// Packs src/ into dist/darkit-<manifest version>.zip, manifest at the zip root (store upload format).
// Minimal zip writer (deflate, no extras): Node has no zip API and Windows/Linux lack a common zip CLI.
// Fixed timestamps keep the archive reproducible.
import { mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { crc32, deflateRawSync } from 'node:zlib';

const root = fileURLToPath(new URL('../src', import.meta.url));
const { version } = JSON.parse(readFileSync(join(root, 'manifest.json'), 'utf8'));
const files = readdirSync(root, { recursive: true, withFileTypes: true })
  .filter((d) => d.isFile())
  .map((d) => join(d.parentPath, d.name))
  .sort();

const DOS_DATE = (0 << 9) | (1 << 5) | 1; // 1980-01-01
const locals = [];
const centrals = [];
let offset = 0;
for (const file of files) {
  const name = Buffer.from(relative(root, file).replaceAll('\\', '/'));
  const data = readFileSync(file);
  const packed = deflateRawSync(data, { level: 9 });
  const header = Buffer.alloc(30);
  header.writeUInt32LE(0x04034b50, 0);
  header.writeUInt16LE(20, 4); // version needed
  header.writeUInt16LE(8, 8); // deflate
  header.writeUInt16LE(DOS_DATE, 12);
  header.writeUInt32LE(crc32(data), 14);
  header.writeUInt32LE(packed.length, 18);
  header.writeUInt32LE(data.length, 22);
  header.writeUInt16LE(name.length, 26);
  const central = Buffer.alloc(46);
  central.writeUInt32LE(0x02014b50, 0);
  central.writeUInt16LE(20, 4); // made by
  header.copy(central, 6, 4, 30); // shared fields: version .. name length
  central.writeUInt32LE(offset, 42);
  locals.push(header, name, packed);
  centrals.push(central, name);
  offset += header.length + name.length + packed.length;
}
const cd = Buffer.concat(centrals);
const end = Buffer.alloc(22);
end.writeUInt32LE(0x06054b50, 0);
end.writeUInt16LE(files.length, 8);
end.writeUInt16LE(files.length, 10);
end.writeUInt32LE(cd.length, 12);
end.writeUInt32LE(offset, 16);

const out = fileURLToPath(new URL(`../dist/darkit-${version}.zip`, import.meta.url));
mkdirSync(join(out, '..'), { recursive: true });
writeFileSync(out, Buffer.concat([...locals, cd, end]));
console.log(`${relative(process.cwd(), out)} (${files.length} files)`);
