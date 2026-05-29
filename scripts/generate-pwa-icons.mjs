/**
 * Generates the PWA icon set from inline SVG definitions.
 *
 * Run with `node scripts/generate-pwa-icons.mjs` whenever the brand mark
 * changes. Outputs to `public/`:
 *   - icon-192.png         (any-purpose, 192x192)
 *   - icon-512.png         (any-purpose, 512x512)
 *   - icon-maskable-512.png (maskable, 512x512 — safe area is the inner 80%)
 *   - apple-touch-icon.png (180x180, iOS home-screen)
 *
 * Uses `sharp` (already transitively installed by Next.js for image
 * optimization) so we don't add a new top-level dependency.
 */

import sharp from 'sharp'
import { writeFile, mkdir } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const publicDir = join(__dirname, '..', 'public')

const BRAND_BLUE = '#2563eb'

/**
 * The "any-purpose" icon: rounded blue square with a stylized shopping bag.
 * The bag is the same shape as the Lucide `ShoppingBag` icon used in the
 * sidebar brand mark, scaled to fill ~50% of the canvas.
 */
function iconSvg({ size, padding, rounded }) {
  const inner = size - padding * 2
  // Lucide ShoppingBag path on a 24x24 viewBox
  const bagPath = `
    <g transform="translate(${padding}, ${padding}) scale(${inner / 24})"
       fill="none" stroke="white" stroke-width="1.8"
       stroke-linecap="round" stroke-linejoin="round">
      <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z"/>
      <path d="M3 6h18"/>
      <path d="M16 10a4 4 0 0 1-8 0"/>
    </g>
  `
  const rx = rounded ? size * 0.22 : 0
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <rect width="${size}" height="${size}" rx="${rx}" fill="${BRAND_BLUE}"/>
  ${bagPath}
</svg>`
}

async function emit(name, svg) {
  const out = join(publicDir, name)
  await sharp(Buffer.from(svg)).png().toFile(out)
  console.log(`  ✓ ${name}`)
}

async function main() {
  await mkdir(publicDir, { recursive: true })
  console.log('Generating PWA icons →', publicDir)

  // "any" purpose icons — bag fills ~50% of canvas, rounded corners
  await emit('icon-192.png', iconSvg({ size: 192, padding: 48, rounded: true }))
  await emit('icon-512.png', iconSvg({ size: 512, padding: 128, rounded: true }))

  // "maskable" purpose — content stays in the inner 80% safe zone so the
  // OS can crop to a circle/squircle without clipping the bag. No rounding
  // because the OS applies its own mask.
  await emit(
    'icon-maskable-512.png',
    iconSvg({ size: 512, padding: 160, rounded: false }),
  )

  // iOS home-screen icon (square, no transparency, no rounding — iOS rounds)
  await emit('apple-touch-icon.png', iconSvg({ size: 180, padding: 36, rounded: false }))

  // Source SVG kept in the repo so future tweaks don't need to read this script
  await writeFile(
    join(publicDir, 'icon-source.svg'),
    iconSvg({ size: 512, padding: 128, rounded: true }),
    'utf8',
  )
  console.log('  ✓ icon-source.svg')
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
