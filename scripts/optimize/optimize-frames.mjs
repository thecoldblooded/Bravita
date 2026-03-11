import sharp from 'sharp';
import { readdir, stat, mkdir, rm } from 'fs/promises';
import { join, extname, basename } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const framesDir = join(__dirname, '../public/frames');
const outputDir = join(__dirname, '../public/frames-webp');

const QUALITY = 85;

async function getFileSizeKB(filePath) {
  const stats = await stat(filePath);
  return Math.round(stats.size / 1024);
}

async function optimizeFrame(inputPath, outputPath) {
  const inputSize = await getFileSizeKB(inputPath);
  
  // Get frame number from filename (e.g., "frame_001.png" -> "frame_001.webp")
  const baseName = basename(inputPath, extname(inputPath));
  const webpPath = join(dirname(outputPath), `${baseName}.webp`);
  
  await sharp(inputPath)
    .webp({ quality: QUALITY })
    .toFile(webpPath);
  
  const outputSize = await getFileSizeKB(webpPath);
  
  return { inputSize, outputSize, baseName };
}

async function processFrames() {
  try {
    await mkdir(outputDir, { recursive: true });
  } catch (e) {
    // Directory exists
  }
  
  const files = await readdir(framesDir);
  const pngFiles = files.filter(f => f.endsWith('.png')).sort();
  
  let totalInputSize = 0;
  let totalOutputSize = 0;
  
  console.log('🎬 Frame Optimization Script\n');
  console.log(`Processing ${pngFiles.length} frames...`);
  console.log('');
  
  for (let i = 0; i < pngFiles.length; i++) {
    const file = pngFiles[i];
    const inputPath = join(framesDir, file);
    const outputPath = join(outputDir, file);
    
    try {
      const result = await optimizeFrame(inputPath, outputPath);
      totalInputSize += result.inputSize;
      totalOutputSize += result.outputSize;
      
      // Progress indicator
      if ((i + 1) % 10 === 0 || i === pngFiles.length - 1) {
        console.log(`✓ Processed ${i + 1}/${pngFiles.length} frames`);
      }
    } catch (error) {
      console.error(`✗ Error processing ${file}:`, error.message);
    }
  }
  
  console.log('');
  console.log('='.repeat(50));
  console.log('');
  console.log('📊 Summary:');
  console.log(`   Frames processed: ${pngFiles.length}`);
  console.log(`   Total input:  ${Math.round(totalInputSize / 1024 * 10) / 10} MB`);
  console.log(`   Total output: ${Math.round(totalOutputSize / 1024 * 10) / 10} MB`);
  console.log(`   Savings:      ${Math.round((1 - totalOutputSize / totalInputSize) * 100)}%`);
  console.log('');
  console.log('💡 Next steps:');
  console.log('   1. Update scroll-image-sequence.tsx to use .webp files');
  console.log('   2. Replace public/frames with public/frames-webp');
}

processFrames();
