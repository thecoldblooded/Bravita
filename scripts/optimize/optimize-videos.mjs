import { execSync } from 'child_process';
import { statSync } from 'fs';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const assetsDir = join(__dirname, '../src/assets');
const outputDir = join(__dirname, '../src/assets/optimized');

// Files to optimize
const videosToOptimize = [
  { input: 'login.mp4', output: 'login-compressed.mp4' },
  { input: 'Generated video 1.mp4', output: 'Generated video 1-compressed.mp4' },
  { input: 'alpaca.gif', output: 'alpaca-optimized.mp4' },
  { input: 'bravita.gif', output: 'bravita-optimized.mp4' },
];

function getFileSizeKB(filePath) {
  try {
    const stats = statSync(filePath);
    return Math.round(stats.size / 1024);
  } catch (e) {
    return 0;
  }
}

function optimizeVideo(inputPath, outputPath) {
  const inputSize = getFileSizeKB(inputPath);
  
  // Use H.265/HEVC with AAC audio for best compression ratio
  const command = `ffmpeg -i "${inputPath}" -c:v libx265 -crf 28 -preset medium -c:a aac -b:a 96k -y "${outputPath}" 2>&1`;
  
  try {
    execSync(command, { stdio: 'pipe' });
    const outputSize = getFileSizeKB(outputPath);
    const savings = Math.round((1 - outputSize / inputSize) * 100);
    
    return { success: true, inputSize, outputSize, savings };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

async function processVideos() {
  console.log('🎬 Video Optimization Script\n');
  console.log('Converting videos to H.265 for better compression...');
  console.log('');
  console.log('='.repeat(60));
  console.log('');
  
  let totalInputSize = 0;
  let totalOutputSize = 0;
  let successCount = 0;
  
  for (const video of videosToOptimize) {
    const inputPath = join(assetsDir, video.input);
    const outputPath = join(outputDir, video.output);
    
    console.log(`Processing: ${video.input}`);
    
    const result = optimizeVideo(inputPath, outputPath);
    
    if (result.success) {
      console.log(`  ✓ Success`);
      console.log(`  ${result.inputSize} KB → ${result.outputSize} KB (${result.savings}% smaller)`);
      console.log(`  Output: ${video.output}`);
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
  console.log(`   Processed: ${successCount}/${videosToOptimize.length}`);
  console.log(`   Total input:  ${Math.round(totalInputSize / 1024 * 10) / 10} MB`);
  console.log(`   Total output: ${Math.round(totalOutputSize / 1024 * 10) / 10} MB`);
  if (totalInputSize > 0) {
    console.log(`   Savings:      ${Math.round((1 - totalOutputSize / totalInputSize) * 100)}%`);
  }
  console.log('');
  console.log('💡 Next steps:');
  console.log('   1. Update component imports to use optimized versions');
  console.log('   2. Add <video> element with MP4 fallback for GIF replacements');
  console.log('   3. Test playback on all browsers');
}

processVideos();
