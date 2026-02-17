'use client';

import { useState, FormEvent } from 'react';
import { authApi } from '@/lib/api';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';

function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const tokenFromUrl = searchParams.get('token');

  const [step, setStep] = useState<'request' | 'reset'>(tokenFromUrl ? 'reset' : 'request');
  const [email, setEmail] = useState('');
  const [token, setToken] = useState(tokenFromUrl || '');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [msg, setMsg] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  async function handleRequest(e: FormEvent) {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    try {
      const result = await authApi.requestPasswordReset(email);
      setMsg(result.message);
      // In dev, show the token so they can use it
      if (result.devToken) {
        setToken(result.devToken);
        setStep('reset');
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }

  async function handleReset(e: FormEvent) {
    e.preventDefault();
    setError('');
    if (password !== confirmPassword) {
      setError('Las contrasenas no coinciden');
      return;
    }
    setIsLoading(true);
    try {
      const result = await authApi.resetPassword(token, password);
      setMsg(result.message);
      setStep('request'); // done
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
            {step === 'request' ? 'Recuperar Contrasena' : 'Nueva Contrasena'}
          </h1>
        </div>

        <div className="bg-white rounded-xl shadow-xl p-8 space-y-5">
          {error && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">{error}</div>}
          {msg && !error && <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg text-sm">{msg}</div>}

          {step === 'request' && !msg && (
            <form onSubmit={handleRequest} className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input type="email" className="input-field" placeholder="tu@email.com" required
                  value={email} onChange={e => setEmail(e.target.value)} autoFocus />
              </div>
              <button type="submit" className="btn-primary w-full" disabled={isLoading}>
                {isLoading ? 'Enviando...' : 'Enviar instrucciones'}
              </button>
            </form>
          )}

          {step === 'reset' && (
            <form onSubmit={handleReset} className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nueva Contrasena</label>
                <input type="password" className="input-field" placeholder="Minimo 6 caracteres" required minLength={6}
                  value={password} onChange={e => setPassword(e.target.value)} autoFocus />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Confirmar Contrasena</label>
                <input type="password" className="input-field" placeholder="Repetir contrasena" required minLength={6}
                  value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} />
              </div>
              <button type="submit" className="btn-primary w-full" disabled={isLoading}>
                {isLoading ? 'Actualizando...' : 'Cambiar Contrasena'}
              </button>
            </form>
          )}

          <p className="text-center text-sm text-gray-500">
            <Link href="/login" className="text-primary font-medium hover:underline">Volver a iniciar sesion</Link>
          </p>
        </div>
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><div className="text-gray-500">Cargando...</div></div>}>
      <ResetPasswordForm />
    </Suspense>
  );
}
