import React, { useEffect, useState, useCallback } from 'react';
import { Phone, Filter, RefreshCw, X, Clock, CheckCircle, AlertCircle, ChevronDown, ChevronUp } from 'lucide-react';
import HRTCallPerformance from './HRTCallPerformance';

const API = '/api';

const CALL_STATUSES = [
  'Connected','No Response','Wrong Number','Switched Off','Busy',
  'Call Back Later','Follow-Up Required','Escalated','Resolved',
];

const STATUS_COLORS = {
  'Connected':           '#22C55E',
  'No Response':         '#EF4444',
  'Wrong Number':        '#F97316',
  'Switched Off':        '#94A3B8',
  'Busy':                '#EAB308',
  'Call Back Later':     '#60A5FA',
  'Follow-Up Required':  '#A78BFA',
  'Escalated':           '#EF4444',
  'Resolved':            '#22C55E',
  'Pending':             '#94A3B8',
  'No Number':           '#EF4444',
};

function DEOPerformance() {
  const [deoData, setDeoData] = useState(null);
  const [open,    setOpen]    = useState(true);

  useEffect(() => {
    fetch(`${API}/deo-performance`).then(r => r.json()).then(setDeoData).catch(() => {});
  }, []);

  if (!deoData) return null;
  const { month, dates, deos, totals } = deoData;

  return (
    <div className="rounded-xl overflow-hidden"
      style={{ background: 'var(--ccmc-panel)', border: '1px solid rgba(66,165,245,0.25)' }}>
      <button className="w-full flex items-center justify-between px-5 py-3"
        onClick={() => setOpen(o => !o)}
        style={{ borderBottom: open ? '1px solid rgba(30,58,95,0.6)' : 'none' }}>
        <div className="flex items-center gap-2">
          <Phone className="w-4 h-4" style={{ color: '#42A5F5' }} />
          <span className="text-sm font-bold text-white" style={{ fontFamily: 'Poppins,sans-serif' }}>
            MCH Call Center — DEO Connected Calls Per Day
          </span>
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
            style={{ background: 'rgba(66,165,245,0.12)', color: '#42A5F5' }}>{month}</span>
        </div>
        {open ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
      </button>

      {open && (
        <div className="overflow-x-auto">
          <table className="data-table text-[11px]">
            <thead>
              <tr>
                <th style={{ color: '#CBD5E1' }}>S.No</th>
                <th style={{ color: '#CBD5E1' }}>Name</th>
                {dates.map(d => (
                  <th key={d} className="text-right" style={{ color: '#CBD5E1', minWidth: 58 }}>{d}</th>
                ))}
                <th className="text-right" style={{ color: '#93C5FD' }}>Total</th>
              </tr>
            </thead>
            <tbody>
              {deos.map(deo => {
                const rowTotal = dates.reduce((s, d) => s + (deo.calls[d] || 0), 0);
                return (
                  <tr key={deo.sno}>
                    <td className="text-slate-500 text-center">{deo.sno}</td>
                    <td className="font-semibold" style={{ color: '#F1F5F9' }}>{deo.name}</td>
                    {dates.map(d => {
                      const v = deo.calls[d];
                      return (
                        <td key={d} className="text-right font-bold"
                          style={{ color: v === 0 ? '#475569' : v >= 35 ? '#22C55E' : v >= 25 ? '#F97316' : '#F1F5F9' }}>
                          {v === 0 ? '–' : v}
                        </td>
                      );
                    })}
                    <td className="text-right font-bold" style={{ color: '#60A5FA' }}>{rowTotal}</td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr style={{ borderTop: '2px solid rgba(66,165,245,0.3)' }}>
                <td colSpan={2} className="font-bold" style={{ color: '#93C5FD' }}>Daily Total</td>
                {dates.map(d => (
                  <td key={d} className="text-right font-bold" style={{ color: '#60A5FA' }}>
                    {totals[d] || 0}
                  </td>
                ))}
                <td className="text-right font-bold" style={{ color: '#42A5F5' }}>
                  {Object.values(totals).reduce((s, v) => s + v, 0)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </div>
  );
}

export default function CallTracking({ user }) {
  const [records, setRecords]   = useState([]);
  const [total,   setTotal]     = useState(0);
  const [loading, setLoading]   = useState(false);
  const [statusCounts, setStatusCounts] = useState({});
  const [filterStatus, setFilterStatus] = useState('');
  const [filterHRT,    setFilterHRT]    = useState('');
  const [filterPHC,    setFilterPHC]    = useState('');
  const [phcList,      setPhcList]      = useState([]);
  const [callModal, setCallModal] = useState(null);
  const [saving,    setSaving]   = useState(false);

  useEffect(() => {
    fetch(`${API}/phcs?role=${user.role}`)
      .then(r => r.json()).then(d => setPhcList(d)).catch(() => {});
  }, [user.role]);

  const load = useCallback((background = false) => {
    if (!background) setLoading(true);
    const p = new URLSearchParams({ role: user.role });
    if (filterStatus) p.set('status', filterStatus);
    if (filterHRT)    p.set('hrt', filterHRT);
    if (filterPHC)    p.set('phc', filterPHC);
    fetch(`${API}/calls?${p}`)
      .then(r => r.json())
      .then(d => {
        setRecords(d.records || []);
        setTotal(d.total || 0);
        setStatusCounts(d.status_counts || {});
        setLoading(false);
      }).catch(() => setLoading(false));
  }, [user.role, filterStatus, filterHRT, filterPHC]);

  useEffect(() => { load(); }, [load]);

  // Live sync — all HRT portals update call statuses concurrently, so poll
  // in the background (no spinner) to show everyone's latest entries.
  useEffect(() => {
    const t = setInterval(() => load(true), 15000);
    return () => clearInterval(t);
  }, [load]);

  const openCallModal = (r) => {
    setCallModal({
      uid:          r.uid,
      mother_name:  r.mother_name,
      cell_no:      r.cell_no,
      status:       'Connected',
      remarks:      '',
      outcome:      '',
      next_followup_date: '',
      next_followup_time: '',
    });
  };

  const saveCall = async () => {
    setSaving(true);
    await fetch(`${API}/calls/${callModal.uid}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...callModal, caller_name: user.name }),
    });
    setCallModal(null);
    setSaving(false);
    load();
  };

  const today = Object.entries(statusCounts).reduce((a, [, v]) => a + v, 0);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-white" style={{ fontFamily: 'Poppins, sans-serif' }}>
            Call Tracking
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            {total.toLocaleString()} mothers · live sync across all HRT portals (auto-refreshes every 15s)
          </p>
        </div>
        <button onClick={load} disabled={loading}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold"
          style={{ background: 'rgba(25,118,210,0.2)', border: '1px solid rgba(25,118,210,0.4)', color: '#42A5F5' }}>
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* DEO Performance table */}
      <DEOPerformance />

      {/* HRT Call Performance — DMCHO / CHO only */}
      {user.full_access && <HRTCallPerformance user={user} />}

      {/* Status summary cards */}
      <div className="grid grid-cols-3 md:grid-cols-5 gap-2">
        {['Connected','No Response','Pending','Escalated','Follow-Up Required'].map(s => (
          <button key={s} onClick={() => setFilterStatus(filterStatus === s ? '' : s)}
            className="rounded-xl p-3 text-center transition-all"
            style={{
              background: filterStatus === s ? `${STATUS_COLORS[s]}15` : '#0F172A',
              border: `1px solid ${filterStatus === s ? `${STATUS_COLORS[s]}40` : 'rgba(30,58,95,0.5)'}`,
            }}>
            <div className="text-lg font-bold" style={{ color: STATUS_COLORS[s] || '#94A3B8' }}>
              {statusCounts[s] || 0}
            </div>
            <div className="text-[9px] text-slate-500 font-semibold uppercase tracking-wider">{s}</div>
          </button>
        ))}
      </div>

      {/* Filters */}
      <div className="flex gap-2 flex-wrap">
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
          className="px-3 py-2 rounded-lg text-xs text-white outline-none"
          style={{ background: 'var(--ccmc-panel)', border: '1px solid rgba(30,58,95,0.7)' }}>
          <option value="">All Statuses</option>
          {CALL_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
          <option value="Pending">Pending</option>
        </select>
        <select value={filterPHC} onChange={e => setFilterPHC(e.target.value)}
          className="px-3 py-2 rounded-lg text-xs text-white outline-none"
          style={{ background: 'var(--ccmc-panel)', border: '1px solid rgba(30,58,95,0.7)' }}>
          <option value="">All PHCs</option>
          {phcList.map(p => (
            <option key={p.phc_key} value={p.phc_key}>{p.phc_display} ({p.count})</option>
          ))}
        </select>
        {user.full_access && (
          <select value={filterHRT} onChange={e => setFilterHRT(e.target.value)}
            className="px-3 py-2 rounded-lg text-xs text-white outline-none"
            style={{ background: 'var(--ccmc-panel)', border: '1px solid rgba(30,58,95,0.7)' }}>
            <option value="">All HRTs</option>
            {['HRT1','HRT2','HRT3','HRT4','HRT5','HRT6','HRT7','HRT8'].map(h => (
              <option key={h} value={h}>{h}</option>
            ))}
          </select>
        )}
      </div>

      {/* Table */}
      <div className="rounded-xl overflow-hidden"
        style={{ background: 'var(--ccmc-panel)', border: '1px solid rgba(30,58,95,0.7)' }}>
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>Mother Name</th><th>PHC</th><th>HRT</th>
                <th>Phone</th><th>Call Status</th><th>Last Call</th>
                <th>Caller</th><th>Remarks</th><th>Next Follow-Up</th><th>Calls</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={11} className="text-center py-8">
                  <div className="w-5 h-5 border-2 rounded-full animate-spin mx-auto"
                    style={{ borderColor: '#1E3A5F', borderTopColor: '#42A5F5' }} />
                </td></tr>
              ) : records.length === 0 ? (
                <tr><td colSpan={11} className="text-center py-8 text-slate-500 text-xs">
                  No call records found
                </td></tr>
              ) : records.slice(0, 300).map(r => (
                <tr key={r.uid}>
                  <td>
                    <div className="font-semibold text-white max-w-[140px] truncate">{r.mother_name || '—'}</div>
                  </td>
                  <td className="text-slate-400 text-xs">{r.phc_display}</td>
                  <td>
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded"
                      style={{ background: 'rgba(66,165,245,0.15)', color: '#93C5FD' }}>{r.hrt_code}</span>
                  </td>
                  <td className="text-slate-400 text-xs">{r.cell_no || '—'}</td>
                  <td>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                      style={{
                        background: `${STATUS_COLORS[r.call_status] || '#94A3B8'}15`,
                        color: STATUS_COLORS[r.call_status] || '#94A3B8',
                        border: `1px solid ${STATUS_COLORS[r.call_status] || '#94A3B8'}30`,
                      }}>
                      {r.call_status || 'Pending'}
                    </span>
                  </td>
                  <td className="text-[10px] text-slate-400">{r.last_call_date || '—'}</td>
                  <td className="text-[10px] text-slate-400">{r.caller_name || '—'}</td>
                  <td className="max-w-[120px]">
                    <div className="text-[10px] text-slate-400 truncate">{r.remarks || '—'}</div>
                  </td>
                  <td className="text-[10px] text-blue-300">{r.next_followup_date || '—'}</td>
                  <td className="text-center">
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded"
                      style={{ background: 'rgba(66,165,245,0.1)', color: '#60A5FA' }}>
                      {r.call_count}
                    </span>
                  </td>
                  <td>
                    <button onClick={() => openCallModal(r)}
                      className="flex items-center gap-1 px-2 py-1 rounded text-[10px] font-semibold whitespace-nowrap"
                      style={{ background: 'rgba(34,197,94,0.1)', color: '#86EFAC', border: '1px solid rgba(34,197,94,0.2)' }}>
                      <Phone className="w-3 h-3" /> Log Call
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Call modal */}
      {callModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(2,6,23,0.9)', backdropFilter: 'blur(8px)' }}>
          <div className="w-full max-w-lg rounded-2xl p-6"
            style={{ background: 'var(--ccmc-panel)', border: '1px solid rgba(30,58,95,0.9)' }}>
            <div className="flex items-center justify-between mb-5">
              <div>
                <h3 className="text-sm font-bold text-white">Log Call</h3>
                <p className="text-xs text-slate-400 mt-0.5">{callModal.mother_name} · {callModal.cell_no}</p>
              </div>
              <button onClick={() => setCallModal(null)}>
                <X className="w-4 h-4 text-slate-400" />
              </button>
            </div>
            <div className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <label className="block">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Call Status *</span>
                  <select value={callModal.status}
                    onChange={e => setCallModal(m => ({ ...m, status: e.target.value }))}
                    className="w-full mt-1 px-3 py-2 rounded-lg text-sm text-white outline-none"
                    style={{ background: '#1E293B', border: '1px solid rgba(30,58,95,0.8)' }}>
                    {CALL_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </label>
                <label className="block">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Outcome</span>
                  <input value={callModal.outcome}
                    onChange={e => setCallModal(m => ({ ...m, outcome: e.target.value }))}
                    placeholder="e.g., Advised ANC visit"
                    className="w-full mt-1 px-3 py-2 rounded-lg text-sm text-white outline-none"
                    style={{ background: '#1E293B', border: '1px solid rgba(30,58,95,0.8)' }} />
                </label>
              </div>
              <label className="block">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Remarks</span>
                <textarea value={callModal.remarks}
                  onChange={e => setCallModal(m => ({ ...m, remarks: e.target.value }))}
                  rows={2} placeholder="Detailed call notes…"
                  className="w-full mt-1 px-3 py-2 rounded-lg text-sm text-white outline-none resize-none"
                  style={{ background: '#1E293B', border: '1px solid rgba(30,58,95,0.8)' }} />
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <label className="block">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Next Follow-Up Date</span>
                  <input type="date" value={callModal.next_followup_date}
                    onChange={e => setCallModal(m => ({ ...m, next_followup_date: e.target.value }))}
                    className="w-full mt-1 px-3 py-2 rounded-lg text-sm text-white outline-none"
                    style={{ background: '#1E293B', border: '1px solid rgba(30,58,95,0.8)', colorScheme: 'dark' }} />
                </label>
                <label className="block">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Next Follow-Up Time</span>
                  <input type="time" value={callModal.next_followup_time}
                    onChange={e => setCallModal(m => ({ ...m, next_followup_time: e.target.value }))}
                    className="w-full mt-1 px-3 py-2 rounded-lg text-sm text-white outline-none"
                    style={{ background: '#1E293B', border: '1px solid rgba(30,58,95,0.8)', colorScheme: 'dark' }} />
                </label>
              </div>
              <div className="flex gap-2 mt-4">
                <button onClick={() => setCallModal(null)}
                  className="flex-1 py-2.5 rounded-lg text-sm font-semibold text-slate-400"
                  style={{ background: 'rgba(30,41,59,0.8)', border: '1px solid rgba(30,58,95,0.5)' }}>
                  Cancel
                </button>
                <button onClick={saveCall} disabled={saving}
                  className="flex-1 py-2.5 rounded-lg text-sm font-bold text-white"
                  style={{ background: 'linear-gradient(135deg, #0F4C81, #1976D2)' }}>
                  {saving ? 'Saving…' : 'Save Call Record'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
