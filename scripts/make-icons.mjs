// Regenerates the app icons from the design system. Run with `npm run icons`.
//
// The mark is drawn from the world's own alphabet (see DESIGN.md): a code strip
// of three blocks — two pressed, one still empty — on VOID ground, with the
// completion bar running along the bottom edge in ENERGY. It is the smallest
// honest statement of what the app is, and it survives being 40px on a home
// screen because it is nothing but flat rectangles.
//
// Written as a tiny PNG encoder rather than pulling in sharp or canvas: the
// artwork is axis-aligned flat colour, so an encoder is ~40 lines and the
// project keeps zero image dependencies for something regenerated once a year.

import { deflateSync } from 'node:zlib'
import { mkdirSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const OUT = join(ROOT, 'public')
const ANDROID_RES = join(ROOT, 'android', 'app', 'src', 'main', 'res')

const VOID = [0x0a, 0x0a, 0x0b]
const PULSE = [0xf2, 0xf1, 0xec]
const ENERGY = [0xe9, 0xb4, 0x17]

function crc32(buf) {
  let c = ~0
  for (const byte of buf) {
    c ^= byte
    for (let k = 0; k < 8; k++) c = (c >>> 1) ^ (0xedb88320 & -(c & 1))
  }
  return ~c >>> 0
}

function chunk(type, data) {
  const len = Buffer.alloc(4)
  len.writeUInt32BE(data.length)
  const body = Buffer.concat([Buffer.from(type, 'latin1'), data])
  const crc = Buffer.alloc(4)
  crc.writeUInt32BE(crc32(body))
  return Buffer.concat([len, body, crc])
}

/**
 * @param pixels  row-major samples, length size*size*channels
 * @param channels 3 for RGB, 4 for RGBA — the status-bar icon needs the alpha,
 *                 because Android reads only that channel and tints it.
 */
function png(size, pixels, channels = 3) {
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(size, 0)
  ihdr.writeUInt32BE(size, 4)
  ihdr[8] = 8 // bit depth
  ihdr[9] = channels === 4 ? 6 : 2 // colour type: truecolour, with alpha or not

  const stride = size * channels
  // Each scanline is prefixed with its filter byte; 0 = none, which is fine
  // for flat colour and lets deflate do all the work.
  const raw = Buffer.alloc(size * (stride + 1))
  for (let y = 0; y < size; y++) {
    const rowStart = y * (stride + 1)
    raw[rowStart] = 0
    pixels.copy(raw, rowStart + 1, y * stride, (y + 1) * stride)
  }

  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0))
  ])
}

function draw(size) {
  const px = Buffer.alloc(size * size * 3)
  const set = (x, y, [r, g, b]) => {
    if (x < 0 || y < 0 || x >= size || y >= size) return
    const i = (y * size + x) * 3
    px[i] = r
    px[i + 1] = g
    px[i + 2] = b
  }
  const rect = (x, y, w, h, colour) => {
    for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) set(i, j, colour)
  }
  const outline = (x, y, w, h, t, colour) => {
    rect(x, y, w, t, colour)
    rect(x, y + h - t, w, t, colour)
    rect(x, y, t, h, colour)
    rect(x + w - t, y, t, h, colour)
  }

  rect(0, 0, size, size, VOID)

  // Six blocks on a 1/16 grid — five pressed, one still empty — with the
  // completion bar under them. Two rows rather than one: a single strip leaves
  // the top and bottom thirds of the square empty, and an icon that only fills
  // its middle band reads as small on a home screen full of full-bleed ones.
  const u = size / 16
  const block = Math.round(u * 3.4)
  const gap = Math.round(u * 1.0)
  const total = block * 3 + gap * 2
  const barH = Math.max(2, Math.round(u * 0.8))
  const barTop = Math.round(u * 1.4)
  const height = block * 2 + gap + barTop + barH

  const x0 = Math.round((size - total) / 2)
  const y0 = Math.round((size - height) / 2)
  const stroke = Math.max(1, Math.round(size / 55))

  const col = (i) => x0 + (block + gap) * i
  for (let i = 0; i < 3; i++) rect(col(i), y0, block, block, PULSE)
  rect(col(0), y0 + block + gap, block, block, PULSE)
  rect(col(1), y0 + block + gap, block, block, PULSE)
  outline(col(2), y0 + block + gap, block, block, stroke, PULSE)

  // Five of six done: the bar runs five sixths of the way across.
  rect(x0, y0 + block * 2 + gap + barTop, Math.round(total * (5 / 6)), barH, ENERGY)

  return px
}

