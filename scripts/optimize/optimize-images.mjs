import sharp from 'sharp';
import { readdir, stat, mkdir } from 'fs/promises';
import { join, extname, basename } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const assetsDir = join(__dirname, '../src/assets');
const outputDir = join(__dirname, '../src/assets/optimized');

const MAX_WIDTH = 1920;
const MAX_HEIGHT = 1080;
const QUALITY = 80;

async function getFileSizeKB(filePath) {
  const stats = await stat(filePath);
  return Math.round(stats.size / 1024);
}

async function optimizeImage(inputPath, outputPath) {
  const ext = extname(inputPath).toLowerCase();
  const inputSize = await getFileSizeKB(inputPath);
  
  let pipeline = sharp(inputPath);
  
  // Resize if too large
  const metadata = await pipeline.metadata();
  if (metadata.width > MAX_WIDTH || metadata.height > MAX_HEIGHT) {
    pipeline = pipeline.resize(MAX_WIDTH, MAX_HEIGHT, {
      fit: 'inside',
      withoutEnlargement: true
    });
  }
  
  // Convert to WebP for better compression
  const webpPath = outputPath.replace(/\.(png|jpg|jpeg)$/i, '.webp');
  await pipeline
    .webp({ quality: QUALITY })
    .toFile(webpPath);
  
  const outputSize = await getFileSizeKB(webpPath);
  const savings = Math.round((1 - outputSize / inputSize) * 100);
  
  console.log(`✓ ${basename(inputPath)}`);
  console.log(`  ${inputSize} KB → ${outputSize} KB (${savings}% smaller)`);
  console.log(`  Output: ${basename(webpPath)}`);
  console.log('');
  
  return { inputSize, outputSize, savings };
}

async function processDirectory(dir) {
  try {
    await mkdir(outputDir, { recursive: true });
  } catch (e) {
    // Directory exists
  }
  
  const files = await readdir(dir);
  let totalInputSize = 0;
  let totalOutputSize = 0;
  
  console.log('🖼️  Image Optimization Script\n');
  console.log('Processing images in:', dir);
  console.log('Output directory:', outputDir);
  console.log('');
  console.log('='.repeat(50));
  console.log('');
  
  for (const file of files) {
    const filePath = join(dir, file);
    const stats = await stat(filePath);
    
    if (stats.isDirectory()) continue;
    
    const ext = extname(file).toLowerCase();
    if (!['.png', '.jpg', '.jpeg'].includes(ext)) continue;
    
    const outputPath = join(outputDir, file);
    
    try {
      const result = await optimizeImage(filePath, outputPath);
      totalInputSize += result.inputSize;
      totalOutputSize += result.outputSize;
    } catch (error) {
      console.error(`✗ Error processing ${file}:`, error.message);
    }
  }
  
  console.log('='.repeat(50));
  console.log('');
  console.log('📊 Summary:');
  console.log(`   Total input:  ${Math.round(totalInputSize / 1024 * 10) / 10} MB`);
  console.log(`   Total output: ${Math.round(totalOutputSize / 1024 * 10) / 10} MB`);
  console.log(`   Savings:      ${Math.round((1 - totalOutputSize / totalInputSize) * 100)}%`);
  console.log('');
  console.log('💡 Next steps:');
  console.log('   1. Replace original imports with optimized WebP versions');
  console.log('   2. Or manually replace files in src/assets/');
}

processDirectory(assetsDir);
