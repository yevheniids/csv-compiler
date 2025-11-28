require('dotenv').config();
const { spawn } = require('child_process');
const path = require('path');

const SHOPIFY_STORE = process.env.SHOPIFY_STORE;
const SHOPIFY_API_KEY = process.env.SHOPIFY_API_KEY;
const CSV_PATH = 'output/shopify-products.csv';

function execCommand(command, args, input = null) {
  return new Promise((resolve, reject) => {
    console.log(`\n> ${command} ${args.join(' ')}`);

    const child = spawn(command, args, {
      stdio: input ? ['pipe', 'inherit', 'inherit'] : 'inherit',
      shell: true
    });

    if (input) {
      child.stdin.write(input + '\n');
      child.stdin.end();
    }

    child.on('close', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`Command failed with exit code ${code}`));
      }
    });

    child.on('error', (error) => {
      reject(error);
    });
  });
}

function execCommandSimple(command, args) {
  return new Promise((resolve, reject) => {
    console.log(`\n> ${command} ${args.join(' ')}`);

    const child = spawn(command, args, {
      stdio: 'inherit',
      shell: true
    });

    child.on('close', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`Command failed with exit code ${code}`));
      }
    });

    child.on('error', (error) => {
      reject(error);
    });
  });
}

async function main() {
  try {
    console.log('🚀 Starting Altera CLI commands...');
    console.log(`Store: ${SHOPIFY_STORE}`);
    console.log(`API Key: ${SHOPIFY_API_KEY.substring(0, 10)}...`);

    console.log('\n📦 Step 1: Adding shop...');
    await execCommand('npx', ['altera', 'shop', 'add', SHOPIFY_STORE], SHOPIFY_API_KEY);

    console.log('\n🧪 Step 2: Testing shop connection...');
    await execCommandSimple('npx', ['altera', 'shop', 'test']);

    console.log('\n📤 Step 3: Importing CSV...');
    await execCommandSimple('npx', ['altera', 'import', 'create', CSV_PATH]);

    console.log('\n✅ All commands completed successfully!');
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    process.exit(1);
  }
}

main();
