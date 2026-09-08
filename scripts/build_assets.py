import os
import json

template_files = {}
base = 'docx_template'
for root, dirs, files in os.walk(base):
    for f in files:
        full = os.path.join(root, f)
        rel = os.path.relpath(full, base).replace(os.sep, '/')
        if rel != 'word/document.xml':
            with open(full, 'rb') as fl:
                template_files[rel] = fl.read().decode('utf-8', errors='ignore')

content = (
    '// Embedded docx static template assets from Monday.docx\n'
    'const DOCX_TEMPLATE_ASSETS = ' + json.dumps(template_files, indent=2) + ';\n\n'
    'if (typeof module !== "undefined" && module.exports) {\n'
    '  module.exports = DOCX_TEMPLATE_ASSETS;\n'
    '}\n'
)

with open('js/template-assets.js', 'w', encoding='utf-8') as out:
    out.write(content)

print(f"Regenerated js/template-assets.js with {len(template_files)} files, size: {os.path.getsize('js/template-assets.js')} bytes")
