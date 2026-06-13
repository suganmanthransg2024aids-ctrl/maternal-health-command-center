import React, { useEffect, useState } from 'react';
import { Bell, AlertTriangle, AlertCircle, Zap, Phone, RefreshCw } from 'lucide-react';

const API = '/api';

const ALERT_STYLES = {
  'Critical Risk Mother':  { color: '#EF4444', bg: 'rgba(239,68,68,0.08)', border: 'rgba(239,68,68,0.25)', icon: Zap },
  'Delivery Due ≤7 Days':  { color: '#F97316', bg: 'rgba(249,115,22,0.08)', border: 'rgba(249,115,22,0.25)', icon: AlertTriangle },
  'Overdue EDD':           { color: '#EF4444', bg: 'rgba(239,68,68,0.08)', border: 'rgba(239,68,68,0.2)',  icon: AlertCircle },
  'Very High Risk':        { color: '#F97316', bg: 'rgba(249,115,22,0.06)', border: 'rgba(249,115,22,0.2)', icon: AlertTriangle },
  'No Contact Number':     { color: '#EAB308', bg: 'rgba(234,179,8,0.06)',  border: 'rgba(234,179,8,0.2)',  icon: Phone },
};

const PRIORITY_LABELS = { P1: '#EF4444', P2: '#F97316', P3: '#EAB308' };

export default function AlertsCenter({ user }) {
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

  const alerts = (data?.alerts || []).filter(a => !filter || a.alert_type === filter);
  const types = [...new Set((data?.alerts || []).map(a => a.alert_type))];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-white" style={{ fontFamily: 'Poppins, sans-serif' }}>
            Alerts Center
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            {data?.total ?? '…'} total alerts — {data?.critical ?? '…'} critical mothers
          </p>
        </div>
        <button onClick={load} disabled={loading}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold"
          style={{ background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)', color: '#FCA5A5' }}>
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Summary strip */}
      {data && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: 'Critical Mothers', value: data.critical, color: '#EF4444' },
            { label: 'Due ≤7 Days',      value: data.due_soon, color: '#F97316' },
            { label: 'Overdue EDD',      value: data.overdue,  color: '#EF4444' },
            { label: 'Total Alerts',     value: data.total,    color: '#42A5F5' },
          ].map(({ label, value, color }) => (
            <div key={label} className="rounded-xl p-4"
              style={{ background: 'var(--ccmc-panel)', border: `1px solid ${color}20` }}>
              <div className="text-2xl font-bold" style={{ color }}>{value?.toLocaleString() ?? '—'}</div>
              <div className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider mt-1">{label}</div>
            </div>
          ))}
        </div>
      )}

      {/* Filter chips */}
      <div className="flex gap-2 flex-wrap">
        <button onClick={() => setFilter('')}
          className="px-3 py-1.5 rounded-lg text-xs font-bold"
          style={{
            background: !filter ? 'rgba(66,165,245,0.15)' : 'rgba(30,41,59,0.5)',
            color: !filter ? '#42A5F5' : '#64748B',
            border: `1px solid ${!filter ? 'rgba(66,165,245,0.3)' : 'rgba(30,58,95,0.5)'}`,
          }}>
          All Types
        </button>
        {types.map(t => {
          const s = ALERT_STYLES[t] || {};
          return (
            <button key={t} onClick={() => setFilter(t === filter ? '' : t)}
              className="px-3 py-1.5 rounded-lg text-xs font-bold"
              style={{
                background: filter === t ? s.bg : 'rgba(30,41,59,0.5)',
                color: filter === t ? s.color : '#64748B',
                border: `1px solid ${filter === t ? s.border : 'rgba(30,58,95,0.5)'}`,
              }}>
              {t}
            </button>
          );
        })}
      </div>

      {/* Alert list */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-2 rounded-full animate-spin"
            style={{ borderColor: '#1E3A5F', borderTopColor: '#42A5F5' }} />
        </div>
      ) : (
        <div className="rounded-xl overflow-hidden"
          style={{ background: 'var(--ccmc-panel)', border: '1px solid rgba(30,58,95,0.7)' }}>
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Priority</th><th>Alert Type</th><th>Mother</th>
                  <th>PHC</th><th>HRT</th><th>Phone</th>
                  <th>Risk</th><th>EDD / Days</th>
                </tr>
              </thead>
              <tbody>
                {alerts.length === 0 ? (
                  <tr><td colSpan={8} className="text-center py-8 text-slate-500 text-xs">No alerts in current filter</td></tr>
                ) : alerts.slice(0, 300).map((a, i) => {
                  const s = ALERT_STYLES[a.alert_type] || {};
                  const Icon = s.icon || Bell;
                  return (
                    <tr key={i}>
                      <td>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                          style={{
                            background: `${PRIORITY_LABELS[a.priority] || '#42A5F5'}15`,
                            color: PRIORITY_LABELS[a.priority] || '#42A5F5',
                            border: `1px solid ${PRIORITY_LABELS[a.priority] || '#42A5F5'}30`,
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
                      <td className="font-semibold text-white max-w-[160px]">
                        <div className="truncate">{a.mother_name || '—'}</div>
                      </td>
                      <td className="text-slate-400 text-xs">{a.phc_display}</td>
                      <td>
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded"
                          style={{ background: 'rgba(66,165,245,0.15)', color: '#93C5FD' }}>
                          {a.hrt_name}
                        </span>
                      </td>
                      <td className="text-slate-400 text-xs">{a.cell_no || 'Missing'}</td>
                      <td>
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded"
                          style={{ background: `${s.color || '#42A5F5'}15`, color: s.color || '#42A5F5', border: `1px solid ${s.color || '#42A5F5'}30` }}>
                          {a.risk_category}
                        </span>
                      </td>
                      <td className="text-xs" style={{ color: a.days_to_edd < 0 ? '#EF4444' : '#94A3B8' }}>
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
