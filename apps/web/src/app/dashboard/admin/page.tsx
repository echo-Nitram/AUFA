'use client';

import { useEffect, useState } from 'react';
import { useTenant } from '@/lib/tenant-context';
import { useAuth } from '@/lib/auth-context';
import { adminApi } from '@/lib/api';

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
}

export default function AdminPage() {
  const { tenantId } = useTenant();
  const { token } = useAuth();
  const [tab, setTab] = useState<'members' | 'branding'>('members');

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
    </div>
  );
}
