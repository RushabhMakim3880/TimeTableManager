const fs = require('fs');
const html = fs.readFileSync('index.html', 'utf8');

const pathRegex = /<path[^>]*\bd="([^"]+)"/g;
let match;
let totalPaths = 0;
let errors = 0;

const cmdArgs = {
  M: 2, m: 2,
  L: 2, l: 2,
  H: 1, h: 1,
  V: 1, v: 1,
  C: 6, c: 6,
  S: 4, s: 4,
  Q: 4, q: 4,
  T: 2, t: 2,
  A: 7, a: 7,
  Z: 0, z: 0
};

while ((match = pathRegex.exec(html)) !== null) {
  totalPaths++;
  const d = match[1];
  const tokens = d.match(/([a-zA-Z]|[-+]?(?:\d*\.\d+|\d+)(?:[eE][-+]?\d+)?)/g);
  if (!tokens) continue;

  let i = 0;
  let currentCmd = null;
  while (i < tokens.length) {
    const token = tokens[i];
    if (/^[a-zA-Z]$/.test(token)) {
      currentCmd = token;
      i++;
      if (currentCmd === 'Z' || currentCmd === 'z') continue;
    }
    const expected = cmdArgs[currentCmd];
    if (expected === undefined) {
      console.error(`Path #${totalPaths}: Unknown command '${currentCmd}'`);
      errors++;
      break;
    }
    if (expected > 0) {
      let count = 0;
      while (count < expected && i < tokens.length && !/^[a-zA-Z]$/.test(tokens[i])) {
        count++;
        i++;
      }
      if (count !== expected) {
        console.error(`Path #${totalPaths} Mismatch in '${currentCmd}': expected ${expected}, got ${count}`);
        console.error('Tokens around error:', tokens.slice(Math.max(0, i - 8), i + 4).join(' '));
        errors++;
        break;
      }
    }
  }
}

console.log(`Validated ${totalPaths} SVG paths. Errors found: ${errors}`);
process.exit(errors > 0 ? 1 : 0);
