'use client';

import { useAuth } from '@/lib/auth-context';
import { useEffect, useState, useRef } from 'react';
import { aufaIdApi, uploadApi } from '@/lib/api';

interface PassportData {
  aufaId: string;
  fullName: string;
  photoUrl?: string;
  identityStatus: string;
  ciPhotoFrontUrl?: string;
  ciPhotoBackUrl?: string;
  selfieUrl?: string;
  medicalClearance?: { expiresAt: string; isActive: boolean };
  career: {
    totalMatches: number;
    totalGoals: number;
    totalAssists: number;
    totalYellowCards: number;
    totalRedCards: number;
  };
  leagues: { id: string; name: string; slug: string }[];
}

export default function PassportPage() {
  const { user, token } = useAuth();
  const [passport, setPassport] = useState<PassportData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [msg, setMsg] = useState('');
  const [msgType, setMsgType] = useState<'success' | 'error'>('success');
  const [uploading, setUploading] = useState(false);

  // File refs
  const ciFrontRef = useRef<HTMLInputElement>(null);
  const ciBackRef = useRef<HTMLInputElement>(null);
  const selfieRef = useRef<HTMLInputElement>(null);
  const medicalRef = useRef<HTMLInputElement>(null);
  const [medicalDates, setMedicalDates] = useState({ issuedAt: '', expiresAt: '' });

  function loadPassport() {
    if (!user?.playerId || !token) { setIsLoading(false); return; }
    aufaIdApi.getPassport(user.playerId, token)
      .then(setPassport)
      .catch(console.error)
      .finally(() => setIsLoading(false));
  }

  useEffect(() => { loadPassport(); }, [user]);

  function showMsg(text: string, type: 'success' | 'error') {
    setMsg(text);
    setMsgType(type);
    if (type === 'success') setTimeout(() => setMsg(''), 4000);
  }

  async function handleIdentityUpload() {
    if (!token) return;
    const ciFront = ciFrontRef.current?.files?.[0];
    const ciBack = ciBackRef.current?.files?.[0];
    const selfie = selfieRef.current?.files?.[0];

    if (!ciFront || !ciBack || !selfie) {
      showMsg('Selecciona los 3 archivos: frente CI, dorso CI y selfie', 'error');
      return;
    }

    setUploading(true);
    try {
      await uploadApi.uploadIdentity(token, ciFront, ciBack, selfie);
      showMsg('Documentos de identidad cargados. Pendiente de validacion.', 'success');
      loadPassport();
    } catch (err: any) {
      showMsg(err.message, 'error');
    } finally {
      setUploading(false);
    }
  }

  async function handleMedicalUpload() {
    if (!token) return;
    const file = medicalRef.current?.files?.[0];

    if (!file) { showMsg('Selecciona el documento medico', 'error'); return; }
    if (!medicalDates.issuedAt || !medicalDates.expiresAt) {
      showMsg('Completa las fechas de emision y vencimiento', 'error');
      return;
    }

    setUploading(true);
    try {
      await uploadApi.uploadMedical(token, file, medicalDates.issuedAt, medicalDates.expiresAt);
      showMsg('Ficha medica cargada exitosamente.', 'success');
      setMedicalDates({ issuedAt: '', expiresAt: '' });
      loadPassport();
    } catch (err: any) {
      showMsg(err.message, 'error');
    } finally {
      setUploading(false);
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-gray-500">Cargando pasaporte...</div>
      </div>
    );
  }

  const identityStatusLabel = (status: string) => {
    switch (status) {
      case 'APPROVED': return { text: 'Verificada', cls: 'bg-green-100 text-green-700' };
      case 'PENDING': return { text: 'Pendiente', cls: 'bg-yellow-100 text-yellow-700' };
      case 'REJECTED': return { text: 'Rechazada', cls: 'bg-red-100 text-red-700' };
      default: return { text: 'No cargada', cls: 'bg-gray-100 text-gray-500' };
    }
  };

  const idStatus = identityStatusLabel(passport?.identityStatus || '');

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-8">Pasaporte Deportivo AUFA</h1>

      {msg && (
        <div className={`mb-6 p-3 rounded-lg text-sm ${msgType === 'error' ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'}`}>
          {msg}
        </div>
      )}

      <div className="max-w-2xl mx-auto">
        {/* Passport Card */}
        <div className="bg-gradient-to-br from-blue-900 via-blue-800 to-indigo-900 rounded-2xl p-8 text-white shadow-xl mb-8">
          <div className="flex items-start justify-between mb-6">
            <div>
              <p className="text-xs text-blue-300 uppercase tracking-wider mb-1">AUFA ID</p>
              <p className="text-lg font-mono font-bold">{passport?.aufaId || user?.aufaId || '---'}</p>
            </div>
            <div className="w-12 h-12 bg-accent rounded-lg flex items-center justify-center font-bold text-xl">A</div>
          </div>

          <div className="flex items-center gap-6 mb-6">
            <div className="w-20 h-20 bg-white/20 rounded-xl flex items-center justify-center text-3xl font-bold">
              {passport?.fullName?.[0] || user?.fullName?.[0] || '?'}
            </div>
            <div>
              <h2 className="text-2xl font-bold">{passport?.fullName || user?.fullName || 'Jugador'}</h2>
              <p className="text-blue-200">{user?.email}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-blue-300">Identidad</p>
              <span className={`inline-block mt-1 px-2 py-0.5 rounded text-xs font-medium ${idStatus.cls}`}>{idStatus.text}</span>
            </div>
            <div>
              <p className="text-xs text-blue-300">Ficha Medica</p>
              <p className="font-medium text-sm mt-1">
                {passport?.medicalClearance
                  ? `Vence: ${new Date(passport.medicalClearance.expiresAt).toLocaleDateString('es-UY')}`
                  : 'No cargada'}
              </p>
            </div>
          </div>
        </div>

        {/* Career Stats */}
        <div className="card mb-6">
          <h3 className="font-semibold text-gray-900 mb-4">Estadisticas de Carrera</h3>
          <div className="grid grid-cols-5 gap-4">
            {[
              { label: 'Partidos', value: passport?.career.totalMatches || 0 },
              { label: 'Goles', value: passport?.career.totalGoals || 0 },
              { label: 'Asistencias', value: passport?.career.totalAssists || 0 },
              { label: 'Amarillas', value: passport?.career.totalYellowCards || 0 },
              { label: 'Rojas', value: passport?.career.totalRedCards || 0 },
            ].map((stat, i) => (
              <div key={i} className="text-center">
                <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
                <p className="text-xs text-gray-500">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Identity Verification Upload */}
        <div className="card mb-6">
          <h3 className="font-semibold text-gray-900 mb-1">Verificacion de Identidad</h3>
          <p className="text-sm text-gray-500 mb-4">Subi fotos de tu cedula y una selfie para verificar tu identidad.</p>

          {passport?.identityStatus === 'APPROVED' ? (
            <div className="bg-green-50 p-3 rounded-lg text-sm text-green-700">
              Identidad verificada correctamente.
            </div>
          ) : passport?.identityStatus === 'PENDING' ? (
            <div className="bg-yellow-50 p-3 rounded-lg text-sm text-yellow-700">
              Documentos enviados. Pendiente de revision por el administrador.
            </div>
          ) : (
            <div className="space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Frente de CI</label>
                  <input ref={ciFrontRef} type="file" accept="image/*" className="text-sm w-full file:mr-2 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-sm file:bg-primary/10 file:text-primary hover:file:bg-primary/20" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Dorso de CI</label>
                  <input ref={ciBackRef} type="file" accept="image/*" className="text-sm w-full file:mr-2 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-sm file:bg-primary/10 file:text-primary hover:file:bg-primary/20" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Selfie</label>
                  <input ref={selfieRef} type="file" accept="image/*" className="text-sm w-full file:mr-2 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-sm file:bg-primary/10 file:text-primary hover:file:bg-primary/20" />
                </div>
              </div>
              <button className="btn-primary text-sm" onClick={handleIdentityUpload} disabled={uploading}>
                {uploading ? 'Subiendo...' : 'Enviar documentos'}
              </button>
            </div>
          )}
        </div>

        {/* Medical Clearance Upload */}
        <div className="card mb-6">
          <h3 className="font-semibold text-gray-900 mb-1">Ficha Medica</h3>
          <p className="text-sm text-gray-500 mb-4">Subi tu certificado medico deportivo vigente.</p>

          {passport?.medicalClearance ? (
            <div className="bg-green-50 p-3 rounded-lg text-sm text-green-700 mb-4">
              Ficha medica vigente hasta {new Date(passport.medicalClearance.expiresAt).toLocaleDateString('es-UY')}.
            </div>
          ) : null}

          <div className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Documento (PDF o imagen)</label>
              <input ref={medicalRef} type="file" accept="image/*,.pdf" className="text-sm w-full file:mr-2 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-sm file:bg-primary/10 file:text-primary hover:file:bg-primary/20" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Fecha de emision</label>
                <input type="date" className="input-field text-sm" value={medicalDates.issuedAt}
                  onChange={e => setMedicalDates(p => ({ ...p, issuedAt: e.target.value }))} />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Fecha de vencimiento</label>
                <input type="date" className="input-field text-sm" value={medicalDates.expiresAt}
                  onChange={e => setMedicalDates(p => ({ ...p, expiresAt: e.target.value }))} />
              </div>
            </div>
            <button className="btn-primary text-sm" onClick={handleMedicalUpload} disabled={uploading}>
              {uploading ? 'Subiendo...' : passport?.medicalClearance ? 'Actualizar ficha medica' : 'Subir ficha medica'}
            </button>
          </div>
        </div>

        {/* Leagues */}
        <div className="card">
          <h3 className="font-semibold text-gray-900 mb-4">Ligas</h3>
          {passport?.leagues && passport.leagues.length > 0 ? (
            <div className="space-y-3">
              {passport.leagues.map(league => (
                <div key={league.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                  <div className="w-8 h-8 bg-primary rounded flex items-center justify-center text-white text-sm font-bold">
                    {league.name[0]}
                  </div>
                  <span className="font-medium text-gray-900">{league.name}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 text-sm">Aun no participas en ninguna liga.</p>
          )}
        </div>
      </div>
    </div>
  );
}
