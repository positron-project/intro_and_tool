import { readFile, writeFile } from 'node:fs/promises'

const indexPath = new URL('../dist/index.html', import.meta.url)
const html = await readFile(indexPath, 'utf8')

// Vite's bundled output is self-contained. A classic script tag also allows
// Chrome/Edge to open the package from file:// without module CORS restrictions.
const staticHtml = html
  .replace('<script type="module" crossorigin ', '<script defer ')
  .replace(' crossorigin href="./assets/', ' href="./assets/')
await writeFile(indexPath, staticHtml, 'utf8')
