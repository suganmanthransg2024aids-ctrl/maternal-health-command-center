import React, { useEffect, useState } from 'react';
import { Activity } from 'lucide-react';

const API = '/api';

const RISK_STYLES = {
  Critical:   { bg: 'rgba(239,68,68,0.12)',  border: 'rgba(239,68,68,0.35)',  color: '#FCA5A5', dot: '#EF4444'  },
  'Very High':{ bg: 'rgba(249,115,22,0.12)', border: 'rgba(249,115,22,0.35)', color: '#FDBA74', dot: '#F97316'  },
  High:       { bg: 'rgba(234,179,8,0.12)',  border: 'rgba(234,179,8,0.35)',  color: '#FDE047', dot: '#EAB308'  },
  Moderate:   { bg: 'rgba(59,130,246,0.12)', border: 'rgba(59,130,246,0.35)', color: '#93C5FD', dot: '#3B82F6'  },
  Low:        { bg: 'rgba(34,197,94,0.12)',  border: 'rgba(34,197,94,0.35)',  color: '#86EFAC', dot: '#22C55E'  },
};

/* Category label helper — appends " Risk" where not already present */
const riskLabel = (cat) =>
  cat && !cat.toLowerCase().includes('risk') ? `${cat} Risk` : cat;

export default function RiskIntelligence({ user, openPatient }) {
  const [patients,   setPatients]   = useState([]);
  const [total,      setTotal]      = useState(0);
  const [loading,    setLoading]    = useState(false);
  const [filterRisk, setFilterRisk] = useState('Critical');
  const [page,       setPage]       = useState(1);
  const PER = 60;

  const load = () => {
    setLoading(true);
    const params = new URLSearchParams({ role: user.role, risk_category: filterRisk, page, per_page: PER });
    fetch(`${API}/patients?${params}`)
      .then(r => r.json())
      .then(d => { setPatients(d.patients || []); setTotal(d.total || 0); setLoading(false); })
      .catch(() => setLoading(false));
  };

  useEffect(() => { load(); }, [filterRisk, page, user.role]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold" style={{ fontFamily: 'Poppins,sans-serif', color: 'var(--ccmc-text)' }}>
            Risk Intelligence
          </h1>
          <p className="text-xs mt-0.5" style={{ color: 'var(--ccmc-text-hint)' }}>
            {total.toLocaleString()} mothers in selected risk tier — based on 44 high-risk criteria
          </p>
        </div>
      </div>

      {/* Risk tier selector */}
      <div className="flex gap-2 flex-wrap">
        {Object.entries(RISK_STYLES).map(([cat, s]) => (
          <button key={cat} onClick={() => { setFilterRisk(cat); setPage(1); }}
            className="px-4 py-2 rounded-xl text-xs font-bold transition-all"
            style={{
              background: filterRisk === cat ? s.bg : 'var(--ccmc-panel)',
              border:     filterRisk === cat ? `1px solid ${s.border}` : '1px solid var(--ccmc-border)',
              color:      filterRisk === cat ? s.color : 'var(--ccmc-text-hint)',
              boxShadow:  filterRisk === cat ? `0 0 12px ${s.dot}20` : 'none',
            }}>
            <span className="inline-block w-2 h-2 rounded-full mr-2" style={{ background: s.dot }} />
            {cat} Risk
          </button>
        ))}
      </div>

      {/* Risk cards grid */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-2 rounded-full animate-spin"
            style={{ borderColor: 'var(--ccmc-border-s)', borderTopColor: '#42A5F5' }} />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {patients.map(p => {
            const s = RISK_STYLES[p.risk_category] || RISK_STYLES.Low;
            return (
              <div key={p.uid} onClick={() => openPatient(p.uid)}
                className="rounded-xl p-4 cursor-pointer transition-all"
                style={{ background: 'var(--ccmc-panel)', border: `1px solid ${s.border}` }}
                onMouseEnter={e => e.currentTarget.style.background = s.bg}
                onMouseLeave={e => e.currentTarget.style.background = 'var(--ccmc-panel)'}>

                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="min-w-0">
                    <div className="text-sm font-bold truncate" style={{ color: 'var(--ccmc-text)' }}>
                      {p.mother_name || 'Unknown'}
                    </div>
                    <div className="text-[10px]" style={{ color: 'var(--ccmc-text-hint)' }}>
                      {p.phc_display} · {p.hrt_name}
                    </div>
                  </div>
                  {/* Category badge — NO numerical score */}
                  <span className="text-xs font-bold px-2 py-0.5 rounded-full flex-shrink-0"
                    style={{ background: s.bg, color: s.color, border: `1px solid ${s.border}` }}>
                    {riskLabel(p.risk_category)}
                  </span>
                </div>

                {/* Risk factor chips */}
                <div className="flex flex-wrap gap-1 mb-3">
                  {(p.risk_factors || []).slice(0, 3).map((f, i) => (
                    <span key={i} className="text-[9px] font-semibold px-1.5 py-0.5 rounded"
                      style={{ background: `${s.dot}18`, color: s.color }}>
                      {f}
                    </span>
                  ))}
                  {(p.risk_factors || []).length > 3 && (
                    <span className="text-[9px]" style={{ color: 'var(--ccmc-text-hint)' }}>
                      +{(p.risk_factors || []).length - 3} more
                    </span>
                  )}
                </div>

                <div className="flex items-center justify-between text-[10px]" style={{ color: 'var(--ccmc-text-hint)' }}>
                  <span>{p.cell_no || 'No phone'}</span>
                  <span>EDD: {p.edd || '—'} {p.days_to_edd !== null ? `(${p.days_to_edd}d)` : ''}</span>
                </div>
              </div>
            );
          })}
          {patients.length === 0 && !loading && (
            <div className="col-span-3 text-center py-16 text-xs" style={{ color: 'var(--ccmc-text-hint)' }}>
              No patients in this risk category
            </div>
          )}
        </div>
      )}

      {/* Pagination */}
      {Math.ceil(total / PER) > 1 && (
        <div className="flex items-center justify-center gap-3">
          <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold"
            style={{ background: 'rgba(25,118,210,0.2)', color: '#42A5F5' }}>
            ← Prev
          </button>
          <span className="text-xs" style={{ color: 'var(--ccmc-text-sec)' }}>
            Page {page} of {Math.ceil(total / PER)}
          </span>
          <button onClick={() => setPage(p => Math.min(Math.ceil(total / PER), p + 1))}
            disabled={page === Math.ceil(total / PER)}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold"
            style={{ background: 'rgba(25,118,210,0.2)', color: '#42A5F5' }}>
            Next →
          </button>
        </div>
      )}
    </div>
  );
}
