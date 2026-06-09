import Link from "next/link"

export const metadata = {
  title: "Aviso de Privacidad Integral",
  description:
    "Aviso de Privacidad Integral de Restoki conforme a la LFPDPPP de México. Detalle completo de qué datos recabamos, para qué, cuánto los conservamos y con quién se comparten.",
}

const LAST_UPDATED = "25 de mayo de 2026"

interface DataRow {
  category: string
  data: string
  source: string
  purpose: string
  legalBasis: string
  retention: string
  sharedWith: string
}

const DATA_TABLE: DataRow[] = [
  {
    category: "Identidad",
    data: "Correo electrónico, nombre (opcional)",
    source: "Capturado por ti al registrarte",
    purpose:
      "Autenticación, identificación, envío de notificaciones transaccionales",
    legalBasis: "Necesario para la prestación del Servicio",
    retention:
      "Mientras cuenta activa + 30 días post-cancelación (luego eliminación permanente)",
    sharedWith: "Supabase (auth), Resend (envío de emails)",
  },
  {
    category: "Credenciales",
    data: "Contraseña cifrada (hash bcrypt cost 10+)",
    source: "Capturada por ti, cifrada inmediatamente",
    purpose: "Autenticación segura. Nunca legible por nadie.",
    legalBasis: "Necesario para la prestación del Servicio",
    retention: "Mientras cuenta activa",
    sharedWith: "Supabase Auth (procesa el hash, nunca el texto plano)",
  },
  {
    category: "Sesión",
    data: "Tokens de sesión, cookies de preferencias",
    source: "Generados automáticamente al iniciar sesión",
    purpose: "Mantener login activo, recordar preferencias",
    legalBasis: "Cookies estrictamente necesarias",
    retention: "Hasta logout o 30 días sin uso",
    sharedWith: "Nadie (solo nosotros)",
  },
  {
    category: "Datos del negocio",
    data: "Nombre del restaurante, RFC, dirección fiscal, teléfono de notificaciones",
    source: "Capturado por ti en Configuración",
    purpose:
      "Facturación CFDI, identificación de tu organización, envío de notificaciones de stock",
    legalBasis:
      "Necesario para facturación / consentimiento para notificaciones",
    retention:
      "Mientras cuenta activa + 5 años para datos fiscales (CFF Art. 30)",
    sharedWith: "Supabase (almacenamiento), Stripe (datos fiscales para CFDI)",
  },
  {
    category: "Datos operativos",
    data: "Inventario, productos, proveedores, recetas, órdenes de compra, transferencias, movimientos",
    source: "Capturado por ti y tu equipo al operar Restoki",
    purpose: "Prestación del Servicio (es la sustancia de lo que ofrecemos)",
    legalBasis: "Necesario para la prestación del Servicio",
    retention: "Mientras cuenta activa + 30 días post-cancelación",
    sharedWith: "Supabase (almacenamiento exclusivo)",
  },
  {
    category: "Pagos",
    data: "Datos de tarjeta de crédito/débito, CVV",
    source: "Capturados por ti DIRECTAMENTE en el formulario de Stripe",
    purpose: "Procesar tu suscripción mensual o anual",
    legalBasis: "Necesario para ejecutar el contrato de suscripción",
    retention:
      "Conservados por Stripe según sus políticas; NOSOTROS NUNCA los vemos ni almacenamos",
    sharedWith: "Stripe (procesador PCI-DSS Level 1) — único receptor",
  },
  {
    category: "Imágenes",
    data: "Fotos de tickets/facturas de proveedor",
    source: "Subidas por ti voluntariamente al usar la función de IA",
    purpose: "Extraer productos, cantidades y costos mediante IA",
    legalBasis: "Consentimiento explícito al subir la imagen",
    retention:
      "EFÍMERO. Procesado en memoria y descartado tras la extracción. No almacenamos copias.",
    sharedWith:
      "Anthropic (Claude API). NO se usan para entrenar modelos. NO se almacenan permanentemente.",
  },
  {
    category: "Técnicos / red",
    data: "Dirección IP, User-Agent, sistema operativo, navegador, zona horaria",
    source: "Recopilado automáticamente al conectarte",
    purpose: "Seguridad (detección de fraude), soporte técnico, logs",
    legalBasis: "Interés legítimo en proteger el Servicio",
    retention: "90 días, luego purga automática",
    sharedWith: "Supabase, Vercel (logs del servidor)",
  },
  {
    category: "Uso del Servicio",
    data: "Acciones realizadas (crear orden, mover inventario, etc.), timestamps, IDs de referencia",
    source: "Generado automáticamente al usar la app",
    purpose:
      "Auditoría interna, resolución de disputas dentro de tu equipo, soporte",
    legalBasis: "Interés legítimo en auditoría y soporte",
    retention: "90 días detallados; agregados anónimos hasta 12 meses",
    sharedWith: "Supabase (almacenamiento exclusivo)",
  },
  {
    category: "Comunicaciones",
    data: "Magic links, recuperación de contraseña, recibos, alertas",
    source: "Generadas automáticamente por el Servicio",
    purpose: "Notificaciones esenciales de tu cuenta",
    legalBasis: "Necesario para la prestación del Servicio",
    retention: "90 días en logs de envío",
    sharedWith: "Resend (envío de correo)",
  },
]

