import React, { useState, useEffect, useMemo } from 'react';
import { X, Search, Download, FileText } from 'lucide-react';

const API = '/api';

const CALL_BADGE = {
  'No Call':      { bg: 'var(--ccmc-pill-neutral-bg)', color: 'var(--ccmc-pill-neutral-text)' },
  'Answered':     { bg: 'var(--ccmc-pill-success-bg)',  color: 'var(--ccmc-pill-success-text)' },
  'Not Answered': { bg: 'var(--ccmc-pill-critical-bg)', color: 'var(--ccmc-pill-critical-text)' },
  'Busy':         { bg: 'var(--ccmc-pill-warning-bg)',  color: 'var(--ccmc-pill-warning-text)' },
  'Scheduled':    { bg: 'var(--ccmc-pill-info-bg)',     color: 'var(--ccmc-pill-info-text)' },
};

const FU_BADGE = {
  'No Follow-Up': { bg: 'var(--ccmc-pill-neutral-bg)', color: 'var(--ccmc-pill-neutral-text)' },
  'Completed':    { bg: 'var(--ccmc-pill-success-bg)',  color: 'var(--ccmc-pill-success-text)' },
  'Pending':      { bg: 'var(--ccmc-pill-warning-bg)',  color: 'var(--ccmc-pill-warning-text)' },
  'Missed':       { bg: 'var(--ccmc-pill-critical-bg)', color: 'var(--ccmc-pill-critical-text)' },
  'Scheduled':    { bg: 'var(--ccmc-pill-info-bg)',     color: 'var(--ccmc-pill-info-text)' },
};

const SORT_COLS = [
  { key: 'mother_name',    label: 'Mother Name' },
  { key: 'days_to_edd',    label: 'Days' },
  { key: 'phc_display',    label: 'PHC' },
  { key: 'call_status',    label: 'Call' },
];

function Th({ children, col, sortCol, sortDir, onSort, className = '' }) {
  const active = col === sortCol;
  return (
    <th
      onClick={() => onSort(col)}
      className={`px-3 py-2.5 text-left text-[10px] font-bold uppercase tracking-wider cursor-pointer select-none whitespace-nowrap ${className}`}
      style={{ color: active ? '#3B82F6' : '#475569', background: 'var(--ccmc-panel)' }}
    >
      {children}
      <span className="ml-1" style={{ opacity: active ? 1 : 0.35 }}>
        {active ? (sortDir === 'asc' ? '↑' : '↓') : '↕'}
      </span>
    </th>
  );
}

function callStyle(s)    { return CALL_BADGE[s]    || { bg: 'var(--ccmc-pill-neutral-bg)', color: 'var(--ccmc-pill-neutral-text)' }; }
function fuStyle(s)      { return FU_BADGE[s]      || { bg: 'var(--ccmc-pill-neutral-bg)', color: 'var(--ccmc-pill-neutral-text)' }; }

function dayLabel(m) {
  if (m.is_delivered) return { text: 'Delivered', color: '#16A34A' };
  if (m.days_to_edd === null || m.days_to_edd === undefined) return { text: '—', color: '#475569' };
  if (m.days_to_edd === 0)  return { text: 'TODAY',                    color: '#DC2626' };
  if (m.days_to_edd < 0)   return { text: `${Math.abs(m.days_to_edd)}d past`, color: '#DC2626' };
  if (m.days_to_edd <= 7)  return { text: `${m.days_to_edd}d`,        color: '#D97706' };
  if (m.days_to_edd <= 30) return { text: `${m.days_to_edd}d`,        color: '#CA8A04' };
  return                           { text: `${m.days_to_edd}d`,        color: '#94A3B8' };
}

