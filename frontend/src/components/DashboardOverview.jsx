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


const HRT_COLORS_DARK = {
  HRT1: '#F472B6', HRT2: '#A78BFA', HRT3: '#60A5FA', HRT4: '#FBBF24',
  HRT5: '#34D399', HRT6: '#F87171', HRT7: '#C084FC', HRT8: '#FB923C',
};

const HRT_COLORS_BRIGHT = {
  HRT1: '#DB2777', HRT2: '#7C3AED', HRT3: '#2563EB', HRT4: '#D97706',
  HRT5: '#059669', HRT6: '#DC2626', HRT7: '#6D28D9', HRT8: '#EA580C',
};

/* ── Premium KPI Card ─────────────────────────────────────────────────────── */
function KPICard({ icon: Icon, label, value, color, sub, onClick, gradient, iconBg }) {
  const [hovered, setHovered] = useState(false);
  const { theme } = useTheme();
  const bright = theme === 'bright';

  const topAccent = bright && gradient
    ? `linear-gradient(90deg, ${gradient[0]}, ${gradient[1]})`
    : `linear-gradient(90deg, transparent, ${color}, transparent)`;

  const iconBgStyle = bright && iconBg
    ? `linear-gradient(135deg, ${iconBg[0]}, ${iconBg[1]})`
    : `${color}${bright ? '12' : '15'}`;

  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className="kpi-card"
      style={{
        borderColor: hovered ? `${color}40` : 'var(--ccmc-border)',
        boxShadow: hovered
          ? `0 8px 32px rgba(0,0,0,0.15), 0 0 0 1px ${color}20`
          : 'var(--ccmc-card-shadow)',
        transform: hovered ? 'translateY(-3px)' : 'translateY(0)',
        cursor: onClick ? 'pointer' : 'default',
        transition: 'all 0.22s ease',
      }}
    >
      {/* Gradient top accent bar */}
      <div className="absolute top-0 left-0 right-0 rounded-t-2xl"
        style={{
          height: hovered ? 3 : 2,
          background: topAccent,
          opacity: hovered ? 1 : bright ? 0.85 : 0.4,
          transition: 'height 0.2s, opacity 0.2s',
        }} />

      {/* Icon + arrow */}
      <div className="flex items-start justify-between mb-4">
        <div className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ background: iconBgStyle }}>
          <Icon className="w-5 h-5" style={{ color }} />
        </div>
        {onClick && (
          <ArrowUpRight className="w-3.5 h-3.5"
            style={{ color: bright ? color : 'var(--ccmc-text-hint)', opacity: hovered ? 0.8 : bright ? 0.25 : 0, transition: 'opacity 0.2s' }} />
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

/* ── Operational Intel Card ───────────────────────────────────────────────── */
function IntelCard({ label, value, color, sub, onClick, urgent, gradient }) {
  const { theme } = useTheme();
  const bright = theme === 'bright';

  const topAccent = bright && gradient
    ? `linear-gradient(90deg, ${gradient[0]}, ${gradient[1]})`
    : null;

  return (
    <button
      onClick={onClick}
      className="text-left rounded-xl transition-all relative overflow-hidden"
      style={{
        padding: '16px',
        background: bright ? '#FFFFFF' : `${color}09`,
        border: bright ? '1px solid #E2E8F0' : `1px solid ${color}20`,
        boxShadow: bright ? '0 1px 3px rgba(0,0,0,0.04)' : 'none',
      }}
      onMouseEnter={(e) => {
        if (bright) {
          e.currentTarget.style.boxShadow = `0 4px 16px ${color}20, 0 1px 3px rgba(0,0,0,0.06)`;
          e.currentTarget.style.borderColor = `${color}35`;
          e.currentTarget.style.transform = 'translateY(-1px)';
        } else {
          e.currentTarget.style.background = `${color}15`;
          e.currentTarget.style.borderColor = `${color}40`;
        }
      }}
      onMouseLeave={(e) => {
        if (bright) {
          e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.04)';
          e.currentTarget.style.borderColor = '#E2E8F0';
          e.currentTarget.style.transform = 'none';
        } else {
          e.currentTarget.style.background = `${color}09`;
          e.currentTarget.style.borderColor = `${color}20`;
        }
      }}
    >
      {/* Gradient top accent (bright mode only) */}
      {bright && topAccent && (
        <div className="absolute top-0 left-0 right-0" style={{ height: 2, background: topAccent }} />
      )}

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
  const [autoSync,      setAutoSync]      = useState(null); // null until loaded
  const [toggling,      setToggling]      = useState(false);

  const isAdmin = Boolean(user?.full_access);

  useEffect(() => {
    if (!isAdmin) return;
    fetch(`${API}/sync-status`)
      .then(r => r.json())
      .then(d => setAutoSync(Boolean(d.auto_enabled)))
      .catch(() => {});
  }, [isAdmin]);

  const setSyncMode = async (enabled) => {
    if (toggling || autoSync === enabled) return;
    setToggling(true);
    try {
      const r = await fetch(`${API}/sync-auto`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled, role: user.role }),
      });
      if (r.ok) {
        const d = await r.json();
        setAutoSync(Boolean(d.auto_enabled));
      }
    } catch { /* keep previous mode on failure */ } finally {
      setToggling(false);
    }
  };

  useEffect(() => {
    if (!user) return;
    fetch(`${API}/alerts?role=${user.role}`)
      .then(r => r.json()).then(d => setAlerts(d.alerts || [])).catch(() => {});
    fetch(`${API}/phc-analytics?role=${user.role}`)
      .then(r => r.json()).then(d => setPHCData(d.slice(0, 10))).catch(() => {});
    fetch(`${API}/hrt-call-performance?role=${user.role}`)
      .then(r => r.json()).then(d => setHrtCallData(d.hrts || [])).catch(() => {});
  }, [user]);

  const s        = stats || {};
  const p1Alerts = alerts.filter(a => a.priority === 'P1').slice(0, 8);
  const drill    = (metric, title) => () => setDrillDown({ metric, title });

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

  const HRT_COLORS = bright ? HRT_COLORS_BRIGHT : HRT_COLORS_DARK;

  // PHC table value colors
  const phcClr = bright
    ? { critical: '#DC2626', veryHigh: '#EA580C', dueSoon: '#7C3AED', delivered: '#059669' }
    : { critical: '#FCA5A5', veryHigh: '#FDBA74', dueSoon: '#C4B5FD', delivered: '#86EFAC' };

  const hrtChipBg  = bright ? '#EFF6FF' : 'rgba(59,159,255,0.12)';
  const hrtChipClr = bright ? '#2563EB' : '#3B9FFF';
  const hrtChipBd  = bright ? '1px solid #BFDBFE' : '1px solid rgba(59,159,255,0.2)';

  const cardStyle = {
    background: 'var(--ccmc-panel)',
    border: bright ? '1px solid #E2E8F0' : '1px solid var(--ccmc-border)',
    boxShadow: bright ? '0 1px 3px rgba(0,0,0,0.04), 0 6px 20px rgba(0,0,0,0.04)' : 'none',
  };

  // Intel cards with per-card gradient accents
  const intelCards = [
    { label: 'Due Today',     value: s.due_today ?? '—',           color: C.red,    gradient: ['#EA580C', '#FB923C'], sub: 'Deliveries today',    onClick: drill('due_today',       'Mothers Due Today'), urgent: (s.due_today || 0) > 0 },
    { label: 'Due ≤ 7 Days',  value: s.due_7_days ?? '—',          color: C.orange, gradient: ['#F97316', '#FB923C'], sub: 'Upcoming deliveries', onClick: drill('due_7_days',      'Mothers Due ≤7 Days') },
    { label: 'Overdue EDD',   value: s.overdue_edd ?? '—',         color: C.rose,   gradient: ['#E11D48', '#FB7185'], sub: 'Past due date',       onClick: drill('overdue_edd',     'Overdue EDD Mothers') },
    { label: 'Follow-Ups',    value: s.followups_due_today ?? '—', color: C.purple, gradient: ['#7C3AED', '#A78BFA'], sub: 'Visits today',        onClick: drill('followups_today', 'Follow-Ups Due Today') },
    { label: 'Calls Pending', value: s.calls_pending_today ?? '—', color: C.blue,   gradient: ['#2563EB', '#60A5FA'], sub: 'Pending today',       onClick: drill('calls_pending',   'Calls Pending Today') },
    { label: 'Data Issues',   value: s.validation_issues ?? '—',   color: C.amber,  gradient: ['#D97706', '#FBBF24'], sub: 'Validation problems', onClick: () => setActivePage('validation') },
  ];

  return (
    <div className="space-y-5 fade-in">

      {/* ── Page header ─────────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[22px] font-bold leading-tight"
            style={{ color: 'var(--ccmc-text)', fontFamily: 'Poppins, sans-serif', letterSpacing: '-0.3px', fontWeight: bright ? 800 : 700 }}>
            {bright ? 'Command Center Overview' : 'Dashboard Overview'}
          </h1>
          <p className="text-[12px] mt-0.5" style={{ color: 'var(--ccmc-text-hint)' }}>
            {bright ? 'Live healthcare intelligence · ' : 'Live maternal health intelligence · '}
            <span style={{ color: C.blue }}>{s.total_mothers?.toLocaleString() ?? '…'} records</span>
            &nbsp;· click any card to drill down
          </p>
        </div>
        <div className="flex items-center gap-3">
          {isAdmin && autoSync !== null && (
            <div className="flex items-center rounded-full p-0.5"
              title={autoSync
                ? 'Auto: spreadsheet is fetched every 60 seconds'
                : 'Manual: spreadsheet is fetched only when you click Sync Data'}
              style={{ border: '1px solid var(--ccmc-border)', background: 'var(--ccmc-panel)', opacity: toggling ? 0.6 : 1 }}>
              <button onClick={() => setSyncMode(true)} disabled={toggling}
                className="rounded-full px-3 py-1 transition-colors"
                style={{ fontSize: '11px', fontWeight: 600,
                  background: autoSync ? C.green : 'transparent',
                  color: autoSync ? '#FFFFFF' : 'var(--ccmc-text-hint)' }}>
                Auto 60s
              </button>
              <button onClick={() => setSyncMode(false)} disabled={toggling}
                className="rounded-full px-3 py-1 transition-colors"
                style={{ fontSize: '11px', fontWeight: 600,
                  background: autoSync ? 'transparent' : C.amber,
                  color: autoSync ? 'var(--ccmc-text-hint)' : '#FFFFFF' }}>
                Manual
              </button>
            </div>
          )}
          <button onClick={onRefresh} disabled={syncing} className="btn-ghost flex items-center gap-2" style={{ fontSize: '12px' }}>
            <RefreshCw className={`w-3.5 h-3.5 ${syncing ? 'animate-spin' : ''}`} style={{ color: syncing ? C.teal : 'inherit' }} />
            {syncing ? 'Syncing…' : 'Sync Data'}
          </button>
        </div>
      </div>

      {/* ── Primary KPI row ─────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard icon={Users}       label="Total Mothers"  value={s.total_mothers?.toLocaleString()} color={C.blue}   sub="All registered records"   onClick={drill('total',         'All Mothers')}
          gradient={['#2563EB','#3B82F6']} iconBg={['#EFF6FF','#DBEAFE']} />
        <KPICard icon={Baby}        label="Due ≤ 7 Days"   value={s.due_7_days?.toLocaleString()}   color={C.orange} sub="Upcoming deliveries"      onClick={drill('due_7_days',    'Mothers Due ≤7 Days')}
          gradient={['#F97316','#FB923C']} iconBg={['#FFF7ED','#FED7AA']} />
        <KPICard icon={Heart}       label="Delivered"      value={s.delivered?.toLocaleString()}     color={C.green}  sub="Successful deliveries"    onClick={drill('delivered',     'Delivered Mothers')}
          gradient={['#059669','#10B981']} iconBg={['#ECFDF5','#D1FAE5']} />
        <KPICard icon={Phone}       label="Calls Pending"  value={s.calls_pending_today?.toLocaleString()} color={C.teal}  sub="Pending today"       onClick={drill('calls_pending', 'Calls Pending Today')}
          gradient={['#0F766E','#14B8A6']} iconBg={['#F0FDFA','#CCFBF1']} />
      </div>

      {/* ── Secondary KPI row ───────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard icon={Calendar}    label="Due ≤ 30 Days"   value={s.due_30_days?.toLocaleString()}   color={C.blueLt} onClick={drill('due_30_days',   'Mothers Due ≤30 Days')}
          gradient={['#2563EB','#60A5FA']} iconBg={['#EFF6FF','#DBEAFE']} />
        <KPICard icon={Phone}       label="No Phone"         value={s.missing_phone?.toLocaleString()} color={C.amber}  onClick={drill('missing_phone', 'Mothers Missing Phone')}
          gradient={['#D97706','#FBBF24']} iconBg={['#FFF7ED','#FED7AA']} />
        <KPICard icon={AlertCircle} label="Postdated EDD"    value={s.postdated_edd?.toLocaleString()} color={C.rose}   onClick={() => setShowPostdated(true)}
          gradient={['#E11D48','#FB7185']} iconBg={['#FEF2F2','#FECACA']} />
        <KPICard icon={CalendarCheck} label="Follow-Ups Due" value={s.followups_due_today?.toLocaleString()} color={C.purple} onClick={drill('followups_today', 'Follow-Ups Due Today')}
          gradient={['#7C3AED','#A78BFA']} iconBg={['#F5F3FF','#EDE9FE']} />
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
          <span className="text-[11px]" style={{ color: 'var(--ccmc-text-hint)' }}>Click any card to view patients</span>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {intelCards.map(({ label, value, color, sub, onClick, urgent, gradient }) => (
            <IntelCard key={label} label={label} value={value} color={color} sub={sub} onClick={onClick} urgent={urgent} gradient={gradient} />
          ))}
        </div>
      </div>

      {/* ── Delivery Timeline ──────────────────────────────────────── */}
      <DeliveryTimeline user={user} setActivePage={setActivePage} />

      {/* ── PHC Pie Charts (CHO / DMCHO only) ──────────────────────── */}
      <PHCPieCharts user={user} />

      {/* ── Priority Alerts (full width) ─────────────────────────── */}
      <div>

        {/* Priority alerts */}
        <div className="rounded-2xl overflow-hidden" style={cardStyle}>
          <div className="flex items-center justify-between px-6 py-4"
            style={{ borderBottom: bright ? '1px solid #F1F5F9' : '1px solid var(--ccmc-border)' }}>
            <div className="flex items-center gap-2">
              <Bell className="w-4 h-4" style={{ color: C.red }} />
              <h2 className="text-[14px] font-bold" style={{ color: 'var(--ccmc-text)' }}>Priority Alerts</h2>
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
              <div className="px-6 py-8 text-center text-[12px]" style={{ color: 'var(--ccmc-text-hint)' }}>Loading alerts…</div>
            ) : p1Alerts.map((a, i) => (
              <div key={i} onClick={() => openPatient(a.uid)}
                className="flex items-center gap-3 px-5 py-3.5 cursor-pointer transition-colors"
                onMouseEnter={(e) => { e.currentTarget.style.background = bright ? '#FEF2F2' : 'rgba(239,68,68,0.05)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}>
                <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: C.red }} />
                <div className="min-w-0 flex-1">
                  <div className="text-[12px] font-semibold truncate" style={{ color: 'var(--ccmc-text)' }}>{a.mother_name || 'Unknown'}</div>
                  <div className="text-[11px]" style={{ color: 'var(--ccmc-text-hint)' }}>{a.phc_display} · {a.alert_type}</div>
                </div>
                {a.days_to_edd != null && (
                  <span className="text-[10px] font-bold flex-shrink-0"
                    style={{ color: a.days_to_edd < 0 ? '#EF4444' : a.days_to_edd < 7 ? '#F97316' : '#94A3B8' }}>
                    {a.days_to_edd < 0 ? `${Math.abs(a.days_to_edd)}d over` : `${a.days_to_edd}d`}
                  </span>
                )}
              </div>
            ))}
          </div>
          <div className="px-5 py-3.5" style={{ borderTop: bright ? '1px solid #F1F5F9' : '1px solid var(--ccmc-border)' }}>
            <button onClick={() => setActivePage('alerts')} className="btn-ghost w-full text-center text-[12px] py-2">
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
              <h2 className="text-[14px] font-bold" style={{ color: 'var(--ccmc-text)' }}>HRT Performance — Today</h2>
            </div>
            <span className="text-[11px]" style={{ color: 'var(--ccmc-text-hint)' }}>Connected · Pending · Follow-ups</span>
          </div>
          <div className="p-5 grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3">
            {hrtCallData.map(h => {
              const c   = HRT_COLORS[h.hrt_code] || C.blue;
              const pct = h.total_mothers > 0 ? Math.round((h.calls_connected / h.total_mothers) * 100) : 0;
              const connColor = h.deo_source ? '#06B6D4' : (bright ? '#059669' : '#22C55E');
              return (
                <div key={h.hrt_code} className="rounded-xl p-3 text-center"
                  style={{ background: bright ? `${c}10` : `${c}09`, border: `1px solid ${c}${bright ? '30' : '22'}` }}>
                  <div className="text-[11px] font-bold mb-0.5" style={{ color: c }}>{h.hrt_code}</div>
                  <div className="text-[9px] truncate" style={{ color: 'var(--ccmc-text-hint)' }}>{h.hrt_name}</div>
                  {h.deo_source && (
                    <div className="text-[8px] font-bold mb-1" style={{ color: '#06B6D4' }}>MCH Record</div>
                  )}
                  <div className={`space-y-1.5 text-left ${h.deo_source ? '' : 'mt-3'}`}>
                    {[
                      { label: 'Connected', value: h.calls_connected, color: connColor },
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
                    <div className="progress-fill" style={{ width: `${pct}%`, background: h.deo_source ? '#06B6D4' : (bright ? 'linear-gradient(90deg,#059669,#10B981)' : '#22C55E') }} />
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
            <h2 className="text-[14px] font-bold" style={{ color: 'var(--ccmc-text)' }}>PHC Performance Summary</h2>
          </div>
          <button onClick={() => setActivePage('phc')} className="text-[12px] font-semibold" style={{ color: C.teal }}>
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
                <th className="text-right">Due Soon</th>
                <th className="text-right">Delivered</th>
                <th className="text-right">High Risk %</th>
              </tr>
            </thead>
            <tbody>
              {phcData.length === 0 ? (
                <tr><td colSpan={6} className="text-center py-8" style={{ color: 'var(--ccmc-text-hint)' }}>Loading PHC data…</td></tr>
              ) : phcData.map(p => (
                <tr key={p.phc_key} style={{ cursor: 'pointer' }}
                  onClick={() => setDrillDown({ metric: `phc:${p.phc_key}`, title: `${p.phc_display} — All Mothers` })}>
                  <td className="font-semibold" style={{ color: 'var(--ccmc-text)' }}>{p.phc_display}</td>
                  <td>
                    <span className="chip mr-2" style={{ background: hrtChipBg, color: hrtChipClr, border: hrtChipBd }}>{p.hrt_code}</span>
                    <span className="text-[11px]" style={{ color: 'var(--ccmc-text-hint)' }}>{p.hrt_name}</span>
                  </td>
                  <td className="text-right font-bold" style={{ color: 'var(--ccmc-text)' }}>{p.total}</td>
                  <td className="text-right font-semibold" style={{ color: phcClr.dueSoon }}>{p.due_soon}</td>
                  <td className="text-right font-semibold" style={{ color: phcClr.delivered }}>{p.delivered}</td>
                  <td className="text-right">
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded"
                      style={{ background: 'rgba(66,165,245,0.12)', color: '#60A5FA' }}>{p.risk_pct}%</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Modals ─────────────────────────────────────────────────── */}
      {showPostdated && (
        <PostdatedEDDModal user={user} onClose={() => setShowPostdated(false)}
          openPatient={(uid) => { setShowPostdated(false); openPatient(uid); }} />
      )}
      {drillDown && (
        <DrillDownModal metric={drillDown.metric} title={drillDown.title} user={user}
          onClose={() => setDrillDown(null)}
          openPatient={(uid) => { setDrillDown(null); openPatient(uid); }} />
      )}
    </div>
  );
}
