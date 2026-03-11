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

function optimizeAlpacaTransparent(inputPath, outputPath) {
  const inputSize = getFileSizeKB(inputPath);

  try {
    // Use ImageMagick convert command (more reliable for transparent GIFs)
    // Or use ffmpeg with proper parameters
    const magickCommand = `magick "${inputPath}" -alpha on -fuzz 20% -transparent white -coalesce -strip -layers OptimizeTransparency "${outputPath}" 2>&1`;
    
    try {
      execSync(magickCommand, { stdio: 'pipe' });
    } catch (e) {
      // Fallback to ffmpeg
      const ffmpegCommand = `ffmpeg -i "${inputPath}" -vf "format=rgba,colorchannelmixer=aa=0.5" -loop 0 -y "${outputPath}" 2>&1`;
      execSync(ffmpegCommand, { stdio: 'pipe' });
    }
    
    const outputSize = getFileSizeKB(outputPath);
    const savings = Math.round((1 - outputSize / inputSize) * 100);
    
    return { success: true, inputSize, outputSize, savings };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

async function processAlpaca() {
  const inputPath = join(assetsDir, 'alpaca.gif');
  const outputPath = join(outputDir, 'alpaca-optimized.gif');
  
  console.log('🦙 Alpaca Transparent Background Optimization\n');
  console.log('Removing white background and making it transparent...');
  console.log('');
  console.log('='.repeat(60));
  console.log('');
  
  console.log(`Processing: alpaca.gif → alpaca-optimized.gif`);
  
  const result = optimizeAlpacaTransparent(inputPath, outputPath);
  
  if (result.success) {
    console.log(`  ✓ Success`);
    console.log(`  ${result.inputSize} KB → ${result.outputSize} KB (${result.savings}% reduction)`);
    console.log(`  Output: alpaca-optimized.gif with transparent background`);
  } else {
    console.log(`  ✗ Failed: ${result.error}`);
  }
  
  console.log('');
  console.log('='.repeat(60));
  console.log('');
  console.log('✨ Alpaca now has transparent background!');
}

processAlpaca();
