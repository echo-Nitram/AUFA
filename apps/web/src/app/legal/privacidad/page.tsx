export const metadata = {
  title: 'Politica de Privacidad - AUFA',
};

export default function PrivacidadPage() {
  return (
    <>
      <h1>Politica de Privacidad</h1>
      <p className="lead">
        AUFA guarda datos sensibles: tu cedula, un selfie y tu ficha medica. Esta pagina explica
        que se guarda, para que, quien puede verlo y por cuanto tiempo.
      </p>

      <h2>Que datos guardamos</h2>
      <table>
        <thead>
          <tr>
            <th>Dato</th>
            <th>Para que</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Cedula, nombre y fecha de nacimiento</td>
            <td>Identificarte de forma unica en todas las ligas y validar categorias por edad</td>
          </tr>
          <tr>
            <td>Foto de cedula (frente y dorso) y selfie</td>
            <td>Que el organizador confirme que sos vos y evitar suplantaciones en la cancha</td>
          </tr>
          <tr>
            <td>Ficha medica</td>
            <td>Verificar que tenes aptitud vigente antes de dejarte jugar</td>
          </tr>
          <tr>
            <td>Correo y telefono</td>
            <td>Avisarte horarios de partido, vencimientos y temas de tu cuenta</td>
          </tr>
          <tr>
            <td>Goles, tarjetas, sanciones y partidos jugados</td>
            <td>Armar la tabla, las estadisticas y tu historial deportivo</td>
          </tr>
          <tr>
            <td>Pagos</td>
            <td>Registrar cuotas e inscripciones y distribuir el dinero a la liga</td>
          </tr>
        </tbody>
      </table>

      <h2>Quien puede ver cada cosa</h2>
      <p>
        <strong>Tus documentos de identidad y tu ficha medica</strong> los ve solamente el
        administrador de una liga en la que estas fichado, y solo mientras lo estes. No son
        publicos, no se muestran en tu perfil y no estan accesibles por URL: cada descarga verifica
        quien la pide. Otras ligas donde no juegas no tienen acceso.
      </p>
      <p>
        <strong>Tus estadisticas deportivas</strong> (goles, partidos, tarjetas) son visibles en el
        portal publico de la liga donde jugaste, como en cualquier torneo.
      </p>
      <p>
        <strong>Tus sanciones</strong> las ve unicamente la liga donde ocurrio la infraccion. No se
        comparten con otras ligas.
      </p>

      <h2>El AUFA ID entre ligas</h2>
      <p>
        Tu cuenta es una sola para todo el pais: esa es la idea del producto. En la practica
        significa que cuando te sumas a una liga nueva, esa liga ve tu nombre, tu foto de perfil, si
        tenes ficha medica vigente y tu historial deportivo. No ve tus sanciones en otras ligas ni
        tus documentos, salvo que los subas para que te validen ahi.
      </p>

      <h2>Con quien compartimos</h2>
      <p>
        Con las ligas donde jugas, en el alcance descrito arriba. Con los proveedores que hacen
        funcionar el servicio: el que procesa los pagos y el que envia los correos. No vendemos
        datos ni los cedemos con fines publicitarios.
      </p>

      <h2>Cuanto tiempo</h2>
      <p>
        Los documentos de identidad y la ficha medica se conservan mientras tengas una cuenta activa
        y se eliminan cuando la das de baja. Los resultados deportivos y las sanciones se conservan
        como parte del historial del torneo: afectan a otros equipos y no se pueden borrar sin
        alterar competencias ya jugadas.
      </p>

      <h2>Tus derechos</h2>
      <p>
        La Ley 18.331 te da derecho a acceder a tus datos, corregirlos, actualizarlos y, en los
        casos que corresponda, pedir que se eliminen. Podes ejercerlos escribiendo a la direccion de
        contacto. Tambien podes reclamar ante la Unidad Reguladora y de Control de Datos Personales
        (URCDP).
      </p>

      <h2>Seguridad</h2>
      <p>
        Las contraseñas se guardan cifradas y nunca en texto plano. Los documentos sensibles se
        almacenan fuera del alcance publico y cada acceso se autoriza individualmente. Ningun
        sistema es infalible: si ocurre un incidente que afecte tus datos, te lo comunicamos.
      </p>

      <h2>Menores de edad</h2>
      <p>
        Las ligas pueden tener categorias juveniles. Si sos menor de 18, necesitas autorizacion de
        tu madre, padre o tutor para registrarte, y esa persona puede ejercer tus derechos sobre
        estos datos.
      </p>

      <h2>Contacto</h2>
      <p>
        Para cualquier consulta sobre tus datos, escribinos a{' '}
        <a href="mailto:privacidad@aufa.uy">privacidad@aufa.uy</a>.
      </p>
    </>
  );
}
