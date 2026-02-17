# AUFA - Visión del Producto y Arquitectura de Negocio

> Este documento es la fuente de verdad para el diseño y dirección del proyecto AUFA.

---

## Concepto Central

AUFA no es solo un gestor de torneos; es una **"Nube de Ligas"**. Funciona como un sistema operativo central donde cualquier organizador de torneos (Fútbol 5, 7, 11, Empresarial, Universitario) alquila una instancia de la plataforma para operar su negocio.

---

## 1. Arquitectura Multi-Tenant

La plataforma opera bajo una arquitectura Multi-Tenant (Multi-inquilino) con dos niveles:

### Super-Admin (AUFA)
Controla la plataforma global, facturación a las ligas y bases de datos nacionales (jugadores, árbitros).

### Tenant (Liga Cliente)
Cada liga tiene su propio subdominio (ej: `ligauniversitaria.aufa.uy`), su propia base de datos de torneos y su propia configuración visual (marca blanca).

---

## 2. Módulo: AUFA ID (Identidad Digital Única)

Este es el **activo más valioso** del sistema. Un jugador tiene un solo usuario para todas las ligas del país. Cada liga gestiona sus propias sanciones de forma independiente.

### A. Pasaporte Deportivo Digital

**Validación de Identidad**
- El jugador sube foto de su CI (frente y dorso) junto con un selfie.
- La validación la realiza manualmente el organizador de la liga, sin integración con servicios externos de DNIC.

**Ficha Médica Centralizada**
- El jugador sube su aptitud física una sola vez.
- El sistema alerta automáticamente cuando está por vencer y bloquea la participación en cualquier liga conectada si el documento expira.

**Historial Unificado**
- Muestra la carrera del jugador a través de todas las ligas: goles, asistencias, tarjetas, campañas y logros.

### B. Sistema de Sanciones (Local por Liga)
- Cada liga gestiona sus propias sanciones de forma independiente.
- No existen sanciones cruzadas entre ligas.
- El AUFA ID es único, pero la inhabilitación aplica exclusivamente dentro de la liga donde ocurrió la infracción.

### C. Fair Play Score
- Calificación de comportamiento de equipos realizada exclusivamente por el árbitro al cierre del acta de cada partido.
- Las ligas pueden usar este puntaje como criterio para admitir o rechazar equipos en futuras temporadas.

---

## 3. Módulo: SaaS para Organizadores (Command Center)

Este es el servicio que paga la liga. Debe ser una herramienta administrativa potente.

### A. Configuración de Producto (Liga)

**Personalización Visual (Marca Blanca)**
- El organizador sube sus activos: logo, paleta de colores (Hex Codes) y banners.
- El frontend renderiza dinámicamente estos estilos usando variables CSS globales.

**Motor de Reglas Flexible**
El organizador configura:
- Tipo de juego: F5, F7, F11
- Puntaje: 3 puntos por ganar, punto extra por Fair Play, etc.
- Criterios de desempate: Diferencia de gol, Goles a favor, Resultado entre ellos (orden configurable)
- Cambios permitidos: Ilimitados o cantidad fija

### B. Gestión Financiera Automatizada (Smart Treasury)

**Split de Pagos**
Cuando un equipo paga la inscripción online, el sistema procesa automáticamente:
1. Cobra la transacción completa.
2. Descuenta la comisión de la pasarela de pago.
3. Descuenta la comisión de uso de plataforma AUFA (4%).
4. Deposita el resto automáticamente en la cuenta del Organizador.

**Gestión de Señas y Cuotas**
- Permite configurar pagos parciales (ej: "Pagar seña de $2000 para reservar cupo").

**Bloqueo por Deuda**
- Si un equipo no paga antes del partido, pierde los puntos por default y el rival gana el partido.
- No se bloquea el inicio del juego ni se generan problemas logísticos en la cancha.

### C. Generador de Fixtures

Algoritmo de emparejamiento que cruza tres variables críticas:
- Disponibilidad de canchas (horarios cargados manualmente por el organizador)
- Restricciones de equipos (ej: "El equipo X solo puede jugar martes después de las 21hs")
- Balanceo de localía a lo largo del torneo

**Gestión de Canchas**
- El organizador carga manualmente las canchas y los bloques horarios que ya tiene contratados.
- No hay integración ni booking automático con complejos deportivos.
- El sistema usa esta información como restricción para generar el fixture.

---

## 4. Módulo: Match Day (Operativa de Partido)

El árbitro utiliza una planilla en papel durante el partido. Posterior al encuentro, un operador de la liga carga los datos en el sistema.

### A. Pre-Partido (Semana previa)
- El sistema genera el fixture según el algoritmo y notifica horarios a los delegados vía WhatsApp/Email.
- El organizador designa árbitros para cada partido.

### B. Durante el Partido
El árbitro registra en planilla papel:
- Jugadores presentes (check-in)
- Goles (jugador y minuto)
- Tarjetas amarillas y rojas
- Cambios realizados
- Incidentes relevantes

