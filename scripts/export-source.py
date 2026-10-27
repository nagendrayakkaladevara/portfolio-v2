"""Export portable application source and specs without hosting identity or secrets."""
from pathlib import Path
import json
import zipfile

root = Path(__file__).resolve().parent.parent
output = root / 'public' / 'Sai-Nagendra-Portfolio-React-TypeScript.zip'
spec_output = root / 'public' / 'Sai-Nagendra-Portfolio-Specifications.zip'
include = ['src', 'components/ui', 'lib/utils.ts', 'public/favicon.svg', 'public/favicon.ico', 'public/apple-touch-icon.png', 'public/mascots', 'public/licenses', 'public/images',
           'public/Sai-Nagendra-Resume-2025.pdf', 'README.md', 'index.html', 'docs', 'tests',
           'scripts/build-content.mjs', 'scripts/generate-api-spec.py', 'scripts/chat_api_spec.py', 'scripts/export-source.py',
           'env.example', 'pnpm-workspace.yaml', 'vitest.config.ts', 'tsconfig.json', 'postcss.config.mjs', 'components.json', 'pnpm-lock.yaml']
portable_vite = '''import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath, URL } from 'node:url';

export default defineConfig({
  plugins: [react()],
  resolve: { alias: { '@': fileURLToPath(new URL('.', import.meta.url)) } },
  build: { outDir: 'dist' },
});
'''
package = json.loads((root / 'package.json').read_text())
package['scripts'].pop('install:ci', None)
with zipfile.ZipFile(output, 'w', compression=zipfile.ZIP_DEFLATED) as archive:
    for name in include:
        item = root / name
        files = sorted(item.rglob('*')) if item.is_dir() else [item]
        for source in files:
            if source.is_file(): archive.write(source, f'sai-nagendra-portfolio/{source.relative_to(root)}')
    archive.writestr('sai-nagendra-portfolio/package.json', json.dumps(package, indent=2) + '\n')
    archive.writestr('sai-nagendra-portfolio/vite.config.ts', portable_vite)
    archive.writestr('sai-nagendra-portfolio/.gitignore', 'node_modules/\ndist/\n.env*\n.DS_Store\n')
with zipfile.ZipFile(spec_output, 'w', compression=zipfile.ZIP_DEFLATED) as archive:
    for source in sorted((root/'docs').rglob('*')):
        if source.is_file(): archive.write(source, f'portfolio-specifications/{source.relative_to(root/"docs")}')
for target in [output, spec_output]:
    with zipfile.ZipFile(target) as archive:
        assert archive.testzip() is None
        assert not any('.openai/' in name or '.sites-runtime/' in name or 'node_modules/' in name for name in archive.namelist())
    print(f'{target} ({target.stat().st_size:,} bytes)')
