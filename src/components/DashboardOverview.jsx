import React, { useEffect, useState } from 'react';
import {
  Users, AlertTriangle, Heart, Calendar, Phone, CalendarCheck,
  AlertCircle, RefreshCw, TrendingUp, Baby, ShieldAlert,
  BarChart2, Activity, Bell, ArrowUpRight, Clock,
} from 'lucide-react';
import PostdatedEDDModal  from './PostdatedEDDModal';
import DrillDownModal     from './DrillDownModal';
import HRTCallPerformance from './HRTCallPerformance';
import DeliveryTimeline   from './DeliveryTimeline';

const API = '/api';

const RISK_TIERS = [
  { key: 'Critical',   color: '#EF4444', track: 'rgba(239,68,68,0.12)'  },
  { key: 'Very High',  color: '#F97316', track: 'rgba(249,115,22,0.12)' },
  { key: 'High',       color: '#EAB308', track: 'rgba(234,179,8,0.12)'  },
  { key: 'Moderate',   color: '#3B82F6', track: 'rgba(59,130,246,0.12)' },
  { key: 'Low',        color: '#22C55E', track: 'rgba(34,197,94,0.12)'  },
];

/* ── Premium KPI Card ─────────────────────────────────────────────────────── */
function KPICard({ icon: Icon, label, value, color, sub, onClick, accent }) {
  const [hovered, setHovered] = useState(false);

  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className="kpi-card"
      style={{
        borderColor: hovered ? `${color}40` : 'var(--ccmc-border)',
        boxShadow: hovered
          ? `0 8px 32px rgba(0,0,0,0.35), 0 0 0 1px ${color}20`
          : 'var(--ccmc-card-shadow)',
        transform: hovered ? 'translateY(-3px)' : 'translateY(0)',
        cursor: onClick ? 'pointer' : 'default',
      }}
    >
      {/* Accent top bar */}
      <div className="absolute top-0 left-0 right-0 h-0.5 rounded-t-2xl transition-opacity"
        style={{ background: `linear-gradient(90deg, transparent, ${color}, transparent)`, opacity: hovered ? 1 : 0.4 }} />

      {/* Icon + label row */}
      <div className="flex items-start justify-between mb-4">
        <div className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ background: `${color}15` }}>
          <Icon className="w-5 h-5" style={{ color }} />
        </div>
        {onClick && (
          <ArrowUpRight className="w-3.5 h-3.5 transition-opacity"
            style={{ color: 'var(--ccmc-text-hint)', opacity: hovered ? 1 : 0 }} />
        )}
      </div>

      {/* Metric */}
      <div className="text-[32px] font-bold leading-none mb-2"
        style={{ color: 'var(--ccmc-text)', fontFamily: 'Poppins, sans-serif', letterSpacing: '-1px' }}>
        {value ?? '—'}
      </div>

      {/* Label */}
      <div className="text-[12px] font-semibold" style={{ color: 'var(--ccmc-text-sec)' }}>
        {label}
      </div>
      {sub && (
        <div className="text-[11px] mt-0.5" style={{ color: 'var(--ccmc-text-hint)' }}>{sub}</div>
      )}
    </div>
  );
}

/* ── Risk Distribution Row ────────────────────────────────────────────────── */
function RiskBar({ label, count, total, color, track, onClick }) {
  const pct = total > 0 ? Math.round((count / total) * 100) : 0;
  return (
    <div
      onClick={onClick}
      className="flex items-center gap-4 px-3 py-2.5 rounded-xl transition-all"
      style={{ cursor: onClick ? 'pointer' : 'default' }}
      onMouseEnter={(e) => { if (onClick) { e.currentTarget.style.background = track; }}}
      onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
    >
      <div className="w-24 flex-shrink-0 flex items-center gap-2">
        <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: color }} />
        <span className="text-[12px] font-medium" style={{ color: 'var(--ccmc-text-sec)' }}>{label}</span>
      </div>
      <div className="flex-1 progress-track" style={{ background: 'var(--ccmc-surface2)' }}>
        <div className="progress-fill" style={{ width: `${pct}%`, background: color }} />
      </div>
      <div className="w-14 text-right">
        <span className="text-[13px] font-bold" style={{ color }}>
          {(count || 0).toLocaleString()}
        </span>
      </div>
      <div className="w-9 text-right">
        <span className="text-[11px]" style={{ color: 'var(--ccmc-text-hint)' }}>{pct}%</span>
      </div>
    </div>
  );
}

