import Link from "next/link"

export const metadata = {
  title: "Política de Privacidad",
  description:
    "Cómo Restoki recopila, usa y protege tus datos. Aviso de privacidad conforme a la LFPDPPP de México.",
}

const LAST_UPDATED = "13 de mayo de 2026"

export default function PrivacidadPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-16 md:px-6 md:py-24">
      <div className="mb-10 flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight md:text-4xl">
          Política de Privacidad
        </h1>
        <p className="text-sm text-muted-foreground">
          Última actualización: {LAST_UPDATED}
        </p>
      </div>

      <div className="prose prose-sm max-w-none text-foreground prose-headings:text-foreground prose-headings:font-semibold prose-h2:mt-10 prose-h2:text-xl prose-h3:mt-6 prose-h3:text-base prose-p:leading-relaxed prose-a:text-primary prose-a:no-underline hover:prose-a:underline">
        <p>
          Restoki (en adelante &quot;<strong>nosotros</strong>&quot; o &quot;
          <strong>el Servicio</strong>&quot;) es operado por Luis Mora, con
          domicilio en Hermosillo, Sonora, México. Esta política describe cómo
          recopilamos, usamos, almacenamos y protegemos tu información cuando
          usas restoki.mx o las apps móviles de Restoki para iOS y Android.
        </p>
        <p>
          Esta política está alineada con la <strong>Ley Federal de Protección
          de Datos Personales en Posesión de los Particulares (LFPDPPP)</strong>
          {" "}de México y, donde aplique, con principios del Reglamento General
          de Protección de Datos (GDPR) de la Unión Europea.
        </p>

        <h2>1. Datos que recopilamos</h2>

        <h3>1.1 Datos que tú nos das directamente</h3>
        <ul>
          <li>
            <strong>Datos de cuenta:</strong> correo electrónico, contraseña
            (almacenada cifrada vía bcrypt en Supabase Auth, nunca en texto
            plano).
          </li>
          <li>
            <strong>Datos de la organización:</strong> nombre del restaurante o
            cadena, RFC, dirección fiscal, teléfono de contacto (todos
            opcionales excepto el nombre).
          </li>
          <li>
            <strong>Datos operativos del restaurante:</strong> sucursales,
            inventario, productos, proveedores, órdenes de compra,
            transferencias, recetas, movimientos de inventario. Estos datos
            son la sustancia de tu uso del servicio.
          </li>
          <li>
            <strong>Fotos de tickets/facturas:</strong> cuando subes una foto
            de un ticket de proveedor para que la IA la lea, esa imagen se
            envía a Anthropic para procesamiento (ver sección 3).
          </li>
          <li>
            <strong>Datos de pago:</strong> NO almacenamos tu tarjeta de
            crédito directamente. Toda la información de pago es procesada
            por <a href="https://stripe.com" target="_blank">Stripe</a> y
            permanece en su infraestructura PCI-DSS Level 1.
          </li>
        </ul>

        <h3>1.2 Datos que recopilamos automáticamente</h3>
        <ul>
          <li>
            <strong>Información técnica:</strong> dirección IP, tipo de
            navegador o dispositivo, sistema operativo, idioma, zona horaria.
          </li>
          <li>
            <strong>Cookies y almacenamiento local:</strong> cookies de
            sesión para mantenerte logueado, preferencias de UI (org
            seleccionada, sucursal), y en algunas vistas datos efímeros (ej.
            tu venta bruta mensual capturada en el calculador de salud, que
            se guarda solo en tu navegador).
          </li>
          <li>
            <strong>Logs de uso:</strong> registramos qué acciones realizas
            (crear orden, ajustar inventario, etc.) para auditoría y soporte.
            Los logs se conservan por un máximo de 90 días.
          </li>
        </ul>

        <h2>2. Cómo usamos tus datos</h2>
        <p>Usamos tu información únicamente para:</p>
        <ul>
          <li>
            <strong>Operar el servicio:</strong> autenticarte, mostrar tu
            inventario, procesar tus órdenes de compra, calcular costos.
          </li>
          <li>
            <strong>Procesar pagos:</strong> cobrar tu suscripción mensual o
            anual vía Stripe.
          </li>
          <li>
            <strong>Mejorar el servicio:</strong> analizar patrones de uso
            agregados (NO individuales) para detectar bugs y priorizar
            features.
          </li>
          <li>
            <strong>Comunicarnos contigo:</strong> enviar emails
            transaccionales (recibos, facturas, alertas de stock, magic
            links). Nunca te mandamos spam ni publicidad de terceros.
          </li>
          <li>
            <strong>Cumplir obligaciones legales:</strong> facturación
            electrónica, requerimientos de autoridades cuando legalmente
            obligados.
          </li>
        </ul>

        <h2>3. Terceros con los que compartimos datos</h2>
        <p>
          Solo compartimos datos con los proveedores estrictamente necesarios
          para operar el servicio:
        </p>
        <ul>
          <li>
            <strong>
              <a href="https://supabase.com" target="_blank">Supabase</a>:
            </strong>{" "}
            almacena tu base de datos (Postgres) y gestiona autenticación.
            Datos hosteados en regiones de AWS. Aislamiento por Row-Level
            Security.
          </li>
          <li>
            <strong>
              <a href="https://vercel.com" target="_blank">Vercel</a>:
            </strong>{" "}
            hostea el frontend y procesa las peticiones del servidor.
          </li>
          <li>
            <strong>
              <a href="https://stripe.com" target="_blank">Stripe</a>:
            </strong>{" "}
            procesa pagos. Sólo recibe correo, nombre y datos de tarjeta.
            Cumple PCI-DSS Level 1.
          </li>
          <li>
            <strong>
              <a href="https://www.anthropic.com" target="_blank">Anthropic</a>:
            </strong>{" "}
            cuando usas la función de IA &quot;Foto del ticket → orden de
            compra&quot;, la imagen del ticket se envía a la API de Claude
            para extracción de productos. Anthropic{" "}
            <strong>no entrena sus modelos con tus datos</strong> (ver{" "}
            <a
              href="https://www.anthropic.com/legal/privacy"
              target="_blank"
            >
              su política
            </a>
            ). Las imágenes se procesan y descartan, no se almacenan
            permanentemente del lado de Anthropic.
          </li>
          <li>
            <strong>
              <a href="https://resend.com" target="_blank">Resend</a>:
            </strong>{" "}
            envía emails transaccionales (login, recuperación de contraseña,
            invitaciones).
          </li>
        </ul>
        <p>
          <strong>NO vendemos tus datos.</strong> NO compartimos tu
          información con anunciantes, brokers de datos ni terceros con fines
          de marketing.
        </p>

        <h2>4. Tus derechos (ARCO)</h2>
        <p>
          Conforme a la LFPDPPP, tienes derecho a Acceder, Rectificar,
          Cancelar y Oponerte (ARCO) al tratamiento de tus datos. Puedes:
        </p>
        <ul>
          <li>
            <strong>Acceder y exportar:</strong> desde la app, exporta tu
            inventario, compras, transferencias y movimientos en CSV en
            cualquier momento.
          </li>
          <li>
            <strong>Rectificar:</strong> edita tus datos directamente en{" "}
            <Link href="/configuracion">Configuración</Link>.
          </li>
          <li>
            <strong>Cancelar / eliminar cuenta:</strong> escríbenos a{" "}
            <a href="mailto:privacidad@restoki.mx">privacidad@restoki.mx</a>{" "}
            y borramos tu cuenta y todos tus datos en máximo 30 días.
          </li>
          <li>
            <strong>Oponerte al uso:</strong> puedes desuscribirte de
            comunicaciones no transaccionales en cualquier momento. Las
            comunicaciones transaccionales (recibos, alertas de seguridad)
            no se pueden desactivar mientras tu cuenta esté activa.
          </li>
        </ul>

        <h2>5. Seguridad</h2>
        <ul>
          <li>Toda comunicación con restoki.mx usa HTTPS/TLS 1.3.</li>
          <li>Contraseñas almacenadas con bcrypt (costo factor 10+).</li>
          <li>API keys de terceros guardadas en variables de entorno cifradas.</li>
          <li>
            Backups automáticos diarios de la base de datos, retenidos por
            30 días.
          </li>
          <li>
            Aislamiento de datos entre organizaciones a nivel de base de
            datos (Postgres Row-Level Security). Ningún cliente puede ver
            datos de otro cliente.
          </li>
          <li>
            Si detectamos un incidente de seguridad que afecte tus datos,
            te notificaremos por email en máximo 72 horas.
          </li>
        </ul>

        <h2>6. Retención de datos</h2>
        <p>
          Conservamos tus datos mientras tu cuenta esté activa. Si cancelas,
          mantenemos los datos por 30 días por si decides reactivar, y
          después los eliminamos permanentemente (excepto registros
          contables/fiscales que la ley nos obliga a conservar por 5 años).
        </p>

        <h2>7. Menores de edad</h2>
        <p>
          Restoki está dirigido a personas mayores de 18 años o que actúen
          en representación de un negocio. No recopilamos datos de menores
          a sabiendas.
        </p>

        <h2>8. Cambios a esta política</h2>
        <p>
          Si modificamos esta política, te notificaremos por email con al
          menos 30 días de anticipación a la entrada en vigor de los cambios
          materiales. La versión vigente siempre estará en esta URL.
        </p>

        <h2>9. Contacto</h2>
        <p>
          Para cualquier duda sobre tu privacidad, ejercer derechos ARCO, o
          reportar un incidente:
        </p>
        <ul>
          <li>
            Email:{" "}
            <a href="mailto:privacidad@restoki.mx">privacidad@restoki.mx</a>
          </li>
          <li>Dirección: Hermosillo, Sonora, México</li>
        </ul>
        <p>
          También puedes acudir al{" "}
          <a href="https://home.inai.org.mx/" target="_blank">
            Instituto Nacional de Transparencia, Acceso a la Información y
            Protección de Datos Personales (INAI)
          </a>{" "}
          si consideras que tus derechos han sido vulnerados.
        </p>
      </div>
    </div>
  )
}
