import {
  ArrowRightLeft,
  Barcode,
  Box,
  ChefHat,
  HeartPulse,
  LayoutDashboard,
  Package,
  Receipt,
  Settings,
  ShoppingCart,
  Store,
  Truck,
  type LucideIcon,
} from "lucide-react"

export type NavItem = {
  label: string
  href: string
  icon: LucideIcon
}

export const APP_NAV: NavItem[] = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Indicadores", href: "/indicadores", icon: HeartPulse },
  { label: "Inventario", href: "/inventario", icon: Package },
  { label: "Escáner", href: "/escaner", icon: Barcode },
  { label: "Compras", href: "/compras", icon: ShoppingCart },
  { label: "Transferencias", href: "/transferencias", icon: ArrowRightLeft },
  { label: "Recetas", href: "/recetas", icon: ChefHat },
  { label: "Ventas", href: "/ventas", icon: Receipt },
  { label: "Productos", href: "/productos", icon: Box },
  { label: "Proveedores", href: "/proveedores", icon: Truck },
  { label: "Sucursales", href: "/sucursales", icon: Store },
  { label: "Configuración", href: "/configuracion", icon: Settings },
]
