// Run with Node.js and sharp available; generated assets are committed for Hugo.
const fs = require('node:fs/promises');
const path = require('node:path');
const sharp = require('sharp');

async function main() {
  const output = path.resolve(__dirname, '../static');
  const svg = await fs.readFile(path.join(output, 'favicon.svg'));
  const render = (size) => sharp(svg, { density: 384 }).resize(size, size).png().toBuffer();
  const sizes = [16, 32, 48];
  const images = await Promise.all(sizes.map(render));
  const header = Buffer.alloc(6 + 16 * sizes.length);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(sizes.length, 4);
  let offset = header.length;
  images.forEach((image, i) => {
    const entry = 6 + i * 16;
    header[entry] = sizes[i];
    header[entry + 1] = sizes[i];
    header.writeUInt16LE(1, entry + 4);
    header.writeUInt16LE(32, entry + 6);
    header.writeUInt32LE(image.length, entry + 8);
    header.writeUInt32LE(offset, entry + 12);
    offset += image.length;
  });
  await fs.writeFile(path.join(output, 'favicon.ico'), Buffer.concat([header, ...images]));
  for (const [name, size] of [['apple-touch-icon.png', 180], ['icon-192.png', 192], ['icon-512.png', 512]]) {
    await fs.writeFile(path.join(output, name), await render(size));
  }
}

main().catch((error) => { console.error(error); process.exitCode = 1; });
