export const metadata = {
  title: 'Terminos y Condiciones - AUFA',
};

export default function TerminosPage() {
  return (
    <>
      <h1>Terminos y Condiciones</h1>
      <p className="lead">
        Estas condiciones regulan el uso de AUFA, la plataforma que las ligas deportivas
        contratan para organizar sus torneos y que los jugadores usan para participar en ellos.
      </p>

      <h2>1. Quien es quien</h2>
      <p>
        <strong>AUFA</strong> provee y opera la plataforma. <strong>La liga</strong> es el
        organizador que contrata el servicio para gestionar sus torneos. <strong>El jugador</strong>{' '}
        es quien se registra para participar en una o mas ligas.
      </p>
      <p>
        AUFA no organiza torneos ni decide sobre resultados, sanciones o admision de equipos. Esas
        decisiones son de cada liga. AUFA provee las herramientas con las que la liga las registra
        y comunica.
      </p>

      <h2>2. La cuenta del jugador</h2>
      <p>
        Cada jugador tiene una sola cuenta, identificada por su cedula. La cuenta es personal e
        intransferible: prestarla o dejar que otro juegue en tu nombre es motivo de baja.
      </p>
      <p>
        Para ser incluido en la planilla de un partido hacen falta tres cosas: identidad validada
        por el organizador, ficha medica vigente y no estar cumpliendo una sancion en esa liga.
      </p>

      <h2>3. Identidad y ficha medica</h2>
      <p>
        La validacion de identidad la hace manualmente el organizador de cada liga comparando la
        foto de la cedula con el selfie. AUFA no verifica identidades contra registros oficiales ni
        garantiza que una identidad validada sea autentica.
      </p>
      <p>
        La ficha medica es responsabilidad del jugador: subirla, mantenerla vigente y renovarla.
        AUFA avisa cuando esta por vencer, pero ese aviso es una cortesia y no un sustituto de tu
        obligacion de tenerla al dia. AUFA no evalua aptitud fisica ni es responsable de lesiones
        o problemas de salud ocurridos durante los partidos.
      </p>

      <h2>4. Sanciones</h2>
      <p>
        Las sanciones son locales a cada liga: una suspension aplicada en una liga no te inhabilita
        en otra. El tribunal de penas de cada liga dicta sus propias resoluciones y AUFA no las
        revisa, modifica ni arbitra. Los reclamos van al organizador.
      </p>

      <h2>5. Pagos</h2>
      <p>
        Las inscripciones y cuotas las cobra la liga a traves de la plataforma. AUFA retiene una
        comision sobre cada transaccion procesada y transfiere el resto al organizador, descontadas
        las comisiones de la pasarela de pago.
      </p>
      <p>
        Los importes, plazos y consecuencias del impago los define cada liga en su reglamento. AUFA
        aplica lo que la liga configura: si el reglamento establece que un equipo con deuda pierde
        los puntos, la plataforma lo registra. Los reclamos por cobros van al organizador; AUFA
        interviene solamente en errores atribuibles a la plataforma.
      </p>

      <h2>6. Contenido que subis</h2>
      <p>
        Segui siendo titular de lo que subas. Nos das permiso para almacenarlo y mostrarlo dentro de
        la plataforma con el fin de operar el servicio: tu foto y tus estadisticas son visibles para
        las ligas en las que participas.
      </p>
      <p>
        No subas documentos ajenos, contenido falsificado ni material que no tengas derecho a
        compartir.
      </p>

      <h2>7. Disponibilidad</h2>
      <p>
        AUFA se presta tal como esta, sin garantia de disponibilidad ininterrumpida. Hacemos lo
        razonable por mantener el servicio en linea y los datos respaldados, pero no respondemos por
        partidos suspendidos, fixtures mal cargados ni decisiones deportivas tomadas a partir de
        informacion que un usuario ingreso mal.
      </p>

      <h2>8. Baja</h2>
      <p>
        Podes dar de baja tu cuenta cuando quieras. Algunos datos se conservan: los resultados
        deportivos y las sanciones forman parte del historial de los torneos en los que jugaste y no
        se borran, porque afectan a terceros. Los documentos de identidad y la ficha medica si se
        eliminan.
      </p>

      <h2>9. Cambios</h2>
      <p>
        Si cambiamos estas condiciones de forma sustancial, te avisamos antes de que entren en
        vigencia. Seguir usando la plataforma implica aceptarlas.
      </p>

      <h2>10. Ley aplicable</h2>
      <p>
        Estas condiciones se rigen por la ley uruguaya y cualquier disputa se somete a los tribunales
        de Montevideo.
      </p>
    </>
  );
}
