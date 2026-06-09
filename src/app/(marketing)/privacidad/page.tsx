import Link from "next/link"

export const metadata = {
  title: "Política de Privacidad",
  description:
    "Cómo Restoki recopila, usa, protege y respeta tus datos. Aviso de privacidad conforme a la LFPDPPP (México) y principios GDPR.",
}

const LAST_UPDATED = "25 de mayo de 2026"

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
        <p className="text-sm text-muted-foreground">
          ¿Buscas el detalle técnico de qué datos recabamos y cuánto los
          conservamos? Ve a nuestro{" "}
          <Link href="/aviso-de-privacidad" className="text-primary hover:underline">
            Aviso de Privacidad Integral con tabla de datos
          </Link>
          .
        </p>
      </div>

      <div className="prose prose-sm max-w-none text-foreground prose-headings:text-foreground prose-headings:font-semibold prose-h2:mt-10 prose-h2:text-xl prose-h3:mt-6 prose-h3:text-base prose-p:leading-relaxed prose-a:text-primary prose-a:no-underline hover:prose-a:underline">
        <h2>0. Resumen rápido</h2>
        <ul>
          <li>
            <strong>Quiénes somos:</strong> Restoki, operado por Luis Mora,
            Hermosillo, Sonora, México.
          </li>
          <li>
            <strong>Qué datos recabamos:</strong> los necesarios para
            funcionar (correo, contraseña cifrada, datos de tu negocio).
            Detalle completo en nuestro{" "}
            <Link href="/aviso-de-privacidad">Aviso de Privacidad Integral</Link>.
          </li>
          <li>
            <strong>Datos que NO recabamos:</strong> ubicación GPS, contactos,
            micrófono, datos biométricos, redes sociales, fotos sin tu acción
            explícita.
          </li>
          <li>
            <strong>Para qué:</strong> operar el servicio, procesar pagos,
            cumplir obligaciones legales. NUNCA para publicidad ni venta a
            terceros.
          </li>
          <li>
            <strong>Con quién compartimos:</strong> solo proveedores
            estrictamente necesarios (Supabase, Vercel, Stripe, Anthropic,
            Resend). Todos cifrados.
          </li>
          <li>
            <strong>Tus derechos:</strong> acceder, rectificar, cancelar,
            oponerte, exportar tus datos en cualquier momento. Escribe a{" "}
            <a href="mailto:privacidad@restoki.mx">privacidad@restoki.mx</a>.
          </li>
        </ul>

        <h2>1. Identidad del responsable</h2>
        <p>
          <strong>Restoki</strong> (en adelante &quot;nosotros&quot;,
          &quot;Restoki&quot; o &quot;el Servicio&quot;) es operado por{" "}
          <strong>Luis Mora</strong>, con domicilio convencional en
          Hermosillo, Sonora, México. Restoki es el responsable del tratamiento
          de tus datos personales conforme a la <strong>Ley Federal de
          Protección de Datos Personales en Posesión de los Particulares
          (LFPDPPP)</strong> de México y, donde aplique, conforme a los
          principios del <strong>Reglamento General de Protección de Datos
          (GDPR)</strong> de la Unión Europea.
        </p>
        <p>
          Para cualquier asunto relacionado con tu privacidad puedes
          contactarnos en{" "}
          <a href="mailto:privacidad@restoki.mx">privacidad@restoki.mx</a>.
        </p>

        <h2>2. Categorías de datos que recabamos</h2>

        <h3>2.1 Datos de identificación y contacto</h3>
        <ul>
          <li>
            <strong>Correo electrónico</strong> (obligatorio para crear
            cuenta).
          </li>
          <li>
            <strong>Nombre</strong> (opcional, lo capturas en tu perfil).
          </li>
          <li>
            <strong>Teléfono de notificaciones</strong> (opcional, para enviar
            recordatorios por WhatsApp si lo configuras).
          </li>
        </ul>

        <h3>2.2 Credenciales de acceso</h3>
        <ul>
          <li>
            <strong>Contraseña:</strong> almacenada únicamente como hash{" "}
            <strong>bcrypt con costo 10+</strong> en Supabase Auth.{" "}
            <strong>Nunca</strong> guardamos tu contraseña en texto plano. Ni
            nosotros, ni nuestros empleados, ni nuestros proveedores pueden
            leerla.
          </li>
          <li>
            <strong>Tokens de sesión:</strong> cookies cifradas que mantienen
            tu login activo. Expiran al cerrar sesión o tras 30 días sin uso.
          </li>
        </ul>

        <h3>2.3 Datos del negocio</h3>
        <ul>
          <li>
            Nombre de tu restaurante o cadena, RFC y domicilio fiscal (todos
            opcionales salvo el nombre).
          </li>
          <li>
            Sucursales, productos, proveedores, inventario, órdenes de compra,
            transferencias, recetas, movimientos. Esta es la información
            operativa que tú capturas para operar Restoki.
          </li>
        </ul>

        <h3>2.4 Imágenes (fotos de tickets)</h3>
        <ul>
          <li>
            Cuando subes la foto de un ticket de proveedor para que la IA lo
            lea, esa imagen se envía a Anthropic (proveedor del modelo Claude)
            para procesamiento.
          </li>
          <li>
            La imagen <strong>NO se almacena permanentemente</strong> en
            nuestros servidores ni en los de Anthropic. Se procesa en memoria,
            se extrae el texto, y se descarta.
          </li>
          <li>
            Anthropic <strong>NO entrena sus modelos con tus imágenes</strong>{" "}
            (ver{" "}
            <a
              href="https://www.anthropic.com/legal/privacy"
              target="_blank"
              rel="noopener noreferrer"
            >
              su política de privacidad
            </a>
            ).
          </li>
        </ul>

        <h3>2.5 Datos de pago</h3>
        <ul>
          <li>
            <strong>NO almacenamos tu tarjeta de crédito ni CVV.</strong> Toda
            la información de pago es capturada y procesada directamente por{" "}
            <a href="https://stripe.com" target="_blank" rel="noopener noreferrer">
              Stripe
            </a>{" "}
            (PCI-DSS Level 1, el estándar más alto de seguridad de pagos).
          </li>
          <li>
            De Stripe solo recibimos un identificador anónimo de tu cliente
            (stripe_customer_id) y el estado de tu suscripción.
          </li>
        </ul>

        <h3>2.6 Datos técnicos y de uso</h3>
        <ul>
          <li>
            <strong>Dirección IP</strong> y datos básicos del navegador
            (User-Agent, idioma, zona horaria) — necesarios para servir el
            sitio y detectar abuso.
          </li>
          <li>
            <strong>Logs de actividad:</strong> registros de las acciones que
            realizas (crear orden, mover inventario, etc.) para auditoría,
            soporte y resolución de disputas. Conservados por máximo 90 días.
          </li>
          <li>
            <strong>Cookies:</strong> de sesión únicamente (mantener login).
            NO usamos cookies de tracking publicitario ni third-party.
          </li>
        </ul>

        <h3>2.7 Datos que NO recabamos</h3>
        <p>Para que quede claro, Restoki <strong>NO</strong>:</p>
        <ul>
          <li>Accede a tu ubicación GPS</li>
          <li>Accede a tu lista de contactos</li>
          <li>Usa tu micrófono</li>
          <li>Recopila datos biométricos</li>
          <li>Lee tu galería de fotos sin acción explícita tuya</li>
          <li>Rastrea tu navegación fuera de restoki.mx</li>
          <li>Comparte datos con redes sociales ni anunciantes</li>
        </ul>

        <h2>3. Cómo usamos tus datos (finalidades)</h2>

        <h3>3.1 Finalidades primarias (necesarias para el servicio)</h3>
        <ul>
          <li>Autenticarte y mantenerte logueado de manera segura.</li>
          <li>Mostrar tu inventario, compras, recetas, etc.</li>
          <li>Procesar tu suscripción y enviarte facturas/recibos.</li>
          <li>Enviar emails transaccionales (magic links, recuperación de contraseña, alertas críticas).</li>
          <li>Procesar imágenes de tickets con IA (cuando tú lo activas).</li>
          <li>Brindarte soporte técnico cuando lo solicitas.</li>
          <li>Detectar y prevenir fraude o uso abusivo.</li>
          <li>Cumplir obligaciones legales y fiscales aplicables en México.</li>
        </ul>

        <h3>3.2 Finalidades secundarias</h3>
        <ul>
          <li>
            <strong>Analítica anónima:</strong> patrones de uso agregados
            (cuántos usuarios usan X feature) para priorizar mejoras.{" "}
            <strong>Nunca</strong> a nivel individual identificable.
          </li>
          <li>
            <strong>Comunicaciones de producto:</strong> avisos de nuevas
            funciones o cambios importantes. Puedes opt-out en cualquier
            momento.
          </li>
        </ul>

        <h3>3.3 Lo que NO hacemos con tus datos</h3>
        <p>
          Te lo decimos directo: <strong>NUNCA</strong>:
        </p>
        <ul>
          <li>Vendemos tus datos a terceros</li>
          <li>Compartimos tu información con anunciantes o data brokers</li>
          <li>Usamos tus datos para entrenar modelos de IA</li>
          <li>Cedemos información a empresas hermanas sin tu consentimiento</li>
          <li>Espiamos tu inventario para inteligencia competitiva</li>
        </ul>

        <h2>4. Terceros (subencargados del tratamiento)</h2>
        <p>
          Solo compartimos datos con proveedores estrictamente necesarios para
          operar el servicio. Cada uno tiene su propio acuerdo de
          confidencialidad y está obligado a usar tus datos solo para los
          fines que le encargamos.
        </p>
        <ul>
          <li>
            <strong>
              <a href="https://supabase.com" target="_blank" rel="noopener noreferrer">
                Supabase
              </a>
              :
            </strong>{" "}
            base de datos Postgres y servicio de autenticación. Datos
            hospedados en infraestructura de AWS (Estados Unidos). Aislamiento
            por Row-Level Security a nivel de base de datos.
          </li>
          <li>
            <strong>
              <a href="https://vercel.com" target="_blank" rel="noopener noreferrer">
                Vercel
              </a>
              :
            </strong>{" "}
            hosting del frontend y procesamiento de peticiones del servidor.
            Infraestructura en Estados Unidos.
          </li>
          <li>
            <strong>
              <a href="https://stripe.com" target="_blank" rel="noopener noreferrer">
                Stripe
              </a>
              :
            </strong>{" "}
            procesamiento de pagos. PCI-DSS Level 1. Solo recibe correo y
            datos de tarjeta directamente de ti — nosotros nunca vemos esos
            datos.
          </li>
          <li>
            <strong>
              <a
                href="https://www.anthropic.com"
                target="_blank"
                rel="noopener noreferrer"
              >
                Anthropic
              </a>
              :
            </strong>{" "}
            modelo de IA (Claude) para extraer información de tickets. NO
            entrena modelos con tus datos. Procesamiento efímero (no
            almacenamiento permanente).
          </li>
          <li>
            <strong>
              <a href="https://resend.com" target="_blank" rel="noopener noreferrer">
                Resend
              </a>
              :
            </strong>{" "}
            envío de correos transaccionales (autenticación, recuperación,
            invitaciones). Solo recibe el correo destinatario y el contenido
            del email.
          </li>
        </ul>
        <p>
          La lista completa con finalidades y datos compartidos por cada
          proveedor está en nuestro{" "}
          <Link href="/aviso-de-privacidad">Aviso de Privacidad Integral</Link>.
        </p>

        <h2>5. Transferencias internacionales</h2>
        <p>
          Algunos de nuestros proveedores (Supabase, Vercel, Stripe, Anthropic,
          Resend) tienen infraestructura en Estados Unidos. Al usar Restoki,
          autorizas que tus datos se transfieran a estos países para los fines
          descritos. Todos cumplen con marcos de protección reconocidos (SOC 2,
          ISO 27001, Privacy Shield equivalente, etc.).
        </p>
        <p>
          Si esto es un impedimento para ti, escríbenos a{" "}
          <a href="mailto:privacidad@restoki.mx">privacidad@restoki.mx</a> y
          evaluamos alternativas (hosting en México disponible para clientes
          Enterprise).
        </p>

        <h2>6. Seguridad</h2>
        <p>
          Implementamos medidas técnicas y organizativas razonables para
          proteger tus datos:
        </p>
        <ul>
          <li>
            <strong>Cifrado en tránsito:</strong> HTTPS con TLS 1.3 en toda
            comunicación entre tu navegador/app y nuestros servidores.
          </li>
          <li>
            <strong>Cifrado en reposo:</strong> base de datos cifrada en disco
            (AES-256). Backups cifrados.
          </li>
          <li>
            <strong>Contraseñas:</strong> bcrypt con cost factor 10+. Resistente
            a ataques de fuerza bruta.
          </li>
          <li>
            <strong>API keys y secretos:</strong> almacenados en variables de
            entorno cifradas, nunca en código fuente ni accesibles a terceros.
          </li>
          <li>
            <strong>Aislamiento de tenants:</strong> cada organización tiene
            sus datos completamente aislados vía Row-Level Security a nivel de
            base de datos. Es físicamente imposible que un cliente acceda a
            datos de otro.
          </li>
          <li>
            <strong>Permisos granulares:</strong> dentro de tu organización,
            controlas qué puede hacer cada usuario y a qué sucursal tiene
            acceso.
          </li>
          <li>
            <strong>Backups automáticos:</strong> diarios, retenidos 30 días,
            cifrados. Probados periódicamente.
          </li>
          <li>
            <strong>Monitoreo:</strong> logs de seguridad y detección de
            anomalías de acceso.
          </li>
          <li>
            <strong>Notificación de incidentes:</strong> si detectamos una
            brecha que afecte tus datos, te avisaremos por correo en máximo
            72 horas, conforme a mejores prácticas internacionales.
          </li>
        </ul>

        <h2>7. Tiempo de conservación</h2>
        <p>
          Conservamos tus datos solo el tiempo necesario para los fines
          descritos:
        </p>
        <ul>
          <li>
            <strong>Cuenta activa:</strong> mientras mantengas tu suscripción
            (de prueba o pagada).
          </li>
          <li>
            <strong>Después de cancelar:</strong> 30 días de gracia por si
            quieres reactivar. Después se eliminan permanentemente.
          </li>
          <li>
            <strong>Datos fiscales (facturas, RFC):</strong> conservados por
            5 años conforme al Código Fiscal de la Federación.
          </li>
          <li>
            <strong>Logs técnicos:</strong> 90 días, después se purgan.
          </li>
          <li>
            <strong>Imágenes de tickets:</strong> no se conservan — procesadas
            y descartadas inmediatamente.
          </li>
          <li>
            <strong>Backups:</strong> 30 días rotación.
          </li>
        </ul>
        <p>
          Ve el desglose completo por categoría en nuestro{" "}
          <Link href="/aviso-de-privacidad">Aviso de Privacidad Integral</Link>.
        </p>

        <h2>8. Tus derechos (ARCO + GDPR)</h2>
        <p>
          Conforme a la LFPDPPP de México (y donde aplique, GDPR), tienes
          derecho a:
        </p>
        <ul>
          <li>
            <strong>Acceder</strong> a tus datos personales que tenemos sobre
            ti.
          </li>
          <li>
            <strong>Rectificar</strong> datos inexactos o incompletos.
          </li>
          <li>
            <strong>Cancelar</strong> el tratamiento (eliminar tu cuenta y
            datos).
          </li>
          <li>
            <strong>Oponerte</strong> a usos específicos (ej. comunicaciones
            de producto).
          </li>
          <li>
            <strong>Portabilidad:</strong> exportar tus datos en formato CSV
            (disponible directamente desde la app, sin trámite).
          </li>
          <li>
            <strong>Revocar consentimiento</strong> en cualquier momento.
          </li>
        </ul>

        <h3>Cómo ejercer estos derechos</h3>
        <ol>
          <li>
            Escribe a{" "}
            <a href="mailto:privacidad@restoki.mx">privacidad@restoki.mx</a>{" "}
            desde el correo de tu cuenta.
          </li>
          <li>Especifica cuál derecho quieres ejercer.</li>
          <li>
            Respondemos en máximo <strong>20 días hábiles</strong> y ejecutamos
            la acción en máximo <strong>15 días hábiles adicionales</strong>{" "}
            (conforme a la LFPDPPP).
          </li>
          <li>
            Si no estás satisfecho, puedes acudir al{" "}
            <a
              href="https://home.inai.org.mx/"
              target="_blank"
              rel="noopener noreferrer"
            >
              INAI
            </a>{" "}
            (Instituto Nacional de Transparencia, Acceso a la Información y
            Protección de Datos Personales).
          </li>
        </ol>

        <h2>9. Menores de edad</h2>
        <p>
          Restoki está dirigido exclusivamente a personas{" "}
          <strong>mayores de 18 años</strong> que actúan en representación
          legal de un negocio. No recopilamos a sabiendas datos de menores. Si
          descubrimos que un menor creó cuenta sin autorización paterna,
          eliminamos esa cuenta inmediatamente.
        </p>

        <h2>10. Cookies y tecnologías similares</h2>
        <p>
          Usamos cookies <strong>estrictamente necesarias</strong> para el
          funcionamiento del servicio:
        </p>
        <ul>
          <li>
            <strong>Cookie de sesión:</strong> mantiene tu login activo.
            Expira al logout o tras 30 días.
          </li>
          <li>
            <strong>Cookie de preferencias:</strong> guarda tu organización
            seleccionada y preferencias de UI.
          </li>
          <li>
            <strong>localStorage:</strong> datos efímeros (ej. tu venta bruta
            mensual capturada en el indicador de salud, que solo vive en tu
            navegador para tu comodidad).
          </li>
        </ul>
        <p>
          <strong>NO usamos:</strong> cookies publicitarias, pixels de
          tracking, cookies de terceros (third-party cookies), ni
          fingerprinting.
        </p>

        <h2>11. Cambios a esta política</h2>
        <p>
          Si modificamos esta política sustancialmente, te avisaremos por
          correo con al menos <strong>30 días de anticipación</strong>. La
          versión vigente siempre está en esta URL con fecha de última
          actualización visible arriba. Para cambios menores (correcciones
          de redacción, links rotos), solo actualizamos la fecha.
        </p>

        <h2>12. Contacto</h2>
        <ul>
          <li>
            <strong>Privacidad y derechos ARCO:</strong>{" "}
            <a href="mailto:privacidad@restoki.mx">privacidad@restoki.mx</a>
          </li>
          <li>
            <strong>Soporte técnico:</strong>{" "}
            <a href="mailto:soporte@restoki.mx">soporte@restoki.mx</a>
          </li>
          <li>
            <strong>General:</strong>{" "}
            <a href="mailto:hola@restoki.mx">hola@restoki.mx</a>
          </li>
          <li>
            <strong>Domicilio convencional:</strong> Hermosillo, Sonora, México
          </li>
        </ul>
      </div>
    </div>
  )
}