/* ── Operational Intel Card ───────────────────────────────────────────────── */
function IntelCard({ label, value, color, sub, onClick, urgent }) {
  return (
    <button
      onClick={onClick}
      className="text-left rounded-xl p-4 transition-all"
      style={{ background: `${color}09`, border: `1px solid ${color}20` }}
      onMouseEnter={(e) => { e.currentTarget.style.background = `${color}15`; e.currentTarget.style.borderColor = `${color}40`; }}
      onMouseLeave={(e) => { e.currentTarget.style.background = `${color}09`; e.currentTarget.style.borderColor = `${color}20`; }}
    >
      <div className="flex items-start justify-between mb-2">
        <div className="text-[22px] font-bold leading-none" style={{ color, fontFamily: 'Poppins, sans-serif' }}>
          {typeof value === 'number' ? value.toLocaleString() : value}
        </div>
        {urgent && value > 0 && (
          <div className="w-2 h-2 rounded-full animate-pulse flex-shrink-0 mt-1" style={{ background: color }} />
        )}
      </div>
      <div className="text-[11px] font-bold uppercase tracking-wider" style={{ color }}>
        {label}
      </div>
      <div className="text-[10px] mt-1" style={{ color: 'var(--ccmc-text-hint)' }}>{sub}</div>
    </button>
  );
}

