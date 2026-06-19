import React, { useEffect, useState } from 'react';
import { useTheme } from '../ThemeContext';
import {
  Users, AlertTriangle, Heart, Calendar, Phone, CalendarCheck,
  AlertCircle, RefreshCw, TrendingUp, Baby, ShieldAlert,
  BarChart2, Activity, Bell, ArrowUpRight, Clock,
} from 'lucide-react';
import PostdatedEDDModal  from './PostdatedEDDModal';
import DrillDownModal     from './DrillDownModal';
import HRTCallPerformance from './HRTCallPerformance';
import DeliveryTimeline   from './DeliveryTimeline';
import PHCPieCharts       from './PHCPieCharts';

const API = '/api';

const RISK_TIERS_DARK = [
  { key: 'Critical',  color: '#EF4444', track: 'rgba(239,68,68,0.12)'  },
  { key: 'Very High', color: '#F97316', track: 'rgba(249,115,22,0.12)' },
  { key: 'High',      color: '#EAB308', track: 'rgba(234,179,8,0.12)'  },
  { key: 'Moderate',  color: '#3B82F6', track: 'rgba(59,130,246,0.12)' },
  { key: 'Low',       color: '#22C55E', track: 'rgba(34,197,94,0.12)'  },
];

const RISK_TIERS_BRIGHT = [
  { key: 'Critical',  color: '#DC2626', track: '#FEE2E2' },
  { key: 'Very High', color: '#EA580C', track: '#FFF0E6' },
  { key: 'High',      color: '#B45309', track: '#FFFBEB' },
  { key: 'Moderate',  color: '#1D4ED8', track: '#EFF6FF' },
  { key: 'Low',       color: '#059669', track: '#F0FDF4' },
];

const HRT_COLORS_DARK = {
  HRT1: '#F472B6', HRT2: '#A78BFA', HRT3: '#60A5FA', HRT4: '#FBBF24',
  HRT5: '#34D399', HRT6: '#F87171', HRT7: '#C084FC', HRT8: '#FB923C',
};

const HRT_COLORS_BRIGHT = {
  HRT1: '#DB2777', HRT2: '#7C3AED', HRT3: '#2563EB', HRT4: '#D97706',
  HRT5: '#059669', HRT6: '#DC2626', HRT7: '#6D28D9', HRT8: '#EA580C',
};

/* ── Premium KPI Card ─────────────────────────────────────────────────────── */
function KPICard({ icon: Icon, label, value, color, sub, onClick }) {
  const [hovered, setHovered] = useState(false);
  const { theme } = useTheme();
  const bright = theme === 'bright';

  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className="kpi-card"
      style={{
        borderColor: hovered ? `${color}40` : 'var(--ccmc-border)',
        boxShadow: hovered
          ? `0 8px 32px rgba(0,0,0,0.2), 0 0 0 1px ${color}20`
          : 'var(--ccmc-card-shadow)',
        transform: hovered ? 'translateY(-3px)' : 'translateY(0)',
        cursor: onClick ? 'pointer' : 'default',
        transition: 'all 0.22s ease',
      }}
    >
      {/* Gradient top accent bar */}
      <div className="absolute top-0 left-0 right-0 rounded-t-2xl transition-all"
        style={{
          height: hovered ? 3 : 2,
          background: `linear-gradient(90deg, transparent, ${color}, transparent)`,
          opacity: hovered ? 1 : bright ? 0.7 : 0.4,
        }} />

      {/* Icon + arrow */}
      <div className="flex items-start justify-between mb-4">
        <div className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ background: bright ? `${color}12` : `${color}15` }}>
          <Icon className="w-5 h-5" style={{ color }} />
        </div>
        {onClick && (
          <ArrowUpRight className="w-3.5 h-3.5 transition-opacity"
            style={{ color: bright ? color : 'var(--ccmc-text-hint)', opacity: hovered ? 1 : bright ? 0.3 : 0 }} />
        )}
      </div>

      {/* Metric value */}
      <div className="text-[32px] font-bold leading-none mb-2"
        style={{ color: bright ? '#0F172A' : 'var(--ccmc-text)', fontFamily: 'Poppins, sans-serif', letterSpacing: '-1.5px' }}>
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
  const { theme } = useTheme();
  const bright = theme === 'bright';
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
        <span className="text-[12px] font-semibold" style={{ color: bright ? '#334155' : 'var(--ccmc-text-sec)' }}>{label}</span>
      </div>
      <div className="flex-1 progress-track" style={{ background: bright ? '#E2E8F0' : 'var(--ccmc-surface2)' }}>
        <div className="progress-fill" style={{ width: `${pct}%`, background: color }} />
      </div>
      <div className="w-14 text-right">
        <span className="text-[13px] font-bold" style={{ color }}>
          {(count || 0).toLocaleString()}
        </span>
      </div>
      <div className="w-9 text-right">
        <span className="text-[11px] font-semibold" style={{ color: 'var(--ccmc-text-hint)' }}>{pct}%</span>
      </div>
    </div>
  );
}

