import React, { useState } from 'react';
import { X, Baby, HeartCrack, CheckCircle2, RotateCcw } from 'lucide-react';

const API = '/api';

const DELIVERY_MODES = ['NVD', 'LSCS', 'Assisted', 'Other'];
const ABORTION_TYPES = ['Spontaneous', 'MTP', 'Missed', 'Incomplete', 'Other'];

/**
 * Pregnancy Outcome modal — assign a mother to Delivery OR Abortion (or undo).
 * Available from every portal; saved as an app override so it survives the
 * Google Sheets re-sync. Delivered mothers flow into the Delivered KPI + PN
 * monitoring; aborted mothers flow into the Abortions page and leave all
 * due/AN lists.
 */
export default function MarkDeliveryModal({ patient, user, onClose, onSaved }) {
  const today = new Date().toISOString().slice(0, 10);
  const [tab,     setTab]     = useState(patient?.is_aborted ? 'abortion' : 'delivery');
  const [date,    setDate]    = useState(today);
  const [mode,    setMode]    = useState('NVD');
  const [abType,  setAbType]  = useState('Spontaneous');
  const [place,   setPlace]   = useState('');
  const [remarks, setRemarks] = useState('');
  const [saving,  setSaving]  = useState(false);
  const [error,   setError]   = useState('');

  if (!patient) return null;

  const accent = tab === 'delivery' ? '#22C55E' : '#F87171';

  const post = async (path, body) => {
    setSaving(true);
    setError('');
    try {
      const r = await fetch(`${API}/patients/${patient.uid}/${path}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...body, marked_by: user?.role || '' }),
      });
      const d = await r.json();
      if (!r.ok) { setError(d.error || 'Failed to save'); setSaving(false); return; }
      if (onSaved) onSaved(d.patient);
      onClose();
    } catch {
      setError('Could not reach server');
      setSaving(false);
    }
  };

  const save = () => {
    if (tab === 'delivery') {
      post('delivery', {
        delivered: true, delivery_date: date, delivery_mode: mode,
        delivery_place: place, remarks,
      });
    } else {
      post('abortion', {
        aborted: true, abortion_date: date, abortion_type: abType,
        abortion_place: place, remarks,
      });
    }
  };

  const undoDelivery = () => post('delivery', { delivered: false });
  const undoAbortion = () => post('abortion', { aborted: false });

  const inputStyle = {
    background: 'var(--ccmc-surface)',
    border: '1px solid var(--ccmc-border)',
    color: 'var(--ccmc-text)',
    colorScheme: 'dark',
  };

  const typeOptions = tab === 'delivery' ? DELIVERY_MODES : ABORTION_TYPES;
  const typeValue   = tab === 'delivery' ? mode : abType;
  const setType     = tab === 'delivery' ? setMode : setAbType;

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4"
      style={{ background: 'rgba(2,6,23,0.85)', backdropFilter: 'blur(8px)' }}
      onClick={onClose}>
      <div className="w-full max-w-md rounded-2xl p-6"
        style={{ background: 'var(--ccmc-panel)', border: `1px solid ${accent}55` }}
        onClick={e => e.stopPropagation()}>

        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center"
              style={{ background: `${accent}22` }}>
              {tab === 'delivery'
                ? <Baby className="w-4 h-4" style={{ color: accent }} />
                : <HeartCrack className="w-4 h-4" style={{ color: accent }} />}
            </div>
            <h3 className="text-sm font-bold" style={{ color: 'var(--ccmc-text)' }}>
              Pregnancy Outcome
            </h3>
          </div>
          <button onClick={onClose}><X className="w-4 h-4" style={{ color: 'var(--ccmc-text-hint)' }} /></button>
        </div>
        <p className="text-xs mb-4" style={{ color: 'var(--ccmc-text-hint)' }}>
          {patient.mother_name || 'Unknown'} · {patient.phc_display || ''}
        </p>

        {/* Outcome type tabs */}
        <div className="grid grid-cols-2 gap-2 mb-4">
          <button onClick={() => setTab('delivery')}
            className="flex items-center justify-center gap-1.5 py-2.5 rounded-lg text-xs font-bold transition-all"
            style={{
              background: tab === 'delivery' ? 'rgba(34,197,94,0.18)' : 'var(--ccmc-surface)',
              border: `1.5px solid ${tab === 'delivery' ? '#22C55E' : 'var(--ccmc-border)'}`,
              color: tab === 'delivery' ? '#4ADE80' : 'var(--ccmc-text-hint)',
            }}>
            <Baby className="w-3.5 h-3.5" /> Delivery
          </button>
          <button onClick={() => setTab('abortion')}
            className="flex items-center justify-center gap-1.5 py-2.5 rounded-lg text-xs font-bold transition-all"
            style={{
              background: tab === 'abortion' ? 'rgba(248,113,113,0.15)' : 'var(--ccmc-surface)',
              border: `1.5px solid ${tab === 'abortion' ? '#F87171' : 'var(--ccmc-border)'}`,
              color: tab === 'abortion' ? '#FCA5A5' : 'var(--ccmc-text-hint)',
            }}>
            <HeartCrack className="w-3.5 h-3.5" /> Abortion
          </button>
        </div>

        {patient.is_delivered && (
          <div className="mb-3 px-3 py-2 rounded-lg text-[11px] flex items-center gap-2"
            style={{ background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.25)', color: '#86EFAC' }}>
            <CheckCircle2 className="w-3.5 h-3.5 flex-shrink-0" />
            Marked as delivered{patient.delivery_date ? ` on ${patient.delivery_date}` : ''}.
            Saving again updates the details.
          </div>
        )}
        {patient.is_aborted && (
          <div className="mb-3 px-3 py-2 rounded-lg text-[11px] flex items-center gap-2"
            style={{ background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.25)', color: '#FCA5A5' }}>
            <CheckCircle2 className="w-3.5 h-3.5 flex-shrink-0" />
            Marked as abortion{patient.abortion_date ? ` on ${patient.abortion_date}` : ''}.
            Saving again updates the details.
          </div>
        )}

        <div className="space-y-3">
          <label className="block">
            <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--ccmc-text-hint)' }}>
              {tab === 'delivery' ? 'Delivery Date' : 'Abortion Date'}
            </span>
            <input type="date" value={date} max={today}
              onChange={e => setDate(e.target.value)}
              className="w-full mt-1 px-3 py-2 rounded-lg text-sm outline-none"
              style={inputStyle} />
          </label>

          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--ccmc-text-hint)' }}>
              {tab === 'delivery' ? 'Delivery Mode' : 'Abortion Type'}
            </span>
            <div className={`grid gap-2 mt-1 ${typeOptions.length === 4 ? 'grid-cols-4' : 'grid-cols-3'}`}>
              {typeOptions.map(m => (
                <button key={m} onClick={() => setType(m)}
                  className="py-2 rounded-lg text-[11px] font-bold transition-all"
                  style={{
                    background: typeValue === m ? `${accent}22` : 'var(--ccmc-surface)',
                    border: `1.5px solid ${typeValue === m ? accent : 'var(--ccmc-border)'}`,
                    color: typeValue === m ? accent : 'var(--ccmc-text-hint)',
                  }}>
                  {m}
                </button>
              ))}
            </div>
          </div>

          <label className="block">
            <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--ccmc-text-hint)' }}>
              Place
            </span>
            <input value={place} onChange={e => setPlace(e.target.value)}
              placeholder="e.g. FCH / MCH / Govt Hospital / Private…"
              className="w-full mt-1 px-3 py-2 rounded-lg text-sm outline-none"
              style={inputStyle} />
          </label>

          <label className="block">
            <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--ccmc-text-hint)' }}>
              Remarks
            </span>
            <textarea value={remarks} onChange={e => setRemarks(e.target.value)} rows={2}
              placeholder={tab === 'delivery' ? 'Baby details, outcome notes… (optional)' : 'Clinical notes… (optional)'}
              className="w-full mt-1 px-3 py-2 rounded-lg text-sm outline-none resize-none"
              style={inputStyle} />
          </label>

          {error && (
            <p className="text-xs font-semibold" style={{ color: '#FCA5A5' }}>{error}</p>
          )}

          <button onClick={save} disabled={saving}
            className="w-full py-2.5 rounded-lg text-sm font-bold text-white"
            style={{
              background: tab === 'delivery'
                ? 'linear-gradient(135deg, #15803D, #16A34A)'
                : 'linear-gradient(135deg, #B91C1C, #DC2626)',
              opacity: saving ? 0.7 : 1,
            }}>
            {saving ? 'Saving…' : tab === 'delivery' ? 'Confirm Delivery' : 'Confirm Abortion'}
          </button>

          {patient.is_delivered && (
            <button onClick={undoDelivery} disabled={saving}
              className="w-full py-2 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5"
              style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', color: '#FCA5A5' }}>
              <RotateCcw className="w-3 h-3" />
              Undo — mark as NOT delivered
            </button>
          )}
          {patient.is_aborted && (
            <button onClick={undoAbortion} disabled={saving}
              className="w-full py-2 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5"
              style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', color: '#FCA5A5' }}>
              <RotateCcw className="w-3 h-3" />
              Undo — remove abortion status
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
