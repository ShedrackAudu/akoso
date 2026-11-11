// Spike 03 only. A minimal zip writer: files stored without compression, because PDFs
// are already compressed and storing them is fastest. Enough to measure a class zip;
// the real worker should use a maintained library (a decision for its spec).
import { crc32 } from "node:zlib"

export interface ZipEntry {
  name: string
  content: Uint8Array
}

function u16(n: number): Buffer {
  const b = Buffer.alloc(2)
  b.writeUInt16LE(n)
  return b
}

function u32(n: number): Buffer {
  const b = Buffer.alloc(4)
  b.writeUInt32LE(n >>> 0)
  return b
}

export function zip(entries: readonly ZipEntry[]): Buffer {
  const parts: Buffer[] = []
  const central: Buffer[] = []
  let offset = 0
  for (const entry of entries) {
    const name = Buffer.from(entry.name, "utf8")
    const data = Buffer.from(entry.content)
    const crc = crc32(data)
    const local = Buffer.concat([
      u32(0x04034b50),
      u16(20),
      u16(0x0800),
      u16(0),
      u16(0),
      u16(0),
      u32(crc),
      u32(data.length),
      u32(data.length),
      u16(name.length),
      u16(0),
      name,
    ])
    parts.push(local, data)
    central.push(
      Buffer.concat([
        u32(0x02014b50),
        u16(20),
        u16(20),
        u16(0x0800),
        u16(0),
        u16(0),
        u16(0),
        u32(crc),
        u32(data.length),
        u32(data.length),
        u16(name.length),
        u16(0),
        u16(0),
        u16(0),
        u16(0),
        u32(0),
        u32(offset),
        name,
      ])
    )
    offset += local.length + data.length
  }
  const directory = Buffer.concat(central)
  const end = Buffer.concat([
    u32(0x06054b50),
    u16(0),
    u16(0),
    u16(entries.length),
    u16(entries.length),
    u32(directory.length),
    u32(offset),
    u16(0),
  ])
  return Buffer.concat([...parts, directory, end])
}
