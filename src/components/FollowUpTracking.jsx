import React, { useEffect, useState, useCallback } from 'react';
import { CalendarCheck, RefreshCw, X, CheckCircle, AlertCircle } from 'lucide-react';

const API = '/api';

const STATUS_STYLES = {
  Completed: { color: '#22C55E', bg: 'rgba(34,197,94,0.1)',   border: 'rgba(34,197,94,0.3)'   },
  Pending:   { color: '#60A5FA', bg: 'rgba(96,165,250,0.1)',  border: 'rgba(96,165,250,0.3)'  },
  Scheduled: { color: '#A78BFA', bg: 'rgba(167,139,250,0.1)', border: 'rgba(167,139,250,0.3)' },
  Missed:    { color: '#EF4444', bg: 'rgba(239,68,68,0.1)',   border: 'rgba(239,68,68,0.3)'   },
  Overdue:   { color: '#F97316', bg: 'rgba(249,115,22,0.1)',  border: 'rgba(249,115,22,0.3)'  },
};

export default function FollowUpTracking({ user }) {
  const [records, setRecords] = useState([]);
  const [total,   setTotal]   = useState(0);
  const [statusCounts, setStatusCounts] = useState({});
  const [loading, setLoading] = useState(false);
  const [filterStatus, setFilterStatus] = useState('');
  const [filterHRT,    setFilterHRT]    = useState('');
  const [filterPHC,    setFilterPHC]    = useState('');
  const [phcList,      setPhcList]      = useState([]);
  const [fuModal,  setFuModal]  = useState(null);
  const [saving,   setSaving]   = useState(false);

  useEffect(() => {
    fetch(`${API}/phcs?role=${user.role}`)
      .then(r => r.json()).then(d => setPhcList(d)).catch(() => {});
  }, [user.role]);

  const load = useCallback(() => {
    setLoading(true);
    const p = new URLSearchParams({ role: user.role });
    if (filterStatus) p.set('status', filterStatus);
    if (filterHRT)    p.set('hrt', filterHRT);
    if (filterPHC)    p.set('phc', filterPHC);
    fetch(`${API}/followups?${p}`)
      .then(r => r.json())
      .then(d => {
        setRecords(d.records || []);
        setTotal(d.total || 0);
        setStatusCounts(d.status_counts || {});
        setLoading(false);
      }).catch(() => setLoading(false));
  }, [user.role, filterStatus, filterHRT, filterPHC]);

  useEffect(() => { load(); }, [load]);

  const saveFU = async () => {
    setSaving(true);
    await fetch(`${API}/followups/${fuModal.uid}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(fuModal),
    });
    setFuModal(null);
    setSaving(false);
    load();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-white" style={{ fontFamily: 'Poppins, sans-serif' }}>
            Follow-Up Tracking
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            {total.toLocaleString()} mothers — visit scheduling and completion tracking
          </p>
        </div>
        <button onClick={load} disabled={loading}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold"
          style={{ background: 'rgba(25,118,210,0.2)', border: '1px solid rgba(25,118,210,0.4)', color: '#42A5F5' }}>
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Status summary */}
      <div className="grid grid-cols-3 md:grid-cols-5 gap-2">
        {['Completed','Pending','Scheduled','Missed','Overdue'].map(s => {
          const st = STATUS_STYLES[s] || {};
          return (
            <button key={s} onClick={() => setFilterStatus(filterStatus === s ? '' : s)}
              className="rounded-xl p-3 text-center transition-all"
              style={{
                background: filterStatus === s ? st.bg : 'var(--ccmc-panel)',
                border: `1px solid ${filterStatus === s ? st.border : 'rgba(30,58,95,0.5)'}`,
              }}>
              <div className="text-lg font-bold" style={{ color: st.color }}>{statusCounts[s] || 0}</div>
              <div className="text-[9px] text-slate-500 font-semibold uppercase tracking-wider">{s}</div>
            </button>
          );
        })}
      </div>

      {/* Filters */}
      <div className="flex gap-2 flex-wrap">
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
          className="px-3 py-2 rounded-lg text-xs text-white outline-none"
          style={{ background: 'var(--ccmc-panel)', border: '1px solid rgba(30,58,95,0.7)' }}>
          <option value="">All Statuses</option>
          {['Completed','Pending','Scheduled','Missed','Overdue'].map(s => (
            <option key={s} value={s}>{s}</option>
          ))}
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
                <th>Mother Name</th><th>PHC</th><th>HRT</th><th>Phone</th>
                <th>Status</th><th>Last Visit</th><th>Next Visit</th>
                <th>Remarks</th><th>Escalation</th><th>Visits</th><th>Action</th>
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
                  No follow-up records found
                </td></tr>
              ) : records.slice(0, 300).map(r => {
                const st = STATUS_STYLES[r.followup_status] || {};
                return (
                  <tr key={r.uid}>
                    <td>
                      <div className="font-semibold text-white max-w-[140px] truncate">{r.mother_name || '—'}</div>
                      <div className="text-[10px]" style={{ color: r.risk_category === 'Critical' ? '#FCA5A5' : '#64748B' }}>
                        {r.risk_category}
                      </div>
                    </td>
                    <td className="text-slate-400 text-xs">{r.phc_display}</td>
                    <td>
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded"
                        style={{ background: 'rgba(66,165,245,0.15)', color: '#93C5FD' }}>{r.hrt_code}</span>
                    </td>
                    <td className="text-slate-400 text-xs">{r.cell_no || '—'}</td>
                    <td>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                        style={{ background: st.bg, color: st.color, border: `1px solid ${st.border}` }}>
                        {r.followup_status || 'Pending'}
                      </span>
                    </td>
                    <td className="text-[10px] text-slate-400">{r.last_visit_date || '—'}</td>
                    <td className="text-[10px] text-blue-300">{r.next_visit_date || '—'}</td>
                    <td>
                      <div className="text-[10px] text-slate-400 max-w-[120px] truncate">{r.remarks || '—'}</div>
                    </td>
                    <td>
                      {r.escalation_status ? (
                        <span className="text-[10px] font-bold text-red-400">{r.escalation_status}</span>
                      ) : <span className="text-[10px] text-slate-600">—</span>}
                    </td>
                    <td className="text-center">
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded"
                        style={{ background: 'rgba(167,139,250,0.1)', color: '#A78BFA' }}>
                        {r.followup_count}
                      </span>
                    </td>
                    <td>
                      <button
                        onClick={() => setFuModal({
                          uid:              r.uid,
                          mother_name:      r.mother_name,
                          status:           'Completed',
                          visit_date:       new Date().toISOString().slice(0,10),
                          remarks:          '',
                          escalation_status:'',
                          next_visit_date:  '',
                        })}
                        className="flex items-center gap-1 px-2 py-1 rounded text-[10px] font-semibold whitespace-nowrap"
                        style={{ background: 'rgba(167,139,250,0.1)', color: '#A78BFA', border: '1px solid rgba(167,139,250,0.2)' }}>
                        <CalendarCheck className="w-3 h-3" /> Update
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Follow-up modal */}
      {fuModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(2,6,23,0.9)', backdropFilter: 'blur(8px)' }}>
          <div className="w-full max-w-lg rounded-2xl p-6"
            style={{ background: 'var(--ccmc-panel)', border: '1px solid rgba(30,58,95,0.9)' }}>
            <div className="flex items-center justify-between mb-5">
              <div>
                <h3 className="text-sm font-bold text-white">Log Follow-Up Visit</h3>
                <p className="text-xs text-slate-400 mt-0.5">{fuModal.mother_name}</p>
              </div>
              <button onClick={() => setFuModal(null)}>
                <X className="w-4 h-4 text-slate-400" />
              </button>
            </div>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <label className="block">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Status *</span>
                  <select value={fuModal.status}
                    onChange={e => setFuModal(m => ({ ...m, status: e.target.value }))}
                    className="w-full mt-1 px-3 py-2 rounded-lg text-sm text-white outline-none"
                    style={{ background: 'var(--ccmc-surface)', border: '1px solid rgba(30,58,95,0.8)' }}>
                    {['Completed','Pending','Scheduled','Missed','Overdue'].map(s => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </label>
                <label className="block">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Visit Date</span>
                  <input type="date" value={fuModal.visit_date}
                    onChange={e => setFuModal(m => ({ ...m, visit_date: e.target.value }))}
                    className="w-full mt-1 px-3 py-2 rounded-lg text-sm text-white outline-none"
                    style={{ background: 'var(--ccmc-surface)', border: '1px solid rgba(30,58,95,0.8)', colorScheme: 'dark' }} />
                </label>
              </div>
              <label className="block">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Remarks</span>
                <textarea value={fuModal.remarks}
                  onChange={e => setFuModal(m => ({ ...m, remarks: e.target.value }))}
                  rows={2} placeholder="Visit notes…"
                  className="w-full mt-1 px-3 py-2 rounded-lg text-sm text-white outline-none resize-none"
                  style={{ background: 'var(--ccmc-surface)', border: '1px solid rgba(30,58,95,0.8)' }} />
              </label>
              <div className="grid grid-cols-2 gap-3">
                <label className="block">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Escalation Status</span>
                  <input value={fuModal.escalation_status}
                    onChange={e => setFuModal(m => ({ ...m, escalation_status: e.target.value }))}
                    placeholder="e.g., Referred to CHC"
                    className="w-full mt-1 px-3 py-2 rounded-lg text-sm text-white outline-none"
                    style={{ background: 'var(--ccmc-surface)', border: '1px solid rgba(30,58,95,0.8)' }} />
                </label>
                <label className="block">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Next Visit Date</span>
                  <input type="date" value={fuModal.next_visit_date}
                    onChange={e => setFuModal(m => ({ ...m, next_visit_date: e.target.value }))}
                    className="w-full mt-1 px-3 py-2 rounded-lg text-sm text-white outline-none"
                    style={{ background: 'var(--ccmc-surface)', border: '1px solid rgba(30,58,95,0.8)', colorScheme: 'dark' }} />
                </label>
              </div>
              <div className="flex gap-2 mt-4">
                <button onClick={() => setFuModal(null)}
                  className="flex-1 py-2.5 rounded-lg text-sm font-semibold text-slate-400"
                  style={{ background: 'rgba(30,41,59,0.8)', border: '1px solid rgba(30,58,95,0.5)' }}>
                  Cancel
                </button>
                <button onClick={saveFU} disabled={saving}
                  className="flex-1 py-2.5 rounded-lg text-sm font-bold text-white"
                  style={{ background: 'linear-gradient(135deg, #15803D, #16A34A)' }}>
                  {saving ? 'Saving…' : 'Save Follow-Up'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
