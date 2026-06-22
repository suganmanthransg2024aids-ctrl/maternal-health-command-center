import React, { useEffect, useState } from 'react';
import {
  X, User, Phone, MapPin, Activity, AlertTriangle,
  Heart, ExternalLink, CheckCircle, Clock,
} from 'lucide-react';

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
  const [p,       setP]       = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!uid) return;
    setLoading(true);
    setP(null);
    fetch(`${API}/patients/${uid}`)
      .then(r => r.json())
      .then(d => { setP(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, [uid]);

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
          <div className="flex items-center gap-2">
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
                <div className="grid grid-cols-3 gap-x-4 gap-y-2.5">
                  <InfoItem label="LMP"         value={p.lmp} />
                  <InfoItem label="EDD"         value={p.edd} />
                  <InfoItem label="Weeks"       value={p.weeks} />
                  <InfoItem label="Gravida"     value={p.gravida} />
                  <InfoItem label="Height"      value={p.height} />
                  <InfoItem label="Weight"      value={p.weight} />
                  <InfoItem label="BP"          value={p.bp} />
                  <InfoItem label="Hb"          value={p.hb} />
                  <InfoItem label="Blood Group" value={p.blood_group} />
                  <InfoItem label="GCT"         value={p.gct} />
                  <InfoItem label="PPBS"        value={p.ppbs} />
                  <InfoItem label="TSH"         value={p.tsh} />
                  <InfoItem label="USG"         value={p.usg} />
                  <InfoItem label="Echo/ECG"    value={p.echo_ecg} />
                  <InfoItem label="Urine"       value={p.urine_routine} />
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
                  <InfoItem label="Last Visit"    value={p.last_visit_date} />
                  <InfoItem label="Next Visit"    value={p.next_visit_date} />
                  <InfoItem label="Birth Plan"    value={p.birth_plan} />
                  <InfoItem label="Referral"      value={p.referral} />
                  <InfoItem label="Action Taken"  value={p.action_taken} />
                  <InfoItem label="UPHC Response" value={p.uphc_response} />
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
              </div>

              {/* Bottom padding for scroll */}
              <div className="h-4" />
            </>
          )}
        </div>
      </div>
    </>
  );
}
