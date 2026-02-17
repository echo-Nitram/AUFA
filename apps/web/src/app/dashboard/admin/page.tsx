'use client';

import { useEffect, useState, useRef } from 'react';
import { useTenant } from '@/lib/tenant-context';
import { useAuth } from '@/lib/auth-context';
import { adminApi, uploadApi, assetUrl } from '@/lib/api';

interface Member {
  id: string;
  role: string;
  isActive: boolean;
  user: { id: string; email: string; role: string };
}

interface Settings {
  id: string;
  name: string;
  slug: string;
  plan: string;
  logoUrl: string | null;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  backgroundColor: string;
  textColor: string;
  matchFee: number | null;
  refereeFee: number | null;
  monthlyFee: number | null;
  currency: string;
}

export default function AdminPage() {
  const { tenantId } = useTenant();
  const { token } = useAuth();
  const [tab, setTab] = useState<'members' | 'branding' | 'pricing'>('members');

  // Members state
  const [members, setMembers] = useState<Member[]>([]);
  const [newEmail, setNewEmail] = useState('');
  const [newRole, setNewRole] = useState<'ADMIN' | 'OPERATOR'>('OPERATOR');
  const [membersMsg, setMembersMsg] = useState('');

  // Settings state
  const [settings, setSettings] = useState<Settings | null>(null);
  const [brandingForm, setBrandingForm] = useState({
    name: '', primaryColor: '', secondaryColor: '', accentColor: '', backgroundColor: '', textColor: '',
  });
  const [brandingMsg, setBrandingMsg] = useState('');
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const logoRef = useRef<HTMLInputElement>(null);

  // Pricing state
  const [pricingForm, setPricingForm] = useState({
    matchFee: '', refereeFee: '', monthlyFee: '', currency: 'UYU',
  });
  const [pricingMsg, setPricingMsg] = useState('');

  useEffect(() => {
    if (!tenantId || !token) return;
    loadMembers();
    loadSettings();
  }, [tenantId, token]);

  async function loadMembers() {
    if (!tenantId || !token) return;
    try {
      const data = await adminApi.listMembers(tenantId, token);
      setMembers(data.filter((m: Member) => m.isActive));
    } catch (err: any) { setMembersMsg(err.message); }
  }

  async function loadSettings() {
    if (!tenantId || !token) return;
    try {
      const data = await adminApi.getSettings(tenantId, token);
      setSettings(data);
      setBrandingForm({
        name: data.name,
        primaryColor: data.primaryColor,
        secondaryColor: data.secondaryColor,
        accentColor: data.accentColor,
        backgroundColor: data.backgroundColor,
        textColor: data.textColor,
      });
      setPricingForm({
        matchFee: data.matchFee?.toString() || '',
        refereeFee: data.refereeFee?.toString() || '',
        monthlyFee: data.monthlyFee?.toString() || '',
        currency: data.currency || 'UYU',
      });
    } catch (err: any) { setBrandingMsg(err.message); }
  }

  async function handleAddMember(e: React.FormEvent) {
    e.preventDefault();
    if (!tenantId || !token || !newEmail) return;
    setMembersMsg('');
    try {
      await adminApi.addMember(tenantId, token, { email: newEmail, role: newRole });
      setNewEmail('');
      setMembersMsg('Miembro agregado');
      loadMembers();
    } catch (err: any) { setMembersMsg(err.message); }
  }

  async function handleChangeRole(memberId: string, role: string) {
    if (!tenantId || !token) return;
    try {
      await adminApi.updateMemberRole(tenantId, token, memberId, role);
      loadMembers();
    } catch (err: any) { setMembersMsg(err.message); }
  }

  async function handleRemoveMember(memberId: string) {
    if (!tenantId || !token) return;
    if (!confirm('Seguro que queres eliminar este miembro?')) return;
    try {
      await adminApi.removeMember(tenantId, token, memberId);
      loadMembers();
    } catch (err: any) { setMembersMsg(err.message); }
  }

  async function handleSaveBranding(e: React.FormEvent) {
    e.preventDefault();
    if (!tenantId || !token) return;
    setBrandingMsg('');
    try {
      await adminApi.updateSettings(tenantId, token, brandingForm);
      setBrandingMsg('Configuracion guardada');
      loadSettings();
    } catch (err: any) { setBrandingMsg(err.message); }
  }

  async function handleLogoUpload() {
    const file = logoRef.current?.files?.[0];
    if (!file || !token || !tenantId) return;
    setUploadingLogo(true);
    setBrandingMsg('');
    try {
      const result = await uploadApi.uploadLogo(token, file);
      // Save the logo URL to tenant settings
      await adminApi.updateSettings(tenantId, token, { logoUrl: result.url });
      setBrandingMsg('Logo actualizado');
      loadSettings();
    } catch (err: any) {
      setBrandingMsg(err.message);
    } finally {
      setUploadingLogo(false);
      if (logoRef.current) logoRef.current.value = '';
    }
  }

  async function handleSavePricing(e: React.FormEvent) {
    e.preventDefault();
    if (!tenantId || !token) return;
    setPricingMsg('');
    try {
      await adminApi.updateSettings(tenantId, token, {
        matchFee: pricingForm.matchFee || null,
        refereeFee: pricingForm.refereeFee || null,
        monthlyFee: pricingForm.monthlyFee || null,
        currency: pricingForm.currency,
      });
      setPricingMsg('Precios guardados');
      loadSettings();
    } catch (err: any) { setPricingMsg(err.message); }
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Administrar Liga</h1>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-lg p-1 mb-6 w-fit">
        <button
          className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
            tab === 'members' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
          }`}
          onClick={() => setTab('members')}
        >
          Miembros y Roles
        </button>
        <button
          className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
            tab === 'branding' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
          }`}
          onClick={() => setTab('branding')}
        >
          Marca y Colores
        </button>
        <button
          className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
            tab === 'pricing' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
          }`}
          onClick={() => setTab('pricing')}
        >
          Precios
        </button>
      </div>

      {/* Members Tab */}
      {tab === 'members' && (
        <div className="space-y-6">
          {membersMsg && (
            <div className="p-3 rounded-lg text-sm bg-blue-50 text-blue-700">{membersMsg}</div>
          )}

          {/* Add member form */}
          <form onSubmit={handleAddMember} className="card">
            <h3 className="font-semibold text-gray-900 mb-3">Agregar Miembro</h3>
            <div className="flex items-end gap-3">
              <div className="flex-1">
                <label className="block text-sm text-gray-600 mb-1">Email del usuario</label>
                <input
                  type="email"
                  className="input-field"
                  placeholder="usuario@ejemplo.com"
                  value={newEmail}
                  onChange={e => setNewEmail(e.target.value)}
                  required
                />
              </div>
              <div className="w-40">
                <label className="block text-sm text-gray-600 mb-1">Rol</label>
                <select className="input-field" value={newRole} onChange={e => setNewRole(e.target.value as any)}>
                  <option value="OPERATOR">Operador</option>
                  <option value="ADMIN">Administrador</option>
                </select>
              </div>
              <button type="submit" className="btn-primary px-4 py-2.5">Agregar</button>
            </div>
          </form>

          {/* Members list */}
          <div className="card">
            <h3 className="font-semibold text-gray-900 mb-3">Miembros Actuales</h3>
            <div className="divide-y divide-gray-100">
              {members.map(member => (
                <div key={member.id} className="flex items-center justify-between py-3">
                  <div>
                    <p className="font-medium text-gray-900">{member.user.email}</p>
                    <p className="text-xs text-gray-400">ID: {member.user.id.slice(0, 8)}...</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <select
                      className="input-field text-sm w-36"
                      value={member.role}
                      onChange={e => handleChangeRole(member.id, e.target.value)}
                    >
                      <option value="ADMIN">Administrador</option>
                      <option value="OPERATOR">Operador</option>
                    </select>
                    <button
                      className="text-sm text-red-500 hover:text-red-700"
                      onClick={() => handleRemoveMember(member.id)}
                    >
                      Eliminar
                    </button>
                  </div>
                </div>
              ))}
              {members.length === 0 && (
                <p className="py-6 text-center text-gray-400">Sin miembros</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Branding Tab */}
      {tab === 'branding' && (
        <div>
          {brandingMsg && (
            <div className="p-3 rounded-lg text-sm bg-green-50 text-green-700 mb-4">{brandingMsg}</div>
          )}

          <form onSubmit={handleSaveBranding} className="card space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nombre de la Liga</label>
              <input
                className="input-field"
                value={brandingForm.name}
                onChange={e => setBrandingForm(p => ({ ...p, name: e.target.value }))}
              />
            </div>

            {settings && (
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-sm text-gray-500 mb-1">Slug: <span className="font-mono">{settings.slug}</span></p>
                <p className="text-sm text-gray-500">Plan: <span className="font-semibold">{settings.plan}</span></p>
                <p className="text-sm text-gray-500 mt-1">Portal publico: <a href={`/liga/${settings.slug}`} className="text-primary hover:underline">/liga/{settings.slug}</a></p>
              </div>
            )}

            {/* Logo Upload */}
            <div>
              <h3 className="text-sm font-semibold text-gray-900 mb-3">Logo de la Liga</h3>
              <div className="flex items-center gap-4">
                {settings?.logoUrl ? (
                  <img src={assetUrl(settings.logoUrl)}
                    alt="Logo" className="w-16 h-16 rounded-lg object-cover border border-gray-200" />
                ) : (
                  <div className="w-16 h-16 bg-gray-100 rounded-lg flex items-center justify-center text-gray-400 text-xl font-bold">
                    {settings?.name?.[0] || '?'}
                  </div>
                )}
                <div className="flex-1">
                  <input ref={logoRef} type="file" accept="image/jpeg,image/png,image/webp"
                    className="text-sm w-full file:mr-2 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-sm file:bg-primary/10 file:text-primary hover:file:bg-primary/20" />
                  <p className="text-xs text-gray-400 mt-1">JPG, PNG o WebP. Maximo 5MB.</p>
                </div>
                <button type="button" className="btn-primary text-sm" onClick={handleLogoUpload} disabled={uploadingLogo}>
                  {uploadingLogo ? 'Subiendo...' : 'Subir Logo'}
                </button>
              </div>
            </div>

            <div>
              <h3 className="text-sm font-semibold text-gray-900 mb-3">Colores de Marca</h3>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {[
                  { key: 'primaryColor', label: 'Primario' },
                  { key: 'secondaryColor', label: 'Secundario' },
                  { key: 'accentColor', label: 'Acento' },
                  { key: 'backgroundColor', label: 'Fondo' },
                  { key: 'textColor', label: 'Texto' },
                ].map(({ key, label }) => (
                  <div key={key}>
                    <label className="block text-sm text-gray-600 mb-1">{label}</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        className="w-10 h-10 rounded cursor-pointer border border-gray-200"
                        value={(brandingForm as any)[key]}
                        onChange={e => setBrandingForm(p => ({ ...p, [key]: e.target.value }))}
                      />
                      <input
                        className="input-field font-mono text-sm"
                        value={(brandingForm as any)[key]}
                        onChange={e => setBrandingForm(p => ({ ...p, [key]: e.target.value }))}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Preview */}
            <div>
              <h3 className="text-sm font-semibold text-gray-900 mb-3">Vista Previa</h3>
              <div className="rounded-lg overflow-hidden border">
                <div style={{ backgroundColor: brandingForm.primaryColor }} className="px-4 py-3 flex items-center justify-between">
                  <span className="text-white font-bold">{brandingForm.name}</span>
                  <div className="flex gap-2">
                    <span style={{ backgroundColor: brandingForm.accentColor }} className="text-white text-xs px-2 py-1 rounded">Boton</span>
                  </div>
                </div>
                <div style={{ backgroundColor: brandingForm.backgroundColor, color: brandingForm.textColor }} className="p-4 text-sm">
                  <p>Asi se ve el contenido con los colores seleccionados.</p>
                  <p style={{ color: brandingForm.secondaryColor }} className="font-semibold mt-1">Texto secundario</p>
                </div>
              </div>
            </div>

            <button type="submit" className="btn-primary">Guardar Cambios</button>
          </form>
        </div>
      )}

      {/* Pricing Tab */}
      {tab === 'pricing' && (
        <div className="max-w-lg">
          {pricingMsg && (
            <div className="p-3 rounded-lg text-sm bg-green-50 text-green-700 mb-4">{pricingMsg}</div>
          )}

          <form onSubmit={handleSavePricing} className="card space-y-5">
            <div>
              <h3 className="font-semibold text-gray-900 mb-1">Precios de la Liga</h3>
              <p className="text-sm text-gray-500 mb-4">Configura cuanto se cobra por los servicios de la liga.</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Moneda</label>
              <select className="input-field w-32" value={pricingForm.currency}
                onChange={e => setPricingForm(p => ({ ...p, currency: e.target.value }))}>
                <option value="UYU">UYU (Pesos)</option>
                <option value="USD">USD (Dolares)</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Costo por partido (por equipo)</label>
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-400">{pricingForm.currency}</span>
                <input type="number" step="10" min="0" className="input-field"
                  placeholder="Ej: 500" value={pricingForm.matchFee}
                  onChange={e => setPricingForm(p => ({ ...p, matchFee: e.target.value }))} />
              </div>
              <p className="text-xs text-gray-400 mt-1">Lo que paga cada equipo por jugar un partido</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Costo del arbitro (por partido)</label>
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-400">{pricingForm.currency}</span>
                <input type="number" step="10" min="0" className="input-field"
                  placeholder="Ej: 800" value={pricingForm.refereeFee}
                  onChange={e => setPricingForm(p => ({ ...p, refereeFee: e.target.value }))} />
              </div>
              <p className="text-xs text-gray-400 mt-1">Cuanto se le paga al arbitro por partido</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Cuota mensual (por equipo)</label>
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-400">{pricingForm.currency}</span>
                <input type="number" step="10" min="0" className="input-field"
                  placeholder="Ej: 2000" value={pricingForm.monthlyFee}
                  onChange={e => setPricingForm(p => ({ ...p, monthlyFee: e.target.value }))} />
              </div>
              <p className="text-xs text-gray-400 mt-1">Cuota fija mensual que pagan los equipos</p>
            </div>

            {/* Summary */}
            {(pricingForm.matchFee || pricingForm.refereeFee) && (
              <div className="bg-blue-50 p-4 rounded-lg">
                <h4 className="text-sm font-semibold text-blue-900 mb-2">Resumen por fecha</h4>
                <div className="text-sm text-blue-700 space-y-1">
                  {pricingForm.matchFee && (
                    <p>Ingreso cancha: {pricingForm.currency} {Number(pricingForm.matchFee) * 2} (2 equipos x {pricingForm.matchFee})</p>
                  )}
                  {pricingForm.refereeFee && (
                    <p>Gasto arbitro: -{pricingForm.currency} {pricingForm.refereeFee}</p>
                  )}
                  {pricingForm.matchFee && pricingForm.refereeFee && (
                    <p className="font-bold pt-1 border-t border-blue-200">
                      Neto por partido: {pricingForm.currency} {Number(pricingForm.matchFee) * 2 - Number(pricingForm.refereeFee)}
                    </p>
                  )}
                </div>
              </div>
            )}

            <button type="submit" className="btn-primary">Guardar Precios</button>
          </form>
        </div>
      )}
    </div>
  );
}