/**
 * The Android status-bar icon, white on transparent.
 *
 * Android throws away the colour and keeps only the alpha channel, tinting the
 * silhouette with the notification colour — so this must have real
 * transparency. `capacitor.config.json` has named `ic_stat_icon` since the
 * project was set up and the drawable never existed; without it Android
 * flattens the launcher icon into a solid white blob.
 *
 * A 24dp canvas is far too small for the six-block mark: the blocks land at
 * about four pixels each at mdpi. So it is the top row alone — three blocks,
 * two pressed and one empty — which is still the code strip and still says the
 * same thing.
 */
function drawStat(size) {
  const px = Buffer.alloc(size * size * 4)
  const rect = (x, y, w, h) => {
    for (let j = y; j < y + h; j++) {
      for (let i = x; i < x + w; i++) {
        if (i < 0 || j < 0 || i >= size || j >= size) continue
        const p = (j * size + i) * 4
        px[p] = 0xff
        px[p + 1] = 0xff
        px[p + 2] = 0xff
        px[p + 3] = 0xff
      }
    }
  }
  const outline = (x, y, w, h, t) => {
    rect(x, y, w, t)
    rect(x, y + h - t, w, t)
    rect(x, y, t, h)
    rect(x + w - t, y, t, h)
  }

  // Android expects a little breathing room inside the 24dp box; the system
  // draws no padding of its own.
  const pad = Math.round(size * 0.12)
  const inner = size - pad * 2
  const gap = Math.max(1, Math.round(inner * 0.09))
  const block = Math.floor((inner - gap * 2) / 3)
  const stroke = Math.max(1, Math.round(block / 6))
  const y = Math.round((size - block) / 2)
  const x0 = Math.round((size - (block * 3 + gap * 2)) / 2)

  rect(x0, y, block, block)
  rect(x0 + block + gap, y, block, block)
  outline(x0 + (block + gap) * 2, y, block, block, stroke)

  return px
}

for (const size of [180, 192, 512]) {
  const name = size === 180 ? 'apple-touch-icon.png' : `icon-${size}.png`
  writeFileSync(join(OUT, name), png(size, draw(size)))
  console.log(`wrote public/${name} (${size}×${size})`)
}

// 24dp at each density, the standard status-bar icon ramp.
for (const [density, size] of [
  ['mdpi', 24],
  ['hdpi', 36],
  ['xhdpi', 48],
  ['xxhdpi', 72],
  ['xxxhdpi', 96]
]) {
  const dir = join(ANDROID_RES, `drawable-${density}`)
  mkdirSync(dir, { recursive: true })
  writeFileSync(join(dir, 'ic_stat_icon.png'), png(size, drawStat(size), 4))
  console.log(`wrote android drawable-${density}/ic_stat_icon.png (${size}×${size})`)
}

// The favicon is the same mark as vector, so a browser tab gets crisp edges.
const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" shape-rendering="crispEdges">
  <rect width="64" height="64" fill="#0a0a0b"/>
  <g fill="#f2f1ec">
    <rect x="6" y="14" width="14" height="14"/>
    <rect x="25" y="14" width="14" height="14"/>
    <rect x="44" y="14" width="14" height="14"/>
    <rect x="6" y="33" width="14" height="14"/>
    <rect x="25" y="33" width="14" height="14"/>
  </g>
  <rect x="44.5" y="33.5" width="13" height="13" fill="none" stroke="#f2f1ec"/>
  <rect x="6" y="52" width="43" height="4" fill="#e9b417"/>
</svg>
`
writeFileSync(join(OUT, 'favicon.svg'), svg)
console.log('wrote public/favicon.svg')
