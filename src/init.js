const { spawn } = require('child_process');
const path = require('path');

const scripts = [
  { name: 'Extract SKU', file: 'extract-sku.js', type: 'js' },
  { name: 'Add images from Google Drive', file: 'google-drive-images.mjs', type: 'mjs' },
  { name: 'Generate CSV', file: 'generate-csv.js', type: 'js' },
  { name: 'Import to Shopify', file: 'push-csv.js', type: 'js' }
];

function runScript(script, onProgress) {
  return new Promise((resolve, reject) => {
    const scriptPath = path.join(__dirname, script.file);

    if (onProgress) {
      onProgress({
        type: 'script_start',
        script: script.name,
        message: `Starting ${script.name}...`
      });
    }

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
        if (onProgress) {
          onProgress({
            type: 'script_complete',
            script: script.name,
            message: `${script.name} completed successfully`
          });
        }
        resolve();
      } else {
        console.error(`\n❌ ${script.name} failed with exit code ${code}\n`);
        if (onProgress) {
          onProgress({
            type: 'script_error',
            script: script.name,
            message: `${script.name} failed with exit code ${code}`
          });
        }
        reject(new Error(`${script.name} failed with exit code ${code}`));
      }
    });

    child.on('error', (error) => {
      console.error(`\n❌ Error running ${script.name}:`, error.message);
      if (onProgress) {
        onProgress({ 
          type: 'script_error', 
          script: script.name,
          message: `Error: ${error.message}`
        });
      }
      reject(error);
    });
  });
}

async function main(onProgress) {
  if (onProgress) {
    onProgress({
      type: 'pipeline_start',
      message: 'Starting CSV Compiler Pipeline',
      total: scripts.length
    });
  }

  console.log('\n🚀 Starting CSV Compiler Pipeline');
  console.log('='.repeat(60));

  try {
    for (let i = 0; i < scripts.length; i++) {
      const script = scripts[i];
      if (onProgress) {
        onProgress({ 
          type: 'progress', 
          current: i + 1,
          total: scripts.length,
          script: script.name
        });
      }
      await runScript(script, onProgress);
    }

    console.log('\n' + '='.repeat(60));
    console.log('✅ All scripts completed successfully!');
    console.log('='.repeat(60) + '\n');

    if (onProgress) {
      onProgress({ 
        type: 'pipeline_complete',
        message: 'All scripts completed successfully!'
      });
    }
  } catch (error) {
    console.error('\n' + '='.repeat(60));
    console.error('❌ Pipeline failed:', error.message);
    console.error('='.repeat(60) + '\n');

    if (onProgress) {
      onProgress({
        type: 'pipeline_error',
        message: `Pipeline failed: ${error.message}`
      });
    }
    throw error;
  }
}

module.exports = { main };

if (require.main === module) {
  main();
}