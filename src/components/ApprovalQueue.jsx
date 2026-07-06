import React, { useEffect, useState, useCallback } from 'react';
import { CheckCircle2, XCircle, Clock, RefreshCw, Users, Phone, CheckCheck, AlertTriangle } from 'lucide-react';
import { useTheme } from '../ThemeContext';

const API = '/api';

const HRT_COLORS = {
  HRT1: '#F472B6', HRT2: '#A78BFA', HRT3: '#60A5FA',
  HRT4: '#FBBF24', HRT5: '#34D399', HRT6: '#F87171',
  HRT7: '#C084FC', HRT8: '#FB923C',
};

const STATUS_COLORS = {
  Active: '#22C55E', Delivered: '#3B9FFF', Referred: '#F97316',
  Transferred: '#A78BFA', Deceased: '#EF4444',
};

function HRTBadge({ role }) {
  const color = HRT_COLORS[role] || '#94A3B8';
  return (
    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold"
      style={{ background: `${color}18`, color, border: `1px solid ${color}40` }}>
      {role}
    </span>
  );
}

function StatusBadge({ status }) {
  const color = STATUS_COLORS[status] || '#94A3B8';
  return (
    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold"
      style={{ background: `${color}18`, color, border: `1px solid ${color}40` }}>
      {status}
    </span>
  );
}

