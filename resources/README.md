# Iconos y Splash Screen de la App Móvil

Restoki usa `@capacitor/assets` para generar todos los tamaños de iconos
y splash necesarios para iOS + Android a partir de UN SOLO archivo fuente.

## Archivos que necesitas poner aquí

Pon dos archivos en este directorio (`resources/`):

1. **`icon.png`** — el ícono de la app
   - Tamaño: **1024×1024 px**
   - Formato: PNG (sin transparencia recomendada)
   - Sin redondeo (iOS y Android lo redondean ellos)
   - El logo debe llenar al menos el 80% del cuadrado

2. **`splash.png`** — la pantalla de carga
   - Tamaño: **2732×2732 px** (cuadrado, para soportar iPad)
   - Formato: PNG
   - Logo centrado, con espacio alrededor (el área del logo será visible
     pero los bordes se cortan en pantallas no cuadradas)
   - Fondo blanco (`#FFFFFF`) o color sólido de marca

## Cómo generar los iconos para todas las plataformas

Una vez que tengas `icon.png` y `splash.png` en este directorio:

```bash
pnpm exec capacitor-assets generate
```

Esto genera automáticamente:
- `android/app/src/main/res/mipmap-*/` (todos los tamaños de íconos Android)
- `ios/App/App/Assets.xcassets/AppIcon.appiconset/` (todos los tamaños iOS)
- `android/app/src/main/res/drawable-*/splash.png` (splash Android)
- `ios/App/App/Assets.xcassets/Splash.imageset/` (splash iOS)

## Sincronizar después de generar

Después de generar los assets, corre:

```bash
pnpm exec cap sync
```

Esto copia los assets a los proyectos nativos.

## Mientras tanto

Si todavía no tienes los archivos PNG, los íconos default de Capacitor
(un logo azul "C") aparecerán hasta que los reemplaces. La app sí compila
y funciona aunque uses los iconos default.
