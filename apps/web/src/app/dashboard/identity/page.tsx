'use client';

import { useCallback, useEffect, useState } from 'react';
import { useTenant } from '@/lib/tenant-context';
import { useAuth } from '@/lib/auth-context';
import { aufaIdApi, fetchPrivateFile } from '@/lib/api';

interface PendingIdentity {
  playerId: string;
  aufaId: string;
  fullName: string;
  ci: string;
  dateOfBirth: string;
  teamName: string | null;
  ciPhotoFrontUrl: string | null;
  ciPhotoBackUrl: string | null;
  selfieUrl: string | null;
  submittedAt: string;
}

/**
 * Documents live behind /api/files, which demands an Authorization header.
 * A plain <img src> cannot send one, so the bytes are fetched here and shown
 * through an object URL that is revoked when the image unmounts.
 */
function SecureImage({ path, alt }: { path: string | null; alt: string }) {
  const { token } = useAuth();
  const [src, setSrc] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!path || !token) return;
    let objectUrl: string | null = null;
    let cancelled = false;

    fetchPrivateFile(path, token)
      .then((url) => {
        if (cancelled) {
          URL.revokeObjectURL(url);
          return;
        }
        objectUrl = url;
        setSrc(url);
      })
      .catch(() => !cancelled && setFailed(true));

    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [path, token]);

  const frame = 'w-full h-40 rounded-lg border border-gray-200 flex items-center justify-center text-xs';

  if (!path) return <div className={`${frame} bg-gray-50 text-gray-400`}>Sin archivo</div>;
  if (failed) return <div className={`${frame} bg-red-50 text-red-500`}>No se pudo cargar</div>;
  if (!src) return <div className={`${frame} bg-gray-50 text-gray-400 animate-pulse`}>Cargando...</div>;

  return (
    <a href={src} target="_blank" rel="noreferrer" title="Abrir en tamano completo">
      <img src={src} alt={alt} className={`${frame} object-contain bg-gray-900/5`} />
    </a>
  );
}

export default function IdentityReviewPage() {
  const { tenantId } = useTenant();
  const { token } = useAuth();
  const [pending, setPending] = useState<PendingIdentity[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [busyPlayerId, setBusyPlayerId] = useState<string | null>(null);
  const [message, setMessage] = useState<{ text: string; type: 'ok' | 'error' } | null>(null);

  const load = useCallback(() => {
    if (!tenantId || !token) return;
    setIsLoading(true);
    aufaIdApi
      .listPendingIdentities(tenantId, token)
      .then(setPending)
      .catch((error: Error) => setMessage({ text: error.message, type: 'error' }))
      .finally(() => setIsLoading(false));
  }, [tenantId, token]);

  useEffect(load, [load]);

  async function decide(player: PendingIdentity, status: 'APPROVED' | 'REJECTED') {
    if (!tenantId || !token) return;

    let reason: string | undefined;
    if (status === 'REJECTED') {
      const answer = window.prompt(
        `Motivo del rechazo de ${player.fullName} (se le informa al jugador):`
      );
      if (answer === null) return;
      reason = answer.trim() || undefined;
    } else if (!window.confirm(`Aprobar la identidad de ${player.fullName}?`)) {
      return;
    }

    setBusyPlayerId(player.playerId);
    try {
      await aufaIdApi.validateIdentity(tenantId, token, player.playerId, status, reason);
      // La lista es de pendientes: resuelto uno, deja de pertenecer.
      setPending((current) => current.filter((p) => p.playerId !== player.playerId));
      setMessage({
        text: `Identidad de ${player.fullName} ${status === 'APPROVED' ? 'aprobada' : 'rechazada'}.`,
        type: 'ok',
      });
    } catch (error) {
      setMessage({ text: (error as Error).message, type: 'error' });
    } finally {
      setBusyPlayerId(null);
    }
  }

  return (
    <div>
      <div className="flex items-start justify-between mb-2">
        <h1 className="text-2xl font-bold text-gray-900">Validacion de Identidad</h1>
        <button onClick={load} className="text-sm text-primary hover:underline" disabled={isLoading}>
          Actualizar
        </button>
      </div>
      <p className="text-sm text-gray-500 mb-8 max-w-3xl">
        Compara la selfie con la foto de la cedula y verifica que el numero coincida con el declarado.
        La aprobacion vale para todo AUFA: una vez aprobada, el jugador queda verificado en cualquier
        liga. Solo aparecen jugadores fichados en un equipo de esta liga.
      </p>

      {message && (
        <div
          className={`mb-6 px-4 py-3 rounded-lg text-sm ${
            message.type === 'ok' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
          }`}
        >
          {message.text}
        </div>
      )}

      {isLoading ? (
        <div className="card text-center py-12 text-gray-500">Cargando...</div>
      ) : pending.length === 0 ? (
        <div className="card text-center py-12 text-gray-500">
          <p>No hay identidades pendientes de revision.</p>
          <p className="text-sm text-gray-400 mt-1">
            Los jugadores aparecen aca cuando suben su cedula y selfie desde Mi AUFA ID.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {pending.map((player) => (
            <div key={player.playerId} className="card">
              <div className="flex flex-wrap items-start justify-between gap-4 mb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-gray-900">{player.fullName}</span>
                    <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-700">
                      Pendiente
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 mt-1">
                    CI {player.ci} · AUFA ID {player.aufaId}
                    {player.teamName && ` · ${player.teamName}`}
                  </p>
                  <p className="text-xs text-gray-400 mt-1">
                    Nacimiento: {new Date(player.dateOfBirth).toLocaleDateString('es-UY')} · Enviado:{' '}
                    {new Date(player.submittedAt).toLocaleDateString('es-UY')}
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => decide(player, 'APPROVED')}
                    disabled={busyPlayerId === player.playerId}
                    className="px-4 py-2 rounded-lg text-sm font-medium bg-green-600 text-white hover:bg-green-700 disabled:opacity-50"
                  >
                    Aprobar
                  </button>
                  <button
                    onClick={() => decide(player, 'REJECTED')}
                    disabled={busyPlayerId === player.playerId}
                    className="px-4 py-2 rounded-lg text-sm font-medium bg-white text-red-600 border border-red-200 hover:bg-red-50 disabled:opacity-50"
                  >
                    Rechazar
                  </button>
                </div>
              </div>

              <div className="grid sm:grid-cols-3 gap-4">
                <div>
                  <p className="text-xs font-medium text-gray-500 mb-1">Cedula (frente)</p>
                  <SecureImage path={player.ciPhotoFrontUrl} alt={`Cedula frente de ${player.fullName}`} />
                </div>
                <div>
                  <p className="text-xs font-medium text-gray-500 mb-1">Cedula (dorso)</p>
                  <SecureImage path={player.ciPhotoBackUrl} alt={`Cedula dorso de ${player.fullName}`} />
                </div>
                <div>
                  <p className="text-xs font-medium text-gray-500 mb-1">Selfie</p>
                  <SecureImage path={player.selfieUrl} alt={`Selfie de ${player.fullName}`} />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
