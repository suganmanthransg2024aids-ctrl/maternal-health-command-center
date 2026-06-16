import React, { useEffect, useState } from 'react';
import {
  Users, AlertTriangle, Heart, Calendar, Phone, CalendarCheck,
  AlertCircle, RefreshCw, TrendingUp, Baby, ShieldAlert,
  BarChart2, Activity, Bell,
} from 'lucide-react';
import PostdatedEDDModal    from './PostdatedEDDModal';
import DrillDownModal       from './DrillDownModal';
import HRTCallPerformance   from './HRTCallPerformance';

const API = '/api';

const RISK_COLORS = {
  Critical:   { text: '#FCA5A5', dot: '#EF4444' },
  'Very High':{ text: '#FDBA74', dot: '#F97316' },
  High:       { text: '#FDE047', dot: '#EAB308' },
  Moderate:   { text: '#93C5FD', dot: '#3B82F6' },
  Low:        { text: '#86EFAC', dot: '#22C55E' },
};

/* ── KPI Card ─────────────────────────────────────────────────────────────── */
function KPICard({ icon: Icon, label, value, color, onClick }) {
  return (
    <div
      onClick={onClick}
      className="rounded-xl p-4 flex flex-col gap-2 transition-all"
      style={{
        background: 'var(--ccmc-panel)',
        border: '1px solid rgba(30,58,95,0.7)',
        cursor: onClick ? 'pointer' : 'default',
      }}
      onMouseEnter={(e) => {
        if (onClick) {
          e.currentTarget.style.borderColor  = color || '#1976D2';
          e.currentTarget.style.boxShadow    = `0 0 0 1px ${color || '#1976D2'}30, 0 4px 20px rgba(0,0,0,0.3)`;
        }
      }}
      onMouseLeave={(e) => {
        if (onClick) {
          e.currentTarget.style.borderColor = 'rgba(30,58,95,0.7)';
          e.currentTarget.style.boxShadow   = 'none';
        }
      }}
    >
      <div className="flex items-center justify-between">
        <div className="w-9 h-9 rounded-lg flex items-center justify-center"
          style={{ background: `${color || '#1976D2'}20` }}>
          <Icon className="w-5 h-5" style={{ color: color || '#42A5F5' }} />
        </div>
        <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider text-right max-w-[80px] leading-tight">
          {label}
        </span>
      </div>
      <div className="text-2xl font-bold" style={{ color: color || '#F1F5F9' }}>
        {value ?? '—'}
      </div>
      {onClick && (
        <div className="text-[9px] font-semibold uppercase tracking-wider" style={{ color: `${color || '#42A5F5'}80` }}>
          Click to drill down →
        </div>
      )}
    </div>
  );
}

/* ── Risk Bar ─────────────────────────────────────────────────────────────── */
function RiskBar({ label, count, total, color, dot, onClick }) {
  const pct = total > 0 ? Math.round((count / total) * 100) : 0;
  return (
    <div
      className="flex items-center gap-3 rounded-lg px-2 py-1.5 -mx-2 transition-all"
      onClick={onClick}
      style={{ cursor: onClick ? 'pointer' : 'default' }}
      onMouseEnter={(e) => { if (onClick) e.currentTarget.style.background = 'rgba(30,58,95,0.45)'; }}
      onMouseLeave={(e) => { if (onClick) e.currentTarget.style.background = 'transparent'; }}
    >
      <div className="flex items-center gap-1.5 w-24 flex-shrink-0">
        <div className="w-2 h-2 rounded-full" style={{ background: dot }} />
        <span className="text-xs text-slate-400 font-medium">{label}</span>
      </div>
      <div className="flex-1 h-1.5 rounded-full" style={{ background: 'rgba(30,58,95,0.5)' }}>
        <div className="h-full rounded-full transition-all duration-700"
          style={{ width: `${pct}%`, background: dot }} />
      </div>
      <span className="text-xs font-bold w-10 text-right" style={{ color }}>
        {(count || 0).toLocaleString()}
      </span>
      <span className="text-[10px] text-slate-600 w-8 text-right">{pct}%</span>
    </div>
  );
}

