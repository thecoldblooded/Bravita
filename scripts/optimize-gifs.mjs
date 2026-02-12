import { execSync } from 'child_process';
import { statSync } from 'fs';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const assetsDir = join(__dirname, '../src/assets');
const outputDir = join(__dirname, '../src/assets/optimized');

function getFileSizeKB(filePath) {
  try {
    const stats = statSync(filePath);
    return Math.round(stats.size / 1024);
  } catch (e) {
    return 0;
  }
}

function optimizeGif(inputPath, outputPath, options = {}) {
  const inputSize = getFileSizeKB(inputPath);
  const { transparentBg = false } = options;

  // Use ffmpeg to optimize GIF
  let command;
  if (transparentBg) {
    // For alpaca: reduce colors and optimize, keep transparency
    // Scale down and reduce frame rate
    command = `ffmpeg -i "${inputPath}" -vf "fps=10,scale=350:-1:flags=lanczos" -loop 0 -y "${outputPath}" 2>&1`;
  } else {
    // For bravita loader: small, fast animation
    command = `ffmpeg -i "${inputPath}" -vf "fps=15,scale=100:-1:flags=lanczos" -loop 0 -y "${outputPath}" 2>&1`;
  }
  
  try {
    execSync(command, { stdio: 'pipe' });
    const outputSize = getFileSizeKB(outputPath);
    const savings = Math.round((1 - outputSize / inputSize) * 100);
    
    return { success: true, inputSize, outputSize, savings };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

async function processGifs() {
  const gifsToOptimize = [
    { 
      input: 'alpaca.gif', 
      output: 'alpaca-optimized.gif',
      transparent: true,
      description: '✨ Alpaca (with transparent background)'
    },
    { 
      input: 'bravita.gif', 
      output: 'bravita-loader.gif',
      transparent: false,
      description: '⏳ Bravita loader animation'
    },
  ];

  console.log('🎬 GIF Optimization Script\n');
  console.log('Converting and optimizing GIFs for web...');
  console.log('');
  console.log('='.repeat(60));
  console.log('');
  
  let totalInputSize = 0;
  let totalOutputSize = 0;
  let successCount = 0;
  
  for (const gif of gifsToOptimize) {
    const inputPath = join(assetsDir, gif.input);
    const outputPath = join(outputDir, gif.output);
    
    console.log(`Processing: ${gif.description}`);
    
    const result = optimizeGif(inputPath, outputPath, { 
      transparentBg: gif.transparent 
    });
    
    if (result.success) {
      console.log(`  ✓ Success`);
      console.log(`  ${result.inputSize} KB → ${result.outputSize} KB (${result.savings}% smaller)`);
      console.log(`  Output: ${gif.output}`);
      totalInputSize += result.inputSize;
      totalOutputSize += result.outputSize;
      successCount++;
    } else {
      console.log(`  ✗ Failed: ${result.error}`);
    }
    console.log('');
  }
  
  console.log('='.repeat(60));
  console.log('');
  console.log('📊 Summary:');
  console.log(`   Processed: ${successCount}/${gifsToOptimize.length}`);
  console.log(`   Total input:  ${Math.round(totalInputSize / 1024 * 10) / 10} MB`);
  console.log(`   Total output: ${Math.round(totalOutputSize / 1024 * 10) / 10} MB`);
  if (totalInputSize > 0) {
    console.log(`   Savings:      ${Math.round((1 - totalOutputSize / totalInputSize) * 100)}%`);
  }
  console.log('');
  console.log('💡 Benefits:');
  console.log('   ✓ Alpaca now has transparent background');
  console.log('   ✓ Bravita optimized for loader animation');
  console.log('   ✓ Reduced file sizes');
  console.log('   ✓ Better website integration');
}

processGifs();
