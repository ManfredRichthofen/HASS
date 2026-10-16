import sharp from 'sharp'
import { mkdir, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const outDir = join(root, 'public', 'icons')

const svg = (size, { maskable = false } = {}) => {
  const pad = maskable ? size * 0.18 : size * 0.16
  const inner = size - pad * 2
  const r = inner * 0.22
  const cx = size / 2
  const cy = size / 2
  const roofY = pad + inner * 0.18
  const bodyTop = pad + inner * 0.42
  const bodyBottom = pad + inner * 0.86
  const bodyLeft = pad + inner * 0.22
  const bodyRight = pad + inner * 0.78
  const doorW = inner * 0.16
  const doorH = inner * 0.28
  const doorX = cx - doorW / 2
  const doorY = bodyBottom - doorH

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <rect width="${size}" height="${size}" rx="${r}" fill="#0e1116"/>
  <path d="M${cx} ${roofY} L${bodyRight} ${bodyTop} L${bodyLeft} ${bodyTop} Z" fill="#4db8a8"/>
  <rect x="${bodyLeft}" y="${bodyTop}" width="${bodyRight - bodyLeft}" height="${bodyBottom - bodyTop}" rx="${inner * 0.06}" fill="#1c222c"/>
  <rect x="${doorX}" y="${doorY}" width="${doorW}" height="${doorH}" rx="${inner * 0.04}" fill="#4db8a8"/>
  <circle cx="${cx}" cy="${cy - inner * 0.02}" r="${inner * 0.06}" fill="#4db8a8"/>
</svg>`
}

await mkdir(outDir, { recursive: true })

const sizes = [192, 512]
for (const size of sizes) {
  const anySvg = svg(size)
  const maskSvg = svg(size, { maskable: true })
  await writeFile(join(outDir, `icon-${size}.svg`), anySvg)
  await sharp(Buffer.from(anySvg))
    .png()
    .toFile(join(outDir, `icon-${size}.png`))
  await sharp(Buffer.from(maskSvg))
    .png()
    .toFile(join(outDir, `icon-${size}-maskable.png`))
}

const apple = svg(180)
await sharp(Buffer.from(apple)).png().toFile(join(outDir, 'apple-touch-icon.png'))
await writeFile(join(outDir, 'icon.svg'), svg(512))

console.log('Generated PWA icons in public/icons')
