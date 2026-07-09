import React, { useEffect, useState, useCallback } from 'react';
import { Phone, CheckCircle2, Clock, RefreshCw, X, PhoneOff, PhoneMissed, ChevronDown, Send, Zap } from 'lucide-react';
import { useTheme } from '../ThemeContext';

const API = '/api';

const OUTCOMES = [
  { value: 'contacted',   label: 'Contacted',   color: '#34D399', icon: CheckCircle2 },
  { value: 'unreachable', label: 'Unreachable',  color: '#FB7185', icon: PhoneOff    },
  { value: 'no_answer',   label: 'No Answer',    color: '#FB923C', icon: PhoneMissed },
  { value: 'busy',        label: 'Busy',         color: '#FBBF24', icon: Phone       },
];

const STATUS_OPTIONS = ['Active', 'Delivered', 'Referred', 'Transferred', 'Deceased'];

const TIER = {
  P1: { color: '#FB7185', label: 'P1' },
  P2: { color: '#FB923C', label: 'P2' },
  P3: { color: '#FBBF24', label: 'P3' },
};

function riskColor(cat) {
  if (cat === 'Critical')  return '#FB7185';
  if (cat === 'Very High') return '#FB923C';
  if (cat === 'High')      return '#FBBF24';
  if (cat === 'Moderate')  return '#60A5FA';
  return '#34D399';
}

function eddInfo(p) {
  if (p.is_delivered) {
    const d = p.days_since_delivery;
    return { text: d != null ? `PN · ${d}d` : 'Delivered', color: '#60A5FA' };
  }
  const d = p.days_to_edd;
  if (d == null) return { text: '—', color: '#4B5E7A' };
  if (d < 0)   return { text: `Overdue ${Math.abs(d)}d`,  color: '#FB7185' };
  if (d === 0) return { text: 'Due today',                 color: '#FB7185' };
  if (d <= 3)  return { text: `Due in ${d}d`,             color: '#FB923C' };
  if (d <= 7)  return { text: `Due in ${d}d`,             color: '#FBBF24' };
  if (d <= 14) return { text: `Due in ${d}d`,             color: '#34D399' };
  return { text: `EDD in ${d}d`, color: '#4B5E7A' };
}

function OutcomeBadge({ outcome }) {
  const o = OUTCOMES.find(x => x.value === outcome) || OUTCOMES[0];
  const Icon = o.icon;
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold"
      style={{ background: `${o.color}18`, color: o.color, border: `1px solid ${o.color}30` }}>
      <Icon className="w-2.5 h-2.5" /> {o.label}
    </span>
  );
}

