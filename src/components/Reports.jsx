import React, { useEffect, useState } from 'react';
import { FileText, Download, Printer, RefreshCw, BarChart2, Phone, AlertTriangle } from 'lucide-react';

const API = '/api';

export default function Reports({ user }) {
  const [stats,     setStats]     = useState(null);
  const [validation,setValidation]= useState(null);
  const [phcData,   setPHCData]   = useState([]);
  const [loading,   setLoading]   = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const [s, v, p] = await Promise.all([
        fetch(`${API}/stats?role=${user.role}`).then(r => r.json()),
        fetch(`${API}/validation`).then(r => r.json()),
        fetch(`${API}/phc-analytics?role=${user.role}`).then(r => r.json()),
      ]);
      setStats(s); setValidation(v); setPHCData(p);
    } catch {}
    setLoading(false);
  };

  useEffect(() => { load(); }, [user.role]);

  const exportCSV = (filename, rows, headers) => {
    const csv = [headers.join(','), ...rows.map(r => headers.map(h => `"${(r[h] ?? '').toString().replace(/"/g, '""')}"`).join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = filename; a.click();
    URL.revokeObjectURL(url);
  };

  const exportPHCReport = async () => {
    const headers = ['phc_display','hrt_code','hrt_name','total','critical','very_high','high','moderate','low','delivered','due_soon','no_phone','risk_pct'];
    exportCSV(`CCMC_PHC_Report_${new Date().toISOString().slice(0,10)}.csv`, phcData, headers);
  };

  const exportPatientsCSV = async () => {
    const r = await fetch(`${API}/patients?role=${user.role}&per_page=5000`).then(r => r.json());
    const headers = ['mother_name','phc_display','hrt_code','hrt_name','cell_no','rch_id','edd','days_to_edd','risk_category','risk_score','high_risk_raw','bp','hb','blood_group','gravida','last_visit_date','next_visit_date','birth_plan','referral','delivery_info'];
    exportCSV(`CCMC_Patients_${new Date().toISOString().slice(0,10)}.csv`, r.patients || [], headers);
  };

  const exportDueSoonCSV = async () => {
    const r = await fetch(`${API}/patients?role=${user.role}&per_page=2000`).then(r => r.json());
    const due = (r.patients || []).filter(p => p.days_to_edd !== null && p.days_to_edd >= 0 && p.days_to_edd <= 7);
    const headers = ['mother_name','phc_display','hrt_name','cell_no','rch_id','high_risk_raw','edd','days_to_edd','bp','hb'];
    exportCSV(`CCMC_DueSoon_${new Date().toISOString().slice(0,10)}.csv`, due, headers);
  };

  const exportValidationCSV = () => {
    if (!validation) return;
    const all = [
      ...(validation.missing_name_records || []).map(r => ({ ...r, issue: 'Missing Name' })),
      ...(validation.missing_phone_records || []).map(r => ({ ...r, issue: 'Missing Phone' })),
      ...(validation.invalid_phone_records || []).map(r => ({ ...r, issue: 'Invalid Phone' })),
      ...(validation.duplicate_phone_records || []).map(r => ({ ...r, issue: 'Duplicate Phone' })),
      ...(validation.duplicate_rch_records || []).map(r => ({ ...r, issue: 'Duplicate RCH ID' })),
    ];
    exportCSV(`CCMC_DataIssues_${new Date().toISOString().slice(0,10)}.csv`, all, ['issue','mother_name','phc_display','hrt_name','cell_no','rch_id']);
  };

  const handlePrint = () => window.print();

  /* ── HRT Call Performance ── */
  const exportHRTCallCSV = async () => {
    const r = await fetch(`${API}/hrt-call-performance?role=${user.role}`).then(r => r.json());
    const rows = (r.hrts || []).map(h => ({
      ...h,
      phcs: (h.phcs || []).join(' | '),
    }));
    const headers = ['hrt_code','hrt_name','phcs','total_mothers','calls_attempted','calls_connected',
      'no_response','switched_off','wrong_number','call_back_later','followup_required',
      'resolved','calls_pending','followups_due','deo_calls','last_call_date','last_call_time'];
    exportCSV(`CCMC_HRT_CallPerformance_${new Date().toISOString().slice(0,10)}.csv`, rows, headers);
  };

  const exportHRTCallPDF = async () => {
    const r = await fetch(`${API}/hrt-call-performance?role=${user.role}`).then(r => r.json());
    const hrts = r.hrts || [];
    const totals = key => hrts.reduce((s, h) => s + (h[key] || 0), 0);
    const rows = hrts.map(h => `
      <tr>
        <td><b style="color:#A78BFA">${h.hrt_code}</b></td>
        <td><b>${h.hrt_name}</b></td>
        <td style="font-size:9px;color:#666">${(h.phcs||[]).join(', ')}</td>
        <td class="num">${h.total_mothers}</td>
        <td class="num">${h.calls_attempted}</td>
        <td class="num g">${h.calls_connected}</td>
        <td class="num r">${h.no_response}</td>
        <td class="num">${h.switched_off}</td>
        <td class="num o">${h.wrong_number}</td>
        <td class="num">${h.call_back_later}</td>
        <td class="num p">${h.followup_required}</td>
        <td class="num">${h.resolved}</td>
        <td class="num dim">${h.calls_pending}</td>
        <td class="num teal"><b>${h.deo_calls ?? '—'}</b></td>
        <td style="font-size:9px">${h.last_call_date || '—'}</td>
      </tr>`).join('');
    const pw = window.open('', '_blank');
    pw.document.write(`<!DOCTYPE html><html><head><title>HRT Call Performance</title>
    <style>
      body{font-family:Arial,sans-serif;font-size:10px;padding:20px;color:#111}
      h2{font-size:14px;margin-bottom:4px;color:#1e3a5f}
      p{color:#666;font-size:9px;margin-bottom:12px}
      table{width:100%;border-collapse:collapse}
      th{background:#1e3a5f;color:#fff;padding:5px 6px;text-align:left;font-size:9px;white-space:nowrap}
      td{padding:4px 6px;border-bottom:1px solid #e5e7eb;vertical-align:top}
      tr:nth-child(even) td{background:#f8fafc}
      .num{text-align:right;font-weight:bold}
      .g{color:#16a34a}.r{color:#dc2626}.o{color:#ea580c}.p{color:#7c3aed}.dim{color:#94a3b8}.teal{color:#0891b2}
      tfoot td{background:#1e3a5f!important;color:#fff;font-weight:bold}
    </style></head><body>
    <h2>CCMC — HRT Call Tracking Performance Report</h2>
    <p>Generated: ${new Date().toLocaleString()} · Role: ${user.role} · Date: ${r.date || 'Today'}</p>
    <table>
      <thead><tr>
        <th>HRT</th><th>Name</th><th>PHCs</th><th>Assigned</th><th>Attempted</th>
        <th>Connected</th><th>No Resp</th><th>SW Off</th><th>Wrong No</th>
        <th>Call Back</th><th>Follow-Up</th><th>Resolved</th><th>Pending</th>
        <th>DEO Calls</th><th>Last Call</th>
      </tr></thead>
      <tbody>${rows}</tbody>
      <tfoot><tr>
        <td colspan="3">TOTAL</td>
        <td class="num">${totals('total_mothers')}</td>
        <td class="num">${totals('calls_attempted')}</td>
        <td class="num">${totals('calls_connected')}</td>
        <td class="num">${totals('no_response')}</td>
        <td class="num">${totals('switched_off')}</td>
        <td class="num">${totals('wrong_number')}</td>
        <td class="num">${totals('call_back_later')}</td>
        <td class="num">${totals('followup_required')}</td>
        <td class="num">${totals('resolved')}</td>
        <td class="num">${totals('calls_pending')}</td>
        <td class="num">${hrts.filter(h=>h.deo_calls!=null).reduce((s,h)=>s+(h.deo_calls||0),0)}</td>
        <td></td>
      </tr></tfoot>
    </table></body></html>`);
    pw.document.close(); pw.focus(); pw.print();
  };

  /* ── Risk Factors Patients Report ── */
  const exportRiskFactorsCSV = async () => {
    const r = await fetch(`${API}/patients?role=${user.role}&per_page=5000`).then(r => r.json());
    const riskPts = (r.patients || []).filter(p => p.high_risk_raw && p.high_risk_raw.trim());
    const headers = ['mother_name','phc_display','hrt_code','hrt_name','cell_no','rch_id',
      'edd','days_to_edd','risk_score','high_risk_raw','bp','hb','blood_group','gravida'];
    exportCSV(`CCMC_RiskFactors_${new Date().toISOString().slice(0,10)}.csv`, riskPts, headers);
  };

  const exportRiskFactorsPDF = async () => {
    const r = await fetch(`${API}/patients?role=${user.role}&per_page=5000`).then(r => r.json());
    const riskPts = (r.patients || []).filter(p => p.high_risk_raw && p.high_risk_raw.trim());
    const rows = riskPts.map((p, i) => {
      const factors = (p.high_risk_raw || '').split(',').map(f => f.trim()).filter(Boolean);
      const badges  = factors.map(f => `<span class="badge">${f}</span>`).join('');
      return `<tr>
        <td class="num dim">${i+1}</td>
        <td><b>${p.mother_name || '—'}</b></td>
        <td style="font-size:9px;color:#555">${p.phc_display || ''}</td>
        <td style="font-size:9px">${p.hrt_code} · ${p.hrt_name}</td>
        <td>${p.cell_no || '—'}</td>
        <td style="font-size:9px;color:#555">${p.rch_id || '—'}</td>
        <td style="font-size:9px">${p.edd || '—'}</td>
        <td class="num" style="color:${(p.days_to_edd??99)<0?'#dc2626':(p.days_to_edd??99)<=7?'#ea580c':'#111'}">${p.days_to_edd??'—'}</td>
        <td class="num"><b>${p.risk_score || '—'}</b></td>
        <td style="font-size:8px">${badges}</td>
      </tr>`;
    }).join('');
    const pw = window.open('', '_blank');
    pw.document.write(`<!DOCTYPE html><html><head><title>Risk Factors Report</title>
    <style>
      body{font-family:Arial,sans-serif;font-size:10px;padding:20px;color:#111}
      h2{font-size:14px;margin-bottom:4px;color:#1e3a5f}
      p{color:#666;font-size:9px;margin-bottom:12px}
      table{width:100%;border-collapse:collapse}
      th{background:#1e3a5f;color:#fff;padding:5px 6px;text-align:left;font-size:9px;white-space:nowrap}
      td{padding:4px 6px;border-bottom:1px solid #e5e7eb;vertical-align:top}
      tr:nth-child(even) td{background:#f8fafc}
      .num{text-align:right}.dim{color:#94a3b8}
      .badge{display:inline-block;background:#fef9c3;color:#713f12;border:1px solid #fde047;
             border-radius:3px;padding:1px 5px;margin:1px 2px;font-size:8px;white-space:nowrap}
    </style></head><body>
    <h2>CCMC — High Risk Factors Patient Report</h2>
    <p>Generated: ${new Date().toLocaleString()} · Role: ${user.role} · ${riskPts.length} mothers with risk factors</p>
    <table>
      <thead><tr>
        <th>#</th><th>Mother Name</th><th>PHC</th><th>HRT</th><th>Phone</th>
        <th>RCH ID</th><th>EDD</th><th>Days</th><th>Score</th><th>Risk Factors</th>
      </tr></thead>
      <tbody>${rows}</tbody>
    </table></body></html>`);
    pw.document.close(); pw.focus(); pw.print();
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-white" style={{ fontFamily: 'Poppins, sans-serif' }}>
            Reports & Exports
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Generate and download CCMC maternal health reports
          </p>
        </div>
        <button onClick={load} disabled={loading}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold"
          style={{ background: 'rgba(25,118,210,0.2)', border: '1px solid rgba(25,118,210,0.4)', color: '#42A5F5' }}>
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Export actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {[
          {
            title: 'All Patients Export',
            desc: 'Complete patient roster with clinical data, risk scores, and assignments',
            color: '#42A5F5', icon: Download,
            actions: [{ label: 'Download CSV', fn: exportPatientsCSV }],
          },
          {
            title: 'Due Soon Report',
            desc: 'Mothers with EDD within 7 days — for immediate follow-up',
            color: '#F97316', icon: Download,
            actions: [{ label: 'Download CSV', fn: exportDueSoonCSV }],
          },
          {
            title: 'HRT Call Performance Report',
            desc: 'Per-HRT call statistics: connected, no-response, pending, DEO records — today\'s date',
            color: '#A78BFA', icon: Phone,
            actions: [
              { label: 'Download CSV', fn: exportHRTCallCSV },
              { label: 'Print / PDF',  fn: exportHRTCallPDF },
            ],
          },
          {
            title: 'Risk Factors Patient Report',
            desc: 'All mothers with active risk factors — factor-wise detail with clinical parameters',
            color: '#EF4444', icon: AlertTriangle,
            actions: [
              { label: 'Download CSV', fn: exportRiskFactorsCSV },
              { label: 'Print / PDF',  fn: exportRiskFactorsPDF },
            ],
          },
          {
            title: 'PHC Performance Report',
            desc: 'PHC-wise summary: total, deliveries, due soon, HRT coverage, risk %',
            color: '#22C55E', icon: BarChart2,
            actions: [{ label: 'Download CSV', fn: exportPHCReport }],
          },
          {
            title: 'Data Quality Report',
            desc: 'All validation errors: missing data, invalid phones, duplicates',
            color: '#EAB308', icon: FileText,
            actions: [{ label: 'Download Issues CSV', fn: exportValidationCSV }],
          },
          {
            title: 'Print Dashboard',
            desc: 'Print the current summary report with statistics and PHC breakdown',
            color: '#60A5FA', icon: Printer,
            actions: [{ label: 'Print Report', fn: handlePrint }],
          },
        ].map(({ title, desc, color, icon: Icon, actions }) => (
          <div key={title} className="rounded-xl p-5 flex items-start gap-4"
            style={{ background: 'var(--ccmc-panel)', border: `1px solid ${color}20` }}>
            <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: `${color}15` }}>
              <Icon className="w-5 h-5" style={{ color }} />
            </div>
            <div className="flex-1">
              <h3 className="text-sm font-bold text-white">{title}</h3>
              <p className="text-xs text-slate-400 mt-1 leading-relaxed">{desc}</p>
              <div className="flex gap-2 mt-3 flex-wrap">
                {actions.map(({ label, fn }) => (
                  <button key={label} onClick={fn}
                    className="px-4 py-2 rounded-lg text-xs font-bold transition-all"
                    style={{ background: `${color}15`, color, border: `1px solid ${color}30` }}
                    onMouseEnter={e => e.currentTarget.style.background = `${color}25`}
                    onMouseLeave={e => e.currentTarget.style.background = `${color}15`}>
                    {label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Summary report — print-friendly */}
      {stats && (
        <div className="rounded-xl p-6 space-y-4 print-full"
          style={{ background: 'var(--ccmc-panel)', border: '1px solid rgba(30,58,95,0.7)' }}>
          <div className="print-page-break">
            <h2 className="text-sm font-bold text-white mb-1">
              CCMC Maternal Health Summary Report
            </h2>
            <p className="text-xs text-slate-400">
              Generated: {new Date().toLocaleString()} · User: {user.name} ({user.role})
            </p>
          </div>

          {/* Stats grid */}
          <div className="grid grid-cols-3 md:grid-cols-4 gap-3">
            {[
              { label: 'Total Mothers',   value: stats.total_mothers,  color: '#42A5F5' },
              { label: 'Due ≤7 Days',     value: stats.due_7_days,      color: '#A78BFA' },
              { label: 'Delivered',       value: stats.delivered,       color: '#22C55E' },
              { label: 'Overdue EDD',     value: stats.overdue_edd,     color: '#EF4444' },
              { label: 'High Risk Mothers', value: stats.high_risk,     color: '#F97316' },
              { label: 'Missing Phone',   value: stats.missing_phone,   color: '#EAB308' },
              { label: 'Due ≤30 Days',    value: stats.due_30_days,     color: '#60A5FA' },
              { label: 'Missing Name',    value: stats.missing_name,    color: '#EAB308' },
            ].map(({ label, value, color }) => (
              <div key={label} className="rounded-xl p-3 text-center"
                style={{ background: 'var(--ccmc-surface)', border: `1px solid ${color}15` }}>
                <div className="text-lg font-bold" style={{ color }}>{value?.toLocaleString() ?? '—'}</div>
                <div className="text-[9px] text-slate-500 font-semibold uppercase tracking-wider mt-0.5">{label}</div>
              </div>
            ))}
          </div>


          {/* Validation summary */}
          {validation && (
            <div>
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Data Quality</h3>
              <div className="flex gap-4 flex-wrap text-xs">
                <span>Quality Score: <b style={{ color: '#22C55E' }}>{validation.quality_score}%</b></span>
                <span>Missing Names: <b style={{ color: '#EF4444' }}>{validation.missing_name}</b></span>
                <span>Missing Phone: <b style={{ color: '#EF4444' }}>{validation.missing_phone}</b></span>
                <span>Invalid Phone: <b style={{ color: '#F97316' }}>{validation.invalid_phone}</b></span>
                <span>Duplicate Phone: <b style={{ color: '#EAB308' }}>{validation.duplicate_phone}</b></span>
              </div>
            </div>
          )}

          {/* PHC table in report */}
          {phcData.length > 0 && (
            <div>
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">PHC Breakdown</h3>
              <div className="overflow-x-auto">
                <table className="data-table text-[11px]">
                  <thead>
                    <tr>
                      <th>PHC</th><th>HRT</th><th>Total</th>
                      <th>Delivered</th><th>Due Soon</th><th>Risk%</th>
                    </tr>
                  </thead>
                  <tbody>
                    {phcData.slice(0, 30).map(p => (
                      <tr key={p.phc_key}>
                        <td>{p.phc_display}</td>
                        <td>{p.hrt_code} · {p.hrt_name}</td>
                        <td className="text-right font-bold">{p.total}</td>
                        <td className="text-right" style={{ color: '#86EFAC' }}>{p.delivered}</td>
                        <td className="text-right" style={{ color: '#A78BFA' }}>{p.due_soon}</td>
                        <td className="text-right">{p.risk_pct}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
