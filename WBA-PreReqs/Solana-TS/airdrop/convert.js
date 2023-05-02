const bs58 = require('bs58');
const fs = require('fs');
let b = bs58.decode('3xQEv2uKUDta4Y6mAfGpmaSZcavGRECLNtEw7rvWCTBSLsqi9qpjMQH5m4GNM9955fLGRRzp7K1C4kBuQXskvfyC');
let j = new Uint8Array(b.buffer, b.byteOffset, b.byteLength / Uint8Array.BYTES_PER_ELEMENT);
fs.writeFileSync('mykey.json', `[${j}]`);