/* ── Main Dashboard ───────────────────────────────────────────────────────── */
export default function DashboardOverview({ stats, user, onRefresh, syncing, setActivePage, openPatient }) {
  const [alerts,        setAlerts]        = useState([]);
  const [phcData,       setPHCData]       = useState([]);
  const [hrtCallData,   setHrtCallData]   = useState([]);
  const [showPostdated, setShowPostdated] = useState(false);
  const [drillDown,     setDrillDown]     = useState(null);

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
  const p1Alerts     = alerts.filter(a => a.priority === 'P1').slice(0, 8);
  const drill        = (metric, title) => () => setDrillDown({ metric, title });

  return (
    <div className="space-y-5 fade-in">

      {/* ── Page header ─────────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[22px] font-bold leading-tight"
            style={{ color: 'var(--ccmc-text)', fontFamily: 'Poppins, sans-serif', letterSpacing: '-0.3px' }}>
            Dashboard Overview
          </h1>
          <p className="text-[12px] mt-0.5" style={{ color: 'var(--ccmc-text-hint)' }}>
            Live maternal health intelligence ·&nbsp;
            <span style={{ color: '#3B9FFF' }}>{s.total_mothers?.toLocaleString() ?? '…'} records</span>
            &nbsp;· click any card to drill down
          </p>
        </div>
        <button
          onClick={onRefresh}
          disabled={syncing}
          className="btn-ghost flex items-center gap-2"
          style={{ fontSize: '12px' }}
        >
          <RefreshCw className={`w-3.5 h-3.5 ${syncing ? 'animate-spin' : ''}`}
            style={{ color: syncing ? '#3B9FFF' : 'inherit' }} />
          {syncing ? 'Syncing…' : 'Sync Data'}
        </button>
      </div>

      {/* ── Primary KPI row — 4 hero cards ─────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard
          icon={Users}
          label="Total Mothers"
          value={s.total_mothers?.toLocaleString()}
          color="#3B9FFF"
          sub="All registered records"
          onClick={drill('total', 'All Mothers')}
        />
        <KPICard
          icon={ShieldAlert}
          label="Critical Risk"
          value={s.critical?.toLocaleString()}
          color="#EF4444"
          sub="Highest priority cases"
          onClick={drill('critical', 'Critical Risk Mothers')}
        />
        <KPICard
          icon={Baby}
          label="Due ≤ 7 Days"
          value={s.due_7_days?.toLocaleString()}
          color="#A78BFA"
          sub="Upcoming deliveries"
          onClick={drill('due_7_days', 'Mothers Due ≤7 Days')}
        />
        <KPICard
          icon={Heart}
          label="Delivered"
          value={s.delivered?.toLocaleString()}
          color="#22C55E"
          sub="Successful deliveries"
          onClick={drill('delivered', 'Delivered Mothers')}
        />
      </div>

      {/* ── Secondary KPI row — 4 supporting cards ─────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard
          icon={TrendingUp}
          label="Very High Risk"
          value={s.very_high?.toLocaleString()}
          color="#F97316"
          onClick={drill('very_high', 'Very High Risk Mothers')}
        />
        <KPICard
          icon={Calendar}
          label="Due ≤ 30 Days"
          value={s.due_30_days?.toLocaleString()}
          color="#60A5FA"
          onClick={drill('due_30_days', 'Mothers Due ≤30 Days')}
        />
        <KPICard
          icon={Phone}
          label="No Phone"
          value={s.missing_phone?.toLocaleString()}
          color="#F59E0B"
          onClick={drill('missing_phone', 'Mothers Missing Phone')}
        />
        <KPICard
          icon={AlertCircle}
          label="Postdated EDD"
          value={s.postdated_edd?.toLocaleString()}
          color="#EF4444"
          onClick={() => setShowPostdated(true)}
        />
      </div>

      {/* ── Operational intel strip ─────────────────────────────────── */}
      <div className="rounded-2xl p-5"
        style={{ background: 'var(--ccmc-panel)', border: '1px solid var(--ccmc-border)' }}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4" style={{ color: '#3B9FFF' }} />
            <h2 className="text-[13px] font-bold" style={{ color: 'var(--ccmc-text)' }}>
              Live Operational Intelligence
            </h2>
          </div>
          <span className="text-[11px]" style={{ color: 'var(--ccmc-text-hint)' }}>
            Click any card to view patients
          </span>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {[
            { label: 'Due Today',       value: s.due_today ?? '—',           color: '#EF4444', sub: 'Deliveries today',     onClick: drill('due_today',       'Mothers Due Today'),          urgent: (s.due_today || 0) > 0 },
            { label: 'Due ≤ 7 Days',    value: s.due_7_days ?? '—',          color: '#F97316', sub: 'Upcoming deliveries',  onClick: drill('due_7_days',      'Mothers Due ≤7 Days') },
            { label: 'Critical',        value: s.critical ?? '—',            color: '#EF4444', sub: 'Highest risk cases',   onClick: drill('critical',        'Critical Risk Mothers') },
            { label: 'Follow-Ups',      value: s.followups_due_today ?? '—', color: '#A78BFA', sub: 'Visits today',         onClick: drill('followups_today', 'Follow-Ups Due Today') },
            { label: 'Calls Pending',   value: s.calls_pending_today ?? '—', color: '#60A5FA', sub: 'Pending today',        onClick: drill('calls_pending',   'Calls Pending Today') },
            { label: 'Data Issues',     value: s.validation_issues ?? '—',   color: '#F59E0B', sub: 'Validation problems',  onClick: () => setActivePage('validation') },
          ].map(({ label, value, color, sub, onClick, urgent }) => (
            <IntelCard key={label} label={label} value={value} color={color} sub={sub} onClick={onClick} urgent={urgent} />
          ))}
        </div>
      </div>

      {/* ── Delivery Timeline ──────────────────────────────────────── */}
      <DeliveryTimeline user={user} setActivePage={setActivePage} />

      {/* ── Two-column section ─────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

        {/* Risk distribution */}
        <div className="rounded-2xl p-6"
          style={{ background: 'var(--ccmc-panel)', border: '1px solid var(--ccmc-border)' }}>
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4" style={{ color: '#3B9FFF' }} />
              <h2 className="text-[14px] font-bold" style={{ color: 'var(--ccmc-text)' }}>
                Risk Distribution
              </h2>
            </div>
            <span className="text-[11px]" style={{ color: 'var(--ccmc-text-hint)' }}>
              {s.total_mothers?.toLocaleString()} total
            </span>
          </div>
          <div className="space-y-1">
            {RISK_TIERS.map(({ key, color, track }) => {
              const metricKey = key.toLowerCase().replace(' ', '_');
              return (
                <RiskBar
                  key={key}
                  label={key}
                  count={riskDist[key] || 0}
                  total={totalForPct}
                  color={color}
                  track={track}
                  onClick={drill(metricKey, `${key} Risk Mothers`)}
                />
              );
            })}
          </div>
        </div>

        {/* Priority alerts */}
        <div className="rounded-2xl overflow-hidden"
          style={{ background: 'var(--ccmc-panel)', border: '1px solid var(--ccmc-border)' }}>
          <div className="flex items-center justify-between px-6 py-4"
            style={{ borderBottom: '1px solid var(--ccmc-border)' }}>
            <div className="flex items-center gap-2">
              <Bell className="w-4 h-4" style={{ color: '#EF4444' }} />
              <h2 className="text-[14px] font-bold" style={{ color: 'var(--ccmc-text)' }}>
                Priority Alerts
              </h2>
            </div>
            <span className="chip" style={{ background: 'rgba(239,68,68,0.12)', color: '#FCA5A5', border: '1px solid rgba(239,68,68,0.2)' }}>
              P1 · {alerts.filter(a => a.priority === 'P1').length}
            </span>
          </div>
          <div className="divide-y" style={{ borderColor: 'var(--ccmc-border)', maxHeight: 256, overflowY: 'auto' }}>
            {p1Alerts.length === 0 ? (
              <div className="px-6 py-8 text-center text-[12px]" style={{ color: 'var(--ccmc-text-hint)' }}>
                Loading alerts…
              </div>
            ) : p1Alerts.map((a, i) => (
              <div
                key={i}
                onClick={() => openPatient(a.uid)}
                className="flex items-center gap-3 px-5 py-3.5 cursor-pointer transition-colors"
                onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(239,68,68,0.05)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
              >
                <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: '#EF4444' }} />
                <div className="min-w-0 flex-1">
                  <div className="text-[12px] font-semibold truncate" style={{ color: 'var(--ccmc-text)' }}>
                    {a.mother_name || 'Unknown'}
                  </div>
                  <div className="text-[11px]" style={{ color: 'var(--ccmc-text-hint)' }}>
                    {a.phc_display} · {a.alert_type}
                  </div>
                </div>
                <span className="badge-critical flex-shrink-0">{a.risk_category}</span>
              </div>
            ))}
          </div>
          <div className="px-5 py-3.5" style={{ borderTop: '1px solid var(--ccmc-border)' }}>
            <button
              onClick={() => setActivePage('alerts')}
              className="btn-ghost w-full text-center text-[12px] py-2"
            >
              View all {alerts.length} alerts →
            </button>
          </div>
        </div>
      </div>

      {/* ── HRT Performance strip ───────────────────────────────────── */}
      {hrtCallData.length > 0 && (
        <div className="rounded-2xl overflow-hidden"
          style={{ background: 'var(--ccmc-panel)', border: '1px solid var(--ccmc-border)' }}>
          <div className="flex items-center justify-between px-6 py-4"
            style={{ borderBottom: '1px solid var(--ccmc-border)' }}>
            <div className="flex items-center gap-2">
              <Phone className="w-4 h-4" style={{ color: '#3B9FFF' }} />
              <h2 className="text-[14px] font-bold" style={{ color: 'var(--ccmc-text)' }}>
                HRT Performance — Today
              </h2>
            </div>
            <span className="text-[11px]" style={{ color: 'var(--ccmc-text-hint)' }}>
              Connected · Pending · Follow-ups
            </span>
          </div>
          <div className="p-5 grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3">
            {hrtCallData.map(h => {
              const HRT_COLORS = {
                HRT1: '#F472B6', HRT2: '#A78BFA', HRT3: '#60A5FA', HRT4: '#FBBF24',
                HRT5: '#34D399', HRT6: '#F87171', HRT7: '#C084FC', HRT8: '#FB923C',
              };
              const c = HRT_COLORS[h.hrt_code] || '#3B9FFF';
              const pct = h.total_mothers > 0 ? Math.round((h.calls_connected / h.total_mothers) * 100) : 0;
              return (
                <div key={h.hrt_code} className="rounded-xl p-3 text-center"
                  style={{ background: `${c}09`, border: `1px solid ${c}22` }}>
                  <div className="text-[11px] font-bold mb-0.5" style={{ color: c }}>{h.hrt_code}</div>
                  <div className="text-[9px] mb-3 truncate" style={{ color: 'var(--ccmc-text-hint)' }}>{h.hrt_name}</div>
                  <div className="space-y-1.5 text-left">
                    {[
                      { label: 'Connected', value: h.calls_connected, color: '#22C55E' },
                      { label: 'Pending',   value: h.calls_pending,   color: 'var(--ccmc-text-hint)' },
                      { label: 'FU Due',    value: h.followups_due,   color: '#F59E0B' },
                    ].map(({ label, value, color }) => (
                      <div key={label} className="flex justify-between items-center">
                        <span className="text-[9px]" style={{ color: 'var(--ccmc-text-hint)' }}>{label}</span>
                        <span className="text-[11px] font-bold" style={{ color }}>{value}</span>
                      </div>
                    ))}
                  </div>
                  <div className="mt-3 progress-track">
                    <div className="progress-fill" style={{ width: `${pct}%`, background: '#22C55E' }} />
                  </div>
                  <div className="text-[9px] mt-1" style={{ color: 'var(--ccmc-text-hint)' }}>{pct}% done</div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── HRT full table ──────────────────────────────────────────── */}
      <HRTCallPerformance user={user} />

      {/* ── PHC Performance Table ───────────────────────────────────── */}
      <div className="rounded-2xl overflow-hidden"
        style={{ background: 'var(--ccmc-panel)', border: '1px solid var(--ccmc-border)' }}>
        <div className="flex items-center justify-between px-6 py-4"
          style={{ borderBottom: '1px solid var(--ccmc-border)' }}>
          <div className="flex items-center gap-2">
            <BarChart2 className="w-4 h-4" style={{ color: '#3B9FFF' }} />
            <h2 className="text-[14px] font-bold" style={{ color: 'var(--ccmc-text)' }}>
              PHC Performance Summary
            </h2>
          </div>
          <button onClick={() => setActivePage('phc')}
            className="text-[12px] font-semibold" style={{ color: '#3B9FFF' }}>
            Full Analytics →
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>PHC / UPHC</th>
                <th>HRT Officer</th>
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
                <tr>
                  <td colSpan={8} className="text-center py-8" style={{ color: 'var(--ccmc-text-hint)' }}>
                    Loading PHC data…
                  </td>
                </tr>
              ) : phcData.map(p => (
                <tr
                  key={p.phc_key}
                  style={{ cursor: 'pointer' }}
                  onClick={() => setDrillDown({ metric: `phc:${p.phc_key}`, title: `${p.phc_display} — All Mothers` })}
                >
                  <td className="font-semibold" style={{ color: 'var(--ccmc-text)' }}>{p.phc_display}</td>
                  <td>
                    <span className="chip mr-2"
                      style={{ background: 'rgba(59,159,255,0.12)', color: '#3B9FFF', border: '1px solid rgba(59,159,255,0.2)' }}>
                      {p.hrt_code}
                    </span>
                    <span className="text-[11px]" style={{ color: 'var(--ccmc-text-hint)' }}>{p.hrt_name}</span>
                  </td>
                  <td className="text-right font-bold" style={{ color: 'var(--ccmc-text)' }}>{p.total}</td>
                  <td className="text-right font-semibold" style={{ color: '#FCA5A5' }}>{p.critical}</td>
                  <td className="text-right font-semibold" style={{ color: '#FDBA74' }}>{p.very_high}</td>
                  <td className="text-right font-semibold" style={{ color: '#C4B5FD' }}>{p.due_soon}</td>
                  <td className="text-right font-semibold" style={{ color: '#86EFAC' }}>{p.delivered}</td>
                  <td className="text-right">
                    <span className={p.risk_pct > 50 ? 'badge-critical' : p.risk_pct > 25 ? 'badge-very-high' : 'badge-low'}>
                      {p.risk_pct}%
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Modals ─────────────────────────────────────────────────── */}
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
    </div>
  );
}
