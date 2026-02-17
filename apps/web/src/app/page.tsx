'use client';

import Link from 'next/link';

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-blue-800 to-indigo-900">
      {/* Header */}
      <header className="container mx-auto px-6 py-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-accent rounded-lg flex items-center justify-center font-bold text-white text-xl">
            A
          </div>
          <span className="text-white text-2xl font-bold">AUFA</span>
        </div>
        <nav className="flex items-center gap-4">
          <Link href="/login" className="text-white/80 hover:text-white transition-colors">
            Iniciar Sesion
          </Link>
          <Link href="/register" className="btn-accent">
            Registrarse
          </Link>
        </nav>
      </header>

      {/* Hero */}
      <main className="container mx-auto px-6 py-20">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-5xl md:text-7xl font-bold text-white mb-6 leading-tight">
            La Nube de Ligas<br />
            <span className="text-accent">de Uruguay</span>
          </h1>
          <p className="text-xl text-blue-200 mb-12 max-w-2xl mx-auto">
            Plataforma integral para organizar, gestionar y digitalizar ligas deportivas.
            Futbol 5, 7 y 11. Todo en un solo lugar.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/register" className="btn-accent text-lg px-8 py-3">
              Crear mi Liga
            </Link>
            <Link href="/login" className="btn-outline border-white text-white hover:bg-white hover:text-blue-900 text-lg px-8 py-3">
              Ya tengo cuenta
            </Link>
          </div>
        </div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-3 gap-8 mt-24 max-w-5xl mx-auto">
          {[
            {
              title: 'AUFA ID',
              desc: 'Identidad digital unica. Un jugador, todas las ligas. Pasaporte deportivo con historial completo.',
              icon: 'ID',
            },
            {
              title: 'Fixtures Inteligentes',
              desc: 'Generacion automatica de fixtures cruzando canchas, horarios y restricciones de equipos.',
              icon: 'CAL',
            },
            {
              title: 'Smart Treasury',
              desc: 'Cobros online, split automatico de pagos. Elimina el efectivo en las canchas.',
              icon: '$',
            },
            {
              title: 'Marca Blanca',
              desc: 'Tu liga, tu marca. Subdominio propio, colores personalizados y logo.',
              icon: 'MW',
            },
            {
              title: 'Tribunal de Penas',
              desc: 'Sanciones automaticas por doble amarilla. Tribunal digital para faltas graves.',
              icon: 'TP',
            },
            {
              title: 'Red de Arbitros',
              desc: 'Marketplace de arbitros certificados. Contrata packs de arbitraje desde la plataforma.',
              icon: 'ARB',
            },
          ].map((feature, i) => (
            <div key={i} className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20">
              <div className="w-12 h-12 bg-accent rounded-lg flex items-center justify-center font-bold text-white text-sm mb-4">
                {feature.icon}
              </div>
              <h3 className="text-xl font-semibold text-white mb-2">{feature.title}</h3>
              <p className="text-blue-200 text-sm">{feature.desc}</p>
            </div>
          ))}
        </div>

        {/* Pricing */}
        <section className="mt-32 max-w-5xl mx-auto">
          <h2 className="text-3xl font-bold text-white text-center mb-12">Planes</h2>
          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                name: 'Plan Barrio',
                price: 'Gratis',
                features: ['Hasta 12 equipos', 'Fixture manual', 'Subdominio liga.aufa.uy', 'Marca blanca basica', 'Comision online 4%'],
                cta: 'Empezar Gratis',
                highlight: false,
              },
              {
                name: 'Plan Liga Pro',
                price: 'US$ 100/mes',
                features: ['Equipos ilimitados', 'Fixture automatico', 'Dominio personalizado', 'Marca blanca completa', 'Comision online 4%', 'Soporte por email'],
                cta: 'Elegir Liga Pro',
                highlight: true,
              },
              {
                name: 'Plan Enterprise',
                price: 'Personalizado',
                features: ['Todo de Liga Pro', 'API abierta', 'Soporte dedicado 24/7', 'Integraciones custom', 'SLA garantizado'],
                cta: 'Contactar Ventas',
                highlight: false,
              },
            ].map((plan, i) => (
              <div
                key={i}
                className={`rounded-xl p-8 ${
                  plan.highlight
                    ? 'bg-white text-gray-900 shadow-2xl scale-105'
                    : 'bg-white/10 text-white border border-white/20'
                }`}
              >
                <h3 className="text-xl font-bold mb-2">{plan.name}</h3>
                <p className={`text-3xl font-bold mb-6 ${plan.highlight ? 'text-primary' : 'text-accent'}`}>
                  {plan.price}
                </p>
                <ul className="space-y-3 mb-8">
                  {plan.features.map((f, j) => (
                    <li key={j} className="flex items-center gap-2 text-sm">
                      <span className={plan.highlight ? 'text-green-500' : 'text-accent'}>&#10003;</span>
                      {f}
                    </li>
                  ))}
                </ul>
                <button
                  className={`w-full py-2.5 rounded-lg font-medium transition-opacity hover:opacity-90 ${
                    plan.highlight ? 'bg-primary text-white' : 'bg-white/20 text-white'
                  }`}
                >
                  {plan.cta}
                </button>
              </div>
            ))}
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="container mx-auto px-6 py-12 mt-20 border-t border-white/10">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-blue-300 text-sm">AUFA - Nube de Ligas de Uruguay</p>
          <p className="text-blue-400 text-sm">Digitalizando el deporte amateur</p>
        </div>
      </footer>
    </div>
  );
}
