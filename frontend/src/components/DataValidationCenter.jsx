import React, { useEffect, useState } from 'react';
import { ShieldCheck, AlertTriangle, AlertCircle, CheckCircle, RefreshCw, Phone, User } from 'lucide-react';
import { useTheme } from '../ThemeContext';

const API = '/api';

// Bright theme needs darker, more saturated shades of these status colors to
// stay legible as text on a white background (mirrors Header.jsx's statColors).
const BRIGHT_SHADE = {
  '#DC2626': '#DC2626',
  '#D97706': '#EA580C',
  '#CA8A04': '#B45309',
  '#16A34A': '#16A34A',
};
function shade(hex, dark) { return dark ? hex : (BRIGHT_SHADE[hex] || hex); }

function StatCard({ label, value, color, icon: Icon }) {
  return (
    <div className="rounded-xl p-4 flex items-center gap-3"
      style={{ background: 'var(--ccmc-panel)', border: `1px solid ${color}30` }}>
      <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
        style={{ background: `${color}15` }}>
        <Icon className="w-5 h-5" style={{ color }} />
      </div>
      <div>
        <div className="text-xl font-bold" style={{ color }}>{value ?? '—'}</div>
        <div className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider">{label}</div>
      </div>
    </div>
  );
}

function QualityGauge({ score, dark }) {
  const color = shade(score >= 80 ? '#16A34A' : score >= 60 ? '#CA8A04' : '#DC2626', dark);
  const label = score >= 80 ? 'Good' : score >= 60 ? 'Fair' : 'Poor';
  return (
    <div className="rounded-xl p-5 flex flex-col items-center justify-center gap-2"
      style={{ background: 'var(--ccmc-panel)', border: '1px solid var(--ccmc-border)' }}>
      <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">Data Quality Score</div>
      <div className="text-5xl font-bold mt-1" style={{ color, fontFamily: 'Poppins, sans-serif' }}>
        {score ?? '—'}%
      </div>
      <div className="w-full h-2 rounded-full mt-2" style={{ background: 'var(--ccmc-border-s)' }}>
        <div className="h-full rounded-full transition-all duration-1000"
          style={{ width: `${score || 0}%`, background: color }} />
      </div>
      <div className="text-sm font-semibold" style={{ color }}>{label} Quality</div>
    </div>
  );
}

