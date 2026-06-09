import Link from "next/link"

export const metadata = {
  title: "Términos y Condiciones",
  description:
    "Términos de uso de Restoki: cuenta, suscripción, reglas, propiedad, responsabilidad y resolución de conflictos.",
}

const LAST_UPDATED = "25 de mayo de 2026"

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
        <h2>0. Resumen</h2>
        <p>
          Restoki es un software como servicio para control de inventario en
          restaurantes. Al crear una cuenta aceptas estos términos. En
          resumen: úsala responsablemente, paga tu suscripción cuando aplique,
          tus datos son tuyos, podemos suspender cuentas que abusen del
          servicio, y cualquier disputa se resuelve en tribunales de Sonora,
          México.
        </p>

        <h2>1. Definiciones</h2>
        <ul>
          <li>
            <strong>&quot;Restoki&quot; / &quot;nosotros&quot; / &quot;Servicio&quot;:</strong>{" "}
            la plataforma operada por Luis Mora, con domicilio en Hermosillo,
            Sonora, México.
          </li>
          <li>
            <strong>&quot;Tú&quot; / &quot;Usuario&quot;:</strong> la persona
            física o moral que crea una cuenta y usa el Servicio.
          </li>
          <li>
            <strong>&quot;Organización&quot;:</strong> la entidad de negocio
            (restaurante, cadena) bajo la que operas dentro del Servicio.
          </li>
          <li>
            <strong>&quot;Contenido del Usuario&quot;:</strong> toda la
            información que capturas en el Servicio (inventario, recetas,
            productos, etc.).
          </li>
          <li>
            <strong>&quot;Suscripción&quot;:</strong> el plan de pago recurrente
            (Solo, Cadena o Enterprise) que te da acceso a las funciones del
            Servicio.
          </li>
        </ul>

        <h2>2. Aceptación y elegibilidad</h2>
        <p>Al crear una cuenta y usar el Servicio confirmas que:</p>
        <ul>
          <li>Tienes al menos 18 años de edad.</li>
          <li>
            Tienes capacidad legal para celebrar contratos vinculantes en tu
            país de residencia.
          </li>
          <li>
            Si actúas en representación de una empresa, cuentas con la
            autorización para obligar a esa empresa a estos términos.
          </li>
          <li>
            La información que registras es verdadera, precisa y actualizada.
          </li>
        </ul>
        <p>
          Si no aceptas alguno de estos términos, debes cerrar tu cuenta y
          dejar de usar el Servicio.
        </p>

        <h2>3. Cuenta del Usuario</h2>

        <h3>3.1 Registro</h3>
        <ul>
          <li>
            Para usar el Servicio debes crear una cuenta con un correo
            electrónico válido y una contraseña segura (mínimo 8 caracteres).
          </li>
          <li>
            Solo puedes mantener una (1) cuenta principal por persona/empresa.
            Cuentas duplicadas pueden ser suspendidas.
          </li>
        </ul>

        <h3>3.2 Responsabilidad de tu cuenta</h3>
        <ul>
          <li>
            Eres responsable de mantener la confidencialidad de tu
            contraseña.
          </li>
          <li>
            Eres responsable de toda actividad que ocurra bajo tu cuenta,
            incluso si fue alguien más quien actuó.
          </li>
          <li>
            Debes notificarnos inmediatamente a{" "}
            <a href="mailto:soporte@restoki.mx">soporte@restoki.mx</a> si
            sospechas que tu cuenta fue comprometida.
          </li>
          <li>
            No compartas tus credenciales con personas externas a tu
            organización. Si necesitas que alguien más opere, invítalo como
            miembro con permisos adecuados.
          </li>
        </ul>

        <h2>4. Período de prueba y suscripción</h2>

        <h3>4.1 Prueba gratuita</h3>
        <ul>
          <li>
            Ofrecemos <strong>14 días de prueba gratuita</strong> a partir de
            la creación de tu cuenta, sin requerir tarjeta de crédito.
          </li>
          <li>
            Durante la prueba tienes acceso a todas las funciones del plan que
            elijas más adelante.
          </li>
          <li>
            Al terminar la prueba, las funciones de escritura (crear órdenes,
            mover inventario, etc.) se bloquean hasta que contrates un plan.
            Conservas acceso de solo lectura a tu información.
          </li>
        </ul>

        <h3>4.2 Planes y precios</h3>
        <ul>
          <li>
            Los planes vigentes y sus precios están en{" "}
            <Link href="/precios">restoki.mx/precios</Link>.
          </li>
          <li>
            Los precios mostrados <strong>incluyen IVA</strong> al 16%.
          </li>
          <li>
            Si pagas anual, recibes 10% de descuento sobre 12 cobros
            mensuales.
          </li>
          <li>
            Puedes cambiar de plan (upgrade o downgrade) en cualquier momento
            desde Configuración → Billing. El cobro se prorratea
            automáticamente.
          </li>
        </ul>

        <h3>4.3 Facturación</h3>
        <ul>
          <li>
            El cobro se realiza automáticamente vía{" "}
            <a href="https://stripe.com" target="_blank" rel="noopener noreferrer">
              Stripe
            </a>{" "}
            (procesador de pagos PCI-DSS Level 1).
          </li>
          <li>
            Aceptamos tarjetas Visa, Mastercard y American Express, en
            cualquier divisa convertible a MXN.
          </li>
          <li>
            Recibes factura electrónica (CFDI) si proporcionas tu RFC. La
            puedes descargar desde el portal de Stripe.
          </li>
          <li>
            Si tu pago falla, el Servicio entra en{" "}
            <strong>período de gracia de 7 días</strong>. Si tras ese período
            el pago no se resuelve, las funciones de escritura se suspenden
            hasta que actualices tu método de pago.
          </li>
        </ul>

        <h3>4.4 Cancelación</h3>
        <ul>
          <li>
            Puedes cancelar tu suscripción en cualquier momento desde{" "}
            <Link href="/configuracion?tab=billing">
              Configuración → Billing
            </Link>{" "}
            (o desde restoki.mx si estás en la app móvil).
          </li>
          <li>
            La cancelación toma efecto al{" "}
            <strong>final del período de facturación actual</strong>. Tu
            servicio sigue activo hasta esa fecha.
          </li>
          <li>
            <strong>NO ofrecemos reembolsos prorrateados</strong> por tiempo
            no usado dentro del período facturado, salvo obligación legal o
            decisión nuestra a discreción razonable.
          </li>
          <li>
            Conservamos tu cuenta y datos por 30 días después de la
            cancelación. Si reactivas en ese plazo, todo queda como estaba.
          </li>
        </ul>

        <h3>4.5 Cambios de precio</h3>
        <p>
          Podemos modificar los precios con al menos <strong>30 días de
          aviso por correo</strong>. Los nuevos precios aplican en tu próxima
          renovación, nunca retroactivamente. Si no aceptas el nuevo precio,
          puedes cancelar antes de la siguiente renovación sin penalización.
        </p>

        <h2>5. Uso aceptable</h2>

        <h3>5.1 Reglas — lo que SÍ puedes hacer</h3>
        <ul>
          <li>Usar Restoki para gestionar el inventario de tu negocio.</li>
          <li>Invitar a tu equipo (con permisos) a colaborar.</li>
          <li>Exportar tus datos en CSV cuando quieras.</li>
          <li>
            Usar la función de IA de tickets para procesar facturas
            legítimas de tus proveedores.
          </li>
          <li>
            Recomendar Restoki a otros restauranteros (¡gracias!).
          </li>
        </ul>

        <h3>5.2 Lo que NO puedes hacer</h3>
        <ul>
          <li>
            <strong>Actividades ilegales:</strong> usar el Servicio para
            blanquear dinero, evasión fiscal, contrabando o cualquier otra
            actividad prohibida por la ley.
          </li>
          <li>
            <strong>Suplantación:</strong> hacerte pasar por otra persona,
            empresa o entidad.
          </li>
          <li>
            <strong>Ingeniería inversa:</strong> intentar descompilar,
            decodificar o derivar el código fuente del Servicio.
          </li>
          <li>
            <strong>Acceso no autorizado:</strong> intentar acceder a datos
            de otras organizaciones, explotar vulnerabilidades o eludir
            controles de seguridad.
          </li>
          <li>
            <strong>Scraping / scripting abusivo:</strong> automatizar el
            uso del Servicio de manera que genere carga desproporcionada o
            que extraiga datos masivamente.
          </li>
          <li>
            <strong>Reventa o sub-licenciamiento:</strong> revender, alquilar,
            sublicenciar o redistribuir el Servicio sin nuestra autorización
            por escrito.
          </li>
          <li>
            <strong>Mal uso de la IA:</strong> usar la función de tickets
            para procesar imágenes que no sean documentos comerciales
            legítimos (recibos, facturas, remisiones).
          </li>
          <li>
            <strong>Spam:</strong> usar nuestras herramientas para enviar
            comunicaciones masivas no solicitadas.
          </li>
          <li>
            <strong>Vulnerar propiedad intelectual:</strong> incluir contenido
            que viole derechos de autor, marcas o patentes de terceros.
          </li>
        </ul>
        <p>
          Si violas estas reglas podemos <strong>suspender o cancelar tu
          cuenta inmediatamente</strong>, con o sin reembolso según la
          gravedad del caso, y conservaremos derecho a acciones legales si
          procede.
        </p>

        <h2>6. Propiedad del contenido</h2>

        <h3>6.1 Tus datos son tuyos</h3>
        <ul>
          <li>
            <strong>Toda la información que capturas en Restoki te
            pertenece</strong> — inventario, recetas, productos,
            proveedores, órdenes. No reclamamos ningún derecho de propiedad
            sobre tu Contenido del Usuario.
          </li>
          <li>
            Nos otorgas únicamente una licencia limitada, no exclusiva, para
            almacenar, procesar y mostrar tu Contenido para los fines de
            prestarte el Servicio.
          </li>
          <li>
            Puedes exportar todos tus datos en CSV en cualquier momento, sin
            costo, sin trámite.
          </li>
          <li>
            Si cancelas, conservamos tu Contenido 30 días por si reactivas;
            después lo eliminamos permanentemente (salvo obligaciones
            fiscales).
          </li>
        </ul>

        <h3>6.2 Nuestra propiedad intelectual</h3>
        <ul>
          <li>
            El software, código fuente, diseño, interfaz, marca, logos y
            documentación de Restoki son propiedad de Luis Mora.
          </li>
          <li>
            Te otorgamos una licencia <strong>limitada, no exclusiva, no
            transferible y revocable</strong> para usar el Servicio durante
            la vigencia de tu suscripción.
          </li>
          <li>
            No puedes copiar, modificar, redistribuir ni hacer obras derivadas
            del software sin nuestro permiso escrito.
          </li>
        </ul>

        <h2>7. Función de Inteligencia Artificial</h2>
        <ul>
          <li>
            La función &quot;Foto del ticket → orden de compra&quot; usa
            modelos de IA de Anthropic (Claude). Disponible en planes Cadena
            y Enterprise.
          </li>
          <li>
            <strong>La IA puede cometer errores.</strong> Es tu
            responsabilidad <strong>revisar y confirmar</strong> los datos
            extraídos antes de crear órdenes en tu inventario. No nos hacemos
            responsables de errores de captura derivados de aceptar
            ciegamente las sugerencias de la IA.
          </li>
          <li>
            Las imágenes que subes se envían a Anthropic para procesamiento
            inmediato y no se almacenan permanentemente. Anthropic{" "}
            <strong>NO entrena sus modelos con tus datos</strong>.
          </li>
        </ul>

        <h2>8. Disponibilidad del Servicio</h2>
        <ul>
          <li>
            Nos esforzamos por mantener el Servicio disponible 24/7, pero{" "}
            <strong>NO garantizamos disponibilidad ininterrumpida</strong>.
          </li>
          <li>
            Mantenimientos programados se notifican con al menos{" "}
            <strong>48 horas de anticipación</strong>.
          </li>
          <li>
            El plan <strong>Enterprise</strong> incluye un SLA de respuesta
            de <strong>4 horas hábiles</strong> para incidentes críticos.
            Solo y Cadena se atienden por orden de llegada vía
            <a href="mailto:soporte@restoki.mx"> soporte@restoki.mx</a>.
          </li>
          <li>
            Interrupciones causadas por proveedores terceros (Supabase,
            Vercel, Stripe, Anthropic) están fuera de nuestro control
            directo, pero hacemos seguimiento y comunicamos avances.
          </li>
        </ul>

        <h2>9. Modificaciones al Servicio</h2>
        <ul>
          <li>
            Podemos agregar, modificar o discontinuar funciones del Servicio
            cuando sea necesario para mejorarlo, corregir bugs o por razones
            comerciales.
          </li>
          <li>
            Cambios que reduzcan significativamente la funcionalidad de tu
            plan se notifican con al menos <strong>30 días de
            anticipación</strong>.
          </li>
          <li>
            Si una función crítica para ti es removida, tienes derecho a
            cancelar y recibir reembolso prorrateado del tiempo no usado.
          </li>
        </ul>

        <h2>10. Terminación</h2>

        <h3>10.1 Por tu parte</h3>
        <p>
          Puedes cerrar tu cuenta en cualquier momento desde Configuración o
          escribiendo a{" "}
          <a href="mailto:soporte@restoki.mx">soporte@restoki.mx</a>. Toma
          efecto al final del período facturado.
        </p>

        <h3>10.2 Por nuestra parte</h3>
        <p>
          Podemos suspender o cancelar tu cuenta:
        </p>
        <ul>
          <li>
            <strong>Inmediatamente</strong> si violas estos términos
            (especialmente las reglas de uso aceptable).
          </li>
          <li>
            <strong>Con 30 días de aviso</strong> si descontinuamos el
            Servicio completamente.
          </li>
          <li>
            <strong>Por incumplimiento de pago</strong> tras el período de
            gracia de 7 días.
          </li>
          <li>
            Si nuestra continuidad operativa hace inviable mantener tu cuenta.
          </li>
        </ul>

        <h3>10.3 Efectos de la terminación</h3>
        <ul>
          <li>Pierdes acceso al Servicio al final del período facturado.</li>
          <li>
            Conservas <strong>30 días</strong> para descargar tus datos en
            CSV antes de la eliminación permanente.
          </li>
          <li>
            Las disposiciones sobre propiedad intelectual, limitación de
            responsabilidad e indemnización sobreviven a la terminación.
          </li>
        </ul>

        <h2>11. Qué hacer si algo sale mal</h2>

        <h3>11.1 Problema técnico (bug, error, datos no aparecen)</h3>
        <ol>
          <li>
            Escribe a{" "}
            <a href="mailto:soporte@restoki.mx">soporte@restoki.mx</a>{" "}
            describiendo el problema (qué intentaste hacer, qué pasó, qué
            esperabas).
          </li>
          <li>
            Adjunta captura de pantalla si aplica.
          </li>
          <li>
            Respondemos en máximo <strong>24 horas hábiles</strong> (4 horas
            para Enterprise).
          </li>
        </ol>

        <h3>11.2 Problema de pago / facturación</h3>
        <ol>
          <li>
            Verifica el estado de tu suscripción en Configuración → Billing.
          </li>
          <li>
            Si el problema persiste, escribe a{" "}
            <a href="mailto:soporte@restoki.mx">soporte@restoki.mx</a> con tu
            ID de cuenta y detalle del cargo.
          </li>
          <li>
            Resolvemos disputas de cobro de buena fe. Si fue un cargo erróneo
            de nuestra parte, reembolsamos.
          </li>
        </ol>

        <h3>11.3 Pérdida de datos</h3>
        <ul>
          <li>
            Mantenemos backups diarios. Si pierdes información por bug
            nuestro, restauramos desde el backup más reciente.
          </li>
          <li>
            Si pierdes información por error tuyo (borrado accidental), haz
            la solicitud rápido — podemos restaurar desde backups hasta 30
            días atrás. Pasado ese tiempo no podemos recuperarlo.
          </li>
        </ul>

        <h3>11.4 Disputa más seria</h3>
        <ol>
          <li>
            <strong>Negociación de buena fe:</strong> contáctanos primero a{" "}
            <a href="mailto:hola@restoki.mx">hola@restoki.mx</a>. Intentamos
            resolver directamente. Suele funcionar.
          </li>
          <li>
            <strong>Mediación:</strong> si no se resuelve en 30 días, podemos
            ir a mediación con un mediador independiente.
          </li>
          <li>
            <strong>Tribunales:</strong> si la mediación falla, jurisdicción
            exclusiva en tribunales de Hermosillo, Sonora, México.
          </li>
        </ol>

        <h2>12. Limitación de responsabilidad</h2>
        <p>
          En la medida máxima permitida por la ley, Restoki y sus operadores{" "}
          <strong>NO se hacen responsables</strong> por:
        </p>
        <ul>
          <li>
            Pérdidas indirectas, incidentales, especiales o consecuentes
            (incluyendo lucro cesante, pérdida de oportunidad de negocio,
            pérdida de reputación).
          </li>
          <li>
            Decisiones de negocio que tomes basado en información del
            Servicio (ej. compras a proveedores, precios de menú, ajustes de
            inventario).
          </li>
          <li>
            Pérdida o corrupción de datos por causas ajenas a nosotros (ej.
            hackeo a Supabase, falla de Vercel, virus en tu dispositivo).
          </li>
          <li>
            Interrupciones causadas por proveedores terceros cuyas SLAs son
            ajenas a nosotros.
          </li>
          <li>
            Errores derivados de la función de IA de tickets si no revisaste
            la información antes de aplicarla a tu inventario.
          </li>
          <li>
            Daños causados por uso indebido del Servicio (compartir cuenta,
            no respaldar exportes, etc.).
          </li>
        </ul>
        <p>
          <strong>Tope de responsabilidad:</strong> en cualquier caso, nuestra
          responsabilidad máxima agregada queda limitada al{" "}
          <strong>monto total que hayas pagado por el Servicio en los
          últimos 12 meses</strong> previos al evento que dio origen al
          reclamo.
        </p>

        <h2>13. Garantías (Disclaimer)</h2>
        <p>
          El Servicio se proporciona <strong>&quot;TAL CUAL&quot;</strong> y{" "}
          <strong>&quot;SEGÚN DISPONIBILIDAD&quot;</strong>. En la medida
          máxima permitida por ley, renunciamos a garantías implícitas de
          comercialización, idoneidad para un fin particular o no infracción.
          No garantizamos que el Servicio:
        </p>
        <ul>
          <li>Sea ininterrumpido o esté libre de errores en todo momento.</li>
          <li>Cumpla exactamente todos tus requerimientos específicos.</li>
          <li>Sea infalible para detección de mermas, costeo o reportes.</li>
        </ul>

        <h2>14. Indemnización</h2>
        <p>
          Te comprometes a indemnizar y mantener libre de responsabilidad a
          Restoki, sus operadores, empleados y proveedores por cualquier
          reclamo, daño, pérdida, costo o gasto (incluyendo honorarios legales
          razonables) que surjan de:
        </p>
        <ul>
          <li>Tu violación de estos términos.</li>
          <li>Tu uso indebido del Servicio.</li>
          <li>
            Tu infracción de derechos de terceros (propiedad intelectual,
            privacidad, etc.).
          </li>
          <li>
            Reclamos de tu personal/clientes derivados de tu uso del Servicio
            (no nuestro).
          </li>
        </ul>

        <h2>15. Fuerza mayor</h2>
        <p>
          Ninguna parte será responsable por incumplimiento causado por
          eventos fuera de su control razonable, incluyendo: catástrofes
          naturales, pandemias, guerras, ataques cibernéticos masivos a
          internet, fallas regionales de electricidad/internet, acciones
          gubernamentales que afecten la operación, o cualquier evento de
          fuerza mayor reconocido legalmente.
        </p>

        <h2>16. Modificaciones a estos términos</h2>
        <ul>
          <li>
            Podemos modificar estos términos cuando sea necesario por razones
            legales, operativas o de negocio.
          </li>
          <li>
            Cambios materiales se notifican por correo con al menos{" "}
            <strong>30 días de anticipación</strong> a su entrada en vigor.
          </li>
          <li>
            Cambios menores (corrección de redacción, links, ejemplos) entran
            en vigor inmediatamente al actualizar esta página.
          </li>
          <li>
            Si continúas usando el Servicio después de la fecha de entrada en
            vigor de los cambios materiales, los aceptas. Si no estás de
            acuerdo, puedes cancelar tu cuenta antes de esa fecha.
          </li>
        </ul>

        <h2>17. Disposiciones generales</h2>

        <h3>17.1 Acuerdo completo</h3>
        <p>
          Estos términos, junto con la{" "}
          <Link href="/privacidad">Política de Privacidad</Link> y el{" "}
          <Link href="/aviso-de-privacidad">Aviso de Privacidad Integral</Link>,
          constituyen el acuerdo completo entre tú y Restoki, y reemplazan
          cualquier acuerdo anterior.
        </p>

        <h3>17.2 Divisibilidad</h3>
        <p>
          Si alguna disposición se considera inválida o no exigible por un
          tribunal, las demás siguen en pleno vigor. La disposición inválida
          se modificará al mínimo necesario para hacerla exigible.
        </p>

        <h3>17.3 Renuncia</h3>
        <p>
          El no exigir el cumplimiento de un término no constituye renuncia a
          exigirlo en el futuro.
        </p>

        <h3>17.4 Cesión</h3>
        <p>
          No puedes ceder estos términos sin nuestro consentimiento por
          escrito. Nosotros podemos cederlos en caso de venta de Restoki,
          fusión o reestructuración, con aviso previo.
        </p>

        <h3>17.5 Notificaciones</h3>
        <p>
          Las notificaciones formales se hacen al correo registrado en tu
          cuenta (de nuestra parte hacia ti) o a{" "}
          <a href="mailto:hola@restoki.mx">hola@restoki.mx</a> (de tu parte
          hacia nosotros).
        </p>

        <h2>18. Ley aplicable y jurisdicción</h2>
        <p>
          Estos términos se rigen e interpretan conforme a las leyes de los{" "}
          <strong>Estados Unidos Mexicanos</strong>. Cualquier controversia
          relativa a su interpretación o cumplimiento se resolverá ante los{" "}
          <strong>tribunales competentes de Hermosillo, Sonora, México</strong>,
          renunciando expresamente las partes a cualquier otra jurisdicción
          que les pudiera corresponder por razón de su domicilio presente o
          futuro.
        </p>

        <h2>19. Contacto</h2>
        <ul>
          <li>
            <strong>General:</strong>{" "}
            <a href="mailto:hola@restoki.mx">hola@restoki.mx</a>
          </li>
          <li>
            <strong>Soporte:</strong>{" "}
            <a href="mailto:soporte@restoki.mx">soporte@restoki.mx</a>
          </li>
          <li>
            <strong>Privacidad:</strong>{" "}
            <a href="mailto:privacidad@restoki.mx">privacidad@restoki.mx</a>
          </li>
          <li>
            <strong>Domicilio convencional:</strong> Hermosillo, Sonora, México
          </li>
        </ul>
      </div>
    </div>
  )
}