export default function ApprovalQueue({ user }) {
  const { theme } = useTheme();
  const bright = theme === 'bright';

  const [data,     setData]     = useState({ pending: [], recent: [] });
  const [summary,  setSummary]  = useState(null);
  const [loading,  setLoading]  = useState(true);
  const [activeTab, setActiveTab] = useState('pending');
  const [rejectId, setRejectId] = useState(null);
  const [rejectReason, setRejectReason] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [a, s] = await Promise.all([
        fetch(`${API}/approvals`).then(r => r.json()),
        fetch(`${API}/daily-summary`).then(r => r.json()),
      ]);
      setData(a);
      setSummary(s);
    } catch { /* silent */ } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const approve = async (id) => {
    await fetch(`${API}/approvals/${id}/approve`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ approved_by: user.role }),
    });
    load();
  };

  const reject = async (id) => {
    await fetch(`${API}/approvals/${id}/reject`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rejected_by: user.role, reason: rejectReason }),
    });
    setRejectId(null);
    setRejectReason('');
    load();
  };

  const panel  = bright ? '#FFFFFF' : 'var(--ccmc-panel)';
  const border = bright ? '1px solid #E2E8F0' : '1px solid rgba(30,58,95,0.7)';
  const text   = bright ? '#1E293B' : '#E2E8F0';
  const sub    = bright ? '#64748B' : '#94A3B8';
  const bg     = bright ? '#F8FAFC' : 'rgba(30,58,95,0.25)';
  const divider = bright ? '#F1F5F9' : 'rgba(30,58,95,0.5)';

  const today = new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' });

  return (
    <div className="space-y-5 max-w-5xl mx-auto">

      {/* Header */}
      <div className="rounded-2xl p-5" style={{ background: panel, border }}>
        <div className="flex items-start justify-between mb-4">
          <div>
            <h1 className="text-lg font-bold" style={{ color: text, fontFamily: 'Poppins,sans-serif' }}>
              Approval Queue
            </h1>
            <p className="text-xs mt-0.5" style={{ color: sub }}>{today} · {user.name}</p>
          </div>
          <button onClick={load} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold"
            style={{ background: bg, border, color: sub }}>
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>

        {/* Summary cards */}
        {summary && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: 'Pending Approval', value: data.pending.length, color: '#F97316', icon: Clock },
              { label: 'Total Calls Today', value: Object.values(summary.by_hrt || {}).reduce((s, h) => s + (h.total || 0), 0), color: '#3B9FFF', icon: Phone },
              { label: 'Contacted', value: Object.values(summary.by_hrt || {}).reduce((s, h) => s + (h.contacted || 0), 0), color: '#22C55E', icon: CheckCircle2 },
              { label: 'Unreachable', value: Object.values(summary.by_hrt || {}).reduce((s, h) => s + (h.unreachable || 0), 0), color: '#EF4444', icon: XCircle },
            ].map(c => {
              const Icon = c.icon;
              return (
                <div key={c.label} className="rounded-xl p-3" style={{ background: `${c.color}0D`, border: `1px solid ${c.color}25` }}>
                  <div className="flex items-center gap-2 mb-1">
                    <Icon className="w-3.5 h-3.5" style={{ color: c.color }} />
                    <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: c.color }}>{c.label}</span>
                  </div>
                  <div className="text-2xl font-bold" style={{ color: c.color, fontFamily: 'Poppins,sans-serif' }}>{c.value}</div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* HRT Activity Grid */}
      {summary && Object.keys(summary.by_hrt || {}).length > 0 && (
        <div className="rounded-2xl p-5" style={{ background: panel, border }}>
          <div className="text-[11px] font-bold uppercase tracking-wider mb-4 flex items-center gap-2" style={{ color: sub }}>
            <Users className="w-3.5 h-3.5" /> Today's Activity by HRT
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {Object.entries(summary.by_hrt).map(([hrt, s]) => {
              const color = HRT_COLORS[hrt] || '#94A3B8';
              return (
                <div key={hrt} className="rounded-xl p-3" style={{ background: bg, border }}>
                  <HRTBadge role={hrt} />
                  <div className="mt-2 space-y-1">
                    <div className="flex justify-between text-[10px]">
                      <span style={{ color: sub }}>Total</span>
                      <span className="font-bold" style={{ color }}>{s.total}</span>
                    </div>
                    {s.contacted > 0 && (
                      <div className="flex justify-between text-[10px]">
                        <span style={{ color: sub }}>Contacted</span>
                        <span className="font-bold" style={{ color: '#22C55E' }}>{s.contacted}</span>
                      </div>
                    )}
                    {s.unreachable > 0 && (
                      <div className="flex justify-between text-[10px]">
                        <span style={{ color: sub }}>Unreachable</span>
                        <span className="font-bold" style={{ color: '#EF4444' }}>{s.unreachable}</span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 p-1 rounded-xl" style={{ background: panel, border }}>
        {[
          { id: 'pending', label: `Pending (${data.pending.length})`, alert: data.pending.length > 0 },
          { id: 'history', label: `History (${data.recent.length})` },
        ].map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)}
            className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-bold transition-all"
            style={{
              background: activeTab === tab.id ? '#3B9FFF' : 'transparent',
              color: activeTab === tab.id ? '#fff' : sub,
            }}>
            {tab.alert && activeTab !== tab.id && (
              <span className="w-1.5 h-1.5 rounded-full bg-orange-400" />
            )}
            {tab.label}
          </button>
        ))}
      </div>

      {/* Pending tab */}
      {activeTab === 'pending' && (
        <div className="rounded-2xl overflow-hidden" style={{ background: panel, border }}>
          {data.pending.length === 0 ? (
            <div className="py-12 text-center">
              <CheckCheck className="w-10 h-10 mx-auto mb-3" style={{ color: '#22C55E' }} />
              <p className="text-sm font-semibold" style={{ color: text }}>No pending approvals</p>
              <p className="text-xs mt-1" style={{ color: sub }}>All status changes have been reviewed</p>
            </div>
          ) : (
            <div className="divide-y" style={{ borderColor: divider }}>
              {data.pending.map(item => (
                <div key={item.id} className="px-4 py-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-bold" style={{ color: text }}>{item.mother_name || item.mother_id}</span>
                        <HRTBadge role={item.hrt_user} />
                      </div>
                      <div className="text-[10px] mt-0.5" style={{ color: sub }}>
                        {item.phc} · Submitted {item.submitted_at?.slice(11, 16)}
                      </div>
                      <div className="flex items-center gap-2 mt-2">
                        <span className="text-[10px]" style={{ color: sub }}>Requesting:</span>
                        <StatusBadge status={item.new_status} />
                      </div>
                      {item.notes && (
                        <div className="text-[10px] mt-1.5 italic" style={{ color: sub }}>"{item.notes}"</div>
                      )}
                    </div>
                    <div className="flex flex-col gap-1.5 flex-shrink-0">
                      <button onClick={() => approve(item.id)}
                        className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-[11px] font-bold"
                        style={{ background: '#22C55E20', border: '1px solid #22C55E50', color: '#22C55E' }}>
                        <CheckCircle2 className="w-3 h-3" /> Approve
                      </button>
                      {rejectId === item.id ? (
                        <div className="flex flex-col gap-1">
                          <input value={rejectReason} onChange={e => setRejectReason(e.target.value)}
                            placeholder="Reason (optional)"
                            className="px-2 py-1 rounded-lg text-[10px] outline-none w-32"
                            style={{ background: bg, border, color: text }} />
                          <div className="flex gap-1">
                            <button onClick={() => reject(item.id)}
                              className="flex-1 py-1 rounded-lg text-[10px] font-bold"
                              style={{ background: '#EF444420', border: '1px solid #EF444450', color: '#EF4444' }}>
                              Confirm
                            </button>
                            <button onClick={() => setRejectId(null)}
                              className="flex-1 py-1 rounded-lg text-[10px] font-bold"
                              style={{ background: bg, border, color: sub }}>
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <button onClick={() => setRejectId(item.id)}
                          className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-[11px] font-bold"
                          style={{ background: '#EF444420', border: '1px solid #EF444450', color: '#EF4444' }}>
                          <XCircle className="w-3 h-3" /> Reject
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* History tab */}
      {activeTab === 'history' && (
        <div className="rounded-2xl overflow-hidden" style={{ background: panel, border }}>
          {data.recent.length === 0 ? (
            <div className="py-10 text-center text-xs" style={{ color: sub }}>No history yet</div>
          ) : (
            <div className="divide-y" style={{ borderColor: divider }}>
              <div className="grid grid-cols-[1fr_auto_auto_auto] gap-3 px-4 py-2.5 text-[9px] font-bold uppercase tracking-wider" style={{ color: sub }}>
                <span>Mother</span>
                <span>Status</span>
                <span>Result</span>
                <span>By</span>
              </div>
              {data.recent.map(item => (
                <div key={item.id} className="grid grid-cols-[1fr_auto_auto_auto] gap-3 px-4 py-3 items-center">
                  <div>
                    <div className="text-xs font-semibold" style={{ color: text }}>{item.mother_name || item.mother_id}</div>
                    <div className="text-[10px]" style={{ color: sub }}>{item.hrt_user} · {item.submitted_at?.slice(0, 10)}</div>
                    {item.rejection_reason && (
                      <div className="text-[10px] mt-0.5 italic" style={{ color: '#EF4444' }}>Reason: {item.rejection_reason}</div>
                    )}
                  </div>
                  <StatusBadge status={item.new_status} />
                  <span className="text-[11px] font-bold" style={{ color: item.is_approved === 1 ? '#22C55E' : '#EF4444' }}>
                    {item.is_approved === 1 ? 'Approved' : 'Rejected'}
                  </span>
                  <span className="text-[10px]" style={{ color: sub }}>{item.approved_by}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