/* ── Operational Intel Card ───────────────────────────────────────────────── */
function IntelCard({ label, value, color, sub, onClick, urgent }) {
  const { theme } = useTheme();
  const bright = theme === 'bright';
  return (
    <button
      onClick={onClick}
      className="text-left rounded-xl p-4 transition-all"
      style={{ background: `${color}${bright ? '0D' : '09'}`, border: `1px solid ${color}${bright ? '25' : '20'}` }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = `${color}${bright ? '18' : '15'}`;
        e.currentTarget.style.borderColor = `${color}${bright ? '45' : '40'}`;
        e.currentTarget.style.transform = bright ? 'translateY(-1px)' : 'none';
        e.currentTarget.style.boxShadow = bright ? `0 4px 16px ${color}20` : 'none';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = `${color}${bright ? '0D' : '09'}`;
        e.currentTarget.style.borderColor = `${color}${bright ? '25' : '20'}`;
        e.currentTarget.style.transform = 'none';
        e.currentTarget.style.boxShadow = 'none';
      }}
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
  const { theme } = useTheme();
  const bright = theme === 'bright';

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

  const s           = stats || {};
  const riskDist    = s.risk_distribution || {};
  const totalForPct = s.total_mothers || 1;
  const p1Alerts    = alerts.filter(a => a.priority === 'P1').slice(0, 8);
  const drill       = (metric, title) => () => setDrillDown({ metric, title });

  // Theme-aware color palette
  const C = bright ? {
    blue:   '#2563EB', red:    '#DC2626', orange: '#EA580C',
    green:  '#059669', redAlt: '#B91C1C', blueLt: '#2563EB',
    amber:  '#D97706', rose:   '#E11D48', teal:   '#0F766E',
    purple: '#7C3AED',
  } : {
    blue:   '#3B9FFF', red:    '#EF4444', orange: '#A78BFA',
    green:  '#22C55E', redAlt: '#F97316', blueLt: '#60A5FA',
    amber:  '#F59E0B', rose:   '#EF4444', teal:   '#3B9FFF',
    purple: '#A78BFA',
  };

  const RISK_TIERS  = bright ? RISK_TIERS_BRIGHT  : RISK_TIERS_DARK;
  const HRT_COLORS  = bright ? HRT_COLORS_BRIGHT  : HRT_COLORS_DARK;

  // PHC table value colors
  const phcClr = bright
    ? { critical: '#DC2626', veryHigh: '#EA580C', dueSoon: '#7C3AED', delivered: '#059669' }
    : { critical: '#FCA5A5', veryHigh: '#FDBA74', dueSoon: '#C4B5FD', delivered: '#86EFAC' };

  // Chip colors for PHC table HRT badge
  const hrtChipBg  = bright ? '#EFF6FF' : 'rgba(59,159,255,0.12)';
  const hrtChipClr = bright ? '#2563EB' : '#3B9FFF';
  const hrtChipBd  = bright ? '1px solid #BFDBFE' : '1px solid rgba(59,159,255,0.2)';

  // Section card style
  const cardStyle = {
    background: 'var(--ccmc-panel)',
    border: bright ? '1px solid #E2E8F0' : '1px solid var(--ccmc-border)',
    boxShadow: bright ? '0 1px 3px rgba(0,0,0,0.04), 0 6px 20px rgba(0,0,0,0.04)' : 'none',
  };

  // Intel cards with theme-aware colors
  const intelCards = [
    { label: 'Due Today',     value: s.due_today ?? '—',           color: C.red,    sub: 'Deliveries today',    onClick: drill('due_today',       'Mothers Due Today'),        urgent: (s.due_today || 0) > 0 },
    { label: 'Due ≤ 7 Days',  value: s.due_7_days ?? '—',          color: C.orange, sub: 'Upcoming deliveries', onClick: drill('due_7_days',      'Mothers Due ≤7 Days') },
    { label: 'Critical',      value: s.critical ?? '—',            color: C.red,    sub: 'Highest risk cases',  onClick: drill('critical',        'Critical Risk Mothers') },
    { label: 'Follow-Ups',    value: s.followups_due_today ?? '—', color: C.purple, sub: 'Visits today',        onClick: drill('followups_today', 'Follow-Ups Due Today') },
    { label: 'Calls Pending', value: s.calls_pending_today ?? '—', color: C.blue,   sub: 'Pending today',       onClick: drill('calls_pending',   'Calls Pending Today') },
    { label: 'Data Issues',   value: s.validation_issues ?? '—',   color: C.amber,  sub: 'Validation problems', onClick: () => setActivePage('validation') },
  ];

  return (
    <div className="space-y-5 fade-in">

      {/* ── Page header ─────────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[22px] font-bold leading-tight"
            style={{
              color: 'var(--ccmc-text)',
              fontFamily: 'Poppins, sans-serif',
              letterSpacing: '-0.3px',
              fontWeight: bright ? 800 : 700,
            }}>
            {bright ? 'Command Center Overview' : 'Dashboard Overview'}
          </h1>
          <p className="text-[12px] mt-0.5" style={{ color: 'var(--ccmc-text-hint)' }}>
            {bright ? 'Live healthcare intelligence · ' : 'Live maternal health intelligence · '}
            <span style={{ color: C.blue }}>{s.total_mothers?.toLocaleString() ?? '…'} records</span>
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
            style={{ color: syncing ? C.teal : 'inherit' }} />
          {syncing ? 'Syncing…' : 'Sync Data'}
        </button>
      </div>

      {/* ── Primary KPI row ─────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard icon={Users}      label="Total Mothers"  value={s.total_mothers?.toLocaleString()} color={C.blue}   sub="All registered records"    onClick={drill('total',      'All Mothers')} />
        <KPICard icon={ShieldAlert} label="Critical Risk" value={s.critical?.toLocaleString()}       color={C.red}    sub="Highest priority cases"    onClick={drill('critical',   'Critical Risk Mothers')} />
        <KPICard icon={Baby}        label="Due ≤ 7 Days"  value={s.due_7_days?.toLocaleString()}     color={C.orange} sub="Upcoming deliveries"       onClick={drill('due_7_days', 'Mothers Due ≤7 Days')} />
        <KPICard icon={Heart}       label="Delivered"     value={s.delivered?.toLocaleString()}       color={C.green}  sub="Successful deliveries"     onClick={drill('delivered',  'Delivered Mothers')} />
      </div>

      {/* ── Secondary KPI row ───────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard icon={TrendingUp}  label="Very High Risk"  value={s.very_high?.toLocaleString()}      color={C.redAlt} onClick={drill('very_high',     'Very High Risk Mothers')} />
        <KPICard icon={Calendar}    label="Due ≤ 30 Days"   value={s.due_30_days?.toLocaleString()}    color={C.blueLt} onClick={drill('due_30_days',   'Mothers Due ≤30 Days')} />
        <KPICard icon={Phone}       label="No Phone"        value={s.missing_phone?.toLocaleString()}  color={C.amber}  onClick={drill('missing_phone', 'Mothers Missing Phone')} />
        <KPICard icon={AlertCircle} label="Postdated EDD"   value={s.postdated_edd?.toLocaleString()}  color={C.rose}   onClick={() => setShowPostdated(true)} />
      </div>

      {/* ── Operational intel strip ─────────────────────────────────── */}
      <div className="rounded-2xl p-5" style={cardStyle}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4" style={{ color: C.teal }} />
            <h2 className="text-[13px] font-bold" style={{ color: 'var(--ccmc-text)' }}>
              {bright ? 'Operational Intelligence' : 'Live Operational Intelligence'}
            </h2>
          </div>
          <span className="text-[11px]" style={{ color: 'var(--ccmc-text-hint)' }}>
            Click any card to view patients
          </span>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {intelCards.map(({ label, value, color, sub, onClick, urgent }) => (
            <IntelCard key={label} label={label} value={value} color={color} sub={sub} onClick={onClick} urgent={urgent} />
          ))}
        </div>
      </div>

      {/* ── Delivery Timeline ──────────────────────────────────────── */}
      <DeliveryTimeline user={user} setActivePage={setActivePage} />

      {/* ── PHC Pie Charts (CHO / DMCHO only) ──────────────────────── */}
      <PHCPieCharts user={user} />

      {/* ── Two-column section ─────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

        {/* Risk distribution */}
        <div className="rounded-2xl p-6" style={cardStyle}>
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4" style={{ color: C.teal }} />
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
        <div className="rounded-2xl overflow-hidden" style={cardStyle}>
          <div className="flex items-center justify-between px-6 py-4"
            style={{ borderBottom: bright ? '1px solid #F1F5F9' : '1px solid var(--ccmc-border)' }}>
            <div className="flex items-center gap-2">
              <Bell className="w-4 h-4" style={{ color: C.red }} />
              <h2 className="text-[14px] font-bold" style={{ color: 'var(--ccmc-text)' }}>
                Priority Alerts
              </h2>
            </div>
            <span className="chip"
              style={{
                background: bright ? '#FEE2E2' : 'rgba(239,68,68,0.12)',
                color: bright ? '#DC2626' : '#FCA5A5',
                border: bright ? '1px solid #FECACA' : '1px solid rgba(239,68,68,0.2)',
              }}>
              P1 · {alerts.filter(a => a.priority === 'P1').length}
            </span>
          </div>
          <div className="divide-y" style={{ borderColor: bright ? '#F1F5F9' : 'var(--ccmc-border)', maxHeight: 256, overflowY: 'auto' }}>
            {p1Alerts.length === 0 ? (
              <div className="px-6 py-8 text-center text-[12px]" style={{ color: 'var(--ccmc-text-hint)' }}>
                Loading alerts…
              </div>
            ) : p1Alerts.map((a, i) => (
              <div
                key={i}
                onClick={() => openPatient(a.uid)}
                className="flex items-center gap-3 px-5 py-3.5 cursor-pointer transition-colors"
                onMouseEnter={(e) => { e.currentTarget.style.background = bright ? '#FEF2F2' : 'rgba(239,68,68,0.05)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
              >
                <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: C.red }} />
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
          <div className="px-5 py-3.5"
            style={{ borderTop: bright ? '1px solid #F1F5F9' : '1px solid var(--ccmc-border)' }}>
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
        <div className="rounded-2xl overflow-hidden" style={cardStyle}>
          <div className="flex items-center justify-between px-6 py-4"
            style={{ borderBottom: bright ? '1px solid #F1F5F9' : '1px solid var(--ccmc-border)' }}>
            <div className="flex items-center gap-2">
              <Phone className="w-4 h-4" style={{ color: C.teal }} />
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
              const c = HRT_COLORS[h.hrt_code] || C.blue;
              const pct = h.total_mothers > 0 ? Math.round((h.calls_connected / h.total_mothers) * 100) : 0;
              return (
                <div key={h.hrt_code} className="rounded-xl p-3 text-center"
                  style={{
                    background: bright ? `${c}10` : `${c}09`,
                    border: `1px solid ${c}${bright ? '30' : '22'}`,
                  }}>
                  <div className="text-[11px] font-bold mb-0.5" style={{ color: c }}>{h.hrt_code}</div>
                  <div className="text-[9px] mb-3 truncate" style={{ color: 'var(--ccmc-text-hint)' }}>{h.hrt_name}</div>
                  <div className="space-y-1.5 text-left">
                    {[
                      { label: 'Connected', value: h.calls_connected, color: bright ? '#059669' : '#22C55E' },
                      { label: 'Pending',   value: h.calls_pending,   color: 'var(--ccmc-text-hint)' },
                      { label: 'FU Due',    value: h.followups_due,   color: bright ? '#D97706' : '#F59E0B' },
                    ].map(({ label, value, color }) => (
                      <div key={label} className="flex justify-between items-center">
                        <span className="text-[9px]" style={{ color: 'var(--ccmc-text-hint)' }}>{label}</span>
                        <span className="text-[11px] font-bold" style={{ color }}>{value}</span>
                      </div>
                    ))}
                  </div>
                  <div className="mt-3 progress-track">
                    <div className="progress-fill" style={{ width: `${pct}%`, background: bright ? '#059669' : '#22C55E' }} />
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
      <div className="rounded-2xl overflow-hidden" style={cardStyle}>
        <div className="flex items-center justify-between px-6 py-4"
          style={{ borderBottom: bright ? '1px solid #F1F5F9' : '1px solid var(--ccmc-border)' }}>
          <div className="flex items-center gap-2">
            <BarChart2 className="w-4 h-4" style={{ color: C.teal }} />
            <h2 className="text-[14px] font-bold" style={{ color: 'var(--ccmc-text)' }}>
              PHC Performance Summary
            </h2>
          </div>
          <button onClick={() => setActivePage('phc')}
            className="text-[12px] font-semibold" style={{ color: C.teal }}>
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
                      style={{ background: hrtChipBg, color: hrtChipClr, border: hrtChipBd }}>
                      {p.hrt_code}
                    </span>
                    <span className="text-[11px]" style={{ color: 'var(--ccmc-text-hint)' }}>{p.hrt_name}</span>
                  </td>
                  <td className="text-right font-bold" style={{ color: 'var(--ccmc-text)' }}>{p.total}</td>
                  <td className="text-right font-semibold" style={{ color: phcClr.critical }}>{p.critical}</td>
                  <td className="text-right font-semibold" style={{ color: phcClr.veryHigh }}>{p.very_high}</td>
                  <td className="text-right font-semibold" style={{ color: phcClr.dueSoon }}>{p.due_soon}</td>
                  <td className="text-right font-semibold" style={{ color: phcClr.delivered }}>{p.delivered}</td>
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
