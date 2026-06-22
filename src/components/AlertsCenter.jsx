import React, { useEffect, useState } from 'react';
import { Bell, AlertTriangle, AlertCircle, Zap, Phone, RefreshCw, PhoneOff, Users } from 'lucide-react';
import { useTheme } from '../ThemeContext';

const API = '/api';

const ALERT_STYLES = {
  'Delivery Due ≤7 Days':  { color: '#F97316', bg: 'rgba(249,115,22,0.08)', border: 'rgba(249,115,22,0.25)', icon: AlertTriangle },
  'Overdue EDD':           { color: '#EF4444', bg: 'rgba(239,68,68,0.08)',  border: 'rgba(239,68,68,0.2)',   icon: AlertCircle },
  'No Contact Number':     { color: '#EAB308', bg: 'rgba(234,179,8,0.06)',  border: 'rgba(234,179,8,0.2)',   icon: Phone },
};

const HIDDEN_ALERT_TYPES = new Set(['Critical Risk Mother', 'Very High Risk']);

const PRIORITY_LABELS = { P1: '#EF4444', P2: '#F97316', P3: '#EAB308' };

const HRT_COLORS = {
  HRT1: '#F472B6', HRT2: '#A78BFA', HRT3: '#60A5FA',
  HRT4: '#FBBF24', HRT5: '#34D399', HRT6: '#F87171',
  HRT7: '#C084FC', HRT8: '#FB923C',
};

const NC_STATUS_COLOR = {
  'No Response':  '#EF4444',
  'Switched Off': '#94A3B8',
  'Wrong Number': '#F97316',
  'Busy':         '#EAB308',
};

