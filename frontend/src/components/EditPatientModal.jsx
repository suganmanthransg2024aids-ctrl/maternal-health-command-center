import React, { useState } from 'react';
import { X, Pencil, RotateCcw } from 'lucide-react';
import { useTheme } from '../ThemeContext';

const API = '/api';

const BRIGHT_SHADE = { '#3B82F6': '#1D4ED8', '#FBBF24': '#B45309', '#FCA5A5': '#DC2626' };
function shade(hex, dark) { return dark ? hex : (BRIGHT_SHADE[hex] || hex); }

/* Editable fields, grouped for the form layout. */
const SECTIONS = [
  {
    title: 'Pregnancy',
    fields: [
      { key: 'edd',     label: 'EDD',     placeholder: 'DD-MM-YYYY' },
      { key: 'lmp',     label: 'LMP',     placeholder: 'DD-MM-YYYY' },
      { key: 'weeks',   label: 'Weeks' },
      { key: 'gravida', label: 'Gravida' },
      { key: 'para',    label: 'Para' },
    ],
  },
  {
    title: 'Vitals & Labs',
    fields: [
      { key: 'hb',            label: 'Hb' },
      { key: 'bp',            label: 'BP' },
      { key: 'weight',        label: 'Weight' },
      { key: 'height',        label: 'Height' },
      { key: 'blood_group',   label: 'Blood Group' },
      { key: 'gct',           label: 'GCT' },
      { key: 'ppbs',          label: 'PPBS / FBS' },
      { key: 'tsh',           label: 'TSH' },
      { key: 'usg',           label: 'USG' },
      { key: 'echo_ecg',      label: 'Echo / ECG' },
      { key: 'urine_routine', label: 'Urine Routine' },
      { key: 'sputum_afb',    label: 'Sputum AFB' },
    ],
  },
  {
    title: 'Contact & Identity',
    fields: [
      { key: 'mother_name',  label: 'Mother Name' },
      { key: 'cell_no',      label: 'Mobile Number' },
      { key: 'husband_name', label: 'Husband Name' },
      { key: 'address',      label: 'Address', wide: true },
    ],
  },
  {
    title: 'Risk & Follow-Up',
    fields: [
      { key: 'high_risk_raw',   label: 'High Risk Factors', wide: true, textarea: true },
      { key: 'birth_plan',      label: 'Birth Plan' },
      { key: 'referral',        label: 'Referral' },
      { key: 'last_visit_date', label: 'Last Visit', placeholder: 'DD-MM-YYYY' },
      { key: 'next_visit_date', label: 'Next Visit', placeholder: 'DD-MM-YYYY' },
    ],
  },
];

const cleanVal = (v) => (v === null || v === undefined || v === 'nan' ? '' : String(v));

/**
 * Edit patient details (EDD, Hb, BP…). Sends only changed fields as an app
 * override; days-to-EDD and risk category are recomputed server-side.
 */
