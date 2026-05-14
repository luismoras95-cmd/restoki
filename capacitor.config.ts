import type { CapacitorConfig } from "@capacitor/cli"

const config: CapacitorConfig = {
  appId: "mx.restoki.app",
  appName: "Restoki",
  webDir: "public",
  // En esta versión Restoki es webview-first: la app abre restoki.mx
  // directamente. Cuando se necesite acceso offline o features 100%
  // nativos, cambiar a empaquetar el bundle web localmente.
  server: {
    url: "https://restoki.mx",
    androidScheme: "https",
    cleartext: false,
  },
  ios: {
    contentInset: "automatic",
    backgroundColor: "#FFFFFF",
    limitsNavigationsToAppBoundDomains: false,
  },
  android: {
    backgroundColor: "#FFFFFF",
    allowMixedContent: false,
    captureInput: true,
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 1500,
      launchAutoHide: true,
      backgroundColor: "#FFFFFF",
      androidScaleType: "CENTER_CROP",
      showSpinner: false,
      splashImmersive: false,
      splashFullScreen: false,
    },
    StatusBar: {
      style: "DEFAULT",
      backgroundColor: "#FFFFFF",
      overlaysWebView: false,
    },
    Camera: {
      // Permission usage descriptions se definen en Info.plist y
      // AndroidManifest.xml. Aquí solo configuración runtime.
    },
  },
}

export default config
