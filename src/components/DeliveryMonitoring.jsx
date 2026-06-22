import React, { useEffect, useState } from 'react';
import { Baby, Clock, AlertTriangle, Heart, RefreshCw, BarChart2, MapPin } from 'lucide-react';

const API = '/api';

/* ── AN Timeline tabs ───────────────────────────────────────── */
const AN_TABS = [
  { id: 'an_today',  label: 'Due Today',      color: '#DC2626', urgent: true },
  { id: 'an_w7',    label: 'Within 7 Days',   color: '#EF4444' },
  { id: 'an_8_14',  label: '8–14 Days',       color: '#F97316' },
  { id: 'an_15_30', label: '15–30 Days',      color: '#EAB308' },
  { id: 'an_31_60', label: '31–60 Days',      color: '#3B82F6' },
  { id: 'an_61_90', label: '61–90 Days',      color: '#6366F1' },
  { id: 'an_90plus',label: '> 90 Days',       color: '#8B5CF6' },
];

/* ── PN tabs ────────────────────────────────────────────────── */
const PN_TABS = [
  { id: 'pn_1_7',   label: 'Day 1–7',    color: '#EF4444',  desc: 'Within 7 days of delivery (actual date)' },
  { id: 'pn_8_14',  label: 'Day 8–14',   color: '#F97316',  desc: '8–14 days post delivery (actual date)'   },
  { id: 'pn_15_21', label: 'Day 15–21',  color: '#22C55E',  desc: '15–21 days post delivery' },
  { id: 'pn_21_28', label: 'Day 21–28',  color: '#34D399',  desc: '21–28 days post delivery' },
  { id: 'pn_28_42', label: 'Day 28–42',  color: '#6EE7B7',  desc: '28–42 days post delivery' },
  { id: 'pn_42plus',label: '> 42 Days',  color: '#A7F3D0',  desc: 'Beyond 42 days post delivery' },
];

function DeliveryCard({ p, openPatient, accentColor }) {
  const days  = p.days_to_edd;
  const label = days === null ? '—'
              : days === 0   ? 'Due Today!'
              : days < 0     ? `${Math.abs(days)}d post`
              :                `${days}d left`;
  const dColor= days === 0 ? '#DC2626' : days !== null && days < 0 ? '#22C55E' : accentColor;

  return (
    <div
      onClick={() => openPatient(p.uid)}
      className="rounded-xl p-4 cursor-pointer transition-all"
      style={{ background: 'var(--ccmc-panel)', border: '1px solid var(--ccmc-border)' }}
      onMouseEnter={e => e.currentTarget.style.borderColor = accentColor}
      onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--ccmc-border)'}
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="min-w-0 flex-1">
          <div className="text-sm font-bold truncate" style={{ color: 'var(--ccmc-text)' }}>
            {p.mother_name || 'Unknown'}
          </div>
          <div className="text-[10px] mt-0.5" style={{ color: 'var(--ccmc-text-hint)' }}>
            {p.phc_display} · {p.hrt_name}
          </div>
        </div>
        <div className="text-right flex-shrink-0">
          <div className="text-base font-bold" style={{ color: dColor }}>{label}</div>
          <div className="text-[9px]" style={{ color: dColor }}>EDD {p.edd || '—'}</div>
        </div>
      </div>

      <div className="flex items-center gap-3 text-[10px] mb-2" style={{ color: 'var(--ccmc-text-hint)' }}>
        {p.weeks && <span>Weeks: <b style={{ color: 'var(--ccmc-text)' }}>{p.weeks}</b></span>}
        {p.cell_no && <span>📞 {p.cell_no}</span>}
        {p.gravida && <span>G: <b style={{ color: 'var(--ccmc-text)' }}>{p.gravida}</b></span>}
      </div>

      <div className="flex flex-wrap gap-1.5 items-center">
        {p.birth_plan && p.birth_plan !== 'nan' && p.birth_plan.trim() && (
          <span className="text-[9px] px-1.5 py-0.5 rounded"
            style={{ background: 'rgba(59,130,246,0.1)', color: '#93C5FD' }}>
            {p.birth_plan}
          </span>
        )}
        {p.delivery_info && p.delivery_info !== 'nan' && p.delivery_info.trim() && (
          <span className="text-[9px] font-semibold" style={{ color: '#22C55E' }}>
            {p.delivery_info}
          </span>
        )}
      </div>
    </div>
  );
}

