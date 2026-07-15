import React, { useEffect, useState } from 'react';
import {
  X, User, Phone, MapPin, Activity, AlertTriangle,
  Heart, ExternalLink, CheckCircle, Clock,
  PhoneCall, CheckCircle2, PhoneOff, PhoneMissed, Send, ChevronDown,
  Baby, Pencil,
} from 'lucide-react';
import MarkDeliveryModal from './MarkDeliveryModal';
import EditPatientModal  from './EditPatientModal';

const OUTCOMES = [
  { value: 'contacted',   label: 'Contacted',   color: '#22C55E', icon: CheckCircle2 },
  { value: 'unreachable', label: 'Unreachable',  color: '#EF4444', icon: PhoneOff },
  { value: 'no_answer',   label: 'No Answer',    color: '#F97316', icon: PhoneMissed },
  { value: 'busy',        label: 'Busy',         color: '#EAB308', icon: Phone },
];
const STATUS_OPTIONS = ['Active', 'Delivered', 'Referred', 'Transferred', 'Deceased'];

const API = '/api';

function InfoItem({ label, value }) {
  if (!value || value === '' || value === 'nan') return null;
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-[9px] font-bold uppercase tracking-wider" style={{ color: 'var(--ccmc-text-hint)' }}>{label}</span>
      <span className="text-xs font-medium" style={{ color: 'var(--ccmc-text)' }}>{value}</span>
    </div>
  );
}

function SectionTitle({ children }) {
  return (
    <div className="text-[10px] font-bold uppercase tracking-wider mb-3" style={{ color: 'var(--ccmc-text-sec)' }}>
      {children}
    </div>
  );
}

