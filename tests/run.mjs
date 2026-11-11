import { build } from 'esbuild'
import { unlink } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'

for (const entry of ['tests/history.test.ts', 'tests/workbook.test.ts', 'tests/formula.test.ts', 'tests/clipboard.test.ts', 'tests/selection.test.ts', 'tests/validation.test.ts', 'tests/chart.test.ts', 'tests/conditional.test.ts', 'tests/autofill.test.ts', 'tests/store.test.ts']) {
  const output = new URL('./.test-bundle.mjs', import.meta.url)
  try {
    await build({ entryPoints: [entry], bundle: true, packages: 'external', platform: 'node', format: 'esm', outfile: fileURLToPath(output) })
    await import(`${output.href}?entry=${encodeURIComponent(entry)}`)
  } finally {
    await unlink(output).catch(() => {})
  }
}
