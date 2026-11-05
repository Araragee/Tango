// Guards the subset Material Symbols font in index.html: any icon referenced in
// the source must be in its `icon_names` list, otherwise it renders as raw
// ligature text (e.g. "favorite") instead of a glyph. Fix: `npm run icons`.
import { describe, it, expect } from 'vitest'
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { CATEGORY_ICON_MAP } from './utils/categoryIcons'
import { DATE_NIGHT_IDEAS } from './utils/dateNightIdeas'

const root = join(__dirname, '..')

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const p = join(dir, name)
    if (statSync(p).isDirectory()) return walk(p)
    return /\.(vue|ts)$/.test(name) && !/\.test\.ts$/.test(name) ? [p] : []
  })
}

const html = readFileSync(join(root, 'index.html'), 'utf8')
const subset = new Set(
  (html.match(/icon_names=([a-z0-9_,]+)/)?.[1] ?? '').split(',').filter(Boolean),
)

function referencedIcons(): Map<string, string> {
  const found = new Map<string, string>()
  const add = (name: string, where: string) => { if (!found.has(name)) found.set(name, where) }
  for (const file of walk(join(root, 'src'))) {
    const src = readFileSync(file, 'utf8')
    const rel = file.slice(root.length + 1)
    // Static glyphs and quoted literals inside an icon element's text.
    for (const m of src.matchAll(/material-symbols-outlined[^>]*>([^<]*)</g)) {
      const text = m[1].trim()
      if (/^[a-z0-9_]+$/.test(text)) add(text, rel)
      // Ternary results: {{ cond ? 'a' : 'b' }}
      for (const q of text.matchAll(/[?:]\s*'([a-z0-9_]+)'/g)) add(q[1], rel)
    }
    // `icon: 'name'` / `icon = 'name'` / `icon ?? 'name'` data literals.
    for (const m of src.matchAll(/\bicon\w*\s*(?::|=|\?\?)\s*'([a-z0-9_]+)'/g)) add(m[1], rel)
  }
  for (const v of Object.values(CATEGORY_ICON_MAP)) add(v, 'utils/categoryIcons.ts')
  for (const i of DATE_NIGHT_IDEAS) add(i.icon, 'utils/dateNightIdeas.ts')
  return found
}

describe('Material Symbols subset font', () => {
  it('index.html requests a subset (not the 4 MB full font)', () => {
    expect(subset.size).toBeGreaterThan(50)
  })

  it('includes every icon referenced in the source', () => {
    const missing = [...referencedIcons()]
      .filter(([name]) => !subset.has(name))
      .map(([name, where]) => `${name} (${where})`)
    expect(missing, 'Run `npm run icons` to regenerate the font URL').toEqual([])
  })
})