export default function DrillDownModal({ metric, title, user, onClose, openPatient }) {
  const [mothers,    setMothers]    = useState([]);
  const [total,      setTotal]      = useState(0);
  const [loading,    setLoading]    = useState(true);
  const [error,      setError]      = useState('');
  const [search,     setSearch]     = useState('');
  const [phcFilter,  setPhcFilter]  = useState('');
  const [hrtFilter,  setHrtFilter]  = useState('');
  const [sortCol,    setSortCol]    = useState('mother_name');
  const [sortDir,    setSortDir]    = useState('asc');

  useEffect(() => {
    setLoading(true);
    setError('');
    fetch(`${API}/drill-down?metric=${encodeURIComponent(metric)}&role=${encodeURIComponent(user.role)}`)
      .then(r => { if (!r.ok) throw new Error('Server error'); return r.json(); })
      .then(d => { setMothers(d.mothers || []); setTotal(d.total || 0); })
      .catch(e => setError('Failed to load data. ' + e.message))
      .finally(() => setLoading(false));
  }, [metric, user.role]);

  const phcOptions  = useMemo(() => [...new Set(mothers.map(m => m.phc_display).filter(Boolean))].sort(), [mothers]);
  const hrtOptions  = useMemo(() => [...new Set(mothers.map(m => m.hrt_code).filter(Boolean))].sort(),    [mothers]);

  const filtered = useMemo(() => {
    let out = mothers;
    if (phcFilter)  out = out.filter(m => m.phc_display  === phcFilter);
    if (hrtFilter)  out = out.filter(m => m.hrt_code     === hrtFilter);
    if (search.trim()) {
      const s = search.trim().toLowerCase();
      out = out.filter(m =>
        (m.mother_name  || '').toLowerCase().includes(s) ||
        (m.cell_no      || '').includes(s) ||
        (m.rch_id       || '').toLowerCase().includes(s) ||
        (m.phc_display  || '').toLowerCase().includes(s) ||
        (m.hrt_code     || '').toLowerCase().includes(s)
      );
    }
    return [...out].sort((a, b) => {
      let av = a[sortCol] ?? (typeof a[sortCol] === 'number' ? 0 : '');
      let bv = b[sortCol] ?? (typeof b[sortCol] === 'number' ? 0 : '');
      if (typeof av === 'number' && typeof bv === 'number') return sortDir === 'asc' ? av - bv : bv - av;
      return sortDir === 'asc'
        ? String(av).toLowerCase().localeCompare(String(bv).toLowerCase())
        : String(bv).toLowerCase().localeCompare(String(av).toLowerCase());
    });
  }, [mothers, search, phcFilter, hrtFilter, sortCol, sortDir]);

  const toggleSort = (col) => {
    if (sortCol === col) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortCol(col); setSortDir('asc'); }
  };

  const clearFilters = () => { setSearch(''); setPhcFilter(''); setHrtFilter(''); };
  const hasFilters   = search || phcFilter || hrtFilter;

  /* ── CSV Export ─────────────────────────────────────────────────────────── */
  const exportCSV = () => {
    const headers = [
      '#','RCH ID','Mother Name','Mobile','PHC','HRT Code','HRT Name',
      'Staff Nurse','Gravida','Risk Category','Risk Score',
      'EDD','Days to EDD','Delivered','Delivery Date','Days Since Delivery',
      'Call Status','Last Call Date','Follow-Up Status','Last Follow-Up Date','Address',
    ];
    const rows = filtered.map((m, i) => [
      i + 1, m.rch_id, m.mother_name, m.cell_no, m.phc_display,
      m.hrt_code, m.hrt_name, m.hsc_name, m.gravida,
      m.risk_category, m.risk_score, m.edd,
      m.days_to_edd ?? '', m.is_delivered ? 'Yes' : 'No',
      m.delivery_date, m.days_since_delivery ?? '',
      m.call_status, m.last_call_date,
      m.followup_status, m.last_followup_date, m.address,
    ]);
    const csv = [headers, ...rows]
      .map(r => r.map(v => `"${String(v ?? '').replace(/"/g, '""')}"`).join(','))
      .join('\n');
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url;
    a.download = `${title.replace(/\s+/g, '_')}_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  /* ── Print / PDF ─────────────────────────────────────────────────────────── */
  const exportPDF = () => {
    const printWindow = window.open('', '_blank');
    const rows = filtered.map((m, i) => `
      <tr>
        <td>${i + 1}</td>
        <td>${m.rch_id || ''}</td>
        <td><strong>${m.mother_name || ''}</strong></td>
        <td>${m.cell_no || ''}</td>
        <td>${m.phc_display || ''}</td>
        <td>${m.hrt_code || ''}</td>
        <td>${m.hsc_name || ''}</td>
        <td>${m.edd || ''}</td>
        <td>${m.is_delivered ? 'Delivered' : (m.days_to_edd != null ? m.days_to_edd + 'd' : '—')}</td>
        <td>${m.call_status || ''}</td>
        <td>${m.followup_status || ''}</td>
      </tr>`).join('');
    printWindow.document.write(`<!DOCTYPE html><html><head>
      <title>${title}</title>
      <style>
        body { font-family: Arial,sans-serif; font-size: 10px; padding: 16px; }
        h2 { font-size: 14px; margin-bottom: 4px; }
        p  { color: #666; margin-bottom: 12px; font-size: 9px; }
        table { width: 100%; border-collapse: collapse; }
        th { background: #1e3a5f; color: white; padding: 5px 6px; text-align: left; font-size: 9px; }
        td { padding: 4px 6px; border-bottom: 1px solid #e5e7eb; }
        tr:nth-child(even) td { background: #f8fafc; }
      </style></head><body>
      <h2>CCMC — ${title}</h2>
      <p>Exported ${new Date().toLocaleString()} · ${filtered.length} of ${total} mothers</p>
      <table><thead><tr>
        <th>#</th><th>RCH ID</th><th>Mother Name</th><th>Mobile</th>
        <th>PHC</th><th>HRT</th><th>Staff Nurse</th>
        <th>EDD</th><th>Days</th><th>Call</th><th>Follow-Up</th>
      </tr></thead><tbody>${rows}</tbody></table>
    </body></html>`);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
  };

  /* ── Render ───────────────────────────────────────────────────────────────── */
  return (
    <div className="fixed inset-0 z-50 flex flex-col"
      style={{ background: 'var(--ccmc-modal-backdrop)', backdropFilter: 'blur(8px)' }}>

      {/* ── Header ── */}
      <div className="flex items-center justify-between px-6 py-4 flex-shrink-0"
        style={{ background: 'var(--ccmc-panel)', borderBottom: '1px solid var(--ccmc-border)' }}>
        <div className="flex items-center gap-3">
          <div className="w-1.5 h-8 rounded-full flex-shrink-0"
            style={{ background: 'linear-gradient(180deg,#2563EB,#3B82F6)' }} />
          <div>
            <h2 className="text-sm font-bold" style={{ color: 'var(--ccmc-text)' }}>{title}</h2>
            <p className="text-[10px] mt-0.5" style={{ color: 'var(--ccmc-text-hint)' }}>
              {loading ? 'Loading records…'
                : error ? 'Error loading data'
                : `${filtered.length.toLocaleString()} of ${total.toLocaleString()} mothers${hasFilters ? ' (filtered)' : ''}`}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Export buttons */}
          {!loading && !error && (
            <>
              <button onClick={exportCSV}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-all"
                style={{ background: 'var(--ccmc-pill-success-bg)', border: '1px solid rgba(22,163,74,0.3)', color: 'var(--ccmc-pill-success-text)' }}
                onMouseEnter={e => e.currentTarget.style.background = 'rgba(22,163,74,0.2)'}
                onMouseLeave={e => e.currentTarget.style.background = 'var(--ccmc-pill-success-bg)'}>
                <Download className="w-3.5 h-3.5" /> Excel/CSV
              </button>
              <button onClick={exportPDF}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-all"
                style={{ background: 'var(--ccmc-pill-info-bg)', border: '1px solid rgba(59,130,246,0.3)', color: 'var(--ccmc-pill-info-text)' }}
                onMouseEnter={e => e.currentTarget.style.background = 'rgba(59,130,246,0.2)'}
                onMouseLeave={e => e.currentTarget.style.background = 'var(--ccmc-pill-info-bg)'}>
                <FileText className="w-3.5 h-3.5" /> PDF/Print
              </button>
            </>
          )}
          <button onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center transition-all"
            style={{ background: 'var(--ccmc-pill-critical-bg)', border: '1px solid rgba(220,38,38,0.25)', color: 'var(--ccmc-pill-critical-text)' }}
            onMouseEnter={e => e.currentTarget.style.background = 'rgba(220,38,38,0.2)'}
            onMouseLeave={e => e.currentTarget.style.background = 'var(--ccmc-pill-critical-bg)'}>
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* ── Filter bar ── */}
      <div className="flex flex-wrap items-center gap-2.5 px-6 py-3 flex-shrink-0"
        style={{ background: 'var(--ccmc-bar)', borderBottom: '1px solid var(--ccmc-bar-border)' }}>
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5" style={{ color: 'var(--ccmc-text-hint)' }} />
          <input
            value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search name, mobile, RCH ID…"
            className="pl-8 pr-3 py-2 rounded-lg text-xs outline-none w-64"
            style={{ background: 'var(--ccmc-input-bg)', border: '1px solid var(--ccmc-input-border)', color: 'var(--ccmc-text)' }}
            onFocus={e => e.target.style.borderColor = '#2563EB'}
            onBlur={e => e.target.style.borderColor = 'var(--ccmc-input-border)'}
          />
        </div>

        {/* PHC filter */}
        <select value={phcFilter} onChange={e => setPhcFilter(e.target.value)}
          className="py-2 pl-3 pr-7 rounded-lg text-xs outline-none appearance-none"
          style={{ background: 'var(--ccmc-input-bg)', border: '1px solid var(--ccmc-input-border)', color: phcFilter ? 'var(--ccmc-text)' : 'var(--ccmc-text-hint)' }}>
          <option value="">All PHCs</option>
          {phcOptions.map(p => <option key={p} value={p}>{p}</option>)}
        </select>

        {/* HRT filter */}
        <select value={hrtFilter} onChange={e => setHrtFilter(e.target.value)}
          className="py-2 pl-3 pr-7 rounded-lg text-xs outline-none appearance-none"
          style={{ background: 'var(--ccmc-input-bg)', border: '1px solid var(--ccmc-input-border)', color: hrtFilter ? 'var(--ccmc-text)' : 'var(--ccmc-text-hint)' }}>
          <option value="">All HRTs</option>
          {hrtOptions.map(h => <option key={h} value={h}>{h}</option>)}
        </select>

        {/* Sort quick-select */}
        <select value={sortCol} onChange={e => setSortCol(e.target.value)}
          className="py-2 pl-3 pr-7 rounded-lg text-xs outline-none appearance-none"
          style={{ background: 'var(--ccmc-input-bg)', border: '1px solid rgba(37,99,235,0.4)', color: 'var(--ccmc-pill-info-text)' }}>
          {SORT_COLS.map(c => <option key={c.key} value={c.key}>Sort: {c.label}</option>)}
        </select>

        <button onClick={() => setSortDir(d => d === 'asc' ? 'desc' : 'asc')}
          className="px-2.5 py-2 rounded-lg text-[10px] font-bold"
          style={{ background: 'var(--ccmc-pill-info-bg)', border: '1px solid rgba(37,99,235,0.3)', color: 'var(--ccmc-pill-info-text)' }}>
          {sortDir === 'asc' ? '↑ ASC' : '↓ DESC'}
        </button>

        {hasFilters && (
          <button onClick={clearFilters}
            className="px-2.5 py-2 rounded-lg text-[10px] font-bold transition-all"
            style={{ background: 'var(--ccmc-pill-critical-bg)', border: '1px solid rgba(220,38,38,0.25)', color: 'var(--ccmc-pill-critical-text)' }}
            onMouseEnter={e => e.currentTarget.style.background = 'rgba(220,38,38,0.2)'}
            onMouseLeave={e => e.currentTarget.style.background = 'var(--ccmc-pill-critical-bg)'}>
            ✕ Clear
          </button>
        )}
      </div>

      {/* ── Table body ── */}
      <div className="flex-1 overflow-auto">
        {loading ? (
          <div className="flex flex-col items-center justify-center h-full gap-3">
            <div className="w-10 h-10 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
            <p className="text-xs text-slate-500">Loading {metric} mothers…</p>
          </div>
        ) : error ? (
          <div className="flex items-center justify-center h-full text-sm" style={{ color: 'var(--ccmc-pill-critical-text)' }}>{error}</div>
        ) : filtered.length === 0 ? (
          <div className="flex items-center justify-center h-full text-sm text-slate-500">
            No mothers match the current filters
          </div>
        ) : (
          <table className="w-full text-xs border-collapse">
            <thead className="sticky top-0 z-10">
              <tr>
                <th className="px-3 py-2.5 text-[10px] font-bold text-slate-600 text-left w-10"
                  style={{ background: 'var(--ccmc-panel)' }}>#</th>
                <Th col="rch_id"          sortCol={sortCol} sortDir={sortDir} onSort={toggleSort}>RCH ID</Th>
                <Th col="mother_name"     sortCol={sortCol} sortDir={sortDir} onSort={toggleSort}>Mother Name</Th>
                <Th col="cell_no"         sortCol={sortCol} sortDir={sortDir} onSort={toggleSort}>Mobile</Th>
                <Th col="phc_display"     sortCol={sortCol} sortDir={sortDir} onSort={toggleSort}>PHC</Th>
                <Th col="hrt_code"        sortCol={sortCol} sortDir={sortDir} onSort={toggleSort}>HRT</Th>
                <Th col="hsc_name"        sortCol={sortCol} sortDir={sortDir} onSort={toggleSort}>Staff Nurse</Th>
                <Th col="gravida"         sortCol={sortCol} sortDir={sortDir} onSort={toggleSort} className="text-center">G</Th>
                <Th col="edd"             sortCol={sortCol} sortDir={sortDir} onSort={toggleSort}>EDD</Th>
                <Th col="days_to_edd"     sortCol={sortCol} sortDir={sortDir} onSort={toggleSort} className="text-right">Days</Th>
                <Th col="call_status"     sortCol={sortCol} sortDir={sortDir} onSort={toggleSort}>Call</Th>
                <Th col="followup_status" sortCol={sortCol} sortDir={sortDir} onSort={toggleSort}>Follow-Up</Th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((m, i) => {
                const cs  = callStyle(m.call_status);
                const fus = fuStyle(m.followup_status);
                const dl  = dayLabel(m);
                return (
                  <tr key={m.uid}
                    onClick={() => openPatient(m.uid)}
                    className="border-b cursor-pointer transition-colors"
                    style={{ borderColor: 'var(--ccmc-border)' }}
                    onMouseEnter={e => e.currentTarget.style.background = 'var(--ccmc-hover)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                  >
                    <td className="px-3 py-2.5 font-mono text-[10px] text-slate-600">{i + 1}</td>
                    <td className="px-3 py-2.5 font-mono text-[10px] text-slate-500">{m.rch_id || '—'}</td>
                    <td className="px-3 py-2.5 max-w-[160px]">
                      <div className="font-semibold truncate" style={{ color: 'var(--ccmc-text)' }}>{m.mother_name || '—'}</div>
                    </td>
                    <td className="px-3 py-2.5 font-mono" style={{ color: m.cell_no ? 'var(--ccmc-pill-info-text)' : 'var(--ccmc-text-hint)' }}>
                      {m.cell_no || '—'}
                    </td>
                    <td className="px-3 py-2.5 text-slate-300 max-w-[120px] truncate">{m.phc_display}</td>
                    <td className="px-3 py-2.5">
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded"
                        style={{ background: 'var(--ccmc-pill-info-bg)', color: 'var(--ccmc-pill-info-text)' }}>
                        {m.hrt_code}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-slate-400 max-w-[110px] truncate text-[10px]">
                      {m.hsc_name || '—'}
                    </td>
                    <td className="px-3 py-2.5 text-center text-slate-400">{m.gravida || '—'}</td>
                    <td className="px-3 py-2.5 font-mono text-[10px] text-slate-400">{m.edd || '—'}</td>
                    <td className="px-3 py-2.5 text-right">
                      <span className="font-bold text-[11px]" style={{ color: dl.color }}>{dl.text}</span>
                    </td>
                    <td className="px-3 py-2.5">
                      <span className="text-[10px] px-1.5 py-0.5 rounded"
                        style={{ background: cs.bg, color: cs.color }}>
                        {m.call_status}
                      </span>
                    </td>
                    <td className="px-3 py-2.5">
                      <span className="text-[10px] px-1.5 py-0.5 rounded"
                        style={{ background: fus.bg, color: fus.color }}>
                        {m.followup_status}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* ── Footer ── */}
      <div className="px-6 py-2.5 flex items-center justify-between flex-shrink-0"
        style={{ background: 'var(--ccmc-panel)', borderTop: '1px solid var(--ccmc-border)' }}>
        <div className="text-[10px] text-slate-500">
          {filtered.length.toLocaleString()} mothers shown · {total.toLocaleString()} total · sorted by <span style={{ color: '#3B82F6' }}>{sortCol}</span> ({sortDir})
        </div>
        <div className="text-[10px] text-slate-600">Click any row to open Patient Details →</div>
      </div>
    </div>
  );
}
