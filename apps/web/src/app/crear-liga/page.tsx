'use client';

import { useState, FormEvent } from 'react';
import { tenantApi } from '@/lib/api';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function CrearLigaPage() {
  const router = useRouter();
  const [step, setStep] = useState<1 | 2>(1);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [form, setForm] = useState({
    leagueName: '',
    slug: '',
    plan: 'BARRIO',
    email: '',
    password: '',
    fullName: '',
  });

  function updateField(field: string, value: string) {
    setForm(prev => ({ ...prev, [field]: value }));
    if (field === 'leagueName' && !form.slug) {
      // Auto-generate slug from name
      const slug = value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
      setForm(prev => ({ ...prev, [field]: value, slug }));
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    try {
      const result = await tenantApi.createSelfService(form);
      // Auto-login and redirect to dashboard
      const { authApi } = await import('@/lib/api');
      const loginResult = await authApi.login(form.email, form.password);
      localStorage.setItem('aufa_token', loginResult.accessToken);
      localStorage.setItem('aufa_refresh', loginResult.refreshToken);
      localStorage.setItem('aufa_tenant_id', result.tenantId);
      router.push('/dashboard');
    } catch (err: any) {
      setError(err.message || 'Error al crear la liga');
    } finally {
      setIsLoading(false);
    }
  }

  const plans = [
    { id: 'BARRIO', name: 'Plan Barrio', price: 'Gratis', desc: 'Hasta 12 equipos, fixture manual' },
    { id: 'LIGA_PRO', name: 'Liga Pro', price: 'US$ 100/mes', desc: 'Equipos ilimitados, fixture automatico' },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-blue-800 to-indigo-900 flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-lg">
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-accent rounded-lg flex items-center justify-center font-bold text-white text-xl">A</div>
            <span className="text-white text-2xl font-bold">AUFA</span>
          </Link>
          <h1 className="text-2xl font-bold text-white">Crear mi Liga</h1>
          <p className="text-blue-200 mt-2">
            {step === 1 ? 'Configura tu liga en 2 minutos' : 'Crea tu cuenta de organizador'}
          </p>
          {/* Progress */}
          <div className="flex items-center justify-center gap-2 mt-4">
            <div className={`w-8 h-1 rounded ${step >= 1 ? 'bg-accent' : 'bg-white/20'}`} />
            <div className={`w-8 h-1 rounded ${step >= 2 ? 'bg-accent' : 'bg-white/20'}`} />
          </div>
        </div>

        <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-xl p-8 space-y-5">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">{error}</div>
          )}

          {step === 1 && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nombre de la Liga</label>
                <input type="text" className="input-field" placeholder="Liga Barrial de Pocitos" required
                  value={form.leagueName} onChange={e => updateField('leagueName', e.target.value)} autoFocus />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">URL de la liga</label>
                <div className="flex items-center">
                  <span className="text-sm text-gray-400 mr-1">aufa.uy/liga/</span>
                  <input type="text" className="input-field font-mono" placeholder="mi-liga"
                    value={form.slug} onChange={e => setForm(p => ({ ...p, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '') }))}
                    required pattern="[a-z0-9-]+" />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">Plan</label>
                <div className="grid grid-cols-2 gap-3">
                  {plans.map(plan => (
                    <button key={plan.id} type="button"
                      className={`p-4 rounded-lg border-2 text-left transition-colors ${
                        form.plan === plan.id ? 'border-primary bg-primary/5' : 'border-gray-200 hover:border-gray-300'
                      }`}
                      onClick={() => setForm(p => ({ ...p, plan: plan.id }))}
                    >
                      <p className="font-semibold text-gray-900 text-sm">{plan.name}</p>
                      <p className="text-primary font-bold">{plan.price}</p>
                      <p className="text-xs text-gray-500 mt-1">{plan.desc}</p>
                    </button>
                  ))}
                </div>
              </div>

              <button type="button" className="btn-primary w-full"
                onClick={() => { if (form.leagueName && form.slug) setStep(2); }}
                disabled={!form.leagueName || !form.slug}
              >
                Siguiente
              </button>
            </>
          )}

          {step === 2 && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tu Nombre</label>
                <input type="text" className="input-field" placeholder="Juan Perez" required
                  value={form.fullName} onChange={e => updateField('fullName', e.target.value)} autoFocus />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input type="email" className="input-field" placeholder="tu@email.com" required
                  value={form.email} onChange={e => updateField('email', e.target.value)} />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Contrasena</label>
                <input type="password" className="input-field" placeholder="Minimo 6 caracteres" required minLength={6}
                  value={form.password} onChange={e => updateField('password', e.target.value)} />
              </div>

              <div className="bg-blue-50 p-3 rounded-lg text-sm text-blue-700">
                Liga: <strong>{form.leagueName}</strong> &middot; URL: aufa.uy/liga/<strong>{form.slug}</strong>
              </div>

              <button type="submit" className="btn-primary w-full" disabled={isLoading}>
                {isLoading ? 'Creando liga...' : 'Crear mi Liga'}
              </button>

              <button type="button" className="w-full text-sm text-gray-500 hover:text-gray-700" onClick={() => setStep(1)}>
                Volver
              </button>
            </>
          )}

          <p className="text-center text-sm text-gray-500">
            Ya tienes cuenta?{' '}
            <Link href="/login" className="text-primary font-medium hover:underline">Inicia sesion</Link>
          </p>
        </form>
      </div>
    </div>
  );
}