### C. Post-Partido (Carga en Sistema)
Un operador de la liga carga los datos de la planilla en el sistema. El backend procesa automáticamente:
- Cálculo de nuevos puntajes y actualización de la tabla de posiciones
- Actualización de estadísticas individuales (goleadores, tarjetas)
- Aplicación automática de sanciones leves (ej: doble amarilla = 1 fecha)
- Derivación de sanciones graves al Tribunal de Penas de la liga

---

## 5. Flujo del Jugador y Registro

### A. Registro / Login Unificado
El jugador ingresa su CI (Cédula de Identidad). El sistema busca en la base de datos maestra de AUFA:
- **Si ya existe:** Trae su foto, nombre y ficha médica vigente.
- **Si es nuevo:** Solicita foto de CI (frente y dorso), selfie y carga de ficha médica.

### B. Fichaje en Equipo
El Capitán envía un link de invitación. El jugador acepta y el sistema valida automáticamente:
- ¿Está sancionado en esta liga?
- ¿Tiene ficha médica vigente?
- ¿Ya está fichado en otro equipo de la misma liga? (Bloqueo de doble fichaje intra-liga)

### C. Perfil de Estadísticas
El sistema agrega las estadísticas de todos los partidos jugados en cualquier liga AUFA, generando un Pasaporte Deportivo con historial de goles, asistencias y tarjetas.

---

## 6. Flujo Financiero (Smart Treasury)

Elimina el manejo de efectivo en las canchas.

### Ciclo de Cobro
1. 48 horas antes del partido, el sistema genera una Orden de Pago para el equipo.
2. El capitán paga la cuota online (MercadoPago/Stripe).
3. El sistema dispersa los fondos: 96% para la Liga, 4% para AUFA.
4. Si el pago no se registra antes del partido, el equipo pierde los puntos por default.

---

## 7. Tribunal de Penas (Justicia Deportiva Local)

Cada liga gestiona sus sanciones de forma independiente. No hay repercusión entre ligas.

### Flujo de Sanciones
1. El árbitro registra la infracción en la planilla papel con el motivo.
2. Al cargar los datos en el sistema, las sanciones leves (doble amarilla) se aplican automáticamente: 1 fecha de suspensión.
3. Las sanciones graves (agresión, roja directa) pasan al Tribunal de Penas de la liga.
4. El Tribunal dictamina la sanción (ej: 5 fechas de suspensión). La sanción aplica solo dentro de esa liga.

---

## 8. Flujo de Alta de Liga (Onboarding B2B)

### Aprovisionamiento del Tenant
- El Super-Admin de AUFA crea una nueva organización en el sistema.
- Se despliega un subdominio dedicado (ej: `ligapradocarrasco.aufa.uy`) o se vincula un dominio personalizado.
- Se aísla el esquema de la liga para sus torneos y finanzas, conectado a la tabla global de jugadores (AUFA ID).

### Configuración de Marca Blanca
- El organizador sube logo, paleta de colores y banners.
- El frontend renderiza dinámicamente estos estilos.

### Conexión Financiera
- El organizador vincula su cuenta bancaria o MercadoPago Comercial.
- Se establece la regla de comisión automática: 96% para la Liga, 4% para AUFA.

---

## 9. Marketplace y Red de Árbitros

### Bolsa de Trabajo
- Árbitros certificados suben su perfil y disponibilidad.
- Las ligas pueden contratar packs de arbitraje directamente desde la plataforma.

---

## 10. Modelo de Negocio y Precios

Estructura de suscripción por niveles con comisión unificada del 4%:

| Característica     | Plan Barrio | Plan Liga Pro    | Plan Enterprise  |
|--------------------|-------------|------------------|------------------|
| Precio             | Gratis      | U$S 100/mes      | Personalizado    |
| Equipos            | Hasta 12    | Ilimitados       | Ilimitados       |
| Fixtures           | Manual      | Automático       | Automático       |
| Dominio            | liga.aufa.uy| tuliga.com       | tuliga.com       |
| Comisión online    | 4%          | 4%               | 4%               |
| Marca blanca       | Básica      | Completa         | Completa         |
| Soporte            | Comunidad   | Email            | Dedicado 24/7    |
| API abierta        | No          | No               | Sí               |

---

## 11. Ventajas Competitivas para Uruguay

### Seguridad e Identidad
Al centralizar los datos de identidad y validación mediante foto de CI + selfie, AUFA ofrece un entorno más seguro contra suplantaciones, algo que las ligas caseras no pueden garantizar.

### Digitalización del Efectivo
Elimina el problema de que los delegados manejen efectivo en las canchas a altas horas de la noche. Todo se paga digital con trazabilidad completa.

### Seguro Deportivo
Al tener la base de datos real de quién juega, AUFA puede negociar una póliza de seguro colectivo con el BSE (Banco de Seguros del Estado) mucho más barata que lo que conseguiría una liga individual.

### Escalabilidad Regional
El modelo multi-tenant y la identidad única del jugador permiten escalar a otros países de la región (Argentina, Paraguay) manteniendo la misma infraestructura.
