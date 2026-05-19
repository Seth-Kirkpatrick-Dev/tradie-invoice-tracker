// Generates simple SVG-based PNG icons for PWA
// Run: node scripts/generate-icons.mjs
import { writeFileSync } from 'fs'

function svgToPng(size) {
  // Simple SVG with blue background and "P" text
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <rect width="${size}" height="${size}" rx="${size * 0.2}" fill="#2563eb"/>
  <text x="50%" y="54%" font-family="system-ui, -apple-system, sans-serif" font-size="${size * 0.55}" font-weight="bold" fill="white" text-anchor="middle" dominant-baseline="middle">P</text>
</svg>`
  return Buffer.from(svg)
}

// We'll use SVG files as icons since PNG generation needs native deps
writeFileSync('public/icon-192.svg', svgToPng(192))
writeFileSync('public/icon-512.svg', svgToPng(512))
console.log('SVG icons generated')
