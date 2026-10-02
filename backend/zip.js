// Minimal ZIP reader/writer (v2.2) for the in-app Full backup. No
// dependency: backups hold already-compressed photos plus one workbook,
// so entries are written "stored" (method 0). The reader also accepts
// "deflate" (method 8) so a backup that was re-zipped by another tool
// can still be restored. No ZIP64: fine up to 4 GB / 65,535 files.
const fs = require("fs");
const zlib = require("zlib");

const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();
function crc32Update(crc, buf) {
  let c = crc ^ 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function dosDateTime(d) {
  const time = (d.getHours() << 11) | (d.getMinutes() << 5) | (d.getSeconds() >> 1);
  const date = ((d.getFullYear() - 1980) << 9) | ((d.getMonth() + 1) << 5) | d.getDate();
  return { time: time & 0xffff, date: date & 0xffff };
}

// Streams a zip to `out` (any Writable). `entries` is an array of
// { name, buffer } or { name, filePath }. Resolves when finished.
async function writeZip(out, entries) {
  const central = [];
  let offset = 0;
  const { time, date } = dosDateTime(new Date());
  const write = (buf) =>
    new Promise((resolve, reject) => {
      offset += buf.length;
      out.write(buf, (err) => (err ? reject(err) : resolve()));
    });

  for (const e of entries) {
    const name = Buffer.from(e.name, "utf8");
    const localOffset = offset;
    const header = Buffer.alloc(30);
    header.writeUInt32LE(0x04034b50, 0);
    header.writeUInt16LE(20, 4);
    header.writeUInt16LE(0x0008 | 0x0800, 6); // data descriptor + UTF-8 names
    header.writeUInt16LE(0, 8); // stored
    header.writeUInt16LE(time, 10);
    header.writeUInt16LE(date, 12);
    header.writeUInt16LE(name.length, 26);
    await write(Buffer.concat([header, name]));

    let crc = 0, size = 0;
    if (e.buffer) {
      crc = crc32Update(0, e.buffer);
      size = e.buffer.length;
      if (size) await write(e.buffer);
    } else {
      await new Promise((resolve, reject) => {
        const rs = fs.createReadStream(e.filePath);
        rs.on("data", (chunk) => {
          crc = crc32Update(crc, chunk);
          size += chunk.length;
          offset += chunk.length;
          if (!out.write(chunk)) { rs.pause(); out.once("drain", () => rs.resume()); }
        });
        rs.on("end", resolve);
        rs.on("error", reject);
      });
    }
    const desc = Buffer.alloc(16);
    desc.writeUInt32LE(0x08074b50, 0);
    desc.writeUInt32LE(crc, 4);
    desc.writeUInt32LE(size, 8);
    desc.writeUInt32LE(size, 12);
    await write(desc);
    central.push({ name, crc, size, localOffset, time, date });
  }

  const cdStart = offset;
  for (const c of central) {
    const h = Buffer.alloc(46);
    h.writeUInt32LE(0x02014b50, 0);
    h.writeUInt16LE(20, 4);
    h.writeUInt16LE(20, 6);
    h.writeUInt16LE(0x0008 | 0x0800, 8);
    h.writeUInt16LE(0, 10);
    h.writeUInt16LE(c.time, 12);
    h.writeUInt16LE(c.date, 14);
    h.writeUInt32LE(c.crc, 16);
    h.writeUInt32LE(c.size, 20);
    h.writeUInt32LE(c.size, 24);
    h.writeUInt16LE(c.name.length, 28);
    h.writeUInt32LE(c.localOffset, 42);
    await write(Buffer.concat([h, c.name]));
  }
  const cdSize = offset - cdStart;
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(central.length, 8);
  end.writeUInt16LE(central.length, 10);
  end.writeUInt32LE(cdSize, 12);
  end.writeUInt32LE(cdStart, 16);
  await write(end);
  await new Promise((resolve) => out.end(resolve));
}

// Reads the central directory of a zip file on disk. Returns
// { entries: [{name, method, compressedSize, size, localOffset, crc}] }.
function openZip(filePath) {
  const fd = fs.openSync(filePath, "r");
  try {
    const stat = fs.fstatSync(fd);
    const tailLen = Math.min(stat.size, 65557);
    const tail = Buffer.alloc(tailLen);
    fs.readSync(fd, tail, 0, tailLen, stat.size - tailLen);
    let eocd = -1;
    for (let i = tailLen - 22; i >= 0; i--) {
      if (tail.readUInt32LE(i) === 0x06054b50) { eocd = i; break; }
    }
    if (eocd < 0) throw new Error("This file isn't a valid zip archive");
    const count = tail.readUInt16LE(eocd + 10);
    const cdSize = tail.readUInt32LE(eocd + 12);
    const cdOffset = tail.readUInt32LE(eocd + 16);
    if (count === 0xffff || cdOffset === 0xffffffff) throw new Error("ZIP64 archives are not supported");
    const cd = Buffer.alloc(cdSize);
    fs.readSync(fd, cd, 0, cdSize, cdOffset);
    const entries = [];
    let p = 0;
    for (let i = 0; i < count; i++) {
      if (cd.readUInt32LE(p) !== 0x02014b50) throw new Error("The zip file's directory is damaged");
      const flags = cd.readUInt16LE(p + 8);
      const method = cd.readUInt16LE(p + 10);
      const crc = cd.readUInt32LE(p + 16);
      const compressedSize = cd.readUInt32LE(p + 20);
      const size = cd.readUInt32LE(p + 24);
      const nameLen = cd.readUInt16LE(p + 28);
      const extraLen = cd.readUInt16LE(p + 30);
      const commentLen = cd.readUInt16LE(p + 32);
      const localOffset = cd.readUInt32LE(p + 42);
      const name = cd.slice(p + 46, p + 46 + nameLen).toString(flags & 0x0800 ? "utf8" : "latin1");
      entries.push({ name, method, crc, compressedSize, size, localOffset });
      p += 46 + nameLen + extraLen + commentLen;
    }
    return { entries };
  } finally {
    fs.closeSync(fd);
  }
}

// Reads one entry fully into a Buffer (capped), verifying its CRC.
function readEntry(filePath, entry, maxBytes = 64 * 1024 * 1024) {
  if (entry.size > maxBytes) throw new Error(`"${entry.name}" is too large`);
  const fd = fs.openSync(filePath, "r");
  try {
    const lh = Buffer.alloc(30);
    fs.readSync(fd, lh, 0, 30, entry.localOffset);
    if (lh.readUInt32LE(0) !== 0x04034b50) throw new Error("The zip file is damaged");
    const dataStart = entry.localOffset + 30 + lh.readUInt16LE(26) + lh.readUInt16LE(28);
    const raw = Buffer.alloc(entry.compressedSize);
    fs.readSync(fd, raw, 0, entry.compressedSize, dataStart);
    let data;
    if (entry.method === 0) data = raw;
    else if (entry.method === 8) data = zlib.inflateRawSync(raw);
    else throw new Error(`"${entry.name}" uses an unsupported compression method`);
    if (crc32Update(0, data) !== entry.crc) throw new Error(`"${entry.name}" is corrupted (checksum mismatch)`);
    return data;
  } finally {
    fs.closeSync(fd);
  }
}

module.exports = { writeZip, openZip, readEntry, crc32Update };
