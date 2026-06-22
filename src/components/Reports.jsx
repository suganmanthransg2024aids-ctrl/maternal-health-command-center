import React, { useEffect, useState } from 'react';
import { FileText, Download, Printer, RefreshCw, BarChart2 } from 'lucide-react';

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
            action: exportPatientsCSV, label: 'Download CSV',
          },
          {
            title: 'Due Soon Report',
            desc: 'Mothers with EDD within 7 days — for immediate follow-up',
            color: '#F97316', icon: Download,
            action: exportDueSoonCSV, label: 'Download Due Soon CSV',
          },
          {
            title: 'PHC Performance Report',
            desc: 'PHC-wise summary: total, risk distribution, deliveries, HRT coverage',
            color: '#22C55E', icon: BarChart2,
            action: exportPHCReport, label: 'Download PHC CSV',
          },
          {
            title: 'Data Quality Report',
            desc: 'All validation errors: missing data, invalid phones, duplicates',
            color: '#EAB308', icon: FileText,
            action: exportValidationCSV, label: 'Download Issues CSV',
          },
          {
            title: 'Print Dashboard',
            desc: 'Print the current summary report with statistics and PHC breakdown',
            color: '#A78BFA', icon: Printer,
            action: handlePrint, label: 'Print Report',
          },
        ].map(({ title, desc, color, icon: Icon, action, label }) => (
          <div key={title} className="rounded-xl p-5 flex items-start gap-4"
            style={{ background: 'var(--ccmc-panel)', border: `1px solid ${color}20` }}>
            <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: `${color}15` }}>
              <Icon className="w-5 h-5" style={{ color }} />
            </div>
            <div className="flex-1">
              <h3 className="text-sm font-bold text-white">{title}</h3>
              <p className="text-xs text-slate-400 mt-1 leading-relaxed">{desc}</p>
              <button onClick={action}
                className="mt-3 px-4 py-2 rounded-lg text-xs font-bold transition-all"
                style={{ background: `${color}15`, color, border: `1px solid ${color}30` }}
                onMouseEnter={e => e.currentTarget.style.background = `${color}25`}
                onMouseLeave={e => e.currentTarget.style.background = `${color}15`}>
                {label}
              </button>
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
