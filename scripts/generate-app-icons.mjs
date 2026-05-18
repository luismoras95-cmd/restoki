// scripts/generate-app-icons.mjs
// Genera resources/icon.png (1024x1024) y resources/splash.png (2732x2732)
// con el logo del chef hat naranja de Restoki sobre fondo blanco.
//
// Después de correr esto, ejecuta:
//   pnpm cap:assets   (genera todos los tamaños para iOS + Android)
//   pnpm cap:sync     (copia a los proyectos nativos)
//
// Uso:
//   node scripts/generate-app-icons.mjs

import { writeFile, mkdir } from "node:fs/promises"
import { fileURLToPath } from "node:url"
import { dirname, resolve } from "node:path"
import sharp from "sharp"

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = resolve(__dirname, "..")
const resources = resolve(root, "resources")

// SVG del chef hat — viene de lucide-react ChefHat icon, escalado y
// rellenado con naranja Restoki (#F97316).
const CHEF_HAT_SVG_PATH =
  "M17 21a1 1 0 0 0 1-1v-5.35c0-.457.316-.844.727-1.041a4 4 0 0 0-2.134-7.589 5 5 0 0 0-9.186 0 4 4 0 0 0-2.134 7.588c.411.198.727.585.727 1.041V20a1 1 0 0 0 1 1Z M6 17h12"

// Genera un SVG cuadrado con el chef hat centrado.
//   size: tamaño del lienzo (px)
//   iconRatio: 0..1 — fracción del lienzo que ocupa el icono
//   bg: color de fondo
//   fg: color del icono
function makeSvg({ size, iconRatio, bg, fg }) {
  const iconBox = size * iconRatio
  const offset = (size - iconBox) / 2
  // El path original de lucide tiene viewBox 24x24
  const scale = iconBox / 24
  return `
<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <rect width="${size}" height="${size}" fill="${bg}"/>
  <g transform="translate(${offset}, ${offset}) scale(${scale})" fill="none" stroke="${fg}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <path d="${CHEF_HAT_SVG_PATH}"/>
  </g>
</svg>`.trim()
}

async function main() {
  await mkdir(resources, { recursive: true })

  // --- icon.png 1024x1024
  // Fondo naranja Restoki + gorra blanca (mejor contraste para ícono pequeño)
  const iconSvg = makeSvg({
    size: 1024,
    iconRatio: 0.55,
    bg: "#F97316",
    fg: "#FFFFFF",
  })
  await sharp(Buffer.from(iconSvg))
    .png({ compressionLevel: 9 })
    .toFile(resolve(resources, "icon.png"))
  console.log("✓ resources/icon.png (1024×1024)")

  // --- icon-foreground.png 1024x1024 (adaptive icon Android)
  // Mismo logo blanco sobre transparente, sin fondo
  const iconFgSvg = `
<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 1024 1024">
  <g transform="translate(${(1024 - 1024 * 0.55) / 2}, ${(1024 - 1024 * 0.55) / 2}) scale(${(1024 * 0.55) / 24})" fill="none" stroke="#FFFFFF" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <path d="${CHEF_HAT_SVG_PATH}"/>
  </g>
</svg>`.trim()
  await sharp(Buffer.from(iconFgSvg))
    .png({ compressionLevel: 9 })
    .toFile(resolve(resources, "icon-foreground.png"))
  console.log("✓ resources/icon-foreground.png (1024×1024)")

  // --- icon-background.png 1024x1024 (adaptive icon Android)
  // Solo el cuadrado naranja
  const iconBgSvg = `
<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024">
  <rect width="1024" height="1024" fill="#F97316"/>
</svg>`.trim()
  await sharp(Buffer.from(iconBgSvg))
    .png({ compressionLevel: 9 })
    .toFile(resolve(resources, "icon-background.png"))
  console.log("✓ resources/icon-background.png (1024×1024)")

  // --- splash.png 2732x2732
  // Fondo blanco con el chef hat naranja al centro, más pequeño para que
  // quede aire alrededor (la pantalla se cortará a portrait/landscape)
  const splashSvg = makeSvg({
    size: 2732,
    iconRatio: 0.18, // logo pequeño centrado, deja espacio para texto
    bg: "#FFFFFF",
    fg: "#F97316",
  })
  await sharp(Buffer.from(splashSvg))
    .png({ compressionLevel: 9 })
    .toFile(resolve(resources, "splash.png"))
  console.log("✓ resources/splash.png (2732×2732)")

  // --- splash-dark.png 2732x2732 (modo oscuro)
  const splashDarkSvg = makeSvg({
    size: 2732,
    iconRatio: 0.18,
    bg: "#0A0A0A",
    fg: "#F97316",
  })
  await sharp(Buffer.from(splashDarkSvg))
    .png({ compressionLevel: 9 })
    .toFile(resolve(resources, "splash-dark.png"))
  console.log("✓ resources/splash-dark.png (2732×2732)")

  console.log("\nListo. Ahora corre:")
  console.log("  pnpm cap:assets   # genera todos los tamaños")
  console.log("  pnpm cap:sync     # copia a iOS y Android")
}

main().catch((err) => {
  console.error("Error:", err)
  process.exit(1)
})
