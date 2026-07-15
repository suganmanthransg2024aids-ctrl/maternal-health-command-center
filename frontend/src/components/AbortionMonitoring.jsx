import React, { useEffect, useState, useCallback } from 'react';
import { HeartCrack, RefreshCw, MapPin, Calendar, Phone } from 'lucide-react';

const API = '/api';

const TYPE_COLORS = {
  Spontaneous: '#F87171',
  MTP:         '#FB923C',
  Missed:      '#A78BFA',
  Incomplete:  '#FBBF24',
  Other:       '#94A3B8',
  Unspecified: '#64748B',
};

function AbortionCard({ m, openPatient }) {
  return (
    <div
      onClick={() => openPatient(m.uid)}
      className="rounded-xl p-4 cursor-pointer transition-all"
      style={{ background: 'var(--ccmc-panel)', border: '1px solid var(--ccmc-border)' }}
      onMouseEnter={e => e.currentTarget.style.borderColor = '#F87171'}
      onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--ccmc-border)'}
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="min-w-0 flex-1">
          <div className="text-sm font-bold truncate" style={{ color: 'var(--ccmc-text)' }}>
            {m.mother_name || 'Unknown'}
          </div>
          {m.rch_id && (
            <div className="text-[10px] mt-0.5" style={{ color: 'var(--ccmc-text-hint)' }}>
              RCH: {m.rch_id}
            </div>
          )}
        </div>
        <div className="text-right flex-shrink-0">
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
            style={{
              background: `${TYPE_COLORS[m.abortion_type || 'Unspecified'] || '#94A3B8'}18`,
              color: TYPE_COLORS[m.abortion_type || 'Unspecified'] || '#94A3B8',
              border: `1px solid ${TYPE_COLORS[m.abortion_type || 'Unspecified'] || '#94A3B8'}40`,
            }}>
            {m.abortion_type || 'Abortion'}
          </span>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3 text-[10px]" style={{ color: 'var(--ccmc-text-hint)' }}>
        {m.abortion_date && (
          <span className="flex items-center gap-1">
            <Calendar className="w-3 h-3" />{m.abortion_date}
            {m.days_since_abortion != null && <b style={{ color: '#FCA5A5' }}>({m.days_since_abortion}d ago)</b>}
          </span>
        )}
        {m.cell_no && <span className="flex items-center gap-1"><Phone className="w-3 h-3" />{m.cell_no}</span>}
        {m.weeks && <span>Weeks: <b style={{ color: 'var(--ccmc-text)' }}>{m.weeks}</b></span>}
        {m.marked_by && <span>By: {m.marked_by}</span>}
      </div>
    </div>
  );
}

export default function AbortionMonitoring({ user, openPatient }) {
  const [data,    setData]    = useState(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    fetch(`${API}/abortions?role=${user.role}`)
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, [user.role]);

  useEffect(() => {
    setLoading(true);
    load();
    const t = setInterval(load, 30000); // stay in sync across portals
    return () => clearInterval(t);
  }, [load]);

  const byPhc = data?.by_phc || [];
  const typeCounts = data?.type_counts || {};

  return (
    <div className="space-y-5">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold" style={{ fontFamily: 'Poppins,sans-serif', color: 'var(--ccmc-text)' }}>
            Abortion Monitoring
          </h1>
          <p className="text-xs mt-0.5" style={{ color: 'var(--ccmc-text-hint)' }}>
            Abortions assigned in the app, grouped by PHC / UPHC
          </p>
        </div>
        <button onClick={() => { setLoading(true); load(); }} disabled={loading}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold"
          style={{ background: 'rgba(248,113,113,0.15)', border: '1px solid rgba(248,113,113,0.35)', color: '#FCA5A5' }}>
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* KPI strip */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Total Abortions', val: data?.total,         color: '#F87171' },
          { label: 'This Month',      val: data?.this_month,    color: '#FB923C' },
          { label: 'PHCs Affected',   val: data?.phcs_affected, color: '#A78BFA' },
        ].map(({ label, val, color }) => (
          <div key={label} className="rounded-xl p-4 flex items-center gap-3"
            style={{ background: 'var(--ccmc-panel)', border: `1px solid ${color}25` }}>
            <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
              style={{ background: `${color}15` }}>
              <HeartCrack className="w-5 h-5" style={{ color }} />
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

      {/* Type breakdown */}
      {Object.keys(typeCounts).length > 0 && (
        <div className="flex flex-wrap gap-2">
          {Object.entries(typeCounts).sort((a, b) => b[1] - a[1]).map(([type, cnt]) => (
            <span key={type} className="text-[10px] font-bold px-2.5 py-1 rounded-full"
              style={{
                background: `${TYPE_COLORS[type] || '#94A3B8'}15`,
                color: TYPE_COLORS[type] || '#94A3B8',
                border: `1px solid ${TYPE_COLORS[type] || '#94A3B8'}35`,
              }}>
              {type}: {cnt}
            </span>
          ))}
        </div>
      )}

      {loading && !data ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-2 rounded-full animate-spin"
            style={{ borderColor: 'var(--ccmc-border-s)', borderTopColor: '#F87171' }} />
        </div>
      ) : byPhc.length === 0 ? (
        <div className="rounded-2xl py-16 text-center"
          style={{ background: 'var(--ccmc-surface)', border: '1px solid var(--ccmc-border)' }}>
          <HeartCrack className="w-8 h-8 mx-auto mb-3" style={{ color: 'var(--ccmc-text-hint)' }} />
          <p className="text-sm font-semibold" style={{ color: 'var(--ccmc-text-sec)' }}>
            No abortions recorded
          </p>
          <p className="text-xs mt-1" style={{ color: 'var(--ccmc-text-hint)' }}>
            Assign one from a patient's profile via the Delivery / Abortion button
          </p>
        </div>
      ) : (
        /* PHC-wise sections */
        byPhc.map(phc => (
          <div key={phc.phc_key} className="rounded-2xl p-4 space-y-3"
            style={{ background: 'var(--ccmc-surface)', border: '1px solid var(--ccmc-border)' }}>
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center"
                style={{ background: 'rgba(248,113,113,0.15)' }}>
                <MapPin className="w-4 h-4" style={{ color: '#F87171' }} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-bold" style={{ color: 'var(--ccmc-text)', fontFamily: 'Poppins,sans-serif' }}>
                  {phc.phc_display}
                </div>
                <div className="text-[10px]" style={{ color: 'var(--ccmc-text-hint)' }}>
                  {phc.hrt_code} · {phc.hrt_name}
                </div>
              </div>
              <span className="text-lg font-bold px-3 py-1 rounded-lg flex-shrink-0"
                style={{ background: 'rgba(248,113,113,0.12)', color: '#F87171' }}>
                {phc.count}
              </span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {phc.mothers.map(m => (
                <AbortionCard key={m.uid} m={m} openPatient={openPatient} />
              ))}
            </div>
          </div>
        ))
      )}
    </div>
  );
}