export default function AlertsCenter({ user }) {
  const { theme } = useTheme();
  const bright = theme === 'bright';

  const [data,    setData]    = useState(null);
  const [loading, setLoading] = useState(true);
  const [filter,  setFilter]  = useState('');

  const load = () => {
    setLoading(true);
    fetch(`${API}/alerts?role=${user.role}`)
      .then(r => r.json()).then(d => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  };

  useEffect(() => { load(); }, [user.role]);

  const alerts    = (data?.alerts || []).filter(a => !HIDDEN_ALERT_TYPES.has(a.alert_type) && (!filter || a.alert_type === filter));
  const types     = [...new Set((data?.alerts || []).filter(a => !HIDDEN_ALERT_TYPES.has(a.alert_type)).map(a => a.alert_type))];
  const hrtAlerts = data?.hrt_nc_alerts || [];

  const cardStyle = {
    background: bright ? '#FFFFFF' : 'var(--ccmc-panel)',
    border:     bright ? '1px solid #E2E8F0' : '1px solid rgba(30,58,95,0.7)',
  };

  return (
    <div className="space-y-4">
      {/* ── Header ─────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold" style={{ color: bright ? '#1E293B' : '#F1F5F9', fontFamily: 'Poppins, sans-serif' }}>
            Alerts Center
          </h1>
          <p className="text-xs mt-0.5" style={{ color: bright ? '#94A3B8' : '#475569' }}>
            {data?.total ?? '…'} patient alerts · {hrtAlerts.length > 0 ? `${hrtAlerts.length} HRT non-connected alert${hrtAlerts.length > 1 ? 's' : ''}` : 'no HRT alerts'}
          </p>
        </div>
        <button onClick={load} disabled={loading}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold"
          style={{ background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)', color: '#FCA5A5' }}>
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* ── HRT Non-Connected Call Alerts ──────────────────────────── */}
      {hrtAlerts.length > 0 && (
        <div className="rounded-xl overflow-hidden"
          style={{
            background: bright ? '#FFF7ED' : 'rgba(239,68,68,0.06)',
            border: bright ? '1px solid rgba(239,68,68,0.35)' : '1px solid rgba(239,68,68,0.3)',
            boxShadow: '0 0 0 2px rgba(239,68,68,0.08)',
          }}>
          {/* Section header */}
          <div className="flex items-center gap-2 px-5 py-3 border-b"
            style={{ borderColor: bright ? 'rgba(239,68,68,0.2)' : 'rgba(239,68,68,0.2)', background: bright ? 'rgba(239,68,68,0.06)' : 'rgba(239,68,68,0.08)' }}>
            <PhoneOff className="w-4 h-4" style={{ color: '#EF4444' }} />
            <span className="text-sm font-bold" style={{ color: '#EF4444' }}>
              Non-Connected Call Alerts
            </span>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
              style={{ background: 'rgba(239,68,68,0.15)', color: '#EF4444' }}>
              {hrtAlerts.length} HRT{hrtAlerts.length > 1 ? 's' : ''}
            </span>
            <span className="text-[10px] ml-1" style={{ color: bright ? '#94A3B8' : '#475569' }}>
              · HRTs with ≥5 unreachable mothers today
            </span>
          </div>
          {/* Alert cards */}
          <div className="p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {hrtAlerts.map(ha => {
              const hrtColor = HRT_COLORS[ha.hrt_code] || '#EF4444';
              return (
                <div key={ha.hrt_code}
                  className="rounded-xl p-4"
                  style={{
                    background: bright ? '#FFFFFF' : 'rgba(239,68,68,0.05)',
                    border: '1px solid rgba(239,68,68,0.3)',
                    boxShadow: bright ? '0 2px 8px rgba(239,68,68,0.08)' : 'none',
                  }}>
                  {/* HRT name + badge */}
                  <div className="flex items-center justify-between gap-2 mb-2.5">
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-bold px-2 py-0.5 rounded"
                        style={{ background: `${hrtColor}20`, color: hrtColor }}>
                        {ha.hrt_code}
                      </span>
                      <span className="text-[13px] font-bold" style={{ color: bright ? '#1E293B' : '#F1F5F9' }}>
                        {ha.hrt_name}
                      </span>
                    </div>
                    <span className="text-[18px] font-bold" style={{ color: '#EF4444', fontFamily: 'Poppins,sans-serif' }}>
                      {ha.not_connected}
                    </span>
                  </div>
                  {/* PHCs */}
                  <div className="text-[9px] mb-2.5" style={{ color: bright ? '#94A3B8' : '#475569' }}>
                    {(ha.phcs || []).slice(0, 4).join(' · ')}{(ha.phcs || []).length > 4 ? ` +${ha.phcs.length - 4}` : ''}
                  </div>
                  {/* Status breakdown */}
                  <div className="flex flex-wrap gap-1.5 mb-2.5">
                    {Object.entries(ha.status_breakdown || {}).map(([st, cnt]) => (
                      <span key={st} className="text-[9px] font-bold px-2 py-0.5 rounded-full"
                        style={{
                          background: bright ? `${NC_STATUS_COLOR[st] || '#EF4444'}12` : `${NC_STATUS_COLOR[st] || '#EF4444'}15`,
                          color: NC_STATUS_COLOR[st] || '#EF4444',
                          border: `1px solid ${NC_STATUS_COLOR[st] || '#EF4444'}30`,
                        }}>
                        {st}: {cnt}
                      </span>
                    ))}
                  </div>
                  {/* Unreachable count */}
                  <div className="flex items-center gap-1.5 pt-2"
                    style={{ borderTop: bright ? '1px solid #FEE2E2' : '1px solid rgba(239,68,68,0.15)' }}>
                    <Users className="w-3 h-3" style={{ color: '#EF4444' }} />
                    <span className="text-[10px] font-semibold" style={{ color: '#EF4444' }}>
                      {ha.not_connected} mothers unreachable today
                    </span>
                    <span className="text-[9px] ml-auto" style={{ color: bright ? '#94A3B8' : '#475569' }}>
                      of {ha.total_mothers} assigned
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Patient Alert Summary strip ────────────────────────────── */}
      {data && (
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: 'Due ≤7 Days',  value: data.due_soon, color: '#F97316' },
            { label: 'Overdue EDD',  value: data.overdue,  color: '#EF4444' },
            { label: 'Total Alerts', value: data.total,    color: bright ? '#2563EB' : '#42A5F5' },
          ].map(({ label, value, color }) => (
            <div key={label} className="rounded-xl p-4" style={{ ...cardStyle, border: `1px solid ${color}20` }}>
              <div className="text-2xl font-bold" style={{ color }}>{value?.toLocaleString() ?? '—'}</div>
              <div className="text-[10px] font-semibold uppercase tracking-wider mt-1" style={{ color: bright ? '#94A3B8' : '#475569' }}>{label}</div>
            </div>
          ))}
        </div>
      )}

      {/* ── Filter chips ────────────────────────────────────────────── */}
      <div className="flex gap-2 flex-wrap">
        <button onClick={() => setFilter('')}
          className="px-3 py-1.5 rounded-lg text-xs font-bold"
          style={{
            background: !filter ? (bright ? '#EFF6FF' : 'rgba(66,165,245,0.15)') : (bright ? '#F8FAFC' : 'rgba(30,41,59,0.5)'),
            color:      !filter ? (bright ? '#2563EB' : '#42A5F5') : (bright ? '#94A3B8' : '#64748B'),
            border:     `1px solid ${!filter ? (bright ? 'rgba(37,99,235,0.3)' : 'rgba(66,165,245,0.3)') : (bright ? '#E2E8F0' : 'rgba(30,58,95,0.5)')}`,
          }}>
          All Types
        </button>
        {types.map(t => {
          const s = ALERT_STYLES[t] || {};
          return (
            <button key={t} onClick={() => setFilter(t === filter ? '' : t)}
              className="px-3 py-1.5 rounded-lg text-xs font-bold"
              style={{
                background: filter === t ? s.bg : (bright ? '#F8FAFC' : 'rgba(30,41,59,0.5)'),
                color:      filter === t ? s.color : (bright ? '#94A3B8' : '#64748B'),
                border:     `1px solid ${filter === t ? s.border : (bright ? '#E2E8F0' : 'rgba(30,58,95,0.5)')}`,
              }}>
              {t}
            </button>
          );
        })}
      </div>

      {/* ── Patient Alert table ─────────────────────────────────────── */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-2 rounded-full animate-spin"
            style={{ borderColor: bright ? '#DBEAFE' : '#1E3A5F', borderTopColor: bright ? '#2563EB' : '#42A5F5' }} />
        </div>
      ) : (
        <div className="rounded-xl overflow-hidden" style={cardStyle}>
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Priority</th><th>Alert Type</th><th>Mother</th>
                  <th>PHC</th><th>HRT</th><th>Phone</th><th>EDD / Days</th>
                </tr>
              </thead>
              <tbody>
                {alerts.length === 0 ? (
                  <tr><td colSpan={7} className="text-center py-8 text-xs" style={{ color: bright ? '#94A3B8' : '#475569' }}>
                    No alerts in current filter
                  </td></tr>
                ) : alerts.slice(0, 300).map((a, i) => {
                  const s = ALERT_STYLES[a.alert_type] || {};
                  const Icon = s.icon || Bell;
                  return (
                    <tr key={i}>
                      <td>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                          style={{
                            background: `${PRIORITY_LABELS[a.priority] || '#42A5F5'}15`,
                            color:       PRIORITY_LABELS[a.priority] || '#42A5F5',
                            border:     `1px solid ${PRIORITY_LABELS[a.priority] || '#42A5F5'}30`,
                          }}>
                          {a.priority}
                        </span>
                      </td>
                      <td>
                        <div className="flex items-center gap-1.5">
                          <Icon className="w-3.5 h-3.5 flex-shrink-0" style={{ color: s.color }} />
                          <span className="text-xs" style={{ color: s.color }}>{a.alert_type}</span>
                        </div>
                      </td>
                      <td className="font-semibold max-w-[160px]" style={{ color: bright ? '#1E293B' : '#F1F5F9' }}>
                        <div className="truncate">{a.mother_name || '—'}</div>
                      </td>
                      <td className="text-xs" style={{ color: bright ? '#64748B' : '#475569' }}>{a.phc_display}</td>
                      <td>
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded"
                          style={{ background: bright ? '#EFF6FF' : 'rgba(66,165,245,0.15)', color: bright ? '#2563EB' : '#93C5FD' }}>
                          {a.hrt_name}
                        </span>
                      </td>
                      <td className="text-xs" style={{ color: bright ? '#64748B' : '#475569' }}>{a.cell_no || 'Missing'}</td>
                      <td className="text-xs" style={{ color: a.days_to_edd < 0 ? '#EF4444' : (bright ? '#64748B' : '#94A3B8') }}>
                        {a.days_to_edd !== null && a.days_to_edd !== undefined
                          ? (a.days_to_edd < 0 ? `${Math.abs(a.days_to_edd)}d overdue` : `${a.days_to_edd}d left`)
                          : '—'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
