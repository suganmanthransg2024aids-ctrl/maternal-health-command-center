import React, { useEffect, useState, useCallback } from 'react';
import {
  Search, Filter, ChevronLeft, ChevronRight, User, Phone, MapPin,
  Activity, Calendar, AlertTriangle, Heart, Eye, ArrowLeft,
  Clock, CheckCircle, X, Baby, Pencil,
} from 'lucide-react';
import MarkDeliveryModal from './MarkDeliveryModal';
import EditPatientModal  from './EditPatientModal';
import { useTheme } from '../ThemeContext';

const API = '/api';

function InfoRow({ label, value, highlight }) {
  if (!value || value === '' || value === 'nan') return null;
  return (
    <div className="flex gap-2">
      <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider w-28 flex-shrink-0 pt-0.5">
        {label}
      </span>
      <span className={`text-xs ${highlight ? 'font-bold text-white' : 'text-slate-300'}`}>
        {value}
      </span>
    </div>
  );
}

function PatientProfile({ uid, onBack, user }) {
  const { theme } = useTheme();
  const dark = theme !== 'bright';
  const [p,       setP]       = useState(null);
  const [loading, setLoading] = useState(true);
  const [callForm, setCallForm] = useState(null);
  const [fuForm,   setFuForm]   = useState(null);
  const [saving,   setSaving]   = useState(false);
  const [showDelivery, setShowDelivery] = useState(false);
  const [showEdit,     setShowEdit]     = useState(false);

  useEffect(() => {
    setLoading(true);
    fetch(`${API}/patients/${uid}`)
      .then(r => r.json()).then(d => { setP(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, [uid]);

  const refetch = () => {
    fetch(`${API}/patients/${uid}`)
      .then(r => r.json()).then(d => setP(d))
      .catch(() => {});
  };

  const saveCall = async () => {
    setSaving(true);
    await fetch(`${API}/calls/${uid}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...callForm, caller_name: user.name }),
    });
    const fresh = await fetch(`${API}/patients/${uid}`).then(r => r.json());
    setP(fresh);
    setCallForm(null);
    setSaving(false);
  };

  const saveFU = async () => {
    setSaving(true);
    await fetch(`${API}/followups/${uid}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(fuForm),
    });
    const fresh = await fetch(`${API}/patients/${uid}`).then(r => r.json());
    setP(fresh);
    setFuForm(null);
    setSaving(false);
  };

  if (loading) return (
    <div className="flex items-center justify-center py-20">
      <div className="w-8 h-8 border-2 rounded-full animate-spin"
        style={{ borderColor: 'var(--ccmc-border-s)', borderTopColor: '#3B82F6' }} />
    </div>
  );
  if (!p) return <div className="text-center py-20 text-slate-500">Patient not found</div>;

  return (
    <div className="space-y-4">
      <button onClick={onBack}
        className="flex items-center gap-2 text-xs font-semibold text-slate-400 hover:text-white transition-colors">
        <ArrowLeft className="w-4 h-4" /> Back to Patient List
      </button>

      {/* Profile card */}
      <div className="rounded-xl p-5"
        style={{ background: 'var(--ccmc-panel)', border: '1px solid var(--ccmc-border)' }}>
        <div className="flex items-start gap-4">
          <div className="w-14 h-14 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: 'var(--ccmc-pill-info-bg)' }}>
            <User className="w-7 h-7" style={{ color: 'var(--ccmc-pill-info-text)' }} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 flex-wrap">
              <h2 className="text-lg font-bold text-white">{p.mother_name || 'Unknown'}</h2>
              {p.is_delivered && (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                  style={{ background: 'var(--ccmc-pill-success-bg)', color: 'var(--ccmc-pill-success-text)', border: '1px solid rgba(22,163,74,0.3)' }}>
                  DELIVERED
                </span>
              )}
              {p.is_aborted && (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                  style={{ background: 'var(--ccmc-pill-critical-bg)', color: 'var(--ccmc-pill-critical-text)', border: '1px solid rgba(248,113,113,0.3)' }}>
                  ABORTION
                </span>
              )}
            </div>
            <div className="text-xs text-slate-400 mt-1">{p.address || 'Address not recorded'}</div>
            <div className="flex flex-wrap gap-3 mt-2 text-xs text-slate-400">
              <span className="flex items-center gap-1"><Phone className="w-3 h-3" />{p.cell_no || 'No number'}</span>
              <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{p.phc_display}</span>
              <span className="flex items-center gap-1"><Activity className="w-3 h-3" />HRT: {p.hrt_name}</span>
              <span>RCH: {p.rch_id || '—'}</span>
            </div>
          </div>
          <div className="flex flex-col sm:flex-row gap-2 flex-shrink-0">
            <button
              onClick={() => setShowDelivery(true)}
              title={p.is_delivered ? 'Delivered — click to edit or undo'
                   : p.is_aborted ? 'Abortion recorded — click to edit or undo'
                   : 'Assign outcome: Delivery or Abortion'}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold"
              style={p.is_aborted
                ? { background: 'var(--ccmc-pill-critical-bg)', border: '1px solid rgba(248,113,113,0.35)', color: 'var(--ccmc-pill-critical-text)' }
                : { background: 'var(--ccmc-pill-success-bg)', border: '1px solid rgba(22,163,74,0.35)', color: 'var(--ccmc-pill-success-text)' }}>
              <Baby className="w-3.5 h-3.5" />
              {p.is_delivered ? 'Delivered ✓' : p.is_aborted ? 'Abortion ✓' : 'Delivery / Abortion'}
            </button>
            <button
              onClick={() => setShowEdit(true)}
              title="Edit EDD, Hb and other details"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold"
              style={{ background: 'var(--ccmc-pill-caution-bg)', border: '1px solid rgba(251,191,36,0.35)', color: 'var(--ccmc-pill-caution-text)' }}>
              <Pencil className="w-3.5 h-3.5" />
              Edit Details
            </button>
          </div>
        </div>
      </div>

      {/* Info grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Clinical */}
        <div className="rounded-xl p-4 space-y-2"
          style={{ background: 'var(--ccmc-panel)', border: '1px solid var(--ccmc-border)' }}>
          <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Clinical Data</div>
          <InfoRow label="Gravida"     value={p.gravida}      highlight />
          <InfoRow label="LMP"         value={p.lmp}          />
          <InfoRow label="EDD"         value={p.edd}          highlight />
          <InfoRow label="Weeks"       value={p.weeks}        highlight />
          <InfoRow label="Height"      value={p.height}       />
          <InfoRow label="Weight"      value={p.weight}       />
          <InfoRow label="BP"          value={p.bp}           highlight />
          <InfoRow label="Hb"          value={p.hb}           highlight />
          <InfoRow label="Blood Group" value={p.blood_group}  />
          <InfoRow label="GCT"         value={p.gct}          />
          <InfoRow label="PPBS"        value={p.ppbs}         />
          <InfoRow label="TSH"         value={p.tsh}          />
        </div>

        {/* Risk factors */}
        <div className="rounded-xl p-4"
          style={{ background: 'var(--ccmc-panel)', border: '1px solid var(--ccmc-border)' }}>
          <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Risk Factors</div>
          {p.high_risk_raw && p.high_risk_raw !== 'nan' && p.high_risk_raw !== '' ? (
            <div className="space-y-1.5">
              {p.high_risk_raw.split(',').map((f, i) => f.trim() && (
                <div key={i} className="flex items-start gap-2">
                  <AlertTriangle className="w-3 h-3 mt-0.5 flex-shrink-0" style={{ color: '#D97706' }} />
                  <span className="text-xs text-slate-300">{f.trim()}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-slate-500 italic">No high-risk factors recorded</p>
          )}

          <div className="mt-4 border-t pt-3" style={{ borderColor: 'var(--ccmc-border)' }}>
            <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Investigations</div>
            <InfoRow label="USG"        value={p.usg}          />
            <InfoRow label="Echo/ECG"   value={p.echo_ecg}     />
            <InfoRow label="Sputum AFB" value={p.sputum_afb}   />
            <InfoRow label="Urine"      value={p.urine_routine}/>
          </div>
        </div>

        {/* Visit & delivery */}
        <div className="rounded-xl p-4"
          style={{ background: 'var(--ccmc-panel)', border: '1px solid var(--ccmc-border)' }}>
          <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Visit & Delivery</div>
          <InfoRow label="Last Visit"   value={p.last_visit_date}  highlight />
          <InfoRow label="Next Visit"   value={p.next_visit_date}  highlight />
          <InfoRow label="Birth Plan"   value={p.birth_plan}       />
          <InfoRow label="Referral"     value={p.referral}         />
          <InfoRow label="Action Taken" value={p.action_taken}     />
          <InfoRow label="Delivery"     value={p.delivery_info}    highlight />
          <InfoRow label="Response"     value={p.uphc_response}    />
          <InfoRow label="Call Date"    value={p.call_date}        />
        </div>
      </div>

      {/* Call & follow-up history + action buttons */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Call history */}
        <div className="rounded-xl overflow-hidden"
          style={{ background: 'var(--ccmc-panel)', border: '1px solid var(--ccmc-border)' }}>
          <div className="flex items-center justify-between px-4 py-3 border-b"
            style={{ borderColor: 'var(--ccmc-border)' }}>
            <span className="text-xs font-bold text-white">Call History ({p.call_history?.length || 0})</span>
            <button onClick={() => setCallForm({ status: 'Connected', remarks: '', outcome: '', next_followup_date: '' })}
              className="text-[10px] font-bold px-2 py-0.5 rounded"
              style={{ background: 'var(--ccmc-pill-info-bg)', color: 'var(--ccmc-pill-info-text)' }}>
              + Log Call
            </button>
          </div>
          <div className="divide-y max-h-48 overflow-y-auto" style={{ borderColor: 'var(--ccmc-border)' }}>
            {(p.call_history || []).length === 0 ? (
              <div className="px-4 py-6 text-center text-xs text-slate-500">No call records yet</div>
            ) : [...(p.call_history || [])].reverse().map((c, i) => (
              <div key={i} className="px-4 py-2.5">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] font-bold" style={{
                    color: c.status === 'Connected' ? 'var(--ccmc-pill-success-text)' : c.status === 'No Response' ? 'var(--ccmc-pill-critical-text)' : 'var(--ccmc-pill-warning-text)'
                  }}>{c.status}</span>
                  <span className="text-[9px] text-slate-500">{c.date} {c.time}</span>
                </div>
                {c.remarks && <p className="text-[10px] text-slate-400">{c.remarks}</p>}
                {c.caller_name && <p className="text-[9px] text-slate-600">By: {c.caller_name}</p>}
              </div>
            ))}
          </div>
        </div>

        {/* Follow-up history */}
        <div className="rounded-xl overflow-hidden"
          style={{ background: 'var(--ccmc-panel)', border: '1px solid var(--ccmc-border)' }}>
          <div className="flex items-center justify-between px-4 py-3 border-b"
            style={{ borderColor: 'var(--ccmc-border)' }}>
            <span className="text-xs font-bold text-white">Follow-Up History ({p.followup_history?.length || 0})</span>
            <button onClick={() => setFuForm({ status: 'Completed', visit_date: new Date().toISOString().slice(0,10), remarks: '', next_visit_date: '' })}
              className="text-[10px] font-bold px-2 py-0.5 rounded"
              style={{ background: 'var(--ccmc-pill-success-bg)', color: 'var(--ccmc-pill-success-text)' }}>
              + Log Visit
            </button>
          </div>
          <div className="divide-y max-h-48 overflow-y-auto" style={{ borderColor: 'var(--ccmc-border)' }}>
            {(p.followup_history || []).length === 0 ? (
              <div className="px-4 py-6 text-center text-xs text-slate-500">No follow-up records yet</div>
            ) : [...(p.followup_history || [])].reverse().map((f, i) => (
              <div key={i} className="px-4 py-2.5">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] font-bold" style={{ color: 'var(--ccmc-pill-success-text)' }}>{f.status}</span>
                  <span className="text-[9px] text-slate-500">{f.visit_date}</span>
                </div>
                {f.remarks && <p className="text-[10px] text-slate-400">{f.remarks}</p>}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Call form modal */}
      {callForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'var(--ccmc-modal-backdrop)', backdropFilter: 'blur(8px)' }}>
          <div className="w-full max-w-md rounded-2xl p-6"
            style={{ background: 'var(--ccmc-panel)', border: '1px solid var(--ccmc-border)' }}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-white">Log Call – {p.mother_name}</h3>
              <button onClick={() => setCallForm(null)}><X className="w-4 h-4 text-slate-400" /></button>
            </div>
            <div className="space-y-3">
              <label className="block">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Call Status</span>
                <select value={callForm.status}
                  onChange={e => setCallForm(f => ({ ...f, status: e.target.value }))}
                  className="w-full mt-1 px-3 py-2 rounded-lg text-sm text-white outline-none"
                  style={{ background: 'var(--ccmc-surface)', border: '1px solid var(--ccmc-border)' }}>
                  {['Connected','No Response','Wrong Number','Switched Off','Busy',
                    'Call Back Later','Follow-Up Required','Escalated','Resolved'].map(s => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </label>
              <label className="block">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Remarks</span>
                <textarea value={callForm.remarks}
                  onChange={e => setCallForm(f => ({ ...f, remarks: e.target.value }))}
                  rows={2} placeholder="Call remarks…"
                  className="w-full mt-1 px-3 py-2 rounded-lg text-sm text-white outline-none resize-none"
                  style={{ background: 'var(--ccmc-surface)', border: '1px solid var(--ccmc-border)' }} />
              </label>
              <label className="block">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Next Follow-Up Date</span>
                <input type="date" value={callForm.next_followup_date}
                  onChange={e => setCallForm(f => ({ ...f, next_followup_date: e.target.value }))}
                  className="w-full mt-1 px-3 py-2 rounded-lg text-sm text-white outline-none"
                  style={{ background: 'var(--ccmc-surface)', border: '1px solid var(--ccmc-border)', colorScheme: dark ? 'dark' : 'light' }} />
              </label>
              <button onClick={saveCall} disabled={saving}
                className="w-full py-2.5 rounded-lg text-sm font-bold text-white mt-2"
                style={{ background: 'linear-gradient(135deg, #1E40AF, #2563EB)' }}>
                {saving ? 'Saving…' : 'Save Call Record'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Follow-up form modal */}
      {fuForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'var(--ccmc-modal-backdrop)', backdropFilter: 'blur(8px)' }}>
          <div className="w-full max-w-md rounded-2xl p-6"
            style={{ background: 'var(--ccmc-panel)', border: '1px solid var(--ccmc-border)' }}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-white">Log Follow-Up – {p.mother_name}</h3>
              <button onClick={() => setFuForm(null)}><X className="w-4 h-4 text-slate-400" /></button>
            </div>
            <div className="space-y-3">
              <label className="block">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Status</span>
                <select value={fuForm.status}
                  onChange={e => setFuForm(f => ({ ...f, status: e.target.value }))}
                  className="w-full mt-1 px-3 py-2 rounded-lg text-sm text-white outline-none"
                  style={{ background: 'var(--ccmc-surface)', border: '1px solid var(--ccmc-border)' }}>
                  {['Completed','Pending','Scheduled','Missed','Overdue'].map(s => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </label>
              <label className="block">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Visit Date</span>
                <input type="date" value={fuForm.visit_date}
                  onChange={e => setFuForm(f => ({ ...f, visit_date: e.target.value }))}
                  className="w-full mt-1 px-3 py-2 rounded-lg text-sm text-white outline-none"
                  style={{ background: 'var(--ccmc-surface)', border: '1px solid var(--ccmc-border)', colorScheme: dark ? 'dark' : 'light' }} />
              </label>
              <label className="block">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Remarks</span>
                <textarea value={fuForm.remarks}
                  onChange={e => setFuForm(f => ({ ...f, remarks: e.target.value }))}
                  rows={2} placeholder="Visit notes…"
                  className="w-full mt-1 px-3 py-2 rounded-lg text-sm text-white outline-none resize-none"
                  style={{ background: 'var(--ccmc-surface)', border: '1px solid var(--ccmc-border)' }} />
              </label>
              <button onClick={saveFU} disabled={saving}
                className="w-full py-2.5 rounded-lg text-sm font-bold text-white mt-2"
                style={{ background: 'linear-gradient(135deg, #15803D, #16A34A)' }}>
                {saving ? 'Saving…' : 'Save Follow-Up Record'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Assign-to-Delivery modal */}
      {showDelivery && (
        <MarkDeliveryModal patient={p} user={user}
          onClose={() => setShowDelivery(false)} onSaved={refetch} />
      )}

      {/* Edit details modal */}
      {showEdit && (
        <EditPatientModal patient={p} user={user}
          onClose={() => setShowEdit(false)} onSaved={refetch} />
      )}
    </div>
  );
}

export default function PatientExplorer({ user, openPatient, defaultUid, onBack }) {
  const [patients,   setPatients]   = useState([]);
  const [total,      setTotal]      = useState(0);
  const [loading,    setLoading]    = useState(false);
  const [page,       setPage]       = useState(1);
  const [search,     setSearch]     = useState('');
  const [filterPHC,  setFilterPHC]  = useState('');
  const [filterHRT,  setFilterHRT]  = useState('');
  const [phcList,    setPhcList]    = useState([]);
  const [profileUid, setProfileUid] = useState(defaultUid || null);
  const [deliveryFor, setDeliveryFor] = useState(null); // row-level "assign delivery" target

  const PER_PAGE = 50;

  // Load available PHCs for this role once
  useEffect(() => {
    fetch(`${API}/phcs?role=${user.role}`)
      .then(r => r.json()).then(d => setPhcList(d)).catch(() => {});
  }, [user.role]);

  const load = useCallback(() => {
    setLoading(true);
    const params = new URLSearchParams({
      role: user.role, page, per_page: PER_PAGE,
      search, phc: filterPHC, hrt: filterHRT,
    });
    fetch(`${API}/patients?${params}`)
      .then(r => r.json())
      .then(d => { setPatients(d.patients || []); setTotal(d.total || 0); setLoading(false); })
      .catch(() => setLoading(false));
  }, [user.role, page, search, filterPHC, filterHRT]);

  useEffect(() => { load(); }, [load]);

  const handleSearch = (e) => { setSearch(e.target.value); setPage(1); };

  if (profileUid) {
    return <PatientProfile uid={profileUid} user={user}
      onBack={() => { setProfileUid(null); if (onBack) onBack(); }} />;
  }

  const totalPages = Math.ceil(total / PER_PAGE);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-title" style={{ fontFamily: 'Poppins, sans-serif' }}>
            Patient Explorer
          </h1>
          <p className="page-subtitle mt-1" style={{ color: 'var(--ccmc-text-hint)' }}>{total.toLocaleString()} patients · Page {page}/{totalPages}</p>
        </div>
      </div>

      {/* PHC Quick-Filter Strip */}
      {phcList.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          <button
            onClick={() => { setFilterPHC(''); setPage(1); }}
            className="px-2.5 py-1 rounded-full text-[10px] font-bold transition-all"
            style={{
              background: !filterPHC ? 'var(--ccmc-pill-info-bg)' : 'var(--ccmc-input-bg)',
              color: !filterPHC ? 'var(--ccmc-pill-info-text)' : 'var(--ccmc-text-hint)',
              border: `1px solid ${!filterPHC ? 'rgba(59,130,246,0.5)' : 'var(--ccmc-input-border)'}`,
            }}>
            All PHCs
          </button>
          {phcList.map(p => (
            <button
              key={p.phc_key}
              onClick={() => { setFilterPHC(p.phc_key); setPage(1); }}
              className="px-2.5 py-1 rounded-full text-[10px] font-semibold transition-all"
              style={{
                background: filterPHC === p.phc_key ? 'var(--ccmc-pill-info-bg)' : 'var(--ccmc-input-bg)',
                color: filterPHC === p.phc_key ? 'var(--ccmc-pill-info-text)' : 'var(--ccmc-text-hint)',
                border: `1px solid ${filterPHC === p.phc_key ? 'rgba(59,130,246,0.4)' : 'var(--ccmc-input-border)'}`,
              }}>
              {p.phc_display}
              <span className="ml-1 opacity-60">{p.count}</span>
            </button>
          ))}
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
          <input value={search} onChange={handleSearch} placeholder="Search name, phone, RCH ID…"
            className="w-full pl-9 pr-4 py-2 rounded-lg text-xs text-white outline-none"
            style={{ background: 'var(--ccmc-panel)', border: '1px solid var(--ccmc-border)' }}
            onFocus={e => e.target.style.borderColor = '#2563EB'}
            onBlur={e => e.target.style.borderColor = 'var(--ccmc-border)'} />
        </div>
        <select value={filterPHC} onChange={e => { setFilterPHC(e.target.value); setPage(1); }}
          className="px-3 py-2 rounded-lg text-xs text-white outline-none"
          style={{ background: 'var(--ccmc-panel)', border: '1px solid var(--ccmc-border)' }}>
          <option value="">All PHCs</option>
          {phcList.map(p => (
            <option key={p.phc_key} value={p.phc_key}>{p.phc_display} ({p.count})</option>
          ))}
        </select>
        {user.full_access && (
          <select value={filterHRT} onChange={e => { setFilterHRT(e.target.value); setPage(1); }}
            className="px-3 py-2 rounded-lg text-xs text-white outline-none"
            style={{ background: 'var(--ccmc-panel)', border: '1px solid var(--ccmc-border)' }}>
            <option value="">All HRTs</option>
            {['HRT1','HRT2','HRT3','HRT4','HRT5','HRT6','HRT7','HRT8'].map(h => (
              <option key={h} value={h}>{h}</option>
            ))}
          </select>
        )}
        <button onClick={load}
          className="px-3 py-2 rounded-lg text-xs font-semibold"
          style={{ background: 'var(--ccmc-pill-info-bg)', border: '1px solid rgba(37,99,235,0.4)', color: 'var(--ccmc-pill-info-text)' }}>
          Apply
        </button>
      </div>

      {/* Table */}
      <div className="rounded-xl overflow-hidden"
        style={{ background: 'var(--ccmc-panel)', border: '1px solid var(--ccmc-border)' }}>
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>#</th><th>Mother Name</th><th>PHC / UPHC</th><th>HRT</th>
                <th>Phone</th><th>EDD</th><th>Days Left</th><th>Action</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={8} className="text-center py-8">
                  <div className="w-5 h-5 border-2 rounded-full animate-spin mx-auto"
                    style={{ borderColor: 'var(--ccmc-border-s)', borderTopColor: '#3B82F6' }} />
                </td></tr>
              ) : patients.length === 0 ? (
                <tr><td colSpan={8} className="text-center py-8 text-slate-500 text-xs">
                  No patients found for current filters
                </td></tr>
              ) : patients.map((p, i) => {
                const daysLeft = p.days_to_edd;
                return (
                  <tr key={p.uid} className="cursor-pointer" onClick={() => setProfileUid(p.uid)}>
                    <td className="text-slate-600 text-[10px]">{(page-1)*PER_PAGE + i + 1}</td>
                    <td>
                      <div className="font-semibold text-white max-w-[160px] truncate">{p.mother_name || '—'}</div>
                      <div className="text-[10px] text-slate-500">{p.rch_id}</div>
                    </td>
                    <td className="text-slate-300 text-xs">{p.phc_display}</td>
                    <td>
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded"
                        style={{ background: 'var(--ccmc-pill-info-bg)', color: 'var(--ccmc-pill-info-text)' }}>
                        {p.hrt_code}
                      </span>
                    </td>
                    <td className="text-slate-400 text-xs">{p.cell_no || '—'}</td>
                    <td className="text-xs text-slate-400">{p.edd || '—'}</td>
                    <td>
                      {p.is_delivered ? (
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full"
                          style={{ background: 'var(--ccmc-pill-success-bg)', color: 'var(--ccmc-pill-success-text)', border: '1px solid rgba(22,163,74,0.3)' }}>
                          DELIVERED
                        </span>
                      ) : p.is_aborted ? (
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full"
                          style={{ background: 'var(--ccmc-pill-critical-bg)', color: 'var(--ccmc-pill-critical-text)', border: '1px solid rgba(248,113,113,0.3)' }}>
                          ABORTION
                        </span>
                      ) : daysLeft !== null && daysLeft !== undefined ? (
                        <span className="text-xs font-bold"
                          style={{ color: daysLeft < 0 ? '#DC2626' : daysLeft < 7 ? '#D97706' : 'var(--ccmc-text-hint)' }}>
                          {daysLeft < 0 ? `${Math.abs(daysLeft)}d overdue` : `${daysLeft}d`}
                        </span>
                      ) : '—'}
                    </td>
                    <td>
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={(e) => { e.stopPropagation(); setProfileUid(p.uid); }}
                          className="flex items-center gap-1 px-2 py-1 rounded text-[10px] font-semibold"
                          style={{ background: 'var(--ccmc-pill-info-bg)', color: 'var(--ccmc-pill-info-text)' }}>
                          <Eye className="w-3 h-3" /> View
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); setDeliveryFor(p); }}
                          title={p.is_delivered ? 'Delivered — click to edit or undo'
                               : p.is_aborted ? 'Abortion recorded — click to edit or undo'
                               : 'Assign outcome: Delivery or Abortion'}
                          className="flex items-center gap-1 px-2 py-1 rounded text-[10px] font-semibold"
                          style={p.is_aborted
                            ? { background: 'var(--ccmc-pill-critical-bg)', color: 'var(--ccmc-pill-critical-text)' }
                            : { background: 'var(--ccmc-pill-success-bg)', color: 'var(--ccmc-pill-success-text)' }}>
                          <Baby className="w-3 h-3" /> {p.is_delivered || p.is_aborted ? 'Done ✓' : 'Outcome'}
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t"
            style={{ borderColor: 'var(--ccmc-border)' }}>
            <span className="text-xs text-slate-500">
              Showing {((page-1)*PER_PAGE)+1}–{Math.min(page*PER_PAGE, total)} of {total.toLocaleString()}
            </span>
            <div className="flex items-center gap-2">
              <button onClick={() => setPage(p => Math.max(1, p-1))} disabled={page === 1}
                className="p-1 rounded" style={{ color: page === 1 ? 'var(--ccmc-text-hint)' : 'var(--ccmc-pill-info-text)' }}>
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-xs text-white font-semibold">{page} / {totalPages}</span>
              <button onClick={() => setPage(p => Math.min(totalPages, p+1))} disabled={page === totalPages}
                className="p-1 rounded" style={{ color: page === totalPages ? 'var(--ccmc-text-hint)' : 'var(--ccmc-pill-info-text)' }}>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Row-level Assign-to-Delivery modal */}
      {deliveryFor && (
        <MarkDeliveryModal patient={deliveryFor} user={user}
          onClose={() => setDeliveryFor(null)} onSaved={() => load()} />
      )}
    </div>
  );
}
