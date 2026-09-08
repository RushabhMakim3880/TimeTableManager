const fs = require('fs');

// Create a 16x16 32-bit BMP icon inside an ICO file
const width = 16;
const height = 16;
const bpp = 32;

// ICO Header (6 bytes)
// 0-1: 0 (reserved)
// 2-3: 1 (type: icon)
// 4-5: 1 (count: 1 image)
const icoHeader = Buffer.alloc(6);
icoHeader.writeUInt16LE(0, 0);
icoHeader.writeUInt16LE(1, 2);
icoHeader.writeUInt16LE(1, 4);

// BMP Info Header for ICO (40 bytes)
// Note: In ICO BMP, height is doubled (height * 2) to account for XOR and AND masks
const biSize = 40;
const bmpHeader = Buffer.alloc(biSize);
bmpHeader.writeUInt32LE(biSize, 0);       // biSize
bmpHeader.writeInt32LE(width, 4);          // biWidth
bmpHeader.writeInt32LE(height * 2, 8);     // biHeight (doubled for ICO mask)
bmpHeader.writeUInt16LE(1, 12);            // biPlanes
bmpHeader.writeUInt16LE(bpp, 14);          // biBitCount
bmpHeader.writeUInt32LE(0, 16);            // biCompression (BI_RGB)
const imageSize = width * height * 4;
bmpHeader.writeUInt32LE(imageSize, 20);    // biSizeImage
bmpHeader.writeInt32LE(0, 24);             // biXPelsPerMeter
bmpHeader.writeInt32LE(0, 28);             // biYPelsPerMeter
bmpHeader.writeUInt32LE(0, 32);            // biClrUsed
bmpHeader.writeUInt32LE(0, 36);            // biClrImportant

// Pixel data (bottom-up BGRA)
const pixelData = Buffer.alloc(width * height * 4);

// Navy blue: RGBA(30, 58, 138, 255) -> BGRA(138, 58, 30, 255)
// Gold/amber: RGBA(245, 158, 11, 255) -> BGRA(11, 158, 245, 255)
// White: RGBA(255, 255, 255, 255)
const NAVY_B = 138, NAVY_G = 58, NAVY_R = 30, ALPHA_OPAQUE = 255;
const GOLD_B = 11, GOLD_G = 158, GOLD_R = 245;

for (let y = 0; y < height; y++) {
  for (let x = 0; x < width; x++) {
    const idx = (y * width + x) * 4;
    // Draw a neat calendar/clock icon
    const isBorder = (x >= 1 && x <= 14 && (y === 1 || y === 14)) || (y >= 1 && y <= 14 && (x === 1 || x === 14));
    const isHeader = (y >= 11 && y <= 13 && x >= 2 && x <= 13);
    const isBinder = (y >= 13 && y <= 15 && (x === 4 || x === 11));
    const isDot = (y >= 4 && y <= 9 && x >= 4 && x <= 11 && (x % 3 === 1) && (y % 3 === 1));

    if (isBinder) {
      pixelData[idx] = GOLD_B;
      pixelData[idx + 1] = GOLD_G;
      pixelData[idx + 2] = GOLD_R;
      pixelData[idx + 3] = ALPHA_OPAQUE;
    } else if (isHeader || isBorder) {
      pixelData[idx] = NAVY_B;
      pixelData[idx + 1] = NAVY_G;
      pixelData[idx + 2] = NAVY_R;
      pixelData[idx + 3] = ALPHA_OPAQUE;
    } else if (isDot) {
      pixelData[idx] = NAVY_B;
      pixelData[idx + 1] = NAVY_G;
      pixelData[idx + 2] = NAVY_R;
      pixelData[idx + 3] = ALPHA_OPAQUE;
    } else if (x > 1 && x < 14 && y > 1 && y < 14) {
      // White body
      pixelData[idx] = 255;
      pixelData[idx + 1] = 255;
      pixelData[idx + 2] = 255;
      pixelData[idx + 3] = ALPHA_OPAQUE;
    } else {
      // Transparent
      pixelData[idx] = 0;
      pixelData[idx + 1] = 0;
      pixelData[idx + 2] = 0;
      pixelData[idx + 3] = 0;
    }
  }
}

// 1-bit AND mask (height rows of width / 8 bytes, padded to 4 bytes per row)
const maskRowBytes = Math.ceil(width / 32) * 4;
const andMask = Buffer.alloc(maskRowBytes * height, 0);

// Combine BMP data: BMP header + pixelData + andMask
const bmpData = Buffer.concat([bmpHeader, pixelData, andMask]);

// ICO Directory Entry (16 bytes)
const icoEntry = Buffer.alloc(16);
icoEntry.writeUInt8(width, 0);           // bWidth
icoEntry.writeUInt8(height, 1);          // bHeight
icoEntry.writeUInt8(0, 2);               // bColorCount
icoEntry.writeUInt8(0, 3);               // bReserved
icoEntry.writeUInt16LE(1, 4);            // wPlanes
icoEntry.writeUInt16LE(bpp, 6);          // wBitCount
icoEntry.writeUInt32LE(bmpData.length, 8); // dwBytesInRes
icoEntry.writeUInt32LE(6 + 16, 12);       // dwImageOffset (6 header + 16 entry = 22)

const finalIco = Buffer.concat([icoHeader, icoEntry, bmpData]);
fs.writeFileSync('favicon.ico', finalIco);
console.log('✓ Successfully generated valid favicon.ico (' + finalIco.length + ' bytes)');
