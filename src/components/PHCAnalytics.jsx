import React, { useEffect, useState } from 'react';
import { BarChart2, RefreshCw, TrendingUp, Users } from 'lucide-react';

const API = '/api';

const HRT_COLORS = {
  HRT1: '#F472B6', HRT2: '#A78BFA', HRT3: '#60A5FA',
  HRT4: '#FBBF24', HRT5: '#34D399', HRT6: '#F87171',
  HRT7: '#C084FC', HRT8: '#FB923C',
};

export default function PHCAnalytics({ user }) {
  const [data,    setData]    = useState([]);
  const [loading, setLoading] = useState(true);
  const [sortBy,  setSortBy]  = useState('total');
  const [filterHRT, setFilterHRT] = useState('');

  const load = () => {
    setLoading(true);
    fetch(`${API}/phc-analytics?role=${user.role}`)
      .then(r => r.json()).then(d => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  };

  useEffect(() => { load(); }, [user.role]);

  const filtered = [...data]
    .filter(d => !filterHRT || d.hrt_code === filterHRT)
    .sort((a, b) => b[sortBy] - a[sortBy]);

  const maxTotal = Math.max(...filtered.map(d => d.total), 1);

  // Aggregate by HRT
  const hrtGroups = {};
  data.forEach(p => {
    const k = p.hrt_code;
    if (!hrtGroups[k]) hrtGroups[k] = { hrt_code: k, hrt_name: p.hrt_name, total: 0, critical: 0, very_high: 0, high: 0, phcs: [] };
    hrtGroups[k].total    += p.total;
    hrtGroups[k].critical += p.critical;
    hrtGroups[k].very_high+= p.very_high;
    hrtGroups[k].high     += p.high;
    hrtGroups[k].phcs.push(p.phc_display);
  });
  const hrtSummary = Object.values(hrtGroups).sort((a, b) => b.total - a.total);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-white" style={{ fontFamily: 'Poppins, sans-serif' }}>
            PHC Analytics
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            {filtered.length} PHC / UPHCs · {data.reduce((s, d) => s + d.total, 0).toLocaleString()} mothers
          </p>
        </div>
        <button onClick={load} disabled={loading}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold"
          style={{ background: 'rgba(25,118,210,0.2)', border: '1px solid rgba(25,118,210,0.4)', color: '#42A5F5' }}>
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* HRT Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {hrtSummary.map(h => {
          const color = HRT_COLORS[h.hrt_code] || '#42A5F5';
          return (
            <div key={h.hrt_code}
              onClick={() => setFilterHRT(filterHRT === h.hrt_code ? '' : h.hrt_code)}
              className="rounded-xl p-4 cursor-pointer transition-all"
              style={{
                background: filterHRT === h.hrt_code ? `${color}10` : '#0F172A',
                border: `1px solid ${filterHRT === h.hrt_code ? `${color}40` : 'rgba(30,58,95,0.7)'}`,
              }}>
              <div className="flex items-center gap-2 mb-2">
                <div className="w-7 h-7 rounded-lg flex items-center justify-center text-[10px] font-bold text-white"
                  style={{ background: color }}>{h.hrt_code.slice(-1)}</div>
                <div>
                  <div className="text-xs font-bold text-white">{h.hrt_code}</div>
                  <div className="text-[10px] text-slate-500">{h.hrt_name}</div>
                </div>
              </div>
              <div className="text-xl font-bold" style={{ color }}>{h.total.toLocaleString()}</div>
              <div className="text-[10px] text-slate-500 mt-1">
                {h.phcs.length} PHC{h.phcs.length !== 1 ? 's' : ''} ·
                <span style={{ color: '#FCA5A5' }}> {h.critical} critical</span>
              </div>
              {/* Mini bar */}
              <div className="mt-2 h-1 rounded-full" style={{ background: 'rgba(30,58,95,0.4)' }}>
                <div className="h-full rounded-full"
                  style={{
                    width: `${Math.round((h.critical + h.very_high) / (h.total || 1) * 100)}%`,
                    background: color,
                  }} />
              </div>
            </div>
          );
        })}
      </div>

      {/* Sort controls */}
      <div className="flex items-center gap-2">
        <span className="text-xs text-slate-500">Sort by:</span>
        {['total','critical','very_high','high','delivered','due_soon'].map(s => (
          <button key={s} onClick={() => setSortBy(s)}
            className="px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider"
            style={{
              background: sortBy === s ? 'rgba(25,118,210,0.2)' : 'transparent',
              color: sortBy === s ? '#42A5F5' : '#64748B',
              border: `1px solid ${sortBy === s ? 'rgba(25,118,210,0.4)' : 'rgba(30,58,95,0.4)'}`,
            }}>
            {s.replace('_', ' ')}
          </button>
        ))}
      </div>

      {/* PHC bars visualization */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="w-8 h-8 border-2 rounded-full animate-spin"
            style={{ borderColor: '#1E3A5F', borderTopColor: '#42A5F5' }} />
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(p => {
            const color = HRT_COLORS[p.hrt_code] || '#42A5F5';
            const pct = Math.round((p.total / maxTotal) * 100);
            return (
              <div key={p.phc_key} className="rounded-xl p-4"
                style={{ background: 'var(--ccmc-panel)', border: '1px solid rgba(30,58,95,0.5)' }}>
                <div className="flex items-center gap-3 mb-2">
                  <div className="text-sm font-bold text-white w-44 flex-shrink-0 truncate">
                    {p.phc_display}
                  </div>
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded"
                    style={{ background: `${color}15`, color }}>
                    {p.hrt_code} · {p.hrt_name}
                  </span>
                  <div className="flex-1" />
                  <div className="flex items-center gap-4 text-[10px] text-right">
                    <span className="text-white font-bold">{p.total}</span>
                    <span style={{ color: '#FCA5A5' }}>{p.critical} crit</span>
                    <span style={{ color: '#FDBA74' }}>{p.very_high} vhigh</span>
                    <span style={{ color: '#86EFAC' }}>{p.delivered} del</span>
                    <span className="font-bold" style={{ color: p.risk_pct > 50 ? '#EF4444' : p.risk_pct > 25 ? '#F97316' : '#22C55E' }}>
                      {p.risk_pct}% risk
                    </span>
                  </div>
                </div>
                {/* Stacked bar */}
                <div className="flex h-2 rounded-full overflow-hidden gap-px"
                  style={{ background: 'rgba(30,58,95,0.3)' }}>
                  {p.critical  > 0 && <div style={{ width: `${(p.critical   / p.total) * pct}%`, background: '#EF4444', minWidth: 2 }} />}
                  {p.very_high > 0 && <div style={{ width: `${(p.very_high  / p.total) * pct}%`, background: '#F97316', minWidth: 2 }} />}
                  {p.high      > 0 && <div style={{ width: `${(p.high       / p.total) * pct}%`, background: '#EAB308', minWidth: 2 }} />}
                  {p.moderate  > 0 && <div style={{ width: `${(p.moderate   / p.total) * pct}%`, background: '#3B82F6', minWidth: 2 }} />}
                  {p.low       > 0 && <div style={{ width: `${(p.low        / p.total) * pct}%`, background: '#22C55E', minWidth: 2 }} />}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Detailed table */}
      <div className="rounded-xl overflow-hidden"
        style={{ background: 'var(--ccmc-panel)', border: '1px solid rgba(30,58,95,0.7)' }}>
        <div className="px-5 py-3 border-b" style={{ borderColor: 'rgba(30,58,95,0.7)' }}>
          <h2 className="text-sm font-bold text-white">Detailed PHC Table</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>PHC / UPHC</th><th>HRT</th><th>Staff</th>
                <th className="text-right">Total</th>
                <th className="text-right">Critical</th><th className="text-right">V.High</th>
                <th className="text-right">High</th><th className="text-right">Moderate</th>
                <th className="text-right">Low</th><th className="text-right">Delivered</th>
                <th className="text-right">Due Soon</th><th className="text-right">No Phone</th>
                <th className="text-right">Risk %</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(p => (
                <tr key={p.phc_key}>
                  <td className="font-semibold text-white">{p.phc_display}</td>
                  <td>
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded"
                      style={{ background: `${HRT_COLORS[p.hrt_code] || '#42A5F5'}15`, color: HRT_COLORS[p.hrt_code] || '#42A5F5' }}>
                      {p.hrt_code}
                    </span>
                  </td>
                  <td className="text-[10px] text-slate-400">{p.hrt_name}</td>
                  <td className="text-right font-bold text-white">{p.total}</td>
                  <td className="text-right font-bold" style={{ color: '#FCA5A5' }}>{p.critical}</td>
                  <td className="text-right font-bold" style={{ color: '#FDBA74' }}>{p.very_high}</td>
                  <td className="text-right font-bold" style={{ color: '#FDE047' }}>{p.high}</td>
                  <td className="text-right font-bold" style={{ color: '#93C5FD' }}>{p.moderate}</td>
                  <td className="text-right font-bold" style={{ color: '#86EFAC' }}>{p.low}</td>
                  <td className="text-right font-bold" style={{ color: '#22C55E' }}>{p.delivered}</td>
                  <td className="text-right" style={{ color: '#A78BFA' }}>{p.due_soon}</td>
                  <td className="text-right" style={{ color: '#F59E0B' }}>{p.no_phone}</td>
                  <td className="text-right">
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded"
                      style={{
                        background: p.risk_pct > 50 ? 'rgba(239,68,68,0.15)' : p.risk_pct > 25 ? 'rgba(249,115,22,0.15)' : 'rgba(34,197,94,0.15)',
                        color:      p.risk_pct > 50 ? '#FCA5A5'              : p.risk_pct > 25 ? '#FDBA74'              : '#86EFAC',
                      }}>{p.risk_pct}%</span>
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
