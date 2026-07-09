import React, { useEffect, useState, useCallback } from 'react';
import { Phone, CheckCircle2, Clock, AlertCircle, RefreshCw, X, PhoneOff, PhoneMissed, ChevronDown, Send, Zap } from 'lucide-react';
import { useTheme } from '../ThemeContext';

const API = '/api';

const OUTCOMES = [
  { value: 'contacted',   label: 'Contacted',   color: '#22C55E', icon: CheckCircle2 },
  { value: 'unreachable', label: 'Unreachable',  color: '#EF4444', icon: PhoneOff },
  { value: 'no_answer',   label: 'No Answer',    color: '#F97316', icon: PhoneMissed },
  { value: 'busy',        label: 'Busy',         color: '#EAB308', icon: Phone },
];

const STATUS_OPTIONS = ['Active', 'Delivered', 'Referred', 'Transferred', 'Deceased'];

function OutcomeBadge({ outcome }) {
  const o = OUTCOMES.find(x => x.value === outcome) || OUTCOMES[0];
  const Icon = o.icon;
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold"
      style={{ background: `${o.color}18`, color: o.color, border: `1px solid ${o.color}40` }}>
      <Icon className="w-2.5 h-2.5" /> {o.label}
    </span>
  );
}

function LogCallModal({ mother, hrtUser, onClose, onSaved }) {
  const { theme } = useTheme();
  const bright = theme === 'bright';
  const [outcome, setOutcome] = useState('contacted');
  const [notes, setNotes] = useState('');
  const [newStatus, setNewStatus] = useState('');
  const [saving, setSaving] = useState(false);

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
    } catch { /* silent */ } finally { setSaving(false); }
  };

  const panel  = bright ? '#FFFFFF' : '#0F1729';
  const border = bright ? '#E2E8F0' : 'rgba(30,58,95,0.7)';
  const text   = bright ? '#1E293B' : '#E2E8F0';
  const sub    = bright ? '#64748B' : '#94A3B8';

  return (
    <>
      <div className="fixed inset-0 z-[60]" style={{ background: 'rgba(2,6,23,0.75)', backdropFilter: 'blur(4px)' }} onClick={onClose} />
      <div className="fixed z-[70] top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[min(420px,95vw)] rounded-2xl overflow-hidden"
        style={{ background: panel, border: `1px solid ${border}`, boxShadow: '0 24px 64px rgba(0,0,0,0.5)' }}>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: border }}>
          <div>
            <div className="text-sm font-bold" style={{ color: text, fontFamily: 'Poppins,sans-serif' }}>Log Call</div>
            <div className="text-[11px] mt-0.5 font-medium" style={{ color: sub }}>{mother.name}</div>
          </div>
          <button onClick={onClose} className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: 'rgba(148,163,184,0.1)', color: sub }}>
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {/* Outcome */}
          <div>
            <div className="text-[10px] font-bold uppercase tracking-wider mb-2" style={{ color: sub }}>Call Outcome</div>
            <div className="grid grid-cols-2 gap-2">
              {OUTCOMES.map(o => {
                const Icon = o.icon;
                const sel = outcome === o.value;
                return (
                  <button key={o.value} onClick={() => setOutcome(o.value)}
                    className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all"
                    style={{ background: sel ? `${o.color}20` : bright ? '#F8FAFC' : 'rgba(30,58,95,0.3)', border: `1.5px solid ${sel ? o.color : border}`, color: sel ? o.color : sub }}>
                    <Icon className="w-3.5 h-3.5" /> {o.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Notes */}
          <div>
            <div className="text-[10px] font-bold uppercase tracking-wider mb-1.5" style={{ color: sub }}>Notes (optional)</div>
            <textarea rows={2} value={notes} onChange={e => setNotes(e.target.value)} placeholder="Any remarks about this call…"
              className="w-full rounded-xl px-3 py-2 text-xs resize-none outline-none"
              style={{ background: bright ? '#F8FAFC' : 'rgba(30,58,95,0.3)', border: `1px solid ${border}`, color: text }} />
          </div>

          {/* Status update (optional) */}
          <div>
            <div className="text-[10px] font-bold uppercase tracking-wider mb-1.5" style={{ color: sub }}>Request Status Change <span className="font-normal normal-case">(optional — needs CHO approval)</span></div>
            <div className="relative">
              <select value={newStatus} onChange={e => setNewStatus(e.target.value)}
                className="w-full rounded-xl px-3 py-2 text-xs outline-none appearance-none"
                style={{ background: bright ? '#F8FAFC' : 'rgba(30,58,95,0.3)', border: `1px solid ${border}`, color: newStatus ? text : sub }}>
                <option value="">— No change —</option>
                {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
              <ChevronDown className="absolute right-2.5 top-2.5 w-3.5 h-3.5 pointer-events-none" style={{ color: sub }} />
            </div>
          </div>

          {/* Submit */}
          <button onClick={handleSave} disabled={saving}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold transition-all"
            style={{ background: saving ? 'rgba(34,197,94,0.3)' : '#22C55E', color: '#fff', opacity: saving ? 0.7 : 1 }}>
            <Send className="w-4 h-4" />
            {saving ? 'Saving…' : 'Save Call Log'}
          </button>
        </div>
      </div>
    </>
  );
}

export default function DailyWorkflow({ user }) {
  const { theme } = useTheme();
  const bright = theme === 'bright';

  const [tasks,         setTasks]         = useState([]);
  const [todayCalls,    setTodayCalls]    = useState([]);
  const [priorityCalls, setPriorityCalls] = useState([]);
  const [loading,       setLoading]       = useState(true);
  const [modal,         setModal]         = useState(null);
  const [activeTab,     setActiveTab]     = useState('priority');

  const today = new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

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
    } catch { /* silent */ } finally { setLoading(false); }
  }, [user.role]);

  useEffect(() => { load(); }, [load]);

  const done    = tasks.filter(t => t.called).length;
  const total   = tasks.length;
  const pct     = total > 0 ? Math.round((done / total) * 100) : 0;
  const isHRT   = user.role.startsWith('HRT');

  const panel  = bright ? '#FFFFFF' : 'var(--ccmc-panel)';
  const border = bright ? '1px solid #E2E8F0' : '1px solid rgba(30,58,95,0.7)';
  const text   = bright ? '#1E293B' : '#E2E8F0';
  const sub    = bright ? '#64748B' : '#94A3B8';
  const bg     = bright ? '#F8FAFC' : 'rgba(30,58,95,0.25)';

  return (
    <div className="space-y-5 max-w-4xl mx-auto">

      {/* Header card */}
      <div className="rounded-2xl p-5" style={{ background: panel, border }}>
        <div className="flex items-start justify-between mb-4">
          <div>
            <h1 className="text-lg font-bold" style={{ color: text, fontFamily: 'Poppins,sans-serif' }}>
              Daily Workflow
            </h1>
            <p className="text-xs mt-0.5" style={{ color: sub }}>{today} · {user.name}</p>
          </div>
          <button onClick={load} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold"
            style={{ background: bg, border, color: sub }}>
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>

        {/* Progress */}
        {total > 0 && (
          <div>
            <div className="flex justify-between text-xs mb-1.5" style={{ color: sub }}>
              <span>Today's Tasks</span>
              <span className="font-bold" style={{ color: pct === 100 ? '#22C55E' : text }}>{done} / {total} done</span>
            </div>
            <div className="h-2 rounded-full overflow-hidden" style={{ background: bg }}>
              <div className="h-full rounded-full transition-all duration-500"
                style={{ width: `${pct}%`, background: pct === 100 ? '#22C55E' : 'linear-gradient(90deg,#3B9FFF,#06B6D4)' }} />
            </div>
            <div className="flex gap-3 mt-2">
              {[
                { label: 'Contacted',   color: '#22C55E', count: todayCalls.filter(c=>c.outcome==='contacted').length },
                { label: 'Unreachable', color: '#EF4444', count: todayCalls.filter(c=>c.outcome==='unreachable').length },
                { label: 'No Answer',   color: '#F97316', count: todayCalls.filter(c=>c.outcome==='no_answer').length },
                { label: 'Busy',        color: '#EAB308', count: todayCalls.filter(c=>c.outcome==='busy').length },
              ].filter(s => s.count > 0).map(s => (
                <span key={s.label} className="text-[10px] font-semibold" style={{ color: s.color }}>
                  {s.count} {s.label}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 rounded-xl" style={{ background: panel, border }}>
        {[
          { id: 'priority', label: `AI Priority`, count: priorityCalls.length, icon: true },
          { id: 'tasks',    label: `Due Today`,   count: total },
          { id: 'log',      label: `Call Log`,    count: todayCalls.length },
        ].map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)}
            className="flex-1 py-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1"
            style={{
              background: activeTab === tab.id
                ? (tab.id === 'priority' ? 'linear-gradient(135deg,#7C3AED,#4F46E5)' : '#3B9FFF')
                : 'transparent',
              color: activeTab === tab.id ? '#fff' : sub,
            }}>
            {tab.icon && <Zap className="w-3 h-3" />}
            {tab.label}
            <span className="ml-0.5 opacity-75">({tab.count})</span>
          </button>
        ))}
      </div>

      {/* AI Priority tab */}
      {activeTab === 'priority' && (
        <div className="rounded-2xl overflow-hidden" style={{ background: panel, border }}>
          {/* Header */}
          <div className="px-4 py-3 border-b flex items-center gap-2" style={{ borderColor: bright ? '#F1F5F9' : 'rgba(30,58,95,0.5)', background: bright ? '#F8FAFC' : 'rgba(79,70,229,0.08)' }}>
            <Zap className="w-4 h-4" style={{ color: '#7C3AED' }} />
            <div>
              <span className="text-xs font-bold" style={{ color: bright ? '#4F46E5' : '#A78BFA' }}>Smart Call Priority</span>
              <span className="text-[10px] ml-2" style={{ color: sub }}>AI-ranked · excludes already-called mothers today</span>
            </div>
          </div>

          {loading ? (
            <div className="py-12 text-center text-xs" style={{ color: sub }}>Ranking mothers…</div>
          ) : priorityCalls.length === 0 ? (
            <div className="py-12 text-center">
              <CheckCircle2 className="w-10 h-10 mx-auto mb-3" style={{ color: '#22C55E' }} />
              <p className="text-sm font-semibold" style={{ color: text }}>All priority mothers called today!</p>
              <p className="text-xs mt-1" style={{ color: sub }}>Great work — refresh to check for updates</p>
            </div>
          ) : (
            <div className="divide-y" style={{ borderColor: bright ? '#F1F5F9' : 'rgba(30,58,95,0.4)' }}>
              {priorityCalls.map(p => {
                const tierColor = p.priority_tier === 'P1' ? '#EF4444' : p.priority_tier === 'P2' ? '#F97316' : '#EAB308';
                const riskColor = p.risk_category === 'Critical' ? '#EF4444' : p.risk_category === 'Very High' ? '#F97316' : p.risk_category === 'High' ? '#EAB308' : '#22C55E';
                const hasPhone  = p.phone && p.phone !== 'nan' && p.phone !== 'None' && p.phone !== '';
                const eddText   = p.is_delivered
                  ? (p.days_since_delivery != null ? `PN ${p.days_since_delivery}d` : 'Delivered')
                  : (p.days_to_edd != null
                    ? (p.days_to_edd < 0 ? `Overdue ${Math.abs(p.days_to_edd)}d` : p.days_to_edd === 0 ? 'Due today' : `EDD ${p.days_to_edd}d`)
                    : '—');
                const eddColor  = p.is_delivered ? '#3B9FFF' :
                  (p.days_to_edd != null && p.days_to_edd <= 0) ? '#EF4444' :
                  (p.days_to_edd != null && p.days_to_edd <= 7) ? '#F97316' :
                  (p.days_to_edd != null && p.days_to_edd <= 14) ? '#EAB308' : '#22C55E';

                return (
                  <div key={p.uid} className="px-4 py-3 flex items-start gap-3">
                    {/* Priority badge */}
                    <div className="flex-shrink-0 w-9 h-9 rounded-xl flex flex-col items-center justify-center text-[9px] font-black"
                      style={{ background: `${tierColor}18`, border: `1.5px solid ${tierColor}50`, color: tierColor }}>
                      <span className="text-[11px] leading-none font-black">{p.rank}</span>
                      <span className="mt-0.5 leading-none">{p.priority_tier}</span>
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-bold truncate" style={{ color: text }}>{p.name || '—'}</span>
                        {/* EDD pill */}
                        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full"
                          style={{ background: `${eddColor}18`, color: eddColor, border: `1px solid ${eddColor}40` }}>
                          {eddText}
                        </span>
                        {/* Risk pill */}
                        {p.risk_category && (
                          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full"
                            style={{ background: `${riskColor}18`, color: riskColor, border: `1px solid ${riskColor}40` }}>
                            {p.risk_category}
                          </span>
                        )}
                      </div>
                      {/* PHC + phone */}
                      <div className="text-[10px] mt-0.5" style={{ color: sub }}>
                        {p.phc}
                        {hasPhone && <span style={{ color: '#60A5FA' }}> · {p.phone}</span>}
                        {!hasPhone && <span style={{ color: '#EF4444' }}> · No phone</span>}
                      </div>
                      {/* Reason chips */}
                      {p.reasons && p.reasons.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1.5">
                          {p.reasons.map((r, ri) => (
                            <span key={ri} className="text-[9px] px-1.5 py-0.5 rounded font-medium"
                              style={{ background: bright ? '#F1F5F9' : 'rgba(148,163,184,0.1)', color: sub, border: `1px solid ${bright ? '#E2E8F0' : 'rgba(148,163,184,0.2)'}` }}>
                              {r}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Action */}
                    {isHRT && (
                      <button onClick={() => setModal(p)}
                        className="flex-shrink-0 flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[10px] font-bold"
                        style={{ background: 'rgba(59,159,255,0.15)', border: '1px solid rgba(59,159,255,0.35)', color: '#60A5FA' }}>
                        <Phone className="w-3 h-3" /> Call
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Tasks tab */}
      {activeTab === 'tasks' && (
        <div className="rounded-2xl overflow-hidden" style={{ background: panel, border }}>
          {loading ? (
            <div className="py-12 text-center text-xs" style={{ color: sub }}>Loading tasks…</div>
          ) : tasks.length === 0 ? (
            <div className="py-12 text-center">
              <CheckCircle2 className="w-10 h-10 mx-auto mb-3" style={{ color: '#22C55E' }} />
              <p className="text-sm font-semibold" style={{ color: text }}>No follow-ups due today</p>
              <p className="text-xs mt-1" style={{ color: sub }}>All caught up!</p>
            </div>
          ) : (
            <div className="divide-y" style={{ borderColor: bright ? '#F1F5F9' : 'rgba(30,58,95,0.5)' }}>
              {tasks.map(t => (
                <div key={t.uid} className="flex items-center gap-3 px-4 py-3">
                  {/* Status indicator */}
                  <div className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0"
                    style={{ background: t.called ? '#22C55E20' : 'rgba(59,159,255,0.1)', border: `1.5px solid ${t.called ? '#22C55E' : 'rgba(59,159,255,0.3)'}` }}>
                    {t.called
                      ? <CheckCircle2 className="w-3.5 h-3.5" style={{ color: '#22C55E' }} />
                      : <Clock className="w-3.5 h-3.5" style={{ color: '#3B9FFF' }} />
                    }
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-semibold truncate" style={{ color: text }}>{t.name}</div>
                    <div className="text-[10px] mt-0.5" style={{ color: sub }}>
                      {t.phc}
                      {t.phone && t.phone !== 'nan' && <> · <span style={{ color: '#60A5FA' }}>{t.phone}</span></>}
                    </div>
                    {t.called && <div className="mt-1"><OutcomeBadge outcome={t.outcome} /></div>}
                  </div>

                  {/* Action */}
                  {isHRT && !t.called && (
                    <button onClick={() => setModal(t)}
                      className="flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold"
                      style={{ background: 'rgba(59,159,255,0.15)', border: '1px solid rgba(59,159,255,0.35)', color: '#60A5FA' }}>
                      <Phone className="w-3 h-3" /> Log Call
                    </button>
                  )}
                  {t.called && t.notes && (
                    <div className="text-[10px] max-w-[140px] truncate flex-shrink-0" style={{ color: sub }}>{t.notes}</div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Call Log tab */}
      {activeTab === 'log' && (
        <div className="rounded-2xl overflow-hidden" style={{ background: panel, border }}>
          {todayCalls.length === 0 ? (
            <div className="py-12 text-center">
              <Phone className="w-10 h-10 mx-auto mb-3" style={{ color: sub, opacity: 0.4 }} />
              <p className="text-sm font-semibold" style={{ color: text }}>No calls logged yet today</p>
              <p className="text-xs mt-1" style={{ color: sub }}>Go to "Due Today" tab to log calls</p>
            </div>
          ) : (
            <div className="divide-y" style={{ borderColor: bright ? '#F1F5F9' : 'rgba(30,58,95,0.5)' }}>
              {/* Header row */}
              <div className="grid grid-cols-[1fr_auto_auto_auto] gap-3 px-4 py-2.5 text-[9px] font-bold uppercase tracking-wider" style={{ color: sub }}>
                <span>Mother</span>
                <span>Outcome</span>
                {!isHRT && <span>HRT</span>}
                <span>Time</span>
              </div>
              {todayCalls.map(c => (
                <div key={c.id} className="grid gap-3 px-4 py-3 items-center" style={{ gridTemplateColumns: isHRT ? '1fr auto auto' : '1fr auto auto auto' }}>
                  <div>
                    <div className="text-xs font-semibold" style={{ color: text }}>{c.mother_name || c.mother_id}</div>
                    {c.phc && <div className="text-[10px]" style={{ color: sub }}>{c.phc}</div>}
                    {c.notes && <div className="text-[10px] mt-0.5 italic" style={{ color: sub }}>{c.notes}</div>}
                  </div>
                  <OutcomeBadge outcome={c.outcome} />
                  {!isHRT && <span className="text-[10px] font-bold" style={{ color: '#A78BFA' }}>{c.hrt_user}</span>}
                  <span className="text-[10px]" style={{ color: sub }}>{c.call_time?.slice(11, 16) || ''}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Log Call modal */}
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