/* ── Main Component ───────────────────────────────────────────────────────── */
export default function DashboardOverview({ stats, user, onRefresh, syncing, setActivePage, openPatient }) {
  const [alerts,        setAlerts]        = useState([]);
  const [phcData,       setPHCData]       = useState([]);
  const [hrtCallData,   setHrtCallData]   = useState([]);
  const [showPostdated, setShowPostdated] = useState(false);
  const [drillDown,     setDrillDown]     = useState(null); // { metric, title }

  useEffect(() => {
    if (!user) return;
    fetch(`${API}/alerts?role=${user.role}`)
      .then(r => r.json()).then(d => setAlerts(d.alerts || [])).catch(() => {});
    fetch(`${API}/phc-analytics?role=${user.role}`)
      .then(r => r.json()).then(d => setPHCData(d.slice(0, 10))).catch(() => {});
    fetch(`${API}/hrt-call-performance?role=${user.role}`)
      .then(r => r.json()).then(d => setHrtCallData(d.hrts || [])).catch(() => {});
  }, [user]);

  const s            = stats || {};
  const riskDist     = s.risk_distribution || {};
  const totalForPct  = s.total_mothers || 1;
  const priorityAlerts = alerts.filter(a => a.priority === 'P1').slice(0, 8);

  /* Helper — returns onClick that opens DrillDownModal */
  const drill = (metric, title) => () => setDrillDown({ metric, title });

  return (
    <div className="space-y-5">

      {/* ── Header ── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-white" style={{ fontFamily: 'Poppins, sans-serif' }}>
            Dashboard Overview
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Live maternal health intelligence — {s.total_mothers?.toLocaleString() ?? '…'} total records
            <span className="ml-2 font-medium" style={{ color: '#42A5F5' }}>· click any card to drill down</span>
          </p>
        </div>
        <button onClick={onRefresh} disabled={syncing}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold"
          style={{ background: 'rgba(25,118,210,0.2)', border: '1px solid rgba(25,118,210,0.4)', color: '#42A5F5' }}>
          <RefreshCw className={`w-3.5 h-3.5 ${syncing ? 'animate-spin' : ''}`} />
          {syncing ? 'Syncing…' : 'Sync Excel'}
        </button>
      </div>

      {/* ── KPI Grid ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3">
        <KPICard icon={Users}        label="Total Mothers"  value={s.total_mothers?.toLocaleString()}  color="#42A5F5" onClick={drill('total',         'All Mothers')} />
        <KPICard icon={ShieldAlert}  label="High Risk"      value={s.high_risk?.toLocaleString()}      color="#F97316" onClick={drill('high_risk',     'High Risk Mothers')} />
        <KPICard icon={AlertTriangle}label="Critical"       value={s.critical?.toLocaleString()}       color="#EF4444" onClick={drill('critical',      'Critical Risk Mothers')} />
        <KPICard icon={Baby}         label="Due ≤7 Days"    value={s.due_7_days?.toLocaleString()}     color="#A78BFA" onClick={drill('due_7_days',    'Mothers Due ≤7 Days')} />
        <KPICard icon={Heart}        label="Delivered"      value={s.delivered?.toLocaleString()}      color="#22C55E" onClick={drill('delivered',     'Delivered Mothers')} />
        <KPICard icon={Phone}        label="No Phone"       value={s.missing_phone?.toLocaleString()}  color="#F59E0B" onClick={drill('missing_phone', 'Mothers Missing Phone')} />
        <KPICard icon={Calendar}     label="Due ≤30 Days"   value={s.due_30_days?.toLocaleString()}    color="#60A5FA" onClick={drill('due_30_days',   'Mothers Due ≤30 Days')} />
        <KPICard icon={AlertCircle}  label="Postdated EDD"  value={s.postdated_edd?.toLocaleString()}  color="#EF4444" onClick={() => setShowPostdated(true)} />
        <KPICard icon={TrendingUp}   label="Very High Risk" value={s.very_high?.toLocaleString()}      color="#F97316" onClick={drill('very_high',     'Very High Risk Mothers')} />
        <KPICard icon={AlertCircle}  label="Missing Name"   value={s.missing_name?.toLocaleString()}   color="#F59E0B" onClick={drill('missing_name',  'Mothers Missing Name')} />
      </div>

      {/* ── Operational Intelligence ── */}
      <div className="rounded-xl p-4"
        style={{ background: 'var(--ccmc-panel)', border: '1px solid rgba(25,118,210,0.3)' }}>
        <div className="flex items-center gap-2 mb-3">
          <BarChart2 className="w-4 h-4" style={{ color: '#42A5F5' }} />
          <h2 className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--ccmc-text-sec)' }}>
            Live Operational Intelligence
          </h2>
          <span className="text-[9px] ml-auto" style={{ color: '#42A5F566' }}>click to see mothers</span>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2">
          {[
            {
              label: 'Due Today',
              value: s.due_today ?? '—',
              color: '#DC2626',
              sub: 'Deliveries due today',
              onClick: drill('due_today', 'Mothers Due Today'),
              urgent: (s.due_today || 0) > 0,
            },
            {
              label: 'Due ≤7 Days',
              value: s.due_7_days ?? '—',
              color: '#F97316',
              sub: 'Upcoming deliveries',
              onClick: drill('due_7_days', 'Mothers Due ≤7 Days'),
            },
            {
              label: 'Critical Mothers',
              value: s.critical ?? '—',
              color: '#EF4444',
              sub: 'Highest risk cases',
              onClick: drill('critical', 'Critical Risk Mothers'),
            },
            {
              label: 'Follow-Ups Today',
              value: s.followups_due_today ?? '—',
              color: '#A78BFA',
              sub: 'Visits scheduled today',
              onClick: drill('followups_today', 'Follow-Ups Due Today'),
            },
            {
              label: 'Calls Pending',
              value: s.calls_pending_today ?? '—',
              color: '#60A5FA',
              sub: 'Pending today',
              onClick: drill('calls_pending', 'Calls Pending Today'),
            },
            {
              label: 'Data Issues',
              value: s.validation_issues ?? '—',
              color: '#F59E0B',
              sub: 'Validation problems',
              onClick: () => setActivePage('validation'),
            },
          ].map(({ label, value, color, sub, onClick, urgent }) => (
            <button
              key={label}
              onClick={onClick}
              className="rounded-xl p-3 text-left transition-all"
              style={{ background: `${color}08`, border: `1px solid ${color}25` }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = `${color}60`; e.currentTarget.style.background = `${color}12`; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = `${color}25`; e.currentTarget.style.background = `${color}08`; }}
            >
              <div className="text-xl font-bold" style={{ color }}>
                {typeof value === 'number' ? value.toLocaleString() : value}
                {urgent && value > 0 && (
                  <span className="inline-block w-1.5 h-1.5 rounded-full mb-1 ml-1 align-middle animate-pulse"
                    style={{ background: color }} />
                )}
              </div>
              <div className="text-[9px] font-bold uppercase tracking-wider mt-0.5" style={{ color }}>
                {label}
              </div>
              <div className="text-[9px] mt-0.5" style={{ color: 'var(--ccmc-text-hint)' }}>{sub}</div>
            </button>
          ))}
        </div>
      </div>

      {/* ── Two-column section ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

        {/* Risk distribution */}
        <div className="rounded-xl p-5" style={{ background: 'var(--ccmc-panel)', border: '1px solid rgba(30,58,95,0.7)' }}>
          <div className="flex items-center gap-2 mb-4">
            <Activity className="w-4 h-4" style={{ color: '#42A5F5' }} />
            <h2 className="text-sm font-bold text-white">Risk Distribution</h2>
            <span className="text-[10px] text-slate-500 ml-auto">
              {s.total_mothers?.toLocaleString()} mothers · <span style={{ color: '#42A5F5' }}>click row</span>
            </span>
          </div>
          <div className="space-y-1">
            {Object.entries(RISK_COLORS).map(([cat, col]) => {
              const metricKey = cat.toLowerCase().replace(' ', '_');
              return (
                <RiskBar
                  key={cat}
                  label={cat}
                  count={riskDist[cat] || 0}
                  total={totalForPct}
                  color={col.text}
                  dot={col.dot}
                  onClick={drill(metricKey, `${cat} Risk Mothers`)}
                />
              );
            })}
          </div>
        </div>

        {/* Priority alerts */}
        <div className="rounded-xl p-5" style={{ background: 'var(--ccmc-panel)', border: '1px solid rgba(30,58,95,0.7)' }}>
          <div className="flex items-center gap-2 mb-4">
            <Bell className="w-4 h-4" style={{ color: '#EF4444' }} />
            <h2 className="text-sm font-bold text-white">Priority Alerts</h2>
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded ml-auto"
              style={{ background: 'rgba(239,68,68,0.2)', color: '#FCA5A5' }}>
              P1 — {alerts.filter(a => a.priority === 'P1').length}
            </span>
          </div>
          <div className="space-y-2 max-h-52 overflow-y-auto">
            {priorityAlerts.length === 0 ? (
              <div className="text-center py-8 text-xs text-slate-500">Loading alerts…</div>
            ) : priorityAlerts.map((a, i) => (
              <div
                key={i}
                onClick={() => openPatient(a.uid)}
                className="flex items-start gap-2.5 p-2.5 rounded-lg cursor-pointer transition-all"
                style={{ background: 'rgba(239,68,68,0.05)', border: '1px solid rgba(239,68,68,0.15)' }}
                onMouseEnter={e => { e.currentTarget.style.background = 'rgba(239,68,68,0.12)'; e.currentTarget.style.borderColor = 'rgba(239,68,68,0.4)'; }}
                onMouseLeave={e => { e.currentTarget.style.background = 'rgba(239,68,68,0.05)'; e.currentTarget.style.borderColor = 'rgba(239,68,68,0.15)'; }}
              >
                <div className="w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0" style={{ background: '#EF4444' }} />
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-semibold text-white truncate">{a.mother_name || 'Unknown'}</div>
                  <div className="text-[10px] text-slate-400">{a.phc_display} · {a.alert_type}</div>
                </div>
                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded flex-shrink-0"
                  style={{ background: 'rgba(239,68,68,0.2)', color: '#FCA5A5' }}>
                  {a.risk_category}
                </span>
              </div>
            ))}
          </div>
          <button
            onClick={() => setActivePage('alerts')}
            className="w-full mt-3 py-2 rounded-lg text-xs font-semibold"
            style={{ background: 'rgba(239,68,68,0.1)', color: '#FCA5A5', border: '1px solid rgba(239,68,68,0.2)' }}>
            View All {alerts.length} Alerts →
          </button>
        </div>
      </div>

      {/* ── HRT Performance Today ── */}
      {hrtCallData.length > 0 && (
        <div className="rounded-xl p-4"
          style={{ background: 'var(--ccmc-panel)', border: '1px solid rgba(66,165,245,0.25)' }}>
          <div className="flex items-center gap-2 mb-3">
            <Phone className="w-4 h-4" style={{ color: '#42A5F5' }} />
            <h2 className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--ccmc-text-sec)' }}>
              HRT Performance Today
            </h2>
            <span className="text-[9px] ml-auto text-slate-600">calls completed · pending · follow-ups due</span>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-2">
            {hrtCallData.map(h => {
              const hrtColors = {
                HRT1:'#F472B6',HRT2:'#A78BFA',HRT3:'#60A5FA',HRT4:'#FBBF24',
                HRT5:'#34D399',HRT6:'#F87171',HRT7:'#C084FC',HRT8:'#FB923C',
              };
              const c = hrtColors[h.hrt_code] || '#42A5F5';
              const callPct = h.total_mothers > 0 ? Math.round((h.calls_connected / h.total_mothers) * 100) : 0;
              return (
                <div key={h.hrt_code} className="rounded-xl p-3 text-center"
                  style={{ background: `${c}08`, border: `1px solid ${c}25` }}>
                  <div className="text-[10px] font-bold mb-1" style={{ color: c }}>{h.hrt_code}</div>
                  <div className="text-[9px] text-slate-500 mb-2 truncate">{h.hrt_name}</div>
                  <div className="space-y-1">
                    <div className="flex justify-between text-[9px]">
                      <span className="text-slate-600">Connected</span>
                      <span className="font-bold" style={{ color: '#22C55E' }}>{h.calls_connected}</span>
                    </div>
                    <div className="flex justify-between text-[9px]">
                      <span className="text-slate-600">Pending</span>
                      <span className="font-bold" style={{ color: '#64748B' }}>{h.calls_pending}</span>
                    </div>
                    <div className="flex justify-between text-[9px]">
                      <span className="text-slate-600">FU Due</span>
                      <span className="font-bold" style={{ color: '#F59E0B' }}>{h.followups_due}</span>
                    </div>
                  </div>
                  <div className="mt-2 h-1 rounded-full overflow-hidden" style={{ background: 'rgba(30,58,95,0.4)' }}>
                    <div className="h-full rounded-full transition-all"
                      style={{ width: `${callPct}%`, background: '#22C55E' }} />
                  </div>
                  <div className="text-[8px] text-slate-600 mt-0.5">{callPct}% connected</div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── HRT Daily Call Activity (full table) ── */}
      <HRTCallPerformance user={user} />

      {/* ── Modals ── */}
      {showPostdated && (
        <PostdatedEDDModal
          user={user}
          onClose={() => setShowPostdated(false)}
          openPatient={(uid) => { setShowPostdated(false); openPatient(uid); }}
        />
      )}
      {drillDown && (
        <DrillDownModal
          metric={drillDown.metric}
          title={drillDown.title}
          user={user}
          onClose={() => setDrillDown(null)}
          openPatient={(uid) => { setDrillDown(null); openPatient(uid); }}
        />
      )}

      {/* ── PHC Performance Table ── */}
      <div className="rounded-xl overflow-hidden"
        style={{ background: 'var(--ccmc-panel)', border: '1px solid rgba(30,58,95,0.7)' }}>
        <div className="flex items-center justify-between px-5 py-3 border-b"
          style={{ borderColor: 'rgba(30,58,95,0.7)' }}>
          <div className="flex items-center gap-2">
            <BarChart2 className="w-4 h-4" style={{ color: '#42A5F5' }} />
            <h2 className="text-sm font-bold text-white">PHC Performance Summary</h2>
            <span className="text-[10px] ml-1" style={{ color: '#42A5F566' }}>· click row to see mothers</span>
          </div>
          <button onClick={() => setActivePage('phc')}
            className="text-[10px] font-bold" style={{ color: '#42A5F5' }}>
            Full Analytics →
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>PHC / UPHC</th>
                <th>HRT</th>
                <th className="text-right">Total</th>
                <th className="text-right">Critical</th>
                <th className="text-right">Very High</th>
                <th className="text-right">Due Soon</th>
                <th className="text-right">Delivered</th>
                <th className="text-right">Risk %</th>
              </tr>
            </thead>
            <tbody>
              {phcData.length === 0 ? (
                <tr><td colSpan={8} className="text-center py-6 text-slate-500 text-xs">Loading PHC data…</td></tr>
              ) : phcData.map(p => (
                <tr
                  key={p.phc_key}
                  style={{ cursor: 'pointer' }}
                  onClick={() => setDrillDown({ metric: `phc:${p.phc_key}`, title: `${p.phc_display} — All Mothers` })}
                  onMouseEnter={e => e.currentTarget.style.background = 'rgba(25,118,210,0.08)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                >
                  <td className="font-semibold text-white">{p.phc_display}</td>
                  <td>
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded mr-1"
                      style={{ background: 'rgba(66,165,245,0.15)', color: '#93C5FD' }}>
                      {p.hrt_code}
                    </span>
                    <span className="text-[10px] text-slate-400">{p.hrt_name}</span>
                  </td>
                  <td className="text-right font-bold text-white">{p.total}</td>
                  <td className="text-right font-bold" style={{ color: '#FCA5A5' }}>{p.critical}</td>
                  <td className="text-right font-bold" style={{ color: '#FDBA74' }}>{p.very_high}</td>
                  <td className="text-right font-bold" style={{ color: '#A78BFA' }}>{p.due_soon}</td>
                  <td className="text-right font-bold" style={{ color: '#86EFAC' }}>{p.delivered}</td>
                  <td className="text-right">
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded"
                      style={{
                        background: p.risk_pct > 50 ? 'rgba(239,68,68,0.15)' : p.risk_pct > 25 ? 'rgba(249,115,22,0.15)' : 'rgba(34,197,94,0.15)',
                        color:      p.risk_pct > 50 ? '#FCA5A5'              : p.risk_pct > 25 ? '#FDBA74'              : '#86EFAC',
                      }}>
                      {p.risk_pct}%
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}
