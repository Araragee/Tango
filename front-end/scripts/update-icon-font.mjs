#!/usr/bin/env node
// Regenerates the Material Symbols <link> in index.html so it requests only
// the icons this app actually uses.
//
// Why: the full variable icon font is ~4 MB, which on a phone means several
// seconds of blank icons (we use display=block). Subsetting with `icon_names`
// and pinning the axes we don't vary (opsz 24, wght 400, GRAD 0) brings it to
// ~20 KB.
//
// How: download the official codepoints list, collect every quoted string /
// text node in src/ that is a valid icon name, and write the sorted list into
// the font URL. Over-inclusion (a word like "home" that is also an icon) is
// harmless; it only costs a few bytes.
//
// Usage: npm run icons   (re-run whenever you use a new icon)

import { readFileSync, writeFileSync, readdirSync, statSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const CODEPOINTS_URL =
  'https://raw.githubusercontent.com/google/material-design-icons/master/variablefont/' +
  'MaterialSymbolsOutlined%5BFILL%2CGRAD%2Copsz%2Cwght%5D.codepoints'

// Icon names stored as database column defaults (supabase/schema.sql and
// migrations) — they never appear as literals in the front-end source.
const DB_DEFAULT_ICONS = ['receipt', 'flag', 'event', 'event_repeat']

function walk(dir) {
  return readdirSync(dir).flatMap((name) => {
    const p = join(dir, name)
    if (statSync(p).isDirectory()) return walk(p)
    return /\.(vue|ts)$/.test(name) && !/\.test\.ts$/.test(name) ? [p] : []
  })
}

const res = await fetch(CODEPOINTS_URL)
if (!res.ok) throw new Error(`Failed to fetch codepoints: ${res.status}`)
const catalog = new Set(
  (await res.text()).split('\n').map((l) => l.split(' ')[0]).filter(Boolean),
)

const tokenRe = />\s*([a-z0-9_]+)\s*<|['"`]([a-z0-9_]+)['"`]/g
const used = new Set(DB_DEFAULT_ICONS)
for (const file of walk(join(root, 'src'))) {
  const src = readFileSync(file, 'utf8')
  for (const m of src.matchAll(tokenRe)) {
    const name = m[1] ?? m[2]
    if (catalog.has(name)) used.add(name)
  }
  // Static glyph text inside an icon element is always an icon, even if the
  // published catalog lags behind the live font (e.g. newer icons).
  for (const m of src.matchAll(/material-symbols-outlined[^>]*>\s*([a-z0-9_]+)\s*</g)) used.add(m[1])
}

const names = [...used].sort() // Google Fonts requires alphabetical order
const href =
  'https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@24,400,0..1,0' +
  `&icon_names=${names.join(',')}&display=block`

const indexPath = join(root, 'index.html')
const html = readFileSync(indexPath, 'utf8')
const linkRe = /href="https:\/\/fonts\.googleapis\.com\/css2\?family=Material\+Symbols\+Outlined[^"]*"/
if (!linkRe.test(html)) throw new Error('Material Symbols <link> not found in index.html')
writeFileSync(indexPath, html.replace(linkRe, `href="${href}"`))
console.log(`index.html: Material Symbols subset with ${names.length} icons`)
