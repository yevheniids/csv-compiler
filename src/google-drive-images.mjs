import path from 'node:path';
import process from 'node:process';
import fs from 'node:fs';
import {authenticate} from '@google-cloud/local-auth';
import {google} from 'googleapis';

const SCOPES = ['https://www.googleapis.com/auth/drive.metadata.readonly'];
const CREDENTIALS_PATH = path.join(process.cwd(), 'credentials.json');
const TOKEN_PATH = path.join(process.cwd(), 'token.json');
const EXTRACTED_DATA_PATH = path.join(process.cwd(), 'output', 'extracted-data.json');

async function loadSavedCredentialsIfExist() {
  try {
    const content = await fs.promises.readFile(TOKEN_PATH);
    const credentials = JSON.parse(content);
    return google.auth.fromJSON(credentials);
  } catch (err) {
    return null;
  }
}

async function saveCredentials(client) {
  const content = await fs.promises.readFile(CREDENTIALS_PATH);
  const keys = JSON.parse(content);
  const key = keys.installed || keys.web;
  const payload = JSON.stringify({
    type: 'authorized_user',
    client_id: key.client_id,
    client_secret: key.client_secret,
    refresh_token: client.credentials.refresh_token,
  });
  await fs.promises.writeFile(TOKEN_PATH, payload);
}

async function authorize() {
  let client = await loadSavedCredentialsIfExist();

  if (client) {
    return client;
  }

  client = await authenticate({
    scopes: SCOPES,
    keyfilePath: CREDENTIALS_PATH,
  });

  if (client.credentials) {
    await saveCredentials(client);
  }

  return client;
}

async function getAllFiles(drive, query = '') {
  let allFiles = [];
  let nextPageToken = null;

  do {
    const params = {
      pageSize: 1000,
      fields: 'nextPageToken, files(id, name, mimeType)',
      pageToken: nextPageToken,
    };

    if (query) {
      params.q = query;
    }

    const result = await drive.files.list(params);

    if (result.data.files) {
      allFiles = allFiles.concat(result.data.files);
    }

    nextPageToken = result.data.nextPageToken;
  } while (nextPageToken);

  return allFiles;
}

async function listFiles() {
  const auth = await authorize();
  const drive = google.drive({version: 'v3', auth});
  let folders;

  folders = await getAllFiles(drive, "mimeType='application/vnd.google-apps.folder'");

  if (folders.length === 0) {
    console.log('No folders found.');
    return;
  }

  for (const folder of folders) {
    console.log(`${folder.name}`);

    const images = await getAllFiles(
      drive,
      `'${folder.id}' in parents and mimeType contains 'image/'`
    );

    if (images.length === 0) {
      console.log('No images found\n');
    } else {
      images.forEach((image) => {
        const shareUrl = `https://drive.google.com/uc?export=download&id=${image.id}`;

        console.log(shareUrl);
      });

      console.log('');
    }
  }
}

async function updateImageSrc() {
  const auth = await authorize();
  const drive = google.drive({version: 'v3', auth});
  const jsonContent = await fs.promises.readFile(EXTRACTED_DATA_PATH, 'utf-8');
  const data = JSON.parse(jsonContent);
  const folders = await getAllFiles(drive, "mimeType='application/vnd.google-apps.folder'");

  let updatedCount = 0;
  let notFoundCount = 0;

  const folderImageMap = new Map();

  for (const folder of folders) {
    const images = await getAllFiles(
      drive,
      `'${folder.id}' in parents and mimeType contains 'image/'`
    );

    if (images.length > 0) {
      const firstImageUrl = `https://drive.google.com/uc?export=download&id=${images[0].id}`;

      folderImageMap.set(folder.name, firstImageUrl);
      console.log(`${folder.name} -> ${firstImageUrl}`);
    }
  }

  console.log(`\nProcessing ${Object.keys(data).length} products...\n`);

  for (const [skuKey, product] of Object.entries(data)) {
    const sku = String(product.sku || skuKey);

    if (folderImageMap.has(sku)) {
      product['Image Src'] = folderImageMap.get(sku);
      updatedCount++;
      console.log(`Updated SKU ${sku} with image`);
    } else {
      notFoundCount++;
      if (notFoundCount <= 10) {
        console.log(`SKU ${sku} - folder not found`);
      }
    }
  }

  await fs.promises.writeFile(
    EXTRACTED_DATA_PATH,
    JSON.stringify(data, null, 2),
    'utf-8'
  );

  console.log(`Updated ${updatedCount} products`);
  console.log(`${notFoundCount} products without matching folders`);
  console.log(`Saved to ${EXTRACTED_DATA_PATH}`);
}

await updateImageSrc();
