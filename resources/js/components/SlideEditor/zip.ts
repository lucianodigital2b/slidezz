// Minimal ZIP writer using the STORE method (no compression). Slide exports are
// JPEG/PNG, which are already compressed, so deflate would cost CPU for negligible
// size gain. This keeps the bundle dependency-free (no JSZip/fflate).

interface ZipEntry {
    name: string;
    data: Uint8Array;
}

function crc32(bytes: Uint8Array): number {
    let crc = ~0;
    for (let i = 0; i < bytes.length; i++) {
        crc ^= bytes[i];
        for (let j = 0; j < 8; j++) {
            crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
        }
    }

    return (~crc) >>> 0;
}

function u16(n: number): Uint8Array {
    return new Uint8Array([n & 0xff, (n >>> 8) & 0xff]);
}

function u32(n: number): Uint8Array {
    return new Uint8Array([n & 0xff, (n >>> 8) & 0xff, (n >>> 16) & 0xff, (n >>> 24) & 0xff]);
}

function concat(parts: Uint8Array[]): Uint8Array {
    let length = 0;
    for (const part of parts) {
        length += part.length;
    }

    const out = new Uint8Array(length);
    let pos = 0;
    for (const part of parts) {
        out.set(part, pos);
        pos += part.length;
    }

    return out;
}

/**
 * Build a valid (uncompressed) ZIP archive from the given entries.
 */
export function createZip(files: ZipEntry[]): Blob {
    const encoder = new TextEncoder();
    const localParts: Uint8Array[] = [];
    const centralParts: Uint8Array[] = [];
    let offset = 0;

    for (const file of files) {
        const nameBytes = encoder.encode(file.name);
        const crc = crc32(file.data);
        const size = file.data.length;

        const localHeader = concat([
            u32(0x04034b50), u16(20), u16(0), u16(0), u16(0), u16(0),
            u32(crc), u32(size), u32(size),
            u16(nameBytes.length), u16(0),
            nameBytes, file.data,
        ]);
        localParts.push(localHeader);

        centralParts.push(concat([
            u32(0x02014b50), u16(20), u16(20), u16(0), u16(0), u16(0), u16(0),
            u32(crc), u32(size), u32(size),
            u16(nameBytes.length), u16(0), u16(0), u16(0), u16(0),
            u32(0), u32(offset),
            nameBytes,
        ]));

        offset += localHeader.length;
    }

    const centralStart = offset;
    let centralSize = 0;
    for (const part of centralParts) {
        centralSize += part.length;
    }

    const end = concat([
        u32(0x06054b50), u16(0), u16(0),
        u16(files.length), u16(files.length),
        u32(centralSize), u32(centralStart), u16(0),
    ]);

    const parts = [...localParts, ...centralParts, end] as BlobPart[];

    return new Blob(parts, { type: 'application/zip' });
}
