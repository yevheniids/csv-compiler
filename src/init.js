const { spawn } = require('child_process');
const path = require('path');

const scripts = [
  { name: 'Extract SKU', file: 'extract-sku.js', type: 'js' },
  { name: 'Add images from Google Drive', file: 'google-drive-images.mjs', type: 'mjs' },
  { name: 'Generate CSV', file: 'generate-csv.js', type: 'js' },
  { name: 'Import to Shopify', file: 'push-csv.js', type: 'js' }
];

function runScript(script) {
  return new Promise((resolve, reject) => {
    const scriptPath = path.join(__dirname, script.file);
    console.log(`\n${'='.repeat(60)}`);
    console.log(`📋 ${script.name}`);
    console.log(`${'='.repeat(60)}`);
    console.log(`Running: node ${scriptPath}\n`);

    const child = spawn('node', [scriptPath], {
      stdio: 'inherit',
      shell: false,
      cwd: path.join(__dirname, '..')
    });

    child.on('close', (code) => {
      if (code === 0) {
        console.log(`\n✅ ${script.name} completed successfully\n`);
        resolve();
      } else {
        console.error(`\n❌ ${script.name} failed with exit code ${code}\n`);
        reject(new Error(`${script.name} failed with exit code ${code}`));
      }
    });

    child.on('error', (error) => {
      console.error(`\n❌ Error running ${script.name}:`, error.message);
      reject(error);
    });
  });
}

async function main() {
  console.log('\n🚀 Starting CSV Compiler Pipeline');
  console.log('='.repeat(60));

  try {
    for (const script of scripts) {
      await runScript(script);
    }

    console.log('\n' + '='.repeat(60));
    console.log('✅ All scripts completed successfully!');
    console.log('='.repeat(60) + '\n');
  } catch (error) {
    console.error('\n' + '='.repeat(60));
    console.error('❌ Pipeline failed:', error.message);
    console.error('='.repeat(60) + '\n');
    process.exit(1);
  }
}

main();
