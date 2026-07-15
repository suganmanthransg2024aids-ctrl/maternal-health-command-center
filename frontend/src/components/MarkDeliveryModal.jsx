import React, { useState } from 'react';
import { X, Baby, CheckCircle2, RotateCcw } from 'lucide-react';

const API = '/api';

const MODES = ['NVD', 'LSCS', 'Assisted', 'Other'];

/**
 * Assign a mother to "Delivery" (or undo it). Available from every portal —
 * saved as an app override so it survives Google Sheets re-sync, and the
 * mother immediately appears under Delivered / PN monitoring on the dashboard.
 */
export default function MarkDeliveryModal({ patient, user, onClose, onSaved }) {
  const today = new Date().toISOString().slice(0, 10);
  const [date,    setDate]    = useState(today);
  const [mode,    setMode]    = useState('NVD');
  const [place,   setPlace]   = useState('');
  const [remarks, setRemarks] = useState('');
  const [saving,  setSaving]  = useState(false);
  const [error,   setError]   = useState('');

  if (!patient) return null;

  const post = async (body) => {
    setSaving(true);
    setError('');
    try {
      const r = await fetch(`${API}/patients/${patient.uid}/delivery`, {
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

  const save = () => post({
    delivered: true,
    delivery_date: date,
    delivery_mode: mode,
    delivery_place: place,
    remarks,
  });

  const undo = () => post({ delivered: false });

  const inputStyle = {
    background: 'var(--ccmc-surface)',
    border: '1px solid var(--ccmc-border)',
    color: 'var(--ccmc-text)',
    colorScheme: 'dark',
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4"
      style={{ background: 'rgba(2,6,23,0.85)', backdropFilter: 'blur(8px)' }}
      onClick={onClose}>
      <div className="w-full max-w-md rounded-2xl p-6"
        style={{ background: 'var(--ccmc-panel)', border: '1px solid rgba(34,197,94,0.35)' }}
        onClick={e => e.stopPropagation()}>

        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center"
              style={{ background: 'rgba(34,197,94,0.15)' }}>
              <Baby className="w-4 h-4" style={{ color: '#22C55E' }} />
            </div>
            <h3 className="text-sm font-bold" style={{ color: 'var(--ccmc-text)' }}>
              Assign to Delivery
            </h3>
          </div>
          <button onClick={onClose}><X className="w-4 h-4" style={{ color: 'var(--ccmc-text-hint)' }} /></button>
        </div>
        <p className="text-xs mb-4" style={{ color: 'var(--ccmc-text-hint)' }}>
          {patient.mother_name || 'Unknown'} · {patient.phc_display || ''}
        </p>

        {patient.is_delivered && (
          <div className="mb-3 px-3 py-2 rounded-lg text-[11px] flex items-center gap-2"
            style={{ background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.25)', color: '#86EFAC' }}>
            <CheckCircle2 className="w-3.5 h-3.5 flex-shrink-0" />
            Already marked as delivered{patient.delivery_date ? ` on ${patient.delivery_date}` : ''}.
            Saving again updates the details.
          </div>
        )}

        <div className="space-y-3">
          <label className="block">
            <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--ccmc-text-hint)' }}>
              Delivery Date
            </span>
            <input type="date" value={date} max={today}
              onChange={e => setDate(e.target.value)}
              className="w-full mt-1 px-3 py-2 rounded-lg text-sm outline-none"
              style={inputStyle} />
          </label>

          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--ccmc-text-hint)' }}>
              Delivery Mode
            </span>
            <div className="grid grid-cols-4 gap-2 mt-1">
              {MODES.map(m => (
                <button key={m} onClick={() => setMode(m)}
                  className="py-2 rounded-lg text-xs font-bold transition-all"
                  style={{
                    background: mode === m ? 'rgba(34,197,94,0.18)' : 'var(--ccmc-surface)',
                    border: `1.5px solid ${mode === m ? '#22C55E' : 'var(--ccmc-border)'}`,
                    color: mode === m ? '#4ADE80' : 'var(--ccmc-text-hint)',
                  }}>
                  {m}
                </button>
              ))}
            </div>
          </div>

          <label className="block">
            <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--ccmc-text-hint)' }}>
              Place of Delivery
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
              placeholder="Baby details, outcome notes… (optional)"
              className="w-full mt-1 px-3 py-2 rounded-lg text-sm outline-none resize-none"
              style={inputStyle} />
          </label>

          {error && (
            <p className="text-xs font-semibold" style={{ color: '#FCA5A5' }}>{error}</p>
          )}

          <button onClick={save} disabled={saving}
            className="w-full py-2.5 rounded-lg text-sm font-bold text-white"
            style={{ background: 'linear-gradient(135deg, #15803D, #16A34A)', opacity: saving ? 0.7 : 1 }}>
            {saving ? 'Saving…' : 'Confirm Delivery'}
          </button>

          {patient.is_delivered && (
            <button onClick={undo} disabled={saving}
              className="w-full py-2 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5"
              style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', color: '#FCA5A5' }}>
              <RotateCcw className="w-3 h-3" />
              Undo — mark as NOT delivered
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
