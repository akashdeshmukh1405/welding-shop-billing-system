import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

const inputLogo = 'public/branding/jaimatadi-logo.jpg';
const outputDir = 'public/icons';

if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

async function generateIcons() {
  console.log('Generating PWA icons from', inputLogo);

  // 1. Regular 192x192 icon
  await sharp(inputLogo)
    .resize(192, 192, {
      fit: 'contain',
      background: { r: 0, g: 0, b: 0, alpha: 1 }
    })
    .png({ quality: 100 })
    .toFile(path.join(outputDir, 'icon-192.png'));
  console.log('✅ Generated public/icons/icon-192.png');

  // 2. Regular 512x512 icon
  await sharp(inputLogo)
    .resize(512, 512, {
      fit: 'contain',
      background: { r: 0, g: 0, b: 0, alpha: 1 }
    })
    .png({ quality: 100 })
    .toFile(path.join(outputDir, 'icon-512.png'));
  console.log('✅ Generated public/icons/icon-512.png');

  // 3. Maskable 512x512 icon (with 15% safe-zone margin for Android adaptive icon shapes)
  const innerSize = Math.round(512 * 0.76); // ~390px
  const innerBuffer = await sharp(inputLogo)
    .resize(innerSize, innerSize, {
      fit: 'contain',
      background: { r: 0, g: 0, b: 0, alpha: 1 }
    })
    .toBuffer();

  await sharp({
    create: {
      width: 512,
      height: 512,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 1 }
    }
  })
    .composite([{ input: innerBuffer, gravity: 'center' }])
    .png({ quality: 100 })
    .toFile(path.join(outputDir, 'icon-maskable-512.png'));
  console.log('✅ Generated public/icons/icon-maskable-512.png (maskable safe zone)');

  // 4. Apple Touch Icon 180x180
  await sharp(inputLogo)
    .resize(180, 180, {
      fit: 'contain',
      background: { r: 0, g: 0, b: 0, alpha: 1 }
    })
    .png({ quality: 100 })
    .toFile(path.join(outputDir, 'apple-touch-icon.png'));
  console.log('✅ Generated public/icons/apple-touch-icon.png');

  // 5. Favicon 32x32 & 48x48
  await sharp(inputLogo)
    .resize(48, 48, {
      fit: 'contain',
      background: { r: 0, g: 0, b: 0, alpha: 1 }
    })
    .png()
    .toFile(path.join(outputDir, 'icon-48.png'));
  console.log('✅ Generated public/icons/icon-48.png');
}

generateIcons().catch(console.error);
