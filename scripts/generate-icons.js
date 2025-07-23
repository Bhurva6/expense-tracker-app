const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const sizes = [72, 96, 128, 144, 152, 192, 384, 512];
const inputFile = path.join(__dirname, '../public/panache_green_logo.jpeg');
const outputDir = path.join(__dirname, '../public');

async function generateIcons() {
  try {
    console.log('Generating PWA icons...');
    
    for (const size of sizes) {
      const outputFile = path.join(outputDir, `icon-${size}x${size}.png`);
      
      await sharp(inputFile)
        .resize(size, size, {
          fit: 'contain',
          background: { r: 255, g: 255, b: 255, alpha: 0 }
        })
        .png()
        .toFile(outputFile);
      
      console.log(`Generated: icon-${size}x${size}.png`);
    }
    
    // Generate apple-touch-icon
    await sharp(inputFile)
      .resize(180, 180, {
        fit: 'contain',
        background: { r: 255, g: 255, b: 255, alpha: 1 }
      })
      .png()
      .toFile(path.join(outputDir, 'apple-touch-icon.png'));
    
    console.log('Generated: apple-touch-icon.png');
    console.log('All PWA icons generated successfully!');
    
  } catch (error) {
    console.error('Error generating icons:', error);
  }
}

generateIcons();
