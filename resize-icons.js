const sharp = require('sharp');
const path = require('path');

const source = path.join(__dirname, 'public/icons/icon-512.png');
const sizes = [72, 96, 128, 144, 152, 192, 384, 512];

async function resize() {
  for (const s of sizes) {
    const out = path.join(__dirname, `public/icons/icon-${s}.png`);
    await sharp(source).resize(s, s).toFile(out + '.tmp');
    require('fs').renameSync(out + '.tmp', out);
    console.log(`✅ icon-${s}.png`);
  }
  console.log('Done!');
}

resize().catch(console.error);
