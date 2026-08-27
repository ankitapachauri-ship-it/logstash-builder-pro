// Minimal, dependency-free ZIP writer (STORE method, no compression).
// Enough to bundle a handful of small text files (pipeline .conf + pipelines.yml)
// into a single downloadable archive entirely in the browser.

function crc32(bytes: Uint8Array): number {
  let c = ~0;
  for (let i = 0; i < bytes.length; i++) {
    c ^= bytes[i];
    for (let k = 0; k < 8; k++) c = (c >>> 1) ^ (0xedb88320 & -(c & 1));
  }
  return ~c >>> 0;
}

export interface ZipEntry {
  name: string;
  data: string;
}

export function createZip(files: ZipEntry[]): Blob {
  const enc = new TextEncoder();
  const chunks: Uint8Array[] = [];
  const central: Uint8Array[] = [];
  let offset = 0;

  const now = new Date();
  const dosTime =
    ((now.getHours() & 31) << 11) | ((now.getMinutes() & 63) << 5) | ((now.getSeconds() >> 1) & 31);
  const dosDate =
    (((now.getFullYear() - 1980) & 127) << 9) |
    (((now.getMonth() + 1) & 15) << 5) |
    (now.getDate() & 31);

  const u16 = (arr: number[], v: number) => arr.push(v & 0xff, (v >>> 8) & 0xff);
  const u32 = (arr: number[], v: number) =>
    arr.push(v & 0xff, (v >>> 8) & 0xff, (v >>> 16) & 0xff, (v >>> 24) & 0xff);

  for (const f of files) {
    const nameBytes = enc.encode(f.name);
    const dataBytes = enc.encode(f.data);
    const crc = crc32(dataBytes);

    const local: number[] = [];
    u32(local, 0x04034b50); // local file header signature
    u16(local, 20); // version needed
    u16(local, 0); // flags
    u16(local, 0); // method: store
    u16(local, dosTime);
    u16(local, dosDate);
    u32(local, crc);
    u32(local, dataBytes.length); // compressed size
    u32(local, dataBytes.length); // uncompressed size
    u16(local, nameBytes.length);
    u16(local, 0); // extra length
    const localHeader = new Uint8Array(local);
    chunks.push(localHeader, nameBytes, dataBytes);

    const c: number[] = [];
    u32(c, 0x02014b50); // central directory header signature
    u16(c, 20); // version made by
    u16(c, 20); // version needed
    u16(c, 0); // flags
    u16(c, 0); // method
    u16(c, dosTime);
    u16(c, dosDate);
    u32(c, crc);
    u32(c, dataBytes.length);
    u32(c, dataBytes.length);
    u16(c, nameBytes.length);
    u16(c, 0); // extra length
    u16(c, 0); // comment length
    u16(c, 0); // disk number start
    u16(c, 0); // internal attrs
    u32(c, 0); // external attrs
    u32(c, offset); // local header offset
    central.push(new Uint8Array(c), nameBytes);

    offset += localHeader.length + nameBytes.length + dataBytes.length;
  }

  const cdStart = offset;
  let cdSize = 0;
  for (const c of central) {
    chunks.push(c);
    cdSize += c.length;
  }

  const eocd: number[] = [];
  u32(eocd, 0x06054b50); // end of central directory signature
  u16(eocd, 0); // disk number
  u16(eocd, 0); // disk with central directory
  u16(eocd, files.length); // entries on this disk
  u16(eocd, files.length); // total entries
  u32(eocd, cdSize);
  u32(eocd, cdStart);
  u16(eocd, 0); // comment length
  chunks.push(new Uint8Array(eocd));

  return new Blob(chunks as BlobPart[], { type: "application/zip" });
}
