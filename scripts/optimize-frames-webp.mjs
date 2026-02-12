import sharp from 'sharp';
import { readdir, stat, mkdir } from 'fs/promises';
import { join, extname, basename } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const framesDir = join(__dirname, '../src/assets/frames');
const outputDir = join(__dirname, '../src/assets/optimized-frames');

const QUALITY = 80; // Reduced from 85 for better compression

async function getFileSizeKB(filePath) {
  const stats = await stat(filePath);
  return Math.round(stats.size / 1024);
}

async function optimizeFrame(inputPath, outputPath) {
  const inputSize = await getFileSizeKB(inputPath);
  
  // Get frame number from filename
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
  
  console.log('🎬 Enhanced Frame Optimization Script\n');
  console.log(`Processing ${pngFiles.length} frames from carousel...`);
  console.log(`Quality: ${QUALITY}%`);
  console.log('');
  console.log('='.repeat(60));
  console.log('');
  
  for (let i = 0; i < pngFiles.length; i++) {
    const file = pngFiles[i];
    const inputPath = join(framesDir, file);
    const outputPath = join(outputDir, file);
    
    try {
      const result = await optimizeFrame(inputPath, outputPath);
      totalInputSize += result.inputSize;
      totalOutputSize += result.outputSize;
      
      // Progress indicator every 10 frames or at the end
      if ((i + 1) % 10 === 0 || i === pngFiles.length - 1) {
        const savings = Math.round((1 - totalOutputSize / totalInputSize) * 100);
        console.log(`✓ Processed ${i + 1}/${pngFiles.length} frames (${savings}% current savings)`);
      }
    } catch (error) {
      console.error(`✗ Error processing ${file}:`, error.message);
    }
  }
  
  console.log('');
  console.log('='.repeat(60));
  console.log('');
  console.log('📊 Summary:');
  console.log(`   Frames processed: ${pngFiles.length}`);
  console.log(`   Total input:  ${Math.round(totalInputSize / 1024 * 10) / 10} MB`);
  console.log(`   Total output: ${Math.round(totalOutputSize / 1024 * 10) / 10} MB`);
  if (totalInputSize > 0) {
    console.log(`   Total savings: ${Math.round((1 - totalOutputSize / totalInputSize) * 100)}%`);
  }
  console.log('');
  console.log('💡 Benefits of this optimization:');
  console.log('   • WebP format reduces file size by 25-35%');
  console.log('   • Carousel will load faster');
  console.log('   • Reduced bandwidth usage');
  console.log('   • Better mobile performance');
  console.log('');
  console.log('📝 Next steps:');
  console.log('   1. Update carousel component to use WebP frames');
  console.log('   2. Add fallback to PNG for older browsers');
}

processFrames();