function TabBar({ tabs, active, setActive, counts }) {
  return (
    <div className="flex gap-1 p-1 rounded-xl flex-wrap"
      style={{ background: 'var(--ccmc-surface)', border: '1px solid var(--ccmc-border)' }}>
      {tabs.map(t => (
        <button
          key={t.id}
          onClick={() => setActive(t.id)}
          className="flex-1 py-2 px-2 rounded-lg text-[10px] font-bold uppercase tracking-wide transition-all whitespace-nowrap"
          style={{
            background: active === t.id ? `${t.color}18` : 'transparent',
            color:      active === t.id ? t.color : 'var(--ccmc-text-hint)',
            border:     active === t.id ? `1px solid ${t.color}35` : '1px solid transparent',
          }}
        >
          {t.urgent && counts?.[t.id] > 0 && (
            <span className="inline-block w-1.5 h-1.5 rounded-full mb-0.5 mr-1 animate-pulse"
              style={{ background: t.color }} />
          )}
          {t.label}
          {counts?.[t.id] !== undefined && (
            <span className="ml-1 opacity-80">({counts[t.id]})</span>
          )}
        </button>
      ))}
    </div>
  );
}

function PHCSummaryBar({ data, max, color }) {
  if (!data || data.length === 0) return null;
  return (
    <div className="space-y-1">
      {data.slice(0, 10).map(d => {
        const pct = max > 0 ? Math.round((d.count / max) * 100) : 0;
        return (
          <div key={d.phc} className="flex items-center gap-2">
            <span className="text-[9px] truncate flex-shrink-0" style={{ width: 110, color: 'var(--ccmc-text-sec)' }}>
              {d.phc}
            </span>
            <div className="flex-1 h-3 rounded-full overflow-hidden" style={{ background: 'rgba(30,58,95,0.4)' }}>
              <div className="h-full rounded-full" style={{ width: `${pct}%`, background: color }} />
            </div>
            <span className="text-[9px] font-bold w-6 text-right" style={{ color }}>{d.count}</span>
            {d.critical > 0 && (
              <span className="text-[9px] w-10 text-right" style={{ color: '#FCA5A5' }}>{d.critical} crit</span>
            )}
          </div>
        );
      })}
    </div>
  );
}