const NOT_COLLECTED = [
  "Ubicación GPS / coordenadas geográficas",
  "Lista de contactos del dispositivo",
  "Grabaciones de audio o acceso al micrófono",
  "Acceso a la galería de fotos sin tu acción explícita",
  "Datos biométricos (huella, rostro, voz)",
  "Datos de redes sociales o relaciones",
  "Historial de navegación fuera de restoki.mx",
  "Datos de salud",
  "Origen racial o étnico, preferencias políticas, religiosas o sexuales",
  "Información de tarjetas almacenadas (las maneja Stripe directamente)",
]

export default function AvisoDePrivacidadPage() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-16 md:px-6 md:py-24">
      <div className="mb-10 flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight md:text-4xl">
          Aviso de Privacidad Integral
        </h1>
        <p className="text-sm text-muted-foreground">
          Última actualización: {LAST_UPDATED}
        </p>
        <p className="text-sm text-muted-foreground">
          Conforme a los Arts. 15 y 16 de la <strong>Ley Federal de
          Protección de Datos Personales en Posesión de los Particulares
          (LFPDPPP)</strong> de México. Para una versión más conversacional
          ve a nuestra{" "}
          <Link href="/privacidad" className="text-primary hover:underline">
            Política de Privacidad
          </Link>
          .
        </p>
      </div>

      <div className="prose prose-sm max-w-none text-foreground prose-headings:text-foreground prose-headings:font-semibold prose-h2:mt-10 prose-h2:text-xl prose-h3:mt-6 prose-h3:text-base prose-p:leading-relaxed prose-a:text-primary prose-a:no-underline hover:prose-a:underline">
        <h2>1. Identidad y domicilio del responsable</h2>
        <p>
          <strong>Restoki</strong>, operado por <strong>Luis Mora</strong>, con
          domicilio convencional en Hermosillo, Sonora, México, es el
          responsable del tratamiento de tus datos personales. Contacto para
          asuntos de privacidad:{" "}
          <a href="mailto:privacidad@restoki.mx">privacidad@restoki.mx</a>.
        </p>

        <h2>2. Datos personales que tratamos</h2>
        <p>
          La siguiente tabla detalla <strong>cada categoría de dato</strong>{" "}
          que recabamos, con su finalidad, base legitimadora, período de
          conservación y los terceros con quienes se comparte:
        </p>
      </div>

      {/* Tabla de datos */}
      <div className="my-8 overflow-x-auto rounded-xl border bg-card">
        <table className="w-full text-xs">
          <thead className="bg-muted/50">
            <tr className="text-left">
              <th className="px-3 py-2 font-semibold">Categoría</th>
              <th className="px-3 py-2 font-semibold">Datos</th>
              <th className="px-3 py-2 font-semibold">Fuente</th>
              <th className="px-3 py-2 font-semibold">Finalidad</th>
              <th className="px-3 py-2 font-semibold">Base legitimadora</th>
              <th className="px-3 py-2 font-semibold">Retención</th>
              <th className="px-3 py-2 font-semibold">Compartido con</th>
            </tr>
          </thead>
          <tbody>
            {DATA_TABLE.map((row, i) => (
              <tr key={i} className="border-t align-top">
                <td className="px-3 py-3 font-medium">{row.category}</td>
                <td className="px-3 py-3 text-muted-foreground">{row.data}</td>
                <td className="px-3 py-3 text-muted-foreground">{row.source}</td>
                <td className="px-3 py-3 text-muted-foreground">
                  {row.purpose}
                </td>
                <td className="px-3 py-3 text-muted-foreground">
                  {row.legalBasis}
                </td>
                <td className="px-3 py-3 text-muted-foreground">
                  {row.retention}
                </td>
                <td className="px-3 py-3 text-muted-foreground">
                  {row.sharedWith}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="prose prose-sm max-w-none text-foreground prose-headings:text-foreground prose-headings:font-semibold prose-h2:mt-10 prose-h2:text-xl prose-h3:mt-6 prose-h3:text-base prose-p:leading-relaxed prose-a:text-primary prose-a:no-underline hover:prose-a:underline">
        <h2>3. Datos que NO recabamos</h2>
        <p>
          Para que quede totalmente claro lo que NO tratamos en ninguna
          circunstancia:
        </p>
        <ul>
          {NOT_COLLECTED.map((item, i) => (
            <li key={i}>{item}</li>
          ))}
        </ul>

        <h2>4. Datos sensibles</h2>
        <p>
          Restoki <strong>NO trata datos personales sensibles</strong>{" "}
          conforme al Art. 3 fracción VI de la LFPDPPP (origen racial o
          étnico, estado de salud, información genética, creencias religiosas,
          filosóficas o morales, afiliación sindical, opiniones políticas,
          preferencias sexuales). No los necesitamos para operar el Servicio
          y no los pedimos.
        </p>

        <h2>5. Finalidades del tratamiento</h2>

        <h3>5.1 Finalidades primarias (necesarias para el Servicio)</h3>
        <p>
          Estas finalidades son <strong>requeridas</strong> para la prestación
          del Servicio. Si no autorizas, no podemos brindarte el Servicio:
        </p>
        <ul>
          <li>
            Crear, autenticar y administrar tu cuenta y la de los miembros de
            tu organización.
          </li>
          <li>
            Almacenar y procesar los datos operativos de tu negocio
            (inventario, compras, recetas, etc.).
          </li>
          <li>
            Procesar tu suscripción y emitir facturas conforme a la
            legislación fiscal mexicana.
          </li>
          <li>
            Enviar correos transaccionales (autenticación, recuperación de
            contraseña, alertas de stock, recibos).
          </li>
          <li>
            Procesar imágenes de tickets de proveedor con IA cuando lo
            solicitas.
          </li>
          <li>
            Brindar soporte técnico cuando lo solicitas.
          </li>
          <li>
            Detectar y prevenir fraude o uso abusivo del Servicio.
          </li>
          <li>
            Cumplir con obligaciones legales, fiscales y judiciales
            aplicables.
          </li>
        </ul>

        <h3>5.2 Finalidades secundarias (opcionales)</h3>
        <p>
          Puedes oponerte a estas en cualquier momento sin afectar el
          Servicio:
        </p>
        <ul>
          <li>
            Análisis estadístico agregado y anónimo de uso del Servicio para
            mejorarlo.
          </li>
          <li>
            Comunicaciones sobre nuevas funciones o mejoras del Servicio.
          </li>
        </ul>
        <p>
          Si no deseas estas finalidades, escribe a{" "}
          <a href="mailto:privacidad@restoki.mx">privacidad@restoki.mx</a> con
          el asunto &quot;Opt-out finalidades secundarias&quot;.
        </p>

        <h2>6. Transferencias de datos</h2>
        <p>
          Tus datos pueden ser transferidos a los siguientes terceros, en los
          términos del Art. 36 LFPDPPP:
        </p>

        <h3>6.1 Subencargados del tratamiento</h3>
        <p>
          Proveedores que tratan datos en nuestro nombre para que el Servicio
          funcione:
        </p>
        <ul>
          <li>
            <strong>Supabase Inc.</strong> (Estados Unidos) — base de datos y
            autenticación. Acuerdo de procesamiento de datos vigente.{" "}
            <a
              href="https://supabase.com/privacy"
              target="_blank"
              rel="noopener noreferrer"
            >
              Política
            </a>
            .
          </li>
          <li>
            <strong>Vercel Inc.</strong> (Estados Unidos) — hosting y CDN.{" "}
            <a
              href="https://vercel.com/legal/privacy-policy"
              target="_blank"
              rel="noopener noreferrer"
            >
              Política
            </a>
            .
          </li>
          <li>
            <strong>Stripe Inc.</strong> (Estados Unidos) — procesamiento de
            pagos. PCI-DSS Level 1.{" "}
            <a
              href="https://stripe.com/privacy"
              target="_blank"
              rel="noopener noreferrer"
            >
              Política
            </a>
            .
          </li>
          <li>
            <strong>Anthropic PBC</strong> (Estados Unidos) — modelos de IA
            para procesamiento de imágenes de tickets. No usa tus datos para
            entrenamiento.{" "}
            <a
              href="https://www.anthropic.com/legal/privacy"
              target="_blank"
              rel="noopener noreferrer"
            >
              Política
            </a>
            .
          </li>
          <li>
            <strong>Resend Inc.</strong> (Estados Unidos) — envío de correos
            transaccionales.{" "}
            <a
              href="https://resend.com/legal/privacy-policy"
              target="_blank"
              rel="noopener noreferrer"
            >
              Política
            </a>
            .
          </li>
        </ul>

        <h3>6.2 Transferencias adicionales (sin consentimiento expreso, Art. 37 LFPDPPP)</h3>
        <p>Solo cuando sea estrictamente requerido:</p>
        <ul>
          <li>
            <strong>Autoridades competentes</strong> en cumplimiento de
            requerimientos legales debidamente fundados y motivados.
          </li>
          <li>
            <strong>SAT (Servicio de Administración Tributaria)</strong> para
            facturación electrónica si emites CFDI a través de Stripe.
          </li>
          <li>
            <strong>Sucesores o adquirentes</strong> en caso de fusión, venta
            o reestructuración corporativa de Restoki (con aviso previo a ti).
          </li>
        </ul>

        <h3>6.3 Transferencias internacionales</h3>
        <p>
          Varios de nuestros subencargados tienen infraestructura en{" "}
          <strong>Estados Unidos</strong>. Al usar el Servicio,{" "}
          <strong>autorizas expresamente</strong> que tus datos se transfieran
          a ese país para los fines descritos. Todos nuestros subencargados
          cumplen con marcos de protección reconocidos internacionalmente
          (SOC 2 Type II, ISO 27001, etc.).
        </p>

        <h2>7. Medios para el ejercicio de derechos ARCO</h2>

        <h3>7.1 Derechos que puedes ejercer</h3>
        <ul>
          <li>
            <strong>Acceso</strong> — saber qué datos tuyos tenemos.
          </li>
          <li>
            <strong>Rectificación</strong> — corregir datos inexactos o
            incompletos.
          </li>
          <li>
            <strong>Cancelación</strong> — solicitar eliminación de tus datos.
          </li>
          <li>
            <strong>Oposición</strong> — oponerte a usos específicos.
          </li>
          <li>
            <strong>Revocación del consentimiento</strong> en cualquier
            momento.
          </li>
          <li>
            <strong>Portabilidad</strong> — recibir tus datos en formato
            estructurado y portable (CSV).
          </li>
        </ul>

        <h3>7.2 Procedimiento</h3>
        <ol>
          <li>
            Envía un correo a{" "}
            <a href="mailto:privacidad@restoki.mx">privacidad@restoki.mx</a>{" "}
            desde la cuenta de correo registrada en Restoki.
          </li>
          <li>
            Incluye en el asunto: &quot;Solicitud ARCO -{" "}
            [Acceso/Rectificación/Cancelación/Oposición/Revocación/Portabilidad]&quot;.
          </li>
          <li>
            En el cuerpo, indica claramente:
            <ul>
              <li>Tu nombre completo y correo de la cuenta</li>
              <li>Cuál derecho quieres ejercer</li>
              <li>
                Si es rectificación: qué dato corregir y cuál es el correcto
              </li>
              <li>Cualquier otra información relevante</li>
            </ul>
          </li>
          <li>
            Para verificar tu identidad podemos pedirte: el correo de
            registro, fecha aproximada de creación de la cuenta, o
            información comercial específica que solo el titular conozca.
          </li>
          <li>
            <strong>Plazos de respuesta (Arts. 32-35 LFPDPPP):</strong>
            <ul>
              <li>
                Respuesta inicial:{" "}
                <strong>máximo 20 días hábiles</strong> desde la recepción.
              </li>
              <li>
                Ejecución de la solicitud:{" "}
                <strong>máximo 15 días hábiles adicionales</strong> tras la
                respuesta.
              </li>
            </ul>
          </li>
          <li>
            La respuesta es <strong>gratuita</strong>. Si solicitas la misma
            información en menos de 12 meses, podemos cobrar costos de envío,
            reproducción o certificación.
          </li>
        </ol>

        <h3>7.3 Si no estás satisfecho</h3>
        <p>
          Puedes acudir al{" "}
          <a
            href="https://home.inai.org.mx/"
            target="_blank"
            rel="noopener noreferrer"
          >
            <strong>
              Instituto Nacional de Transparencia, Acceso a la Información y
              Protección de Datos Personales (INAI)
            </strong>
          </a>{" "}
          para presentar una denuncia o solicitud de protección de derechos.
        </p>

        <h2>8. Cookies y tecnologías de rastreo</h2>
        <p>Restoki utiliza únicamente cookies estrictamente necesarias:</p>
        <ul>
          <li>
            <strong>Cookie de sesión:</strong> mantiene tu autenticación
            activa entre páginas. Expira al cerrar sesión.
          </li>
          <li>
            <strong>Cookie de preferencias:</strong> guarda tu organización
            seleccionada (si tienes acceso a varias) y temas de UI.
          </li>
          <li>
            <strong>localStorage:</strong> guarda valores efímeros de
            interfaz (ej. tu venta bruta mensual del calculador de salud, que
            solo vive en tu navegador).
          </li>
        </ul>
        <p>
          <strong>
            NO usamos cookies de tracking publicitario, pixels de seguimiento,
            cookies third-party, ni fingerprinting de ningún tipo.
          </strong>{" "}
          Tu actividad en Restoki no se rastrea con fines de marketing.
        </p>

        <h2>9. Medidas de seguridad</h2>
        <p>
          Implementamos las siguientes medidas técnicas y organizativas para
          proteger tus datos:
        </p>
        <ul>
          <li>
            <strong>Cifrado en tránsito:</strong> HTTPS / TLS 1.3 obligatorio
            en toda comunicación.
          </li>
          <li>
            <strong>Cifrado en reposo:</strong> AES-256 a nivel de
            almacenamiento.
          </li>
          <li>
            <strong>Hash de contraseñas:</strong> bcrypt cost factor 10+.
          </li>
          <li>
            <strong>Aislamiento de tenants:</strong> Row-Level Security en
            Postgres garantiza que ningún cliente puede acceder a datos de
            otro.
          </li>
          <li>
            <strong>Backups:</strong> diarios, cifrados, retenidos 30 días.
          </li>
          <li>
            <strong>Auditoría:</strong> logs de acceso y cambios críticos.
          </li>
          <li>
            <strong>Control de acceso:</strong> permisos granulares por rol y
            sucursal.
          </li>
          <li>
            <strong>Secretos:</strong> API keys y credenciales en variables
            de entorno cifradas, nunca en código fuente.
          </li>
          <li>
            <strong>Notificación de incidentes:</strong> si detectamos una
            brecha que afecte tus datos, te notificaremos por correo en
            máximo <strong>72 horas</strong> conforme a mejores prácticas
            internacionales.
          </li>
        </ul>

        <h2>10. Cambios al Aviso de Privacidad</h2>
        <p>
          Cualquier modificación a este Aviso de Privacidad será notificada
          por:
        </p>
        <ul>
          <li>
            <strong>Correo electrónico</strong> a la dirección registrada en
            tu cuenta, con al menos <strong>30 días</strong> de anticipación
            a la entrada en vigor de cambios materiales.
          </li>
          <li>
            <strong>Aviso visible</strong> en esta misma URL con la fecha de
            última actualización al inicio del documento.
          </li>
        </ul>
        <p>
          Si no estás de acuerdo con las modificaciones, puedes cancelar tu
          cuenta antes de su entrada en vigor y solicitar la cancelación de
          tus datos.
        </p>

        <h2>11. Contacto del responsable</h2>
        <ul>
          <li>
            <strong>Correo de privacidad:</strong>{" "}
            <a href="mailto:privacidad@restoki.mx">privacidad@restoki.mx</a>
          </li>
          <li>
            <strong>Soporte general:</strong>{" "}
            <a href="mailto:hola@restoki.mx">hola@restoki.mx</a>
          </li>
          <li>
            <strong>Sitio web:</strong>{" "}
            <a href="https://restoki.mx">restoki.mx</a>
          </li>
          <li>
            <strong>Domicilio convencional:</strong> Hermosillo, Sonora,
            México
          </li>
        </ul>

        <p className="mt-12 text-xs text-muted-foreground">
          Este Aviso de Privacidad Integral se publica conforme a los Arts.
          15 y 16 de la Ley Federal de Protección de Datos Personales en
          Posesión de los Particulares de México. Para consultas o
          aclaraciones, contáctanos por las vías indicadas.
        </p>
      </div>
    </div>
  )
}
