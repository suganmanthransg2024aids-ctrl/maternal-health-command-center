import React, { useEffect, useState } from 'react';
import { BarChart2, TrendingUp, Users, AlertTriangle, RefreshCw, Activity, ShieldAlert } from 'lucide-react';

const API = '/api';

const HRT_COLORS = {
  HRT1: '#F472B6', HRT2: '#A78BFA', HRT3: '#60A5FA',
  HRT4: '#FBBF24', HRT5: '#34D399', HRT6: '#F87171',
  HRT7: '#C084FC', HRT8: '#FB923C',
};

/* ── Reusable chart primitives ──────────────────────────────── */
function HBar({ label, value, max, color }) {
  const pct = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0;
  return (
    <div className="flex items-center gap-2 py-0.5">
      <span className="text-[10px] truncate flex-shrink-0" style={{ width: 130, color: 'var(--ccmc-text-sec)' }}>
        {label}
      </span>
      <div className="flex-1 h-3.5 rounded-full overflow-hidden" style={{ background: 'rgba(30,58,95,0.4)' }}>
        <div className="h-full rounded-full transition-all duration-700"
          style={{ width: `${pct}%`, background: color, minWidth: value > 0 ? 4 : 0 }} />
      </div>
      <span className="text-xs font-bold flex-shrink-0 w-8 text-right" style={{ color }}>{value}</span>
    </div>
  );
}

function VBars({ data, height = 100 }) {
  const max = Math.max(...data.map(d => d.value), 1);
  return (
    <div className="flex items-end gap-1" style={{ height: height + 32 }}>
      {data.map((d, i) => {
        const h = Math.max(d.value > 0 ? 4 : 0, Math.round((d.value / max) * height));
        return (
          <div key={i} className="flex-1 flex flex-col items-center gap-0.5">
            {d.value > 0 && (
              <span className="text-[8px]" style={{ color: 'var(--ccmc-text-hint)' }}>{d.value}</span>
            )}
            <div className="w-full rounded-t transition-all duration-700"
              style={{ height: h, background: d.color || '#42A5F5', minHeight: d.value > 0 ? 4 : 0 }} />
            <span className="text-[8px] text-center leading-tight break-all"
              style={{ color: 'var(--ccmc-text-hint)', maxWidth: '100%', wordBreak: 'break-all' }}>
              {d.label}
            </span>
          </div>
        );
      })}
    </div>
  );
}

function StatCard({ icon: Icon, label, value, color }) {
  return (
    <div className="rounded-xl p-4 flex items-center gap-3"
      style={{ background: 'var(--ccmc-panel)', border: `1px solid ${color}25` }}>
      <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
        style={{ background: `${color}15` }}>
        <Icon className="w-5 h-5" style={{ color }} />
      </div>
      <div>
        <div className="text-xl font-bold" style={{ color }}>
          {typeof value === 'number' ? value.toLocaleString() : (value ?? '—')}
        </div>
        <div className="text-[9px] font-semibold uppercase tracking-wider" style={{ color: 'var(--ccmc-text-hint)' }}>
          {label}
        </div>
      </div>
    </div>
  );
}

