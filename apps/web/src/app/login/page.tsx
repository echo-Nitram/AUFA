'use client';

import { useState, FormEvent } from 'react';
import { useAuth } from '@/lib/auth-context';
import { authApi } from '@/lib/api';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

type Step = 'ci' | 'login' | 'register';

export default function LoginPage() {
  const [step, setStep] = useState<Step>('ci');
  const [ci, setCi] = useState('');
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [playerInfo, setPlayerInfo] = useState<any>(null);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAuth();
  const router = useRouter();

  // Registration fields
  const [regData, setRegData] = useState({ fullName: '', email: '', dateOfBirth: '', phone: '' });

  async function handleCILookup(e: FormEvent) {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    try {
      const result = await authApi.lookupCI(ci);
      if (result.exists) {
        setPlayerInfo(result);
        setIdentifier(ci);
        setStep('login');
      } else {
        setStep('register');
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }

  async function handleLogin(e: FormEvent) {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    try {
      await login(identifier, password);
      router.push('/dashboard');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }

  async function handleRegister(e: FormEvent) {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    try {
      await authApi.register({ ci, password, ...regData });
      await login(ci, password);
      router.push('/dashboard');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-blue-800 to-indigo-900 flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-accent rounded-lg flex items-center justify-center font-bold text-white text-xl">A</div>
            <span className="text-white text-2xl font-bold">AUFA</span>
          </Link>
          <h1 className="text-2xl font-bold text-white">
            {step === 'ci' && 'Ingresa tu Cedula'}
            {step === 'login' && 'Bienvenido de vuelta'}
            {step === 'register' && 'Crear cuenta AUFA'}
          </h1>
          <p className="text-blue-200 mt-2">
            {step === 'ci' && 'Tu CI es tu llave a todas las ligas'}
            {step === 'login' && playerInfo?.fullName}
            {step === 'register' && `CI: ${ci} - No encontrada, registrate`}
          </p>
        </div>

        <div className="bg-white rounded-xl shadow-xl p-8 space-y-5">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">{error}</div>
          )}

          {/* Step 1: CI Lookup */}
          {step === 'ci' && (
            <form onSubmit={handleCILookup} className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Cedula de Identidad</label>
                <input type="text" className="input-field text-center text-xl tracking-widest" placeholder="12345678"
                  value={ci} onChange={(e) => setCi(e.target.value)} required autoFocus />
              </div>
              <button type="submit" className="btn-primary w-full" disabled={isLoading}>
                {isLoading ? 'Buscando...' : 'Continuar'}
              </button>
              <p className="text-center text-xs text-gray-400">
                Tambien puedes{' '}
                <button type="button" className="text-primary underline" onClick={() => { setStep('login'); setIdentifier(''); }}>
                  ingresar con email
                </button>
              </p>
            </form>
          )}

          {/* Step 2: Login (CI found or email mode) */}
          {step === 'login' && (
            <form onSubmit={handleLogin} className="space-y-5">
              {playerInfo && (
                <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg">
                  <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center text-white font-bold">
                    {playerInfo.fullName?.[0] || '?'}
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">{playerInfo.fullName}</p>
                    <p className="text-xs text-gray-500">{playerInfo.maskedEmail}</p>
                  </div>
                </div>
              )}
              {!playerInfo && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email o CI</label>
                  <input type="text" className="input-field" placeholder="tu@email.com o 12345678"
                    value={identifier} onChange={(e) => setIdentifier(e.target.value)} required />
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Contrasena</label>
                <input type="password" className="input-field" placeholder="Tu contrasena"
                  value={password} onChange={(e) => setPassword(e.target.value)} required autoFocus={!!playerInfo} />
              </div>
              <button type="submit" className="btn-primary w-full" disabled={isLoading}>
                {isLoading ? 'Ingresando...' : 'Ingresar'}
              </button>
              <button type="button" className="w-full text-sm text-gray-500 hover:text-gray-700"
                onClick={() => { setStep('ci'); setPlayerInfo(null); setError(''); }}>
                Volver
              </button>
            </form>
          )}

          {/* Step 3: Register (CI not found) */}
          {step === 'register' && (
            <form onSubmit={handleRegister} className="space-y-4">
              <div className="p-3 bg-amber-50 rounded-lg text-sm text-amber-700">
                CI <strong>{ci}</strong> no esta registrada en AUFA. Completa tus datos para crear tu AUFA ID.
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nombre Completo</label>
                <input type="text" className="input-field" placeholder="Martin Gonzalez" required
                  value={regData.fullName} onChange={(e) => setRegData(p => ({ ...p, fullName: e.target.value }))} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Fecha de Nacimiento</label>
                <input type="date" className="input-field" required
                  value={regData.dateOfBirth} onChange={(e) => setRegData(p => ({ ...p, dateOfBirth: e.target.value }))} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input type="email" className="input-field" placeholder="tu@email.com" required
                  value={regData.email} onChange={(e) => setRegData(p => ({ ...p, email: e.target.value }))} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Telefono (opcional)</label>
                <input type="tel" className="input-field" placeholder="099 123 456"
                  value={regData.phone} onChange={(e) => setRegData(p => ({ ...p, phone: e.target.value }))} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Contrasena</label>
                <input type="password" className="input-field" placeholder="Minimo 6 caracteres" required minLength={6}
                  value={password} onChange={(e) => setPassword(e.target.value)} />
              </div>
              <button type="submit" className="btn-primary w-full" disabled={isLoading}>
                {isLoading ? 'Creando...' : 'Crear mi AUFA ID'}
              </button>
              <button type="button" className="w-full text-sm text-gray-500 hover:text-gray-700"
                onClick={() => { setStep('ci'); setError(''); }}>
                Volver
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
