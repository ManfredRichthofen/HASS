import { mkdir, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const publicIconsDir = join(root, 'public', 'icons')
const appIconPath = join(root, 'app-icon.png')

/** Casa mark: walnut ground, cream doorway, honey porch light */
const svg = (size, { maskable = false, rounded = true } = {}) => {
  const pad = maskable ? size * 0.18 : size * 0.14
  const inner = size - pad * 2
  const cx = size / 2
  const cornerR = rounded ? size * 0.223 : 0

  // Doorway geometry — tall Roman arch (rounded top, open bottom feel via inset)
  const doorW = inner * 0.52
  const doorH = inner * 0.68
  const doorX = cx - doorW / 2
  const doorY = pad + inner * 0.12
  const stroke = Math.max(size * 0.055, 4)
  const archR = doorW / 2
  const lightR = inner * 0.09
  const glowId = `glow-${size}-${maskable ? 'm' : 'a'}`

  // Path: rounded-top rectangle (doorway) as a filled shape with thick cream stroke
  const r = (n) => Math.round(n * 100) / 100
  const doorPath = [
    `M ${r(doorX + archR)} ${r(doorY)}`,
    `H ${r(doorX + doorW - archR)}`,
    `A ${r(archR)} ${r(archR)} 0 0 1 ${r(doorX + doorW)} ${r(doorY + archR)}`,
    `V ${r(doorY + doorH)}`,
    `H ${r(doorX)}`,
    `V ${r(doorY + archR)}`,
    `A ${r(archR)} ${r(archR)} 0 0 1 ${r(doorX + archR)} ${r(doorY)}`,
    'Z',
  ].join(' ')

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <defs>
    <radialGradient id="${glowId}" cx="50%" cy="48%" r="58%">
      <stop offset="0%" stop-color="#f7d78a"/>
      <stop offset="45%" stop-color="#f2c56b"/>
      <stop offset="100%" stop-color="#de9f45"/>
    </radialGradient>
  </defs>
  <rect width="${size}" height="${size}" rx="${cornerR}" fill="#1a1410"/>
  <path d="${doorPath}" fill="url(#${glowId})" stroke="#f3e9d8" stroke-width="${stroke}" stroke-linejoin="round"/>
  <circle cx="${cx}" cy="${doorY + doorH * 0.42}" r="${lightR}" fill="#f3e9d8"/>
</svg>`
}

await mkdir(publicIconsDir, { recursive: true })

const sizes = [192, 512]
for (const size of sizes) {
  const anySvg = svg(size)
  const maskSvg = svg(size, { maskable: true })
  await writeFile(join(publicIconsDir, `icon-${size}.svg`), anySvg)
  await sharp(Buffer.from(anySvg)).png().toFile(join(publicIconsDir, `icon-${size}.png`))
  await sharp(Buffer.from(maskSvg))
    .png()
    .toFile(join(publicIconsDir, `icon-${size}-maskable.png`))
}

const apple = svg(180)
await sharp(Buffer.from(apple)).png().toFile(join(publicIconsDir, 'apple-touch-icon.png'))
await writeFile(join(publicIconsDir, 'icon.svg'), svg(512))

// Master source for `tauri icon` — square, opaque, no rounded corners (OS applies masks)
const master = svg(1024, { rounded: false })
await sharp(Buffer.from(master)).png().toFile(appIconPath)

console.log('Generated PWA icons in public/icons')
console.log('Generated app-icon.png (1024) for Tauri')
