import Link from "next/link"

export const metadata = {
  title: "Términos y Condiciones",
  description:
    "Términos de uso de Restoki: suscripción, cancelación, uso aceptable y limitación de responsabilidad.",
}

const LAST_UPDATED = "13 de mayo de 2026"

export default function TerminosPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-16 md:px-6 md:py-24">
      <div className="mb-10 flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight md:text-4xl">
          Términos y Condiciones
        </h1>
        <p className="text-sm text-muted-foreground">
          Última actualización: {LAST_UPDATED}
        </p>
      </div>

      <div className="prose prose-sm max-w-none text-foreground prose-headings:text-foreground prose-headings:font-semibold prose-h2:mt-10 prose-h2:text-xl prose-h3:mt-6 prose-h3:text-base prose-p:leading-relaxed prose-a:text-primary prose-a:no-underline hover:prose-a:underline">
        <p>
          Al crear una cuenta o usar Restoki (en adelante, &quot;<strong>el
          Servicio</strong>&quot;) aceptas estos Términos y Condiciones.
          Restoki es operado por Luis Mora, con domicilio en Hermosillo,
          Sonora, México.
        </p>

        <h2>1. Descripción del Servicio</h2>
        <p>
          Restoki es una plataforma de software como servicio (SaaS) para el
          control de inventario, compras, transferencias entre sucursales,
          recetas y costeo de platillos para restaurantes y cadenas de
          restaurantes. El Servicio se ofrece a través de restoki.mx y
          aplicaciones móviles para iOS y Android.
        </p>

        <h2>2. Cuenta y registro</h2>
        <ul>
          <li>
            Para usar el Servicio debes crear una cuenta con un correo
            electrónico válido y una contraseña.
          </li>
          <li>
            Eres responsable de mantener la confidencialidad de tu
            contraseña y de toda actividad realizada con tu cuenta.
          </li>
          <li>
            Debes ser mayor de 18 años o representar legalmente a un negocio.
          </li>
          <li>
            Eres responsable de la veracidad de la información que
            registres.
          </li>
        </ul>

        <h2>3. Período de prueba y suscripción</h2>
        <h3>3.1 Prueba gratuita</h3>
        <p>
          Restoki ofrece un período de prueba gratuita de{" "}
          <strong>14 días</strong>, sin requerir tarjeta de crédito. Durante
          la prueba tienes acceso a todas las funciones del plan elegido.
        </p>

        <h3>3.2 Planes de suscripción</h3>
        <p>
          Al terminar la prueba, debes contratar uno de nuestros planes
          (Solo, Cadena o Enterprise) para seguir usando las funciones de
          escritura. Sin un plan activo, las funciones de creación,
          modificación y eliminación se bloquean, pero conservas acceso de
          lectura a tus datos.
        </p>

        <h3>3.3 Facturación</h3>
        <ul>
          <li>
            Los precios mostrados en{" "}
            <Link href="/precios">/precios</Link> incluyen IVA.
          </li>
          <li>
            Los cobros se procesan mensual o anualmente, según el plan que
            elijas.
          </li>
          <li>
            El cobro anual ofrece un descuento del 10% sobre 12 cobros
            mensuales.
          </li>
          <li>
            Pagos procesados por <a href="https://stripe.com" target="_blank">
            Stripe</a>. Aceptamos tarjetas de crédito y débito Visa,
            Mastercard y American Express.
          </li>
          <li>
            Si tu pago falla, el Servicio entra en período de gracia de 7
            días. Después, las funciones de escritura se suspenden hasta
            que actualices el método de pago.
          </li>
        </ul>

        <h3>3.4 Cancelación y reembolsos</h3>
        <ul>
          <li>
            Puedes cancelar tu suscripción en cualquier momento desde{" "}
            <Link href="/configuracion?tab=billing">
              Configuración → Billing
            </Link>
            .
          </li>
          <li>
            La cancelación toma efecto al final del período facturado. NO
            ofrecemos reembolsos prorrateados por el tiempo no usado, salvo
            obligación legal o decisión nuestra a discreción.
          </li>
          <li>
            Conservamos tu cuenta y datos por 30 días después de la
            cancelación. Si reactivas en ese plazo, todo queda como estaba.
          </li>
        </ul>

        <h3>3.5 Cambios de precio</h3>
        <p>
          Podemos modificar los precios con al menos 30 días de aviso por
          email. Los nuevos precios aplican en tu próxima renovación, no
          retroactivamente.
        </p>

        <h2>4. Uso aceptable</h2>
        <p>Al usar Restoki te comprometes a:</p>
        <ul>
          <li>
            <strong>NO</strong> usar el Servicio para actividades ilegales
            o que infrinjan derechos de terceros.
          </li>
          <li>
            <strong>NO</strong> intentar acceder a datos de otras
            organizaciones, hacer ingeniería inversa del sistema o explotar
            vulnerabilidades.
          </li>
          <li>
            <strong>NO</strong> revender, sublicenciar o redistribuir el
            Servicio sin autorización por escrito.
          </li>
          <li>
            <strong>NO</strong> usar la función de IA de tickets para
            procesar imágenes que no sean documentos comerciales legítimos
            (facturas, remisiones, tickets de compra).
          </li>
          <li>
            <strong>NO</strong> automatizar o scriptar el uso del Servicio
            de manera que genere carga desproporcionada en nuestra
            infraestructura.
          </li>
        </ul>
        <p>
          Nos reservamos el derecho de suspender o cancelar cuentas que
          violen estos términos, con o sin reembolso según corresponda.
        </p>

        <h2>5. Propiedad de los datos</h2>
        <p>
          <strong>Tus datos son tuyos.</strong> Restoki solo almacena y
          procesa la información que tú o tu equipo introducen, para
          prestarte el servicio. No reclamamos propiedad sobre tu
          inventario, recetas, productos, proveedores ni ninguna otra
          información operativa.
        </p>
        <p>
          Puedes exportar todos tus datos en formato CSV desde la app en
          cualquier momento.
        </p>

        <h2>6. Propiedad intelectual</h2>
        <p>
          El software de Restoki, su diseño, marca, código fuente y
          documentación son propiedad de Luis Mora. Te otorgamos una
          licencia limitada, no exclusiva, no transferible y revocable para
          usar el Servicio durante la vigencia de tu suscripción.
        </p>

        <h2>7. Disponibilidad y SLA</h2>
        <p>
          Nos esforzamos por mantener el Servicio disponible 24/7, pero no
          garantizamos disponibilidad ininterrumpida. Mantenimientos
          programados se notifican con al menos 48 horas de anticipación.
        </p>
        <p>
          El plan Enterprise incluye un SLA de respuesta de 4 horas hábiles
          para incidentes críticos. Los planes Solo y Cadena se atienden
          por orden de llegada vía email.
        </p>

        <h2>8. Función de Inteligencia Artificial</h2>
        <p>
          La función de &quot;Foto del ticket → orden de compra&quot; usa
          modelos de IA de Anthropic (Claude). Esta función:
        </p>
        <ul>
          <li>
            Está disponible solo en planes Cadena y Enterprise.
          </li>
          <li>
            Puede cometer errores. Eres responsable de revisar y confirmar
            los datos extraídos antes de crear órdenes en tu inventario.
          </li>
          <li>
            No reemplaza el criterio del operador. Restoki no se hace
            responsable de errores de captura derivados de aceptar
            ciegamente las sugerencias de la IA.
          </li>
        </ul>

        <h2>9. Limitación de responsabilidad</h2>
        <p>
          En la medida máxima permitida por la ley, Restoki y sus
          operadores NO se hacen responsables por:
        </p>
        <ul>
          <li>
            Pérdidas indirectas, incidentales, especiales o consecuentes
            (incluyendo lucro cesante, pérdida de oportunidad de negocio,
            pérdida de datos por causas ajenas a nosotros).
          </li>
          <li>
            Decisiones de negocio que tomes basado en información del
            Servicio (ej. compras, precios de menú).
          </li>
          <li>
            Interrupciones causadas por proveedores terceros (Supabase,
            Vercel, Stripe, Anthropic) cuyas SLAs son ajenas a nosotros.
          </li>
        </ul>
        <p>
          Nuestra responsabilidad máxima en cualquier caso queda limitada
          al monto que hayas pagado por el Servicio en los últimos 12
          meses.
        </p>

        <h2>10. Indemnización</h2>
        <p>
          Te comprometes a indemnizar y mantener libre de responsabilidad
          a Restoki por reclamos de terceros derivados de tu uso indebido
          del Servicio, violación de estos términos o infracción de
          derechos de terceros.
        </p>

        <h2>11. Modificaciones</h2>
        <p>
          Podemos modificar estos términos cuando sea necesario.
          Notificaremos cambios materiales por email con al menos 30 días
          de anticipación. Si continúas usando el Servicio después de la
          fecha de entrada en vigor, aceptas los nuevos términos.
        </p>

        <h2>12. Terminación</h2>
        <p>
          Cualquiera de las partes puede terminar esta relación contractual
          en cualquier momento. Al cancelar tu cuenta:
        </p>
        <ul>
          <li>Pierdes acceso al Servicio al final del período facturado.</li>
          <li>
            Conservas 30 días para reactivar antes de eliminación
            permanente.
          </li>
          <li>
            Puedes exportar tus datos en CSV antes de cancelar.
          </li>
        </ul>

        <h2>13. Legislación aplicable y jurisdicción</h2>
        <p>
          Estos términos se rigen por las leyes de los Estados Unidos
          Mexicanos. Cualquier controversia se resolverá ante los
          tribunales competentes de Hermosillo, Sonora, renunciando
          expresamente a cualquier otra jurisdicción.
        </p>

        <h2>14. Contacto</h2>
        <ul>
          <li>
            Email general:{" "}
            <a href="mailto:hola@restoki.mx">hola@restoki.mx</a>
          </li>
          <li>
            Soporte:{" "}
            <a href="mailto:soporte@restoki.mx">soporte@restoki.mx</a>
          </li>
          <li>
            Privacidad:{" "}
            <a href="mailto:privacidad@restoki.mx">privacidad@restoki.mx</a>
          </li>
          <li>Dirección: Hermosillo, Sonora, México</li>
        </ul>
      </div>
    </div>
  )
}
