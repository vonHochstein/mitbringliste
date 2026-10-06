// Keep every frame intact, but remove the GIF's repeat instruction.
export function prepareSinglePlayGif(buffer) {
  const bytes = new Uint8Array(buffer);
  const signature = new TextDecoder().decode(bytes.subarray(0, 6));
  if (!/^GIF8[79]a$/.test(signature) || bytes.length < 13) throw new Error("Invalid GIF");
  let offset = 13 + ((bytes[10] & 128) ? 3 * 2 ** ((bytes[10] & 7) + 1) : 0);
  const parts = [bytes.subarray(0, offset)];
  let duration = 0;
  let delay = 100;
  let frames = 0;
  const skipBlocks = () => {
    while (offset < bytes.length) {
      const size = bytes[offset++];
      if (!size) return;
      offset += size;
    }
    throw new Error("Truncated GIF");
  };
  while (offset < bytes.length) {
    const start = offset;
    const type = bytes[offset++];
    if (type === 0x3b) {
      parts.push(bytes.subarray(start, offset));
      if (!frames) throw new Error("GIF has no frames");
      return { blob: new Blob(parts, { type: "image/gif" }), duration };
    }
    if (type === 0x21) {
      const label = bytes[offset++];
      const size = bytes[offset];
      const application = new TextDecoder().decode(bytes.subarray(offset + 1, offset + 1 + size));
      if (label === 0xf9 && size === 4) {
        const hundredths = bytes[offset + 2] | (bytes[offset + 3] << 8);
        // Browsers display delays below 20 ms for approximately 100 ms.
        delay = hundredths < 2 ? 100 : hundredths * 10;
      }
      skipBlocks();
      if (label !== 0xff || !["NETSCAPE2.0", "ANIMEXTS1.0"].includes(application)) {
        parts.push(bytes.subarray(start, offset));
      }
    } else if (type === 0x2c) {
      const packed = bytes[offset + 8];
      offset += 9 + ((packed & 128) ? 3 * 2 ** ((packed & 7) + 1) : 0);
      offset++; // LZW minimum code size.
      skipBlocks();
      parts.push(bytes.subarray(start, offset));
      frames++;
      duration += delay;
      delay = 100;
    } else {
      throw new Error("Invalid GIF block");
    }
  }
  throw new Error("Truncated GIF");
}
