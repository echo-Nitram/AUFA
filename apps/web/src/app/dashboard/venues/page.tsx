'use client';

import { useEffect, useState } from 'react';
import { useTenant } from '@/lib/tenant-context';
import { useAuth } from '@/lib/auth-context';
import { leagueApi } from '@/lib/api';

interface VenueSlot {
  id: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
}

interface Venue {
  id: string;
  name: string;
  address: string | null;
  slots: VenueSlot[];
}

const DAY_NAMES = ['Domingo', 'Lunes', 'Martes', 'Miercoles', 'Jueves', 'Viernes', 'Sabado'];
const DAY_SHORT = ['Dom', 'Lun', 'Mar', 'Mie', 'Jue', 'Vie', 'Sab'];

export default function VenuesPage() {
  const { tenantId } = useTenant();
  const { token } = useAuth();

  const [venues, setVenues] = useState<Venue[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [msg, setMsg] = useState('');
  const [msgType, setMsgType] = useState<'success' | 'error'>('success');

  // Create/edit form
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ name: '', address: '' });
  const [formSlots, setFormSlots] = useState<{ dayOfWeek: number; startTime: string; endTime: string }[]>([]);
  const [saving, setSaving] = useState(false);

  function loadVenues() {
    if (!tenantId) return;
    leagueApi.listVenues(tenantId)
      .then(setVenues)
      .catch(console.error)
      .finally(() => setIsLoading(false));
  }

  useEffect(() => { loadVenues(); }, [tenantId]);

  function showMsg(text: string, type: 'success' | 'error') {
    setMsg(text);
    setMsgType(type);
    if (type === 'success') setTimeout(() => setMsg(''), 4000);
  }

  function openCreate() {
    setEditingId(null);
    setForm({ name: '', address: '' });
    setFormSlots([]);
    setShowForm(true);
  }

  function openEdit(venue: Venue) {
    setEditingId(venue.id);
    setForm({ name: venue.name, address: venue.address || '' });
    setFormSlots(venue.slots.map(s => ({ dayOfWeek: s.dayOfWeek, startTime: s.startTime, endTime: s.endTime })));
    setShowForm(true);
  }

  function addSlot() {
    setFormSlots(prev => [...prev, { dayOfWeek: 6, startTime: '09:00', endTime: '23:00' }]);
  }

  function removeSlot(index: number) {
    setFormSlots(prev => prev.filter((_, i) => i !== index));
  }

  function updateSlot(index: number, field: string, value: any) {
    setFormSlots(prev => prev.map((s, i) => i === index ? { ...s, [field]: value } : s));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!tenantId || !token || !form.name.trim()) return;
    setSaving(true);

    try {
      const data = { name: form.name, address: form.address || null, slots: formSlots };

      if (editingId) {
        await leagueApi.updateVenue(tenantId, token, editingId, data);
        showMsg('Cancha actualizada', 'success');
      } else {
        await leagueApi.createVenue(tenantId, token, data);
        showMsg('Cancha creada', 'success');
      }
      setShowForm(false);
      loadVenues();
    } catch (err: any) {
      showMsg(err.message, 'error');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(venueId: string, name: string) {
    if (!tenantId || !token) return;
    if (!confirm(`Seguro que quieres eliminar "${name}"? Los partidos asignados quedaran sin cancha.`)) return;

    try {
      await leagueApi.deleteVenue(tenantId, token, venueId);
      showMsg('Cancha eliminada', 'success');
      loadVenues();
    } catch (err: any) {
      showMsg(err.message, 'error');
    }
  }

  if (isLoading) {
    return <div className="flex items-center justify-center py-20"><div className="text-gray-500">Cargando canchas...</div></div>;
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Canchas</h1>
        <button className="btn-primary text-sm" onClick={openCreate}>+ Nueva Cancha</button>
      </div>

      {msg && (
        <div className={`mb-4 p-3 rounded-lg text-sm ${msgType === 'error' ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'}`}>
          {msg}
        </div>
      )}

      {/* Create/Edit Form */}
      {showForm && (
        <div className="card mb-6 border-2 border-primary/20">
          <h3 className="font-semibold text-gray-900 mb-4">{editingId ? 'Editar Cancha' : 'Nueva Cancha'}</h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nombre</label>
                <input type="text" className="input-field" placeholder="Cancha Principal" required
                  value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} autoFocus />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Direccion</label>
                <input type="text" className="input-field" placeholder="Av. Rivera 1234"
                  value={form.address} onChange={e => setForm(p => ({ ...p, address: e.target.value }))} />
              </div>
            </div>

            {/* Horarios disponibles */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-medium text-gray-700">Horarios Disponibles</label>
                <button type="button" className="text-sm text-primary hover:underline" onClick={addSlot}>+ Agregar horario</button>
              </div>

              {formSlots.length === 0 ? (
                <p className="text-sm text-gray-400">Sin horarios definidos. Agrega horarios para indicar cuando se puede jugar.</p>
              ) : (
                <div className="space-y-2">
                  {formSlots.map((slot, i) => (
                    <div key={i} className="flex items-center gap-3 bg-gray-50 p-3 rounded-lg">
                      <select className="input-field text-sm w-36" value={slot.dayOfWeek}
                        onChange={e => updateSlot(i, 'dayOfWeek', parseInt(e.target.value))}>
                        {DAY_NAMES.map((name, d) => <option key={d} value={d}>{name}</option>)}
                      </select>
                      <input type="time" className="input-field text-sm w-28" value={slot.startTime}
                        onChange={e => updateSlot(i, 'startTime', e.target.value)} />
                      <span className="text-gray-400 text-sm">a</span>
                      <input type="time" className="input-field text-sm w-28" value={slot.endTime}
                        onChange={e => updateSlot(i, 'endTime', e.target.value)} />
                      <button type="button" className="text-sm text-red-500 hover:text-red-700" onClick={() => removeSlot(i)}>
                        Quitar
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex items-center gap-3">
              <button type="submit" className="btn-primary text-sm" disabled={saving}>
                {saving ? 'Guardando...' : editingId ? 'Guardar Cambios' : 'Crear Cancha'}
              </button>
              <button type="button" className="text-sm text-gray-500 hover:text-gray-700" onClick={() => setShowForm(false)}>
                Cancelar
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Venue list */}
      {venues.length === 0 ? (
        <div className="card text-center py-12">
          <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <span className="text-gray-400 text-2xl font-bold">C</span>
          </div>
          <p className="text-gray-500 mb-4">No hay canchas registradas</p>
          <button className="btn-primary text-sm" onClick={openCreate}>Crear primera cancha</button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {venues.map(venue => (
            <div key={venue.id} className="card hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="font-semibold text-gray-900">{venue.name}</h3>
                  {venue.address && <p className="text-sm text-gray-500">{venue.address}</p>}
                </div>
                <div className="flex gap-2">
                  <button className="text-xs text-primary hover:underline" onClick={() => openEdit(venue)}>Editar</button>
                  <button className="text-xs text-red-500 hover:underline" onClick={() => handleDelete(venue.id, venue.name)}>Eliminar</button>
                </div>
              </div>

              {venue.slots.length > 0 ? (
                <div>
                  <p className="text-xs text-gray-400 mb-2">Horarios:</p>
                  <div className="flex flex-wrap gap-1">
                    {venue.slots
                      .sort((a, b) => a.dayOfWeek - b.dayOfWeek)
                      .map(slot => (
                        <span key={slot.id} className="text-xs bg-green-50 text-green-700 px-2 py-0.5 rounded">
                          {DAY_SHORT[slot.dayOfWeek]} {slot.startTime}-{slot.endTime}
                        </span>
                      ))}
                  </div>
                </div>
              ) : (
                <p className="text-xs text-gray-400">Sin horarios definidos</p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