function SectionBox({ title, icon: Icon, iconColor, children }) {
  return (
    <div className="rounded-xl overflow-hidden"
      style={{ background: 'var(--ccmc-panel)', border: '1px solid var(--ccmc-border)' }}>
      <div className="flex items-center gap-2 px-5 py-3 border-b" style={{ borderColor: 'var(--ccmc-border)' }}>
        <Icon className="w-4 h-4" style={{ color: iconColor || '#42A5F5' }} />
        <h3 className="text-sm font-bold" style={{ color: 'var(--ccmc-text)', fontFamily: 'Poppins,sans-serif' }}>
          {title}
        </h3>
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
}

export default function ExecutiveAnalytics({ user }) {
  const [data,    setData]    = useState(null);
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    fetch(`${API}/executive-analytics?role=${user.role}`)
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  };

  useEffect(() => { load(); }, [user.role]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <div className="w-10 h-10 border-2 rounded-full animate-spin"
          style={{ borderColor: 'var(--ccmc-border-s)', borderTopColor: '#42A5F5' }} />
      </div>
    );
  }

  if (!data) return (
    <div className="text-center py-20 text-sm" style={{ color: 'var(--ccmc-text-hint)' }}>
      Failed to load analytics data
    </div>
  );

  const phcData     = data.phc_data     || [];
  const hrtData     = data.hrt_data     || [];
  const trend       = data.monthly_trend || [];
  const upcomingPhc = data.upcoming_phc  || [];
  const riskDist    = data.risk_dist     || {};

  const maxPhcHR    = Math.max(...phcData.map(d => d.high_risk),   1);
  const maxPhcCrit  = Math.max(...phcData.map(d => d.critical),    1);
  const maxHrtHR    = Math.max(...hrtData.map(d => d.high_risk),   1);
  const maxUpcoming = Math.max(...upcomingPhc.map(d => d.count),   1);
  const maxRisk     = Math.max(...Object.values(riskDist),         1);

  // Monthly trend bars
  const trendDeliveries = trend.map(t => ({
    label: t.month.slice(5),
    value: t.deliveries,
    color: '#42A5F5',
  }));
  const trendHighRisk = trend.map(t => ({
    label: t.month.slice(5),
    value: t.high_risk,
    color: '#F97316',
  }));

  // Month labels with year
  const monthLabel = (m) => {
    const [y, mo] = m.split('-');
    const names = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    return `${names[parseInt(mo,10)-1]} ${y}`;
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold" style={{ fontFamily: 'Poppins,sans-serif', color: 'var(--ccmc-text)' }}>
            Executive Analytics Dashboard
          </h1>
          <p className="text-xs mt-0.5" style={{ color: 'var(--ccmc-text-hint)' }}>
            {user.role} · Live intelligence from {data.total?.toLocaleString()} maternal records across {data.total_phcs} PHCs
          </p>
        </div>
        <button onClick={load}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold"
          style={{ background: 'rgba(25,118,210,0.2)', border: '1px solid rgba(25,118,210,0.4)', color: '#42A5F5' }}>
          <RefreshCw className="w-3.5 h-3.5" />
          Refresh
        </button>
      </div>

      {/* KPI Strip */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <StatCard icon={Users}       label="Total Mothers"   value={data.total}           color="#42A5F5" />
        <StatCard icon={ShieldAlert} label="High Risk Mothers" value={data.total_high_risk} color="#F97316" />
        <StatCard icon={Activity}    label="Due ≤7 Days"    value={data.due_7_days}      color="#EAB308" />
        <StatCard icon={TrendingUp}  label="Overdue EDD"    value={data.overdue_edd}     color="#EF4444" />
        <StatCard icon={BarChart2}   label="Active PHCs"    value={data.total_phcs}      color="#A78BFA" />
      </div>

      {/* PHC Charts — two columns */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <SectionBox title="High Risk Mothers by PHC" icon={ShieldAlert} iconColor="#F97316">
          <div className="space-y-1">
            {phcData.slice(0, 15).map(d => (
              <HBar key={d.phc} label={d.phc} value={d.high_risk} max={maxPhcHR}
                color="#F97316" badge={d.critical} />
            ))}
            {phcData.length === 0 && (
              <p className="text-xs text-center py-4" style={{ color: 'var(--ccmc-text-hint)' }}>No data</p>
            )}
          </div>
        </SectionBox>

        <SectionBox title="Due Soon by PHC (≤7 Days)" icon={AlertTriangle} iconColor="#EAB308">
          <div className="space-y-1">
            {phcData.filter(d => (d.due_soon || 0) > 0).slice(0, 15).map(d => (
              <HBar key={d.phc} label={d.phc} value={d.due_soon || 0} max={Math.max(...phcData.map(x => x.due_soon || 0), 1)} color="#EAB308" />
            ))}
            {phcData.filter(d => (d.due_soon || 0) > 0).length === 0 && (
              <p className="text-xs text-center py-4" style={{ color: 'var(--ccmc-text-hint)' }}>No upcoming deliveries</p>
            )}
          </div>
        </SectionBox>
      </div>

      {/* HRT Performance */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <SectionBox title="High Risk Distribution by HRT" icon={Activity} iconColor="#A78BFA">
          <div className="space-y-3">
            {hrtData.map(d => {
              const color = HRT_COLORS[d.hrt] || '#42A5F5';
              const pct = d.total > 0 ? Math.round((d.high_risk / d.total) * 100) : 0;
              return (
                <div key={d.hrt}>
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded flex items-center justify-center text-[9px] font-bold text-white"
                        style={{ background: color }}>{d.hrt.slice(-1)}</div>
                      <span className="text-xs font-semibold" style={{ color: 'var(--ccmc-text)' }}>{d.hrt_name}</span>
                    </div>
                    <div className="flex items-center gap-3 text-[10px]">
                      <span style={{ color }}>{d.high_risk} HR</span>
                      <span style={{ color: 'var(--ccmc-text-hint)' }}>{pct}%</span>
                    </div>
                  </div>
                  <div className="h-2 rounded-full overflow-hidden" style={{ background: 'rgba(30,58,95,0.4)' }}>
                    <div className="h-full rounded-full"
                      style={{ width: `${Math.round((d.high_risk / Math.max(maxHrtHR, 1)) * 100)}%`, background: color }} />
                  </div>
                </div>
              );
            })}
          </div>
        </SectionBox>

        <SectionBox title="Delivered by HRT" icon={Activity} iconColor="#22C55E">
          <div className="space-y-3">
            {hrtData.map(d => {
              const color = HRT_COLORS[d.hrt] || '#42A5F5';
              return (
                <div key={d.hrt}>
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded flex items-center justify-center text-[9px] font-bold text-white"
                        style={{ background: color }}>{d.hrt.slice(-1)}</div>
                      <span className="text-xs font-semibold" style={{ color: 'var(--ccmc-text)' }}>{d.hrt}</span>
                      <span className="text-[10px]" style={{ color: 'var(--ccmc-text-hint)' }}>
                        {d.phcs.length} PHC{d.phcs.length !== 1 ? 's' : ''}
                      </span>
                    </div>
                    <span className="text-xs font-bold" style={{ color: '#86EFAC' }}>{d.delivered ?? 0}</span>
                  </div>
                  <div className="h-2 rounded-full overflow-hidden" style={{ background: 'rgba(30,58,95,0.4)' }}>
                    <div className="h-full rounded-full"
                      style={{
                        width: `${Math.round(((d.delivered ?? 0) / Math.max(...hrtData.map(x => x.delivered ?? 0), 1)) * 100)}%`,
                        background: '#22C55E',
                      }} />
                  </div>
                </div>
              );
            })}
          </div>
        </SectionBox>
      </div>

      {/* Monthly Trends */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <SectionBox title="Monthly Delivery Timeline (EDD-based)" icon={TrendingUp} iconColor="#42A5F5">
          <VBars data={trendDeliveries} height={100} />
          <div className="flex flex-wrap gap-2 mt-2">
            {trend.map((t, i) => (
              <div key={i} className="text-[9px]" style={{ color: 'var(--ccmc-text-hint)' }}>
                {monthLabel(t.month)}: <b style={{ color: '#42A5F5' }}>{t.deliveries}</b>
              </div>
            ))}
          </div>
        </SectionBox>

        <SectionBox title="Monthly High Risk Trend (Active AN Mothers)" icon={TrendingUp} iconColor="#F97316">
          <VBars data={trendHighRisk} height={100} />
          <div className="flex flex-wrap gap-2 mt-2">
            {trend.map((t, i) => (
              <div key={i} className="text-[9px]" style={{ color: 'var(--ccmc-text-hint)' }}>
                {monthLabel(t.month)}: <b style={{ color: '#F97316' }}>{t.high_risk}</b>
              </div>
            ))}
          </div>
        </SectionBox>
      </div>

      {/* Upcoming by PHC */}
      <div className="grid grid-cols-1 gap-4">
        <SectionBox title="Upcoming Deliveries by PHC (Next 30 Days)" icon={BarChart2} iconColor="#A78BFA">
          <div className="space-y-1">
            {upcomingPhc.map(d => (
              <HBar key={d.phc} label={d.phc} value={d.count} max={maxUpcoming}
                color="#A78BFA" badge={d.critical} />
            ))}
            {upcomingPhc.length === 0 && (
              <p className="text-xs text-center py-4" style={{ color: 'var(--ccmc-text-hint)' }}>
                No upcoming deliveries in 30 days
              </p>
            )}
          </div>
          {upcomingPhc.length > 0 && (
            <div className="mt-3 pt-3 border-t" style={{ borderColor: 'var(--ccmc-border)' }}>
              <div className="grid grid-cols-2 gap-2 text-center">
                <div>
                  <div className="text-lg font-bold" style={{ color: '#F97316' }}>
                    {upcomingPhc.reduce((s, d) => s + d.due_7, 0)}
                  </div>
                  <div className="text-[9px]" style={{ color: 'var(--ccmc-text-hint)' }}>Due ≤7 Days</div>
                </div>
                <div>
                  <div className="text-lg font-bold" style={{ color: '#A78BFA' }}>
                    {upcomingPhc.reduce((s, d) => s + d.count, 0)}
                  </div>
                  <div className="text-[9px]" style={{ color: 'var(--ccmc-text-hint)' }}>Total Upcoming</div>
                </div>
              </div>
            </div>
          )}
        </SectionBox>
      </div>

      {/* PHC Performance Table */}
      <div className="rounded-xl overflow-hidden"
        style={{ background: 'var(--ccmc-panel)', border: '1px solid var(--ccmc-border)' }}>
        <div className="flex items-center gap-2 px-5 py-3 border-b" style={{ borderColor: 'var(--ccmc-border)' }}>
          <BarChart2 className="w-4 h-4" style={{ color: '#42A5F5' }} />
          <h3 className="text-sm font-bold" style={{ color: 'var(--ccmc-text)', fontFamily: 'Poppins,sans-serif' }}>
            PHC Performance Analytics
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>PHC / UPHC</th><th>HRT</th>
                <th className="text-right">Total</th>
                <th className="text-right">High Risk</th>
                <th className="text-right">Risk %</th>
              </tr>
            </thead>
            <tbody>
              {phcData.map(p => {
                const riskPct = p.total > 0 ? Math.round((p.high_risk / p.total) * 100) : 0;
                return (
                  <tr key={p.phc}>
                    <td className="font-semibold" style={{ color: 'var(--ccmc-text)' }}>{p.phc}</td>
                    <td>
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded"
                        style={{ background: `${HRT_COLORS[p.hrt] || '#42A5F5'}15`, color: HRT_COLORS[p.hrt] || '#42A5F5' }}>
                        {p.hrt}
                      </span>
                    </td>
                    <td className="text-right font-bold" style={{ color: 'var(--ccmc-text)' }}>{p.total}</td>
                    <td className="text-right font-bold" style={{ color: '#FDBA74' }}>{p.high_risk}</td>
                    <td className="text-right">
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded"
                        style={{
                          background: riskPct > 50 ? 'rgba(239,68,68,0.15)' : riskPct > 25 ? 'rgba(249,115,22,0.15)' : 'rgba(34,197,94,0.15)',
                          color:      riskPct > 50 ? '#FCA5A5'              : riskPct > 25 ? '#FDBA74'              : '#86EFAC',
                        }}>
                        {riskPct}%
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* HRT Performance Table */}
      <div className="rounded-xl overflow-hidden"
        style={{ background: 'var(--ccmc-panel)', border: '1px solid var(--ccmc-border)' }}>
        <div className="flex items-center gap-2 px-5 py-3 border-b" style={{ borderColor: 'var(--ccmc-border)' }}>
          <Users className="w-4 h-4" style={{ color: '#A78BFA' }} />
          <h3 className="text-sm font-bold" style={{ color: 'var(--ccmc-text)', fontFamily: 'Poppins,sans-serif' }}>
            HRT Performance Analytics
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>HRT</th><th>Staff Nurse</th><th>PHCs</th>
                <th className="text-right">Total</th>
                <th className="text-right">High Risk</th>
                <th className="text-right">Risk %</th>
              </tr>
            </thead>
            <tbody>
              {hrtData.map(h => {
                const color   = HRT_COLORS[h.hrt] || '#42A5F5';
                const riskPct = h.total > 0 ? Math.round((h.high_risk / h.total) * 100) : 0;
                return (
                  <tr key={h.hrt}>
                    <td>
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded"
                        style={{ background: `${color}15`, color }}>
                        {h.hrt}
                      </span>
                    </td>
                    <td className="font-semibold" style={{ color: 'var(--ccmc-text)' }}>{h.hrt_name}</td>
                    <td className="text-[10px]" style={{ color: 'var(--ccmc-text-hint)' }}>
                      {h.phcs.join(', ')}
                    </td>
                    <td className="text-right font-bold" style={{ color: 'var(--ccmc-text)' }}>{h.total}</td>
                    <td className="text-right font-bold" style={{ color: '#FDBA74' }}>{h.high_risk}</td>
                    <td className="text-right">
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded"
                        style={{
                          background: riskPct > 50 ? 'rgba(239,68,68,0.15)' : riskPct > 25 ? 'rgba(249,115,22,0.15)' : 'rgba(34,197,94,0.15)',
                          color:      riskPct > 50 ? '#FCA5A5'              : riskPct > 25 ? '#FDBA74'              : '#86EFAC',
                        }}>
                        {riskPct}%
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