// ── Log Call Modal ─────────────────────────────────────────────────────────
function LogCallModal({ mother, hrtUser, onClose, onSaved }) {
  const { theme } = useTheme();
  const bright = theme === 'bright';
  const [outcome,   setOutcome]   = useState('contacted');
  const [notes,     setNotes]     = useState('');
  const [newStatus, setNewStatus] = useState('');
  const [saving,    setSaving]    = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      await fetch(`${API}/calls/log`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mother_id: mother.uid, hrt_user: hrtUser, outcome, notes }),
      });
      if (newStatus) {
        await fetch(`${API}/status/update`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ mother_id: mother.uid, hrt_user: hrtUser, new_status: newStatus, notes }),
        });
      }
      onSaved();
    } catch { } finally { setSaving(false); }
  };

  const panel = bright ? '#FFFFFF'            : '#0D1729';
  const bdr   = bright ? '#E8EDF5'            : 'rgba(99,102,241,0.18)';
  const tx    = bright ? '#1E293B'            : '#EEF2FF';
  const sub   = bright ? '#64748B'            : '#4B5E7A';
  const field = bright ? '#F4F7FB'            : 'rgba(7,13,26,0.7)';

  return (
    <>
      <div className="fixed inset-0 z-[60]"
        style={{ background: 'rgba(7,13,26,0.82)', backdropFilter: 'blur(8px)' }}
        onClick={onClose} />

      <div className="fixed z-[70] top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[min(420px,95vw)] rounded-2xl overflow-hidden"
        style={{ background: panel, border: `1px solid ${bdr}`, boxShadow: '0 32px 80px rgba(0,0,0,0.6)' }}>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b"
          style={{ borderColor: bdr, background: bright ? '#F4F7FB' : 'rgba(99,102,241,0.06)' }}>
          <div>
            <div className="text-sm font-bold tracking-tight" style={{ color: tx }}>Log Call</div>
            <div className="text-[11px] mt-0.5 font-medium" style={{ color: sub }}>{mother.name}</div>
          </div>
          <button onClick={onClose}
            className="w-7 h-7 rounded-lg flex items-center justify-center transition-colors"
            style={{ background: bright ? '#E8EDF5' : 'rgba(255,255,255,0.06)', color: sub }}>
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {/* Outcome */}
          <div>
            <div className="text-[9px] font-bold uppercase tracking-widest mb-2" style={{ color: sub }}>
              Call Outcome
            </div>
            <div className="grid grid-cols-2 gap-2">
              {OUTCOMES.map(o => {
                const Icon = o.icon;
                const sel  = outcome === o.value;
                return (
                  <button key={o.value} onClick={() => setOutcome(o.value)}
                    className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all"
                    style={{
                      background: sel ? `${o.color}15` : bright ? '#F4F7FB' : 'rgba(255,255,255,0.04)',
                      border: `1.5px solid ${sel ? o.color : bdr}`,
                      color: sel ? o.color : sub,
                      boxShadow: sel ? `0 0 0 3px ${o.color}12` : 'none',
                    }}>
                    <Icon className="w-3.5 h-3.5" /> {o.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Notes */}
          <div>
            <div className="text-[9px] font-bold uppercase tracking-widest mb-1.5" style={{ color: sub }}>Notes</div>
            <textarea rows={2} value={notes} onChange={e => setNotes(e.target.value)}
              placeholder="Any remarks about this call…"
              className="w-full rounded-xl px-3 py-2.5 text-xs resize-none outline-none"
              style={{ background: field, border: `1px solid ${bdr}`, color: tx }} />
          </div>

          {/* Status change */}
          <div>
            <div className="text-[9px] font-bold uppercase tracking-widest mb-1.5" style={{ color: sub }}>
              Status Change
              <span className="font-normal normal-case opacity-60 ml-1">— optional, needs CHO approval</span>
            </div>
            <div className="relative">
              <select value={newStatus} onChange={e => setNewStatus(e.target.value)}
                className="w-full rounded-xl px-3 py-2.5 text-xs outline-none appearance-none"
                style={{ background: field, border: `1px solid ${bdr}`, color: newStatus ? tx : sub }}>
                <option value="">— No change —</option>
                {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
              <ChevronDown className="absolute right-3 top-3 w-3.5 h-3.5 pointer-events-none" style={{ color: sub }} />
            </div>
          </div>

          {/* Submit */}
          <button onClick={handleSave} disabled={saving}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold transition-all"
            style={{
              background: saving ? 'rgba(52,211,153,0.2)' : 'linear-gradient(135deg,#10B981,#34D399)',
              color: '#fff',
              opacity: saving ? 0.7 : 1,
              boxShadow: saving ? 'none' : '0 4px 16px rgba(16,185,129,0.25)',
            }}>
            <Send className="w-4 h-4" />
            {saving ? 'Saving…' : 'Save Call Log'}
          </button>
        </div>
      </div>
    </>
  );
}

// ── Priority Card ──────────────────────────────────────────────────────────
function PriorityCard({ p, onCall, isHRT, bright }) {
  const tier     = TIER[p.priority_tier] || TIER.P3;
  const eInfo    = eddInfo(p);
  const rc       = riskColor(p.risk_category);
  const hasPhone = p.phone && !['nan', 'None', ''].includes(p.phone);
  const scorePct = Math.min(100, p.priority_score);

  const tx     = bright ? '#1E293B' : '#EEF2FF';
  const sub    = bright ? '#64748B' : '#4B5E7A';
  const cardBg = bright ? '#FFFFFF' : '#0D1729';
  const divBdr = bright ? '#F0F4FA' : 'rgba(99,102,241,0.09)';

  const [hovered, setHovered] = useState(false);
  const [callHov, setCallHov] = useState(false);

  return (
    <div
      style={{
        borderBottom: `1px solid ${divBdr}`,
        background: hovered ? (bright ? '#F8FAFF' : 'rgba(99,102,241,0.04)') : cardBg,
        transition: 'background 0.15s',
        position: 'relative',
        overflow: 'hidden',
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}>

      {/* Tier stripe */}
      <div style={{
        position: 'absolute', left: 0, top: 0, bottom: 0, width: 3,
        background: tier.color, opacity: 0.85,
      }} />

      <div style={{ display: 'flex', alignItems: 'stretch', paddingLeft: 16, paddingRight: 12, paddingTop: 14, paddingBottom: 10, gap: 0 }}>

        {/* Rank numeral */}
        <div style={{
          flexShrink: 0, width: 44, display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center', marginRight: 12,
        }}>
          <span style={{
            fontSize: 28, fontWeight: 900, lineHeight: 1, color: tier.color,
            fontVariantNumeric: 'tabular-nums', letterSpacing: '-1.5px',
            opacity: hovered ? 1 : 0.9,
          }}>
            {p.rank}
          </span>
          <span style={{
            fontSize: 8, fontWeight: 700, letterSpacing: '0.1em',
            color: tier.color, opacity: 0.6, marginTop: 2,
          }}>
            {tier.label}
          </span>
        </div>

        {/* Content */}
        <div style={{ flex: 1, minWidth: 0 }}>

          {/* Row 1: name + chips */}
          <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 6 }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: tx, letterSpacing: '-0.3px' }}>
              {p.name || '—'}
            </span>
            {/* EDD chip */}
            <span style={{
              fontSize: 10, fontWeight: 600, padding: '2px 8px', borderRadius: 99,
              background: `${eInfo.color}14`, color: eInfo.color, border: `1px solid ${eInfo.color}30`,
            }}>
              {eInfo.text}
            </span>
            {/* Risk chip */}
            {p.risk_category && (
              <span style={{
                fontSize: 10, fontWeight: 600, padding: '2px 8px', borderRadius: 99,
                background: `${rc}12`, color: rc, border: `1px solid ${rc}28`,
              }}>
                {p.risk_category}
              </span>
            )}
          </div>

          {/* Row 2: PHC · phone */}
          <div style={{ display: 'flex', alignItems: 'center', marginTop: 4, gap: 4, fontSize: 11 }}>
            <span style={{ color: sub }}>{p.phc}</span>
            {hasPhone
              ? <span style={{ color: '#60A5FA', fontFamily: 'monospace' }}>· {p.phone}</span>
              : <span style={{ color: '#FB7185', fontWeight: 600 }}>· No phone</span>
            }
          </div>

          {/* Row 3: reason tags */}
          {p.reasons && p.reasons.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 7 }}>
              {p.reasons.map((r, ri) => (
                <span key={ri} style={{
                  fontSize: 9, fontWeight: 500, padding: '2px 6px', borderRadius: 4,
                  background: bright ? '#F0F4FA' : 'rgba(255,255,255,0.05)',
                  color: sub,
                  border: `1px solid ${bright ? '#E2E8F0' : 'rgba(255,255,255,0.07)'}`,
                  letterSpacing: '0.01em',
                }}>
                  {r}
                </span>
              ))}
            </div>
          )}

          {/* Score bar */}
          <div style={{
            marginTop: 10, height: 2, borderRadius: 2, overflow: 'hidden',
            background: bright ? '#E8EDF5' : 'rgba(255,255,255,0.06)',
          }}>
            <div style={{
              height: '100%', width: `${scorePct}%`, borderRadius: 2,
              background: tier.color, opacity: 0.55, transition: 'width 0.6s ease',
            }} />
          </div>
        </div>

        {/* Call button */}
        {isHRT && (
          <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center', marginLeft: 12 }}>
            <button
              onClick={() => onCall(p)}
              onMouseEnter={() => setCallHov(true)}
              onMouseLeave={() => setCallHov(false)}
              style={{
                width: 48, height: 48, borderRadius: 14, border: `1.5px solid ${tier.color}45`,
                background: callHov ? `${tier.color}22` : `${tier.color}10`,
                color: tier.color, cursor: 'pointer', transition: 'all 0.15s',
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 2,
                boxShadow: callHov ? `0 0 18px ${tier.color}20` : 'none',
              }}>
              <Phone size={15} />
              <span style={{ fontSize: 8, fontWeight: 700, letterSpacing: '0.06em' }}>CALL</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────
export default function DailyWorkflow({ user }) {
  const { theme } = useTheme();
  const bright = theme === 'bright';

  const [tasks,         setTasks]         = useState([]);
  const [todayCalls,    setTodayCalls]    = useState([]);
  const [priorityCalls, setPriorityCalls] = useState([]);
  const [loading,       setLoading]       = useState(true);
  const [modal,         setModal]         = useState(null);
  const [activeTab,     setActiveTab]     = useState('priority');

  const todayStr = new Date().toLocaleDateString('en-IN', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [t, c, p] = await Promise.all([
        fetch(`${API}/tasks/today?role=${user.role}`).then(r => r.json()),
        fetch(`${API}/calls/today?role=${user.role}`).then(r => r.json()),
        fetch(`${API}/daily-priority?role=${user.role}&limit=30`).then(r => r.json()),
      ]);
      setTasks(Array.isArray(t) ? t : []);
      setTodayCalls(Array.isArray(c) ? c : []);
      setPriorityCalls(Array.isArray(p) ? p : []);
    } catch { } finally { setLoading(false); }
  }, [user.role]);

  useEffect(() => { load(); }, [load]);

  const done   = tasks.filter(t => t.called).length;
  const total  = tasks.length;
  const pct    = total > 0 ? Math.round((done / total) * 100) : 0;
  const isHRT  = user.role.startsWith('HRT');

  const p1c = priorityCalls.filter(p => p.priority_tier === 'P1').length;
  const p2c = priorityCalls.filter(p => p.priority_tier === 'P2').length;
  const p3c = priorityCalls.filter(p => p.priority_tier === 'P3').length;

  // Theme tokens
  const panel = bright ? '#FFFFFF'                   : '#0D1729';
  const bdr   = bright ? '1px solid #E8EDF5'         : '1px solid rgba(99,102,241,0.14)';
  const divBdr = bright ? '#F0F4FA'                  : 'rgba(99,102,241,0.09)';
  const tx    = bright ? '#1E293B'                   : '#EEF2FF';
  const sub   = bright ? '#64748B'                   : '#4B5E7A';
  const bg    = bright ? '#F4F7FB'                   : 'rgba(7,13,26,0.5)';

  const TABS = [
    { id: 'priority', label: 'AI Priority', count: priorityCalls.length, accent: '#818CF8' },
    { id: 'tasks',    label: 'Due Today',   count: total,                accent: '#60A5FA' },
    { id: 'log',      label: 'Call Log',    count: todayCalls.length,    accent: '#34D399' },
  ];

  return (
    <div style={{ maxWidth: 760, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 16 }}>

      {/* ── Header ──────────────────────────────────────────────────── */}
      <div style={{
        background: panel, border: bdr, borderRadius: 20,
        padding: '14px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <div>
          <h1 style={{ fontSize: 15, fontWeight: 700, color: tx, margin: 0, letterSpacing: '-0.3px' }}>
            Daily Workflow
          </h1>
          <p style={{ fontSize: 11, color: sub, margin: '3px 0 0' }}>{todayStr} · {user.name}</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {todayCalls.length > 0 && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: 5, padding: '5px 10px',
              borderRadius: 10, background: 'rgba(52,211,153,0.1)', border: '1px solid rgba(52,211,153,0.22)',
            }}>
              <CheckCircle2 size={12} color="#34D399" />
              <span style={{ fontSize: 11, fontWeight: 700, color: '#34D399' }}>
                {todayCalls.length} called
              </span>
            </div>
          )}
          <button onClick={load} style={{
            display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px', borderRadius: 10,
            background: bg, border: bdr, color: sub, fontSize: 11, fontWeight: 600, cursor: 'pointer',
          }}>
            <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
            Refresh
          </button>
        </div>
      </div>

      {/* ── Main panel ──────────────────────────────────────────────── */}
      <div style={{ background: panel, border: bdr, borderRadius: 20, overflow: 'hidden' }}>

        {/* Tab bar */}
        <div style={{ display: 'flex', borderBottom: `1px solid ${divBdr}` }}>
          {TABS.map(tab => {
            const active = activeTab === tab.id;
            return (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                style={{
                  flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
                  padding: '13px 8px', fontSize: 11, fontWeight: 600, cursor: 'pointer',
                  color: active ? tab.accent : sub, background: 'transparent', border: 'none',
                  borderBottom: active ? `2px solid ${tab.accent}` : '2px solid transparent',
                  marginBottom: -1, transition: 'color 0.15s, border-color 0.15s',
                  letterSpacing: '0.01em',
                }}>
                {tab.id === 'priority' && <Zap size={12} />}
                {tab.label}
                <span style={{ fontVariantNumeric: 'tabular-nums', opacity: 0.65, fontWeight: 700 }}>
                  ({tab.count})
                </span>
              </button>
            );
          })}
        </div>

        {/* ── AI Priority ─────────────────────────────────────────── */}
        {activeTab === 'priority' && (
          <>
            {/* Sub-header */}
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '10px 20px', borderBottom: `1px solid ${divBdr}`,
              background: bright ? '#F8FAFF' : 'rgba(99,102,241,0.04)',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                <Zap size={13} color="#818CF8" />
                <span style={{ fontSize: 11, fontWeight: 600, color: '#818CF8' }}>Smart Call Priority</span>
                <span style={{ fontSize: 10, color: sub }}>· excludes already-called mothers</span>
              </div>
              <div style={{ display: 'flex', gap: 14 }}>
                {p1c > 0 && (
                  <span style={{ fontSize: 10, fontWeight: 700, color: '#FB7185', fontVariantNumeric: 'tabular-nums' }}>
                    {p1c} Critical
                  </span>
                )}
                {p2c > 0 && (
                  <span style={{ fontSize: 10, fontWeight: 700, color: '#FB923C', fontVariantNumeric: 'tabular-nums' }}>
                    {p2c} Urgent
                  </span>
                )}
                {p3c > 0 && (
                  <span style={{ fontSize: 10, fontWeight: 700, color: '#FBBF24', fontVariantNumeric: 'tabular-nums' }}>
                    {p3c} Standard
                  </span>
                )}
              </div>
            </div>

            {loading ? (
              <div style={{ padding: '56px 0', textAlign: 'center' }}>
                <Zap size={32} color="#818CF8" style={{ margin: '0 auto 12px', display: 'block', opacity: 0.5 }} />
                <p style={{ fontSize: 12, color: sub, margin: 0 }}>Ranking mothers by urgency…</p>
              </div>
            ) : priorityCalls.length === 0 ? (
              <div style={{ padding: '56px 0', textAlign: 'center' }}>
                <CheckCircle2 size={40} color="#34D399" style={{ margin: '0 auto 12px', display: 'block', opacity: 0.8 }} />
                <p style={{ fontSize: 13, fontWeight: 600, color: tx, margin: '0 0 4px' }}>
                  All priority mothers called today
                </p>
                <p style={{ fontSize: 11, color: sub, margin: 0 }}>Refresh to check for new additions</p>
              </div>
            ) : (
              <div>
                {priorityCalls.map(p => (
                  <PriorityCard
                    key={p.uid}
                    p={p}
                    onCall={setModal}
                    isHRT={isHRT}
                    bright={bright}
                  />
                ))}
              </div>
            )}
          </>
        )}

        {/* ── Due Today ───────────────────────────────────────────── */}
        {activeTab === 'tasks' && (
          <>
            {loading ? (
              <div style={{ padding: '48px 0', textAlign: 'center', fontSize: 12, color: sub }}>
                Loading tasks…
              </div>
            ) : tasks.length === 0 ? (
              <div style={{ padding: '48px 0', textAlign: 'center' }}>
                <CheckCircle2 size={40} color="#34D399" style={{ margin: '0 auto 12px', display: 'block', opacity: 0.8 }} />
                <p style={{ fontSize: 13, fontWeight: 600, color: tx, margin: '0 0 4px' }}>No follow-ups due today</p>
                <p style={{ fontSize: 11, color: sub, margin: 0 }}>All caught up!</p>
              </div>
            ) : (
              <>
                {/* Progress strip */}
                <div style={{ padding: '10px 20px', borderBottom: `1px solid ${divBdr}` }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, fontSize: 10, color: sub }}>
                    <span>Progress</span>
                    <span style={{ fontWeight: 700, fontVariantNumeric: 'tabular-nums', color: pct === 100 ? '#34D399' : tx }}>
                      {done} / {total}
                    </span>
                  </div>
                  <div style={{ height: 3, borderRadius: 3, overflow: 'hidden', background: bright ? '#E8EDF5' : 'rgba(255,255,255,0.06)' }}>
                    <div style={{
                      height: '100%', width: `${pct}%`, borderRadius: 3,
                      background: pct === 100 ? '#34D399' : 'linear-gradient(90deg,#818CF8,#60A5FA)',
                      transition: 'width 0.6s ease',
                    }} />
                  </div>
                </div>
                {tasks.map(t => {
                  const hp = t.phone && t.phone !== 'nan';
                  return (
                    <div key={t.uid} style={{
                      display: 'flex', alignItems: 'center', gap: 12, padding: '12px 20px',
                      borderBottom: `1px solid ${divBdr}`,
                    }}>
                      <div style={{
                        width: 24, height: 24, borderRadius: '50%', flexShrink: 0,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        background: t.called ? 'rgba(52,211,153,0.12)' : 'rgba(96,165,250,0.1)',
                        border: `1.5px solid ${t.called ? '#34D399' : 'rgba(96,165,250,0.3)'}`,
                      }}>
                        {t.called
                          ? <CheckCircle2 size={13} color="#34D399" />
                          : <Clock size={13} color="#60A5FA" />}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 12, fontWeight: 600, color: tx }}>{t.name}</div>
                        <div style={{ fontSize: 10, color: sub, marginTop: 2 }}>
                          {t.phc}{hp && <span style={{ color: '#60A5FA' }}> · {t.phone}</span>}
                        </div>
                        {t.called && <div style={{ marginTop: 4 }}><OutcomeBadge outcome={t.outcome} /></div>}
                      </div>
                      {isHRT && !t.called && (
                        <button onClick={() => setModal(t)} style={{
                          flexShrink: 0, display: 'flex', alignItems: 'center', gap: 5, padding: '6px 12px',
                          borderRadius: 10, background: 'rgba(96,165,250,0.1)', border: '1px solid rgba(96,165,250,0.25)',
                          color: '#60A5FA', fontSize: 11, fontWeight: 700, cursor: 'pointer',
                        }}>
                          <Phone size={12} /> Log Call
                        </button>
                      )}
                      {t.called && t.notes && (
                        <div style={{ fontSize: 10, color: sub, maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontStyle: 'italic' }}>
                          {t.notes}
                        </div>
                      )}
                    </div>
                  );
                })}
              </>
            )}
          </>
        )}

        {/* ── Call Log ────────────────────────────────────────────── */}
        {activeTab === 'log' && (
          <>
            {todayCalls.length === 0 ? (
              <div style={{ padding: '48px 0', textAlign: 'center' }}>
                <Phone size={36} color={sub} style={{ margin: '0 auto 12px', display: 'block', opacity: 0.25 }} />
                <p style={{ fontSize: 13, fontWeight: 600, color: tx, margin: '0 0 4px' }}>No calls logged yet today</p>
                <p style={{ fontSize: 11, color: sub, margin: 0 }}>Use AI Priority to start calling</p>
              </div>
            ) : (
              <>
                {/* Column headers */}
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: isHRT ? '1fr auto auto' : '1fr auto auto auto',
                  gap: 12, padding: '8px 20px',
                  borderBottom: `1px solid ${divBdr}`,
                  fontSize: 9, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: sub,
                }}>
                  <span>Mother</span>
                  <span>Outcome</span>
                  {!isHRT && <span>HRT</span>}
                  <span>Time</span>
                </div>
                {todayCalls.map(c => (
                  <div key={c.id} style={{
                    display: 'grid',
                    gridTemplateColumns: isHRT ? '1fr auto auto' : '1fr auto auto auto',
                    gap: 12, padding: '10px 20px', alignItems: 'center',
                    borderBottom: `1px solid ${divBdr}`,
                  }}>
                    <div>
                      <div style={{ fontSize: 12, fontWeight: 600, color: tx }}>{c.mother_name || c.mother_id}</div>
                      {c.phc && <div style={{ fontSize: 10, color: sub, marginTop: 1 }}>{c.phc}</div>}
                      {c.notes && <div style={{ fontSize: 10, color: sub, marginTop: 1, fontStyle: 'italic' }}>{c.notes}</div>}
                    </div>
                    <OutcomeBadge outcome={c.outcome} />
                    {!isHRT && <span style={{ fontSize: 10, fontWeight: 700, color: '#818CF8' }}>{c.hrt_user}</span>}
                    <span style={{ fontSize: 10, color: sub, fontFamily: 'monospace', fontVariantNumeric: 'tabular-nums' }}>
                      {c.call_time?.slice(11, 16) || ''}
                    </span>
                  </div>
                ))}
              </>
            )}
          </>
        )}
      </div>

      {/* Modal */}
      {modal && (
        <LogCallModal
          mother={modal}
          hrtUser={user.role}
          onClose={() => setModal(null)}
          onSaved={() => { setModal(null); load(); }}
        />
      )}
    </div>
  );
}
