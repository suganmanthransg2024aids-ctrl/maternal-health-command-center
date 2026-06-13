import React, { useEffect, useState } from 'react';
import {
  Users, AlertTriangle, Heart, Calendar, Phone, CalendarCheck,
  AlertCircle, RefreshCw, TrendingUp, Baby, ShieldAlert,
  BarChart2, Activity, Bell,
} from 'lucide-react';

const API = '/api';

const RISK_COLORS = {
  Critical:   { text: '#FCA5A5', dot: '#EF4444' },
  'Very High':{ text: '#FDBA74', dot: '#F97316' },
  High:       { text: '#FDE047', dot: '#EAB308' },
  Moderate:   { text: '#93C5FD', dot: '#3B82F6' },
  Low:        { text: '#86EFAC', dot: '#22C55E' },
};

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
      onMouseEnter={(e) => onClick && (e.currentTarget.style.borderColor = color || '#1976D2')}
      onMouseLeave={(e) => onClick && (e.currentTarget.style.borderColor = 'rgba(30,58,95,0.7)')}
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
    </div>
  );
}

function RiskBar({ label, count, total, color, dot }) {
  const pct = total > 0 ? Math.round((count / total) * 100) : 0;
  return (
    <div className="flex items-center gap-3">
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

export default function DashboardOverview({ stats, user, onRefresh, syncing, setActivePage }) {
  const [alerts,  setAlerts]  = useState([]);
  const [phcData, setPHCData] = useState([]);

  useEffect(() => {
    if (!user) return;
    fetch(`${API}/alerts?role=${user.role}`)
      .then(r => r.json()).then(d => setAlerts(d.alerts || [])).catch(() => {});
    fetch(`${API}/phc-analytics?role=${user.role}`)
      .then(r => r.json()).then(d => setPHCData(d.slice(0, 10))).catch(() => {});
  }, [user]);

  const s = stats || {};
  const riskDist = s.risk_distribution || {};
  const totalForPct = s.total_mothers || 1;
  const priorityAlerts = alerts.filter(a => a.priority === 'P1').slice(0, 8);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-white" style={{ fontFamily: 'Poppins, sans-serif' }}>
            Dashboard Overview
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Live maternal health intelligence — {s.total_mothers?.toLocaleString() ?? '…'} total records
          </p>
        </div>
        <button onClick={onRefresh} disabled={syncing}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold"
          style={{ background: 'rgba(25,118,210,0.2)', border: '1px solid rgba(25,118,210,0.4)', color: '#42A5F5' }}>
          <RefreshCw className={`w-3.5 h-3.5 ${syncing ? 'animate-spin' : ''}`} />
          {syncing ? 'Syncing…' : 'Sync Excel'}
        </button>
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3">
        <KPICard icon={Users}        label="Total Mothers"  value={s.total_mothers?.toLocaleString()}  color="#42A5F5" onClick={() => setActivePage('patients')} />
        <KPICard icon={ShieldAlert}  label="High Risk"      value={s.high_risk?.toLocaleString()}      color="#F97316" onClick={() => setActivePage('risk')} />
        <KPICard icon={AlertTriangle}label="Critical"       value={s.critical?.toLocaleString()}       color="#EF4444" onClick={() => setActivePage('alerts')} />
        <KPICard icon={Baby}         label="Due ≤7 Days"    value={s.due_7_days?.toLocaleString()}     color="#A78BFA" onClick={() => setActivePage('delivery')} />
        <KPICard icon={Heart}        label="Delivered"      value={s.delivered?.toLocaleString()}      color="#22C55E" />
        <KPICard icon={Phone}        label="No Phone"       value={s.missing_phone?.toLocaleString()}  color="#F59E0B" onClick={() => setActivePage('validation')} />
        <KPICard icon={Calendar}     label="Due ≤30 Days"   value={s.due_30_days?.toLocaleString()}    color="#60A5FA" onClick={() => setActivePage('delivery')} />
        <KPICard icon={AlertCircle}  label="Overdue EDD"    value={s.overdue_edd?.toLocaleString()}    color="#EF4444" onClick={() => setActivePage('delivery')} />
        <KPICard icon={TrendingUp}   label="Very High Risk" value={s.very_high?.toLocaleString()}      color="#F97316" />
        <KPICard icon={AlertCircle}  label="Missing Name"   value={s.missing_name?.toLocaleString()}   color="#F59E0B" onClick={() => setActivePage('validation')} />
      </div>

      {/* Executive Widgets — 6 live operational metrics */}
      <div className="rounded-xl p-4"
        style={{ background: 'var(--ccmc-panel)', border: '1px solid rgba(25,118,210,0.3)' }}>
        <div className="flex items-center gap-2 mb-3">
          <BarChart2 className="w-4 h-4" style={{ color: '#42A5F5' }} />
          <h2 className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--ccmc-text-sec)' }}>
            Live Operational Intelligence
          </h2>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2">
          {[
            {
              label: 'Due Today',
              value: s.due_today ?? '—',
              color: '#DC2626',
              sub: 'Deliveries due today',
              onClick: () => setActivePage('delivery'),
              urgent: (s.due_today || 0) > 0,
            },
            {
              label: 'Due ≤7 Days',
              value: s.due_7_days ?? '—',
              color: '#F97316',
              sub: 'Upcoming deliveries',
              onClick: () => setActivePage('delivery'),
            },
            {
              label: 'Critical Mothers',
              value: s.critical ?? '—',
              color: '#EF4444',
              sub: 'Highest risk cases',
              onClick: () => setActivePage('alerts'),
            },
            {
              label: 'Follow-Ups Today',
              value: s.followups_due_today ?? '—',
              color: '#A78BFA',
              sub: 'Visits scheduled today',
              onClick: () => setActivePage('followups'),
            },
            {
              label: 'Calls Pending',
              value: s.calls_pending_today ?? '—',
              color: '#60A5FA',
              sub: 'Pending today',
              onClick: () => setActivePage('calls'),
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
              onMouseEnter={e => e.currentTarget.style.borderColor = `${color}60`}
              onMouseLeave={e => e.currentTarget.style.borderColor = `${color}25`}
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

      {/* Two-column */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Risk distribution */}
        <div className="rounded-xl p-5" style={{ background: 'var(--ccmc-panel)', border: '1px solid rgba(30,58,95,0.7)' }}>
          <div className="flex items-center gap-2 mb-4">
            <Activity className="w-4 h-4" style={{ color: '#42A5F5' }} />
            <h2 className="text-sm font-bold text-white">Risk Distribution</h2>
            <span className="text-[10px] text-slate-500 ml-auto">{s.total_mothers?.toLocaleString()} mothers</span>
          </div>
          <div className="space-y-3">
            {Object.entries(RISK_COLORS).map(([cat, col]) => (
              <RiskBar key={cat} label={cat} count={riskDist[cat] || 0}
                total={totalForPct} color={col.text} dot={col.dot} />
            ))}
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
              <div key={i} className="flex items-start gap-2.5 p-2.5 rounded-lg"
                style={{ background: 'rgba(239,68,68,0.05)', border: '1px solid rgba(239,68,68,0.15)' }}>
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
          <button onClick={() => setActivePage('alerts')}
            className="w-full mt-3 py-2 rounded-lg text-xs font-semibold"
            style={{ background: 'rgba(239,68,68,0.1)', color: '#FCA5A5', border: '1px solid rgba(239,68,68,0.2)' }}>
            View All {alerts.length} Alerts →
          </button>
        </div>
      </div>

      {/* PHC table */}
      <div className="rounded-xl overflow-hidden"
        style={{ background: 'var(--ccmc-panel)', border: '1px solid rgba(30,58,95,0.7)' }}>
        <div className="flex items-center justify-between px-5 py-3 border-b"
          style={{ borderColor: 'rgba(30,58,95,0.7)' }}>
          <div className="flex items-center gap-2">
            <BarChart2 className="w-4 h-4" style={{ color: '#42A5F5' }} />
            <h2 className="text-sm font-bold text-white">PHC Performance Summary</h2>
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
                <th>PHC / UPHC</th><th>HRT</th>
                <th className="text-right">Total</th><th className="text-right">Critical</th>
                <th className="text-right">Very High</th><th className="text-right">Due Soon</th>
                <th className="text-right">Delivered</th><th className="text-right">Risk %</th>
              </tr>
            </thead>
            <tbody>
              {phcData.length === 0 ? (
                <tr><td colSpan={8} className="text-center py-6 text-slate-500 text-xs">Loading PHC data…</td></tr>
              ) : phcData.map(p => (
                <tr key={p.phc_key}>
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
