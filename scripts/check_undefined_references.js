const fs = require('fs');

const js = fs.readFileSync('js/app.js', 'utf8');

// Find all function calls: foo(...)
const callRegex = /([a-zA-Z0-9_$]+)\s*\(/g;
let match;
const calledFunctions = new Set();
while ((match = callRegex.exec(js)) !== null) {
  calledFunctions.add(match[1]);
}

// Find all function definitions: function foo(...), const foo = ..., let foo = ...
const funcDefRegex = /function\s+([a-zA-Z0-9_$]+)\s*\(/g;
const definedFunctions = new Set();
while ((match = funcDefRegex.exec(js)) !== null) {
  definedFunctions.add(match[1]);
}

const varFuncRegex = /(?:const|let|var)\s+([a-zA-Z0-9_$]+)\s*=\s*(?:function|\([^)]*\)\s*=>)/g;
while ((match = varFuncRegex.exec(js)) !== null) {
  definedFunctions.add(match[1]);
}

// Known built-ins, standard JS, browser APIs, or imported globals
const standardBuiltins = new Set([
  'if', 'for', 'while', 'switch', 'catch', 'typeof', 'return',
  'parseInt', 'parseFloat', 'isNaN', 'isFinite', 'encodeURIComponent', 'decodeURIComponent',
  'setTimeout', 'clearTimeout', 'setInterval', 'clearInterval', 'confirm', 'alert', 'prompt',
  'fetch', 'addEventListener', 'removeEventListener', 'querySelector', 'querySelectorAll',
  'getElementById', 'createElement', 'setAttribute', 'getAttribute', 'removeAttribute',
  'appendChild', 'removeChild', 'replaceChild', 'contains', 'matches', 'closest',
  'toString', 'trim', 'toLowerCase', 'toUpperCase', 'replace', 'match', 'split', 'slice',
  'substring', 'indexOf', 'lastIndexOf', 'includes', 'startsWith', 'endsWith', 'repeat', 'padStart', 'padEnd',
  'push', 'pop', 'shift', 'unshift', 'splice', 'concat', 'join', 'reverse', 'sort', 'filter', 'map', 'forEach',
  'reduce', 'reduceRight', 'some', 'every', 'find', 'findIndex', 'fill', 'flat', 'flatMap',
  'keys', 'values', 'entries', 'assign', 'freeze', 'stringify', 'parse',
  'log', 'error', 'warn', 'info', 'debug', 'table', 'assert',
  'add', 'remove', 'toggle', 'has', 'delete', 'clear',
  'focus', 'blur', 'click', 'submit', 'reset',
  'preventDefault', 'stopPropagation', 'stopImmediatePropagation',
  'FileReader', 'Blob', 'URL', 'createObjectURL', 'revokeObjectURL',
  'JSON', 'Math', 'Date', 'Array', 'Object', 'String', 'Number', 'Boolean', 'RegExp', 'Map', 'Set', 'WeakMap', 'WeakSet', 'Promise', 'Error',
  'max', 'min', 'round', 'floor', 'ceil', 'abs', 'random', 'sqrt', 'pow',
  'now', 'toISOString', 'getTime',
  'getItem', 'setItem', 'removeItem',
  'DocxGenerator', 'DEFAULT_DATA', 'JSZip'
]);

const unknownCalls = [];
for (const fn of calledFunctions) {
  if (!definedFunctions.has(fn) && !standardBuiltins.has(fn)) {
    unknownCalls.push(fn);
  }
}

console.log('--- Checking for undeclared function calls in app.js ---');
if (unknownCalls.length > 0) {
  console.log('Potentially undeclared function calls:', unknownCalls);
} else {
  console.log('✓ All function calls are declared or standard built-ins!');
}