export default function PatientDrawer({ uid, user, onClose, onViewFull }) {
  const [p,          setP]          = useState(null);
  const [loading,    setLoading]    = useState(true);
  const [showLogCall, setShowLogCall] = useState(false);
  const [logOutcome,  setLogOutcome]  = useState('contacted');
  const [logNotes,    setLogNotes]    = useState('');
  const [logStatus,   setLogStatus]   = useState('');
  const [logSaving,   setLogSaving]   = useState(false);
  const [logDone,     setLogDone]     = useState(false);
  const [appHistory,  setAppHistory]  = useState([]);
  const [showDelivery, setShowDelivery] = useState(false);
  const [showEdit,     setShowEdit]     = useState(false);

  // Re-fetch full record (incl. call/follow-up history) after delivery/edit save
  const refetchPatient = () => {
    fetch(`${API}/patients/${uid}`)
      .then(r => r.json())
      .then(d => setP(d))
      .catch(() => {});
  };

  const loadHistory = (id) => {
    fetch(`${API}/calls/history/${id}`)
      .then(r => r.json()).then(d => setAppHistory(Array.isArray(d) ? d : []))
      .catch(() => {});
  };

  useEffect(() => {
    if (!uid) return;
    setLoading(true);
    setP(null);
    setShowLogCall(false);
    setLogDone(false);
    setAppHistory([]);
    fetch(`${API}/patients/${uid}`)
      .then(r => r.json())
      .then(d => { setP(d); setLoading(false); loadHistory(uid); })
      .catch(() => setLoading(false));
  }, [uid]);

  const saveCallLog = async () => {
    setLogSaving(true);
    try {
      await fetch(`${API}/calls/log`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mother_id: uid, hrt_user: user.role, outcome: logOutcome, notes: logNotes }),
      });
      if (logStatus) {
        await fetch(`${API}/status/update`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ mother_id: uid, hrt_user: user.role, new_status: logStatus, notes: logNotes }),
        });
      }
      setLogDone(true);
      setShowLogCall(false);
      setLogNotes('');
      setLogStatus('');
      loadHistory(uid);
    } catch { /* silent */ } finally { setLogSaving(false); }
  };

  if (!uid) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40"
        style={{ background: 'rgba(2,6,23,0.7)', backdropFilter: 'blur(4px)' }}
        onClick={onClose}
      />

      {/* Drawer panel */}
      <div
        className="fixed right-0 top-0 bottom-0 z-50 flex flex-col overflow-hidden"
        style={{
          width: 'min(580px, 100vw)',
          background: 'var(--ccmc-bg)',
          borderLeft: '1px solid var(--ccmc-border)',
          boxShadow: '-24px 0 64px rgba(0,0,0,0.6)',
        }}
      >
        {/* Sticky header */}
        <div
          className="flex items-center justify-between px-5 py-3 border-b flex-shrink-0"
          style={{ background: 'var(--ccmc-panel)', borderColor: 'var(--ccmc-border)' }}
        >
          <div>
            <div className="text-sm font-bold" style={{ color: 'var(--ccmc-text)', fontFamily: 'Poppins,sans-serif' }}>
              Patient Profile
            </div>
            <div className="text-[10px]" style={{ color: 'var(--ccmc-text-hint)' }}>
              CCMC Maternal Health Record
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap justify-end">
            {p && user.role.startsWith('HRT') && (
              <button
                onClick={() => setShowLogCall(v => !v)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold"
                style={{ background: logDone ? 'rgba(34,197,94,0.2)' : 'rgba(34,197,94,0.15)', border: `1px solid ${logDone ? 'rgba(34,197,94,0.6)' : 'rgba(34,197,94,0.35)'}`, color: '#4ADE80' }}
              >
                <PhoneCall className="w-3.5 h-3.5" />
                {logDone ? 'Logged ✓' : 'Log Call'}
              </button>
            )}
            {p && (
              <button
                onClick={() => setShowDelivery(true)}
                title={p.is_delivered ? 'Delivered — click to edit or undo'
                     : p.is_aborted ? 'Abortion recorded — click to edit or undo'
                     : 'Assign outcome: Delivery or Abortion'}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold"
                style={p.is_aborted
                  ? { background: 'rgba(248,113,113,0.15)', border: '1px solid rgba(248,113,113,0.35)', color: '#FCA5A5' }
                  : { background: 'rgba(34,197,94,0.15)', border: '1px solid rgba(34,197,94,0.35)', color: '#4ADE80' }}
              >
                <Baby className="w-3.5 h-3.5" />
                {p.is_delivered ? 'Delivered ✓' : p.is_aborted ? 'Abortion ✓' : 'Delivery'}
              </button>
            )}
            {p && (
              <button
                onClick={() => setShowEdit(true)}
                title="Edit EDD, Hb and other details"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold"
                style={{ background: 'rgba(251,191,36,0.12)', border: '1px solid rgba(251,191,36,0.35)', color: '#FBBF24' }}
              >
                <Pencil className="w-3.5 h-3.5" />
                Edit
              </button>
            )}
            {p && (
              <button
                onClick={() => onViewFull(uid)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold"
                style={{ background: 'rgba(25,118,210,0.2)', border: '1px solid rgba(25,118,210,0.4)', color: '#42A5F5' }}
              >
                <ExternalLink className="w-3.5 h-3.5" />
                View Full Record
              </button>
            )}
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg transition-colors"
              style={{ color: 'var(--ccmc-text-hint)' }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(30,58,95,0.5)'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {loading ? (
            <div className="flex items-center justify-center py-24">
              <div className="w-8 h-8 border-2 rounded-full animate-spin"
                style={{ borderColor: 'var(--ccmc-border-s)', borderTopColor: '#42A5F5' }} />
            </div>
          ) : !p ? (
            <div className="text-center py-24 text-sm" style={{ color: 'var(--ccmc-text-hint)' }}>
              Patient record not found
            </div>
          ) : (
            <>
              {/* ── Profile header ──────────────────────────── */}
              <div className="rounded-xl p-4 flex items-start gap-4"
                style={{ background: 'var(--ccmc-panel)', border: '1px solid var(--ccmc-border)' }}>
                <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ background: 'rgba(66,165,245,0.12)' }}>
                  <User className="w-6 h-6" style={{ color: '#42A5F5' }} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <h2 className="text-base font-bold" style={{ color: 'var(--ccmc-text)' }}>
                      {p.mother_name || 'Unknown'}
                    </h2>
                    {p.is_delivered && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                        style={{ background: 'rgba(34,197,94,0.15)', color: '#86EFAC', border: '1px solid rgba(34,197,94,0.3)' }}>
                        DELIVERED
                      </span>
                    )}
                    {p.is_aborted && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                        style={{ background: 'rgba(248,113,113,0.15)', color: '#FCA5A5', border: '1px solid rgba(248,113,113,0.3)' }}>
                        ABORTION
                      </span>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-3 text-[10px]" style={{ color: 'var(--ccmc-text-hint)' }}>
                    {p.cell_no && (
                      <span className="flex items-center gap-1">
                        <Phone className="w-3 h-3" />{p.cell_no}
                      </span>
                    )}
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3 h-3" />{p.phc_display}
                    </span>
                    <span className="flex items-center gap-1">
                      <Activity className="w-3 h-3" />{p.hrt_code} · {p.hrt_name}
                    </span>
                    {p.rch_id && <span>RCH: {p.rch_id}</span>}
                  </div>
                  {p.address && (
                    <div className="text-[10px] mt-1" style={{ color: 'var(--ccmc-text-hint)' }}>
                      {p.address}
                    </div>
                  )}
                </div>
              </div>

              {/* ── Log Call Panel ──────────────────────────── */}
              {showLogCall && (
                <div className="rounded-xl p-4 space-y-3"
                  style={{ background: 'rgba(34,197,94,0.06)', border: '1px solid rgba(34,197,94,0.25)' }}>
                  <div className="text-xs font-bold" style={{ color: '#4ADE80' }}>Log a Call</div>
                  <div className="grid grid-cols-2 gap-2">
                    {OUTCOMES.map(o => {
                      const Icon = o.icon;
                      const sel = logOutcome === o.value;
                      return (
                        <button key={o.value} onClick={() => setLogOutcome(o.value)}
                          className="flex items-center gap-1.5 px-2.5 py-2 rounded-lg text-xs font-semibold"
                          style={{ background: sel ? `${o.color}20` : 'rgba(30,58,95,0.3)', border: `1.5px solid ${sel ? o.color : 'rgba(30,58,95,0.5)'}`, color: sel ? o.color : 'var(--ccmc-text-hint)' }}>
                          <Icon className="w-3 h-3" /> {o.label}
                        </button>
                      );
                    })}
                  </div>
                  <textarea rows={2} value={logNotes} onChange={e => setLogNotes(e.target.value)}
                    placeholder="Notes (optional)…"
                    className="w-full rounded-lg px-3 py-2 text-xs resize-none outline-none"
                    style={{ background: 'rgba(30,58,95,0.3)', border: '1px solid rgba(30,58,95,0.6)', color: 'var(--ccmc-text)' }} />
                  <div className="relative">
                    <select value={logStatus} onChange={e => setLogStatus(e.target.value)}
                      className="w-full rounded-lg px-3 py-2 text-xs outline-none appearance-none"
                      style={{ background: 'rgba(30,58,95,0.3)', border: '1px solid rgba(30,58,95,0.6)', color: logStatus ? 'var(--ccmc-text)' : 'var(--ccmc-text-hint)' }}>
                      <option value="">Request status change (optional)</option>
                      {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                    <ChevronDown className="absolute right-2.5 top-2.5 w-3.5 h-3.5 pointer-events-none" style={{ color: 'var(--ccmc-text-hint)' }} />
                  </div>
                  <button onClick={saveCallLog} disabled={logSaving}
                    className="w-full flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-bold"
                    style={{ background: '#22C55E', color: '#fff', opacity: logSaving ? 0.7 : 1 }}>
                    <Send className="w-3.5 h-3.5" />
                    {logSaving ? 'Saving…' : 'Save'}
                  </button>
                </div>
              )}

              {/* ── App Call History ────────────────────────── */}
              {appHistory.length > 0 && (
                <div className="rounded-xl overflow-hidden"
                  style={{ background: 'var(--ccmc-panel)', border: '1px solid rgba(34,197,94,0.25)' }}>
                  <div className="px-4 py-2.5 border-b" style={{ borderColor: 'rgba(34,197,94,0.2)' }}>
                    <span className="text-xs font-bold" style={{ color: '#4ADE80' }}>App Call History</span>
                    <span className="ml-2 text-[10px]" style={{ color: 'var(--ccmc-text-hint)' }}>{appHistory.length} entries</span>
                  </div>
                  <div className="divide-y max-h-36 overflow-y-auto" style={{ borderColor: 'rgba(30,58,95,0.3)' }}>
                    {appHistory.map(c => {
                      const o = OUTCOMES.find(x => x.value === c.outcome) || OUTCOMES[0];
                      return (
                        <div key={c.id} className="px-4 py-2 flex items-center gap-3">
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full flex-shrink-0"
                            style={{ background: `${o.color}18`, color: o.color, border: `1px solid ${o.color}40` }}>
                            {o.label}
                          </span>
                          <span className="text-[10px] flex-1 truncate" style={{ color: 'var(--ccmc-text-hint)' }}>
                            {c.notes || '—'} · {c.hrt_user}
                          </span>
                          <span className="text-[9px] flex-shrink-0" style={{ color: 'var(--ccmc-text-hint)' }}>
                            {c.call_time?.slice(5, 16)}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* ── Basic + Assignment ───────────────────────── */}
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-xl p-4 space-y-2.5"
                  style={{ background: 'var(--ccmc-panel)', border: '1px solid var(--ccmc-border)' }}>
                  <SectionTitle>Basic Details</SectionTitle>
                  <InfoItem label="Patient ID / RCH" value={p.rch_id} />
                  <InfoItem label="Mobile Number"    value={p.cell_no} />
                  <InfoItem label="Husband Name"     value={p.husband_name} />
                  <InfoItem label="Address"          value={p.address} />
                  <InfoItem label="Resident Type"    value={p.resident_type} />
                </div>
                <div className="rounded-xl p-4 space-y-2.5"
                  style={{ background: 'var(--ccmc-panel)', border: '1px solid var(--ccmc-border)' }}>
                  <SectionTitle>Assignment</SectionTitle>
                  <InfoItem label="PHC / UPHC"    value={p.phc_display} />
                  <InfoItem label="UPHC Name"     value={p.uphc_name} />
                  <InfoItem label="Assigned HRT"  value={p.hrt_code} />
                  <InfoItem label="Staff Nurse"   value={p.hrt_name} />
                  <InfoItem label="HSC"           value={p.hsc_name} />
                </div>
              </div>

              {/* ── Clinical ────────────────────────────────── */}
              <div className="rounded-xl p-4"
                style={{ background: 'var(--ccmc-panel)', border: '1px solid var(--ccmc-border)' }}>
                <SectionTitle>Clinical Information</SectionTitle>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-2.5">
                  <InfoItem label="LMP"         value={p.lmp} />
                  <InfoItem label="EDD"         value={p.edd} />
                  <InfoItem label="Weeks"       value={p.weeks} />
                  <InfoItem label="Gravida"     value={p.gravida} />
                  <InfoItem label="Para"        value={p.para} />
                  <InfoItem label="Height"      value={p.height} />
                  <InfoItem label="Weight"      value={p.weight} />
                  <InfoItem label="BP"          value={p.bp} />
                  <InfoItem label="Hb"          value={p.hb} />
                  <InfoItem label="Blood Group" value={p.blood_group} />
                  <InfoItem label="GCT"         value={p.gct} />
                  <InfoItem label="PPBS / FBS"  value={p.ppbs} />
                  <InfoItem label="TSH"         value={p.tsh} />
                  <InfoItem label="USG"         value={p.usg} />
                  <InfoItem label="Echo / ECG"  value={p.echo_ecg} />
                  <InfoItem label="Urine"       value={p.urine_routine} />
                  <InfoItem label="Sputum AFB"  value={p.sputum_afb} />
                </div>
              </div>

              {/* ── Risk Factors ─────────────────────────────── */}
              <div className="rounded-xl p-4"
                style={{ background: 'var(--ccmc-panel)', border: '1px solid var(--ccmc-border)' }}>
                <SectionTitle>Risk Factors &amp; Alerts</SectionTitle>
                {p.high_risk_raw && p.high_risk_raw !== 'nan' && p.high_risk_raw !== '' ? (
                  <div className="space-y-1.5 mb-2">
                    {p.high_risk_raw.split(',').map((f, i) => f.trim() && (
                      <div key={i} className="flex items-start gap-2">
                        <AlertTriangle className="w-3 h-3 mt-0.5 flex-shrink-0" style={{ color: '#F97316' }} />
                        <span className="text-xs" style={{ color: 'var(--ccmc-text-sec)' }}>{f.trim()}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs italic mb-2" style={{ color: 'var(--ccmc-text-hint)' }}>
                    No high-risk factors recorded
                  </p>
                )}
                {p.risk_factors && p.risk_factors.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {p.risk_factors.map((f, i) => (
                      <span key={i} className="text-[9px] font-bold px-1.5 py-0.5 rounded"
                        style={{ background: 'rgba(249,115,22,0.15)', color: '#FDBA74' }}>{f}</span>
                    ))}
                  </div>
                )}
              </div>

              {/* ── Call Tracking ────────────────────────────── */}
              <div className="rounded-xl overflow-hidden"
                style={{ background: 'var(--ccmc-panel)', border: '1px solid var(--ccmc-border)' }}>
                <div className="px-4 py-3 border-b" style={{ borderColor: 'rgba(30,58,95,0.5)' }}>
                  <div className="flex items-center gap-2">
                    <Phone className="w-3.5 h-3.5" style={{ color: '#42A5F5' }} />
                    <span className="text-xs font-bold" style={{ color: 'var(--ccmc-text)' }}>
                      Call Tracking
                    </span>
                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded ml-auto"
                      style={{ background: 'rgba(66,165,245,0.15)', color: '#93C5FD' }}>
                      {p.call_history?.length || 0} records
                    </span>
                  </div>
                </div>
                <div className="divide-y max-h-44 overflow-y-auto" style={{ borderColor: 'rgba(30,58,95,0.3)' }}>
                  {(p.call_history || []).length === 0 ? (
                    <div className="px-4 py-5 text-center text-xs" style={{ color: 'var(--ccmc-text-hint)' }}>
                      No call records
                    </div>
                  ) : [...(p.call_history || [])].reverse().map((c, i) => (
                    <div key={i} className="px-4 py-2.5">
                      <div className="flex items-center justify-between mb-0.5">
                        <span className="text-[10px] font-bold" style={{
                          color: c.status === 'Connected' ? '#86EFAC'
                               : c.status === 'No Response' ? '#FCA5A5' : '#FDBA74'
                        }}>{c.status}</span>
                        <span className="text-[9px]" style={{ color: 'var(--ccmc-text-hint)' }}>
                          {c.date} {c.time}
                        </span>
                      </div>
                      {c.remarks && (
                        <p className="text-[10px]" style={{ color: 'var(--ccmc-text-hint)' }}>{c.remarks}</p>
                      )}
                      {c.caller_name && (
                        <p className="text-[9px]" style={{ color: 'var(--ccmc-text-hint)' }}>By: {c.caller_name}</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* ── Follow-Up Tracking ───────────────────────── */}
              <div className="rounded-xl overflow-hidden"
                style={{ background: 'var(--ccmc-panel)', border: '1px solid var(--ccmc-border)' }}>
                <div className="px-4 py-3 border-b" style={{ borderColor: 'rgba(30,58,95,0.5)' }}>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-3.5 h-3.5" style={{ color: '#22C55E' }} />
                    <span className="text-xs font-bold" style={{ color: 'var(--ccmc-text)' }}>
                      Follow-Up Tracking
                    </span>
                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded ml-auto"
                      style={{ background: 'rgba(34,197,94,0.15)', color: '#86EFAC' }}>
                      {p.followup_history?.length || 0} visits
                    </span>
                  </div>
                </div>
                <div className="divide-y max-h-44 overflow-y-auto" style={{ borderColor: 'rgba(30,58,95,0.3)' }}>
                  {(p.followup_history || []).length === 0 ? (
                    <div className="px-4 py-5 text-center text-xs" style={{ color: 'var(--ccmc-text-hint)' }}>
                      No follow-up records
                    </div>
                  ) : [...(p.followup_history || [])].reverse().map((f, i) => (
                    <div key={i} className="px-4 py-2.5">
                      <div className="flex items-center justify-between mb-0.5">
                        <span className="text-[10px] font-bold" style={{ color: '#86EFAC' }}>{f.status}</span>
                        <span className="text-[9px]" style={{ color: 'var(--ccmc-text-hint)' }}>{f.visit_date}</span>
                      </div>
                      {f.remarks && (
                        <p className="text-[10px]" style={{ color: 'var(--ccmc-text-hint)' }}>{f.remarks}</p>
                      )}
                      {f.escalation_status && (
                        <p className="text-[9px]" style={{ color: '#FDBA74' }}>
                          Escalation: {f.escalation_status}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* ── Visit History & Delivery ─────────────────── */}
              <div className="rounded-xl p-4"
                style={{ background: 'var(--ccmc-panel)', border: '1px solid var(--ccmc-border)' }}>
                <SectionTitle>Visit History &amp; Delivery</SectionTitle>
                <div className="grid grid-cols-2 gap-x-4 gap-y-2.5 mb-3">
                  <InfoItem label="Last Visit"      value={p.last_visit_date} />
                  <InfoItem label="Call Date"       value={p.call_date} />
                  <InfoItem label="Next Visit"      value={p.next_visit_date} />
                  <InfoItem label="Birth Plan"      value={p.birth_plan} />
                  <InfoItem label="Referral"        value={p.referral} />
                  <InfoItem label="Action Taken"    value={p.action_taken} />
                  <InfoItem label="UPHC Response"   value={p.uphc_response} />
                  {p.delivery_date && <InfoItem label="Delivery Date"  value={p.delivery_date} />}
                  {p.days_since_delivery != null && p.days_since_delivery >= 0 &&
                    <InfoItem label="Days Since Delivery" value={`${p.days_since_delivery} days`} />
                  }
                  {p.delivery_source === 'app' && p.delivery_marked_by &&
                    <InfoItem label="Delivery Marked By" value={p.delivery_marked_by} />
                  }
                </div>
                {p.delivery_info && p.delivery_info !== 'nan' && p.delivery_info.trim() !== '' && (
                  <div className="p-2.5 rounded-lg"
                    style={{ background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.2)' }}>
                    <div className="text-[9px] font-bold uppercase tracking-wider mb-0.5" style={{ color: '#86EFAC' }}>
                      Delivery Information
                    </div>
                    <div className="text-xs" style={{ color: '#D1FAE5' }}>{p.delivery_info}</div>
                  </div>
                )}
                {p.is_aborted && p.abortion_info && (
                  <div className="p-2.5 rounded-lg mt-2"
                    style={{ background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.2)' }}>
                    <div className="text-[9px] font-bold uppercase tracking-wider mb-0.5" style={{ color: '#FCA5A5' }}>
                      Abortion Information
                    </div>
                    <div className="text-xs" style={{ color: '#FECACA' }}>{p.abortion_info}</div>
                    {p.abortion_marked_by && (
                      <div className="text-[9px] mt-1" style={{ color: 'var(--ccmc-text-hint)' }}>
                        Marked by {p.abortion_marked_by}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Bottom padding for scroll */}
              <div className="h-4" />
            </>
          )}
        </div>
      </div>

      {/* Assign-to-Delivery modal */}
      {showDelivery && p && (
        <MarkDeliveryModal
          patient={p}
          user={user}
          onClose={() => setShowDelivery(false)}
          onSaved={refetchPatient}
        />
      )}

      {/* Edit details modal */}
      {showEdit && p && (
        <EditPatientModal
          patient={p}
          user={user}
          onClose={() => setShowEdit(false)}
          onSaved={refetchPatient}
        />
      )}
    </>
  );
}