export default function DeliveryMonitoring({ user, openPatient }) {
  const [data,    setData]    = useState(null);
  const [anTab,   setAnTab]   = useState('an_today');
  const [pnTab,   setPnTab]   = useState('pn_1_7');
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    fetch(`${API}/deliveries?role=${user.role}`)
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  };

  useEffect(() => { load(); }, [user.role]);

  const counts       = data?.counts       || {};
  const anPHCSummary = data?.an_phc_summary || [];
  const pnPHCSummary = data?.pn_phc_summary || [];
  const anList       = data?.[anTab]  || [];
  const pnList       = data?.[pnTab]  || [];

  const anColor = AN_TABS.find(t => t.id === anTab)?.color || '#EF4444';
  const pnColor = PN_TABS.find(t => t.id === pnTab)?.color || '#22C55E';

  const totalAN = (counts.an_today||0)+(counts.an_w7||0)+(counts.an_8_14||0)
                + (counts.an_15_30||0)+(counts.an_31_60||0)+(counts.an_61_90||0)+(counts.an_90plus||0);
  const totalPN = (counts.pn_1_7||0)+(counts.pn_8_14||0)+(counts.pn_15_21||0)
                + (counts.pn_21_28||0)+(counts.pn_28_42||0)+(counts.pn_42plus||0);

  const maxAnPhc = Math.max(...anPHCSummary.map(d => d.count), 1);
  const maxPnPhc = Math.max(...pnPHCSummary.map(d => d.count), 1);

  return (
    <div className="space-y-5">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold" style={{ fontFamily: 'Poppins,sans-serif', color: 'var(--ccmc-text)' }}>
            Delivery Monitoring
          </h1>
          <p className="text-xs mt-0.5" style={{ color: 'var(--ccmc-text-hint)' }}>
            AN Upcoming Delivery Timeline + PN Post-Delivery Monitoring
          </p>
        </div>
        <button onClick={load} disabled={loading}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold"
          style={{ background: 'rgba(25,118,210,0.2)', border: '1px solid rgba(25,118,210,0.4)', color: '#42A5F5' }}>
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Summary KPI strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Due Today',          val: counts.an_today,  color: '#DC2626', icon: AlertTriangle, urgent: true },
          { label: 'AN Due ≤7 Days',     val: (counts.an_today||0)+(counts.an_w7||0),
            color: '#EF4444', icon: Clock },
          { label: 'AN Total (All EDD)', val: totalAN,           color: '#3B82F6', icon: Baby },
          { label: 'PN Total Delivered', val: totalPN,           color: '#22C55E', icon: Heart },
        ].map(({ label, val, color, icon: Icon, urgent }) => (
          <div key={label} className="rounded-xl p-4 flex items-center gap-3"
            style={{ background: 'var(--ccmc-panel)', border: `1px solid ${color}25` }}>
            <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
              style={{ background: `${color}15` }}>
              <Icon className={`w-5 h-5 ${urgent && val > 0 ? 'animate-pulse' : ''}`} style={{ color }} />
            </div>
            <div>
              <div className="text-xl font-bold" style={{ color }}>{val ?? '—'}</div>
              <div className="text-[9px] font-semibold uppercase tracking-wider" style={{ color: 'var(--ccmc-text-hint)' }}>
                {label}
              </div>
            </div>
          </div>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-2 rounded-full animate-spin"
            style={{ borderColor: 'var(--ccmc-border-s)', borderTopColor: '#42A5F5' }} />
        </div>
      ) : (
        <>
          {/* ── AN Section ──────────────────────────────────────────── */}
          <div className="rounded-2xl p-4 space-y-4"
            style={{ background: 'var(--ccmc-surface)', border: '1px solid var(--ccmc-border)' }}>
            {/* AN header */}
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center"
                style={{ background: 'rgba(59,130,246,0.15)' }}>
                <Baby className="w-4 h-4" style={{ color: '#3B82F6' }} />
              </div>
              <div className="flex-1">
                <div className="text-sm font-bold" style={{ color: 'var(--ccmc-text)', fontFamily: 'Poppins,sans-serif' }}>
                  AN Mothers (Antenatal) — Upcoming Delivery Timeline
                </div>
                <div className="text-[10px]" style={{ color: 'var(--ccmc-text-hint)' }}>
                  {totalAN} total · Mothers yet to deliver, categorised by days to EDD
                </div>
              </div>
            </div>

            {/* AN Timeline visual */}
            <div className="rounded-xl p-4"
              style={{ background: 'var(--ccmc-panel)', border: '1px solid var(--ccmc-border)' }}>
              <div className="text-[10px] font-bold uppercase tracking-wider mb-3"
                style={{ color: 'var(--ccmc-text-sec)' }}>
                Delivery Timeline Distribution
              </div>
              <div className="flex items-end gap-2">
                {AN_TABS.map(t => {
                  const cnt   = counts[t.id] || 0;
                  const maxC  = Math.max(...AN_TABS.map(x => counts[x.id] || 0), 1);
                  const h     = cnt > 0 ? Math.max(8, Math.round((cnt / maxC) * 64)) : 4;
                  return (
                    <button key={t.id} onClick={() => setAnTab(t.id)}
                      className="flex-1 flex flex-col items-center gap-1 group">
                      {cnt > 0 && (
                        <span className="text-[9px] font-bold" style={{ color: t.color }}>{cnt}</span>
                      )}
                      <div className="w-full rounded-t transition-all duration-500"
                        style={{
                          height: h,
                          background: anTab === t.id ? t.color : `${t.color}50`,
                          minHeight: 4,
                        }} />
                      <span className="text-[8px] text-center leading-tight"
                        style={{ color: anTab === t.id ? t.color : 'var(--ccmc-text-hint)', wordBreak: 'break-word' }}>
                        {t.label}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            <TabBar tabs={AN_TABS} active={anTab} setActive={setAnTab} counts={counts} />

            {/* AN PHC Summary */}
            {anPHCSummary.length > 0 && (
              <div className="rounded-xl p-4"
                style={{ background: 'var(--ccmc-panel)', border: '1px solid var(--ccmc-border)' }}>
                <div className="flex items-center gap-2 mb-3">
                  <BarChart2 className="w-3.5 h-3.5" style={{ color: '#3B82F6' }} />
                  <span className="text-[10px] font-bold uppercase tracking-wider"
                    style={{ color: 'var(--ccmc-text-sec)' }}>
                    PHC Distribution (Upcoming 30 Days)
                  </span>
                </div>
                <PHCSummaryBar data={anPHCSummary} max={maxAnPhc} color="#3B82F6" />
              </div>
            )}

            {/* AN Cards grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {anList.length === 0 ? (
                <div className="col-span-3 text-center py-10 text-sm" style={{ color: 'var(--ccmc-text-hint)' }}>
                  No AN mothers in this category
                </div>
              ) : anList.map(p => (
                <DeliveryCard key={p.uid} p={p} openPatient={openPatient} accentColor={anColor} />
              ))}
            </div>

            {anList.length > 0 && (
              <p className="text-[10px] text-center" style={{ color: 'var(--ccmc-text-hint)' }}>
                Showing up to 200 records · Click any card to view patient details
              </p>
            )}
          </div>

          {/* ── PN Section ──────────────────────────────────────────── */}
          <div className="rounded-2xl p-4 space-y-4"
            style={{ background: 'var(--ccmc-surface)', border: '1px solid var(--ccmc-border)' }}>
            {/* PN header */}
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center"
                style={{ background: 'rgba(34,197,94,0.15)' }}>
                <Heart className="w-4 h-4" style={{ color: '#22C55E' }} />
              </div>
              <div className="flex-1">
                <div className="text-sm font-bold" style={{ color: 'var(--ccmc-text)', fontFamily: 'Poppins,sans-serif' }}>
                  PN Mothers (Postnatal) — Post-Delivery Monitoring
                </div>
                <div className="text-[10px]" style={{ color: 'var(--ccmc-text-hint)' }}>
                  {totalPN} total · Mothers who have delivered, categorised by days since EDD
                </div>
              </div>
            </div>

            {/* PN Summary cards */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
              {PN_TABS.map(t => (
                <button key={t.id} onClick={() => setPnTab(t.id)}
                  className="rounded-xl p-3 text-center transition-all"
                  style={{
                    background: pnTab === t.id ? `${t.color}15` : 'var(--ccmc-panel)',
                    border: `1px solid ${pnTab === t.id ? `${t.color}40` : 'var(--ccmc-border)'}`,
                  }}>
                  <div className="text-xl font-bold" style={{ color: t.color }}>
                    {counts[t.id] || 0}
                  </div>
                  <div className="text-[9px] font-bold uppercase tracking-wide mt-0.5"
                    style={{ color: t.color }}>{t.label}</div>
                  <div className="text-[8px] mt-0.5" style={{ color: 'var(--ccmc-text-hint)' }}>{t.desc}</div>
                </button>
              ))}
            </div>

            <TabBar tabs={PN_TABS} active={pnTab} setActive={setPnTab} counts={counts} />

            {/* PN PHC Summary */}
            {pnPHCSummary.length > 0 && (
              <div className="rounded-xl p-4"
                style={{ background: 'var(--ccmc-panel)', border: '1px solid var(--ccmc-border)' }}>
                <div className="flex items-center gap-2 mb-3">
                  <MapPin className="w-3.5 h-3.5" style={{ color: '#22C55E' }} />
                  <span className="text-[10px] font-bold uppercase tracking-wider"
                    style={{ color: 'var(--ccmc-text-sec)' }}>
                    PHC Distribution (PN Mothers)
                  </span>
                </div>
                <PHCSummaryBar data={pnPHCSummary} max={maxPnPhc} color="#22C55E" />
              </div>
            )}

            {/* PN Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {pnList.length === 0 ? (
                <div className="col-span-3 text-center py-10 text-sm" style={{ color: 'var(--ccmc-text-hint)' }}>
                  No PN mothers in this category
                </div>
              ) : pnList.map(p => (
                <DeliveryCard key={p.uid} p={p} openPatient={openPatient} accentColor={pnColor} />
              ))}
            </div>

            {pnList.length > 0 && (
              <p className="text-[10px] text-center" style={{ color: 'var(--ccmc-text-hint)' }}>
                Showing up to 200 records · Click any card to view patient details
              </p>
            )}
          </div>
        </>
      )}
    </div>
  );
}