function RecordsTable({ title, records, color, emptyMsg }) {
  const [expanded, setExpanded] = useState(false);
  const shown = expanded ? records : records.slice(0, 5);
  if (records.length === 0) return null;
  return (
    <div className="rounded-xl overflow-hidden"
      style={{ background: 'var(--ccmc-panel)', border: `1px solid ${color}30` }}>
      <div className="flex items-center justify-between px-4 py-3 border-b"
        style={{ borderColor: `${color}20` }}>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full" style={{ background: color }} />
          <span className="text-xs font-bold text-white">{title}</span>
          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded"
            style={{ background: `${color}15`, color }}>
            {records.length}
          </span>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="data-table">
          <thead>
            <tr>
              <th>Mother Name</th><th>PHC</th><th>HRT</th><th>Cell No</th><th>RCH ID</th>
            </tr>
          </thead>
          <tbody>
            {shown.map((r, i) => (
              <tr key={i}>
                <td className="font-medium text-white">{r.mother_name || <span className="text-red-400 italic">MISSING</span>}</td>
                <td className="text-slate-400">{r.phc_display}</td>
                <td><span className="text-[10px] font-bold px-1.5 py-0.5 rounded"
                  style={{ background: 'var(--ccmc-pill-info-bg)', color: 'var(--ccmc-pill-info-text)' }}>{r.hrt_name}</span></td>
                <td className={!r.cell_no ? 'text-red-400 italic' : 'text-slate-400'}>{r.cell_no || 'MISSING'}</td>
                <td className="text-slate-500 text-[10px]">{r.rch_id || '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {records.length > 5 && (
        <button onClick={() => setExpanded(!expanded)}
          className="w-full py-2 text-xs font-semibold transition-all"
          style={{ background: `${color}08`, color, borderTop: `1px solid ${color}20` }}>
          {expanded ? '▲ Show less' : `▼ Show all ${records.length} records`}
        </button>
      )}
    </div>
  );
}

export default function DataValidationCenter({ user }) {
  const { theme } = useTheme();
  const dark = theme !== 'bright';
  const [data,    setData]    = useState(null);
  const [loading, setLoading] = useState(true);
  const [tab,     setTab]     = useState('missing');

  const load = () => {
    setLoading(true);
    fetch(`${API}/validation`)
      .then(r => r.json()).then(d => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const tabs = [
    { id: 'missing',   label: 'Missing Data',    color: shade('#DC2626', dark) },
    { id: 'invalid',   label: 'Invalid Data',    color: shade('#D97706', dark) },
    { id: 'duplicates',label: 'Duplicates',      color: shade('#CA8A04', dark) },
  ];

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-title" style={{ fontFamily: 'Poppins, sans-serif' }}>
            Data Validation Center
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Real-time data quality analysis across all {data?.total_records?.toLocaleString() ?? '…'} records
          </p>
        </div>
        <button onClick={load} disabled={loading}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold"
          style={{ background: 'var(--ccmc-pill-info-bg)', border: '1px solid rgba(37,99,235,0.4)', color: 'var(--ccmc-pill-info-text)' }}>
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          Revalidate
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="text-center">
            <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-3" style={{ color: 'var(--ccmc-pill-info-text)' }} />
            <p className="text-sm text-slate-500">Running validation engine…</p>
          </div>
        </div>
      ) : data ? (
        <>
          {/* Stats + gauge */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <QualityGauge score={data.quality_score} dark={dark} />
            <StatCard label="Missing Names"   value={data.missing_name}    color={shade('#DC2626', dark)} icon={User} />
            <StatCard label="Missing Phone"   value={data.missing_phone}   color={shade('#DC2626', dark)} icon={Phone} />
            <StatCard label="Invalid Phone"   value={data.invalid_phone}   color={shade('#D97706', dark)} icon={AlertTriangle} />
            <StatCard label="Missing RCH ID"  value={data.missing_rch}     color={shade('#CA8A04', dark)} icon={AlertCircle} />
            <StatCard label="Missing EDD"     value={data.missing_edd}     color={shade('#CA8A04', dark)} icon={AlertCircle} />
            <StatCard label="Duplicate Phone" value={data.duplicate_phone} color={shade('#CA8A04', dark)} icon={AlertTriangle} />
            <StatCard label="Duplicate RCH"   value={data.duplicate_rch}   color={shade('#D97706', dark)} icon={AlertTriangle} />
          </div>

          {/* Summary banner */}
          <div className="rounded-xl p-4 flex items-center gap-4"
            style={{ background: 'var(--ccmc-pill-success-bg)', border: '1px solid rgba(22,163,74,0.2)' }}>
            <CheckCircle className="w-8 h-8 flex-shrink-0" style={{ color: shade('#16A34A', dark) }} />
            <div>
              <div className="text-sm font-bold text-white">
                {data.total_records?.toLocaleString()} records analysed across all PHC sheets
              </div>
              <div className="text-xs text-slate-400 mt-0.5">
                Quality score: <span style={{ color: shade(data.quality_score >= 80 ? '#16A34A' : data.quality_score >= 60 ? '#CA8A04' : '#DC2626', dark) }}>
                  {data.quality_score}%
                </span> &nbsp;·&nbsp;
                {data.missing_name + data.missing_phone + data.invalid_phone + data.duplicate_phone + data.duplicate_rch} total issues detected
              </div>
            </div>
          </div>

          {/* Tab navigation */}
          <div className="flex gap-1 p-1 rounded-xl" style={{ background: 'var(--ccmc-panel)', border: '1px solid var(--ccmc-border)' }}>
            {tabs.map(t => (
              <button key={t.id} onClick={() => setTab(t.id)}
                className="flex-1 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all"
                style={{
                  background: tab === t.id ? `${t.color}15` : 'transparent',
                  color: tab === t.id ? t.color : '#64748B',
                  border: tab === t.id ? `1px solid ${t.color}30` : '1px solid transparent',
                }}>
                {t.label}
              </button>
            ))}
          </div>

          {/* Tab content */}
          {tab === 'missing' && (
            <div className="space-y-4">
              <RecordsTable title="Missing Mother Name" records={data.missing_name_records || []}
                color={shade('#DC2626', dark)} />
              <RecordsTable title="Missing Phone Number" records={data.missing_phone_records || []}
                color={shade('#DC2626', dark)} />
            </div>
          )}
          {tab === 'invalid' && (
            <RecordsTable title="Invalid Phone Numbers" records={data.invalid_phone_records || []}
              color={shade('#D97706', dark)} />
          )}
          {tab === 'duplicates' && (
            <div className="space-y-4">
              <RecordsTable title="Duplicate Phone Numbers" records={data.duplicate_phone_records || []}
                color={shade('#CA8A04', dark)} />
              <RecordsTable title="Duplicate RCH IDs" records={data.duplicate_rch_records || []}
                color={shade('#CA8A04', dark)} />
            </div>
          )}
        </>
      ) : (
        <div className="text-center py-20 text-slate-500">
          Failed to load validation data. Ensure the backend is running.
        </div>
      )}
    </div>
  );
}