export default function EditPatientModal({ patient, user, onClose, onSaved }) {
  const { theme } = useTheme();
  const dark = theme !== 'bright';
  const initial = {};
  for (const s of SECTIONS) for (const f of s.fields) initial[f.key] = cleanVal(patient?.[f.key]);

  const [form,   setForm]   = useState(initial);
  const [saving, setSaving] = useState(false);
  const [error,  setError]  = useState('');

  if (!patient) return null;

  const changedKeys = Object.keys(form).filter(k => form[k] !== initial[k]);

  const save = async () => {
    if (changedKeys.length === 0) { onClose(); return; }
    setSaving(true);
    setError('');
    const updates = Object.fromEntries(changedKeys.map(k => [k, form[k]]));
    try {
      const r = await fetch(`${API}/patients/${patient.uid}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ updates, updated_by: user?.role || '' }),
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

  const resetOverrides = async () => {
    setSaving(true);
    setError('');
    try {
      const r = await fetch(`${API}/patients/${patient.uid}/overrides`, { method: 'DELETE' });
      const d = await r.json();
      if (!r.ok) { setError(d.error || 'Failed to reset'); setSaving(false); return; }
      if (onSaved) onSaved(d.patient);
      onClose();
    } catch {
      setError('Could not reach server');
      setSaving(false);
    }
  };

  const inputStyle = {
    background: 'var(--ccmc-surface)',
    border: '1px solid var(--ccmc-border)',
    color: 'var(--ccmc-text)',
  };

  const hasOverrides = (patient.edited_fields && patient.edited_fields.length > 0)
    || patient.delivery_source === 'app'
    || patient.is_aborted;

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4"
      style={{ background: 'var(--ccmc-modal-backdrop)', backdropFilter: 'blur(8px)' }}
      onClick={onClose}>
      <div className="w-full max-w-2xl rounded-2xl flex flex-col"
        style={{ background: 'var(--ccmc-panel)', border: '1px solid rgba(59,130,246,0.35)', maxHeight: '90vh' }}
        onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-5 pb-3 flex-shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center"
              style={{ background: 'rgba(59,130,246,0.15)' }}>
              <Pencil className="w-4 h-4" style={{ color: shade('#3B82F6', dark) }} />
            </div>
            <div>
              <h3 className="text-sm font-bold" style={{ color: 'var(--ccmc-text)' }}>Edit Patient Details</h3>
              <p className="text-[10px]" style={{ color: 'var(--ccmc-text-hint)' }}>
                {patient.mother_name || 'Unknown'} · {patient.phc_display || ''} · changes are saved as app
                overrides on top of the spreadsheet
              </p>
            </div>
          </div>
          <button onClick={onClose}><X className="w-4 h-4" style={{ color: 'var(--ccmc-text-hint)' }} /></button>
        </div>

        {/* Scrollable form body */}
        <div className="flex-1 overflow-y-auto px-6 pb-2 space-y-4">
          {SECTIONS.map(section => (
            <div key={section.title}>
              <div className="text-[10px] font-bold uppercase tracking-wider mb-2"
                style={{ color: 'var(--ccmc-text-sec)' }}>
                {section.title}
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                {section.fields.map(f => (
                  <label key={f.key} className={`block ${f.wide ? 'col-span-2 sm:col-span-3' : ''}`}>
                    <span className="text-[9px] font-bold uppercase tracking-wider"
                      style={{ color: form[f.key] !== initial[f.key] ? shade('#FBBF24', dark) : 'var(--ccmc-text-hint)' }}>
                      {f.label}{form[f.key] !== initial[f.key] ? ' •' : ''}
                    </span>
                    {f.textarea ? (
                      <textarea value={form[f.key]} rows={2}
                        onChange={e => setForm(prev => ({ ...prev, [f.key]: e.target.value }))}
                        placeholder={f.placeholder || ''}
                        className="w-full mt-0.5 px-2.5 py-1.5 rounded-lg text-xs outline-none resize-none"
                        style={inputStyle} />
                    ) : (
                      <input value={form[f.key]}
                        onChange={e => setForm(prev => ({ ...prev, [f.key]: e.target.value }))}
                        placeholder={f.placeholder || ''}
                        className="w-full mt-0.5 px-2.5 py-1.5 rounded-lg text-xs outline-none"
                        style={inputStyle} />
                    )}
                  </label>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 flex-shrink-0 space-y-2"
          style={{ borderTop: '1px solid var(--ccmc-border)' }}>
          {error && <p className="text-xs font-semibold" style={{ color: shade('#FCA5A5', dark) }}>{error}</p>}
          <div className="flex items-center gap-2">
            <button onClick={save} disabled={saving}
              className="flex-1 py-2.5 rounded-lg text-sm font-bold text-white"
              style={{ background: 'linear-gradient(135deg, #1E40AF, #2563EB)', opacity: saving ? 0.7 : 1 }}>
              {saving ? 'Saving…' : changedKeys.length > 0
                ? `Save ${changedKeys.length} Change${changedKeys.length > 1 ? 's' : ''}`
                : 'Nothing Changed'}
            </button>
            {hasOverrides && (
              <button onClick={resetOverrides} disabled={saving}
                title="Remove all app edits and revert to spreadsheet values"
                className="px-3 py-2.5 rounded-lg text-xs font-bold flex items-center gap-1.5"
                style={{ background: 'var(--ccmc-pill-critical-bg)', border: '1px solid rgba(220,38,38,0.3)', color: 'var(--ccmc-pill-critical-text)' }}>
                <RotateCcw className="w-3 h-3" />
                Reset to Sheet
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
