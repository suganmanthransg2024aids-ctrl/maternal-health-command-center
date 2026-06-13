import React, { useState, useEffect } from 'react';
import { FileText, Printer, FileSpreadsheet, Download, AlertTriangle, RefreshCw } from 'lucide-react';

export default function ReportsExports({ 
  fetchSummaryReport, 
  onExportCSV,
  dbConnected = false 
}) {
  const [reportType, setReportType] = useState('WARD');
  const [reportData, setReportData] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  const loadReport = async () => {
    setIsLoading(true);
    try {
      const result = await fetchSummaryReport(reportType);
      setReportData(result.data || []);
    } catch (err) {
      console.warn('Reports: Load failed.', err.message);
      setReportData([]);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    loadReport();
  }, [reportType]);

  const triggerPrint = () => {
    window.print();
  };

  const hasData = reportData.length > 0 && reportData.some(r => r.totalPopulation > 0 || r.biteIncidents > 0);

  return (
    <div className="space-y-6 select-none">
      {/* Title */}
      <div className="flex items-center justify-between print:hidden">
        <div>
          <h2 className="text-xl font-extrabold text-primary uppercase tracking-wide">CCMC REPORT COMPILER & EXPORT</h2>
          <p className="text-xs text-slate-500 font-medium mt-1">Compile comprehensive ward reports, vaccination summaries, and sterilization metrics. Print physical PDFs or export CSV templates.</p>
        </div>

        <div className="flex gap-2">
          {/* Print PDF Trigger */}
          <button
            disabled={!hasData}
            onClick={triggerPrint}
            className="flex items-center gap-1.5 px-3 py-1.5 border border-border hover:bg-slate-100 text-slate-700 text-xs font-bold rounded shadow transition-colors disabled:bg-slate-100 disabled:text-slate-400 uppercase tracking-wide"
          >
            <Printer className="w-4 h-4" />
            <span>Export PDF / Print</span>
          </button>

          {/* CSV Export Trigger */}
          <button
            disabled={!hasData}
            onClick={() => onExportCSV(reportType)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-success hover:bg-success-dark text-white text-xs font-bold rounded shadow transition-colors disabled:bg-slate-200 disabled:text-slate-400 uppercase tracking-wide"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Download CSV</span>
          </button>
        </div>
      </div>

      {/* Query Selector Bar */}
      <div className="bg-white border border-border rounded-lg p-4 shadow-sm flex items-center justify-between gap-4 print:hidden">
        <div className="flex items-center gap-4 flex-1">
          <label htmlFor="reportType" className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Report Configuration:</label>
          <select
            id="reportType"
            value={reportType}
            onChange={(e) => setReportType(e.target.value)}
            className="bg-slate-50 border border-border rounded px-3 py-1.5 text-xs font-bold text-slate-800 focus:outline-none focus:ring-1 focus:ring-secondary focus:bg-white"
          >
            <option value="WARD">Complete Ward Performance Summary</option>
            <option value="STERILIZATION">Sterilization Coverage & Pending Targets</option>
            <option value="VACCINATION">Vaccination Coverage & Camps Advisory</option>
          </select>
        </div>

        <button 
          onClick={loadReport}
          disabled={isLoading}
          className="p-2 border border-border hover:bg-slate-50 rounded text-slate-600 transition-colors shrink-0"
        >
          <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Physical printable page layout */}
      <div className="bg-white border border-border rounded-lg p-8 shadow-md print:border-none print:shadow-none print:p-0 print-full">
        {/* Printable Header */}
        <div className="text-center border-b-2 border-primary pb-4 mb-6">
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none">Official Planning Document</div>
          <h1 className="text-base font-extrabold text-primary uppercase tracking-wide mt-1.5">Coimbatore City Municipal Corporation (CCMC)</h1>
          <h2 className="text-xs font-bold text-slate-800 tracking-wide mt-1 uppercase">CanisIntel East Zone Biological Analytics Report</h2>
          <span className="text-[9px] text-slate-500 block mt-1 font-medium">Report Compiled: {new Date().toLocaleString()} &bull; Scope: Central Veterinary Dept</span>
        </div>

        {/* Report Content Grid */}
        {isLoading ? (
          <div className="text-center py-20">
            <RefreshCw className="w-8 h-8 text-secondary animate-spin mx-auto" />
            <span className="text-xs font-bold text-slate-500 block mt-2.5">Aggregating database statistics...</span>
          </div>
        ) : !hasData ? (
          <div className="text-center py-20 bg-slate-50 border border-border border-dashed rounded-lg">
            <AlertTriangle className="w-8 h-8 text-danger mx-auto" />
            <span className="text-xs font-extrabold text-danger block mt-3 uppercase tracking-wide">
              OFFICIAL DATA NOT FOUND – AWAITING IMPORT
            </span>
            <p className="text-[10px] text-slate-500 font-semibold px-10 mt-1 px-4 leading-relaxed">
              No clinical ARV/ABC or hospital dog-bite incidents found. Access the Data Import Center to load official datasets.
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Table */}
            <div className="overflow-x-auto border border-border rounded">
              <table className="w-full text-left text-xs font-medium text-slate-600">
                <thead>
                  <tr className="bg-slate-50 border-b border-border">
                    <th className="px-4 py-2.5 font-extrabold text-slate-500 uppercase tracking-wider text-[9px]">Ward Number</th>
                    <th className="px-4 py-2.5 font-extrabold text-slate-500 uppercase tracking-wider text-[9px]">Ward Name</th>
                    
                    {reportType === 'STERILIZATION' ? (
                      <>
                        <th className="px-4 py-2.5 font-extrabold text-slate-500 uppercase tracking-wider text-[9px] text-center">Dog Population</th>
                        <th className="px-4 py-2.5 font-extrabold text-slate-500 uppercase tracking-wider text-[9px] text-center">Sterilized Count</th>
                        <th className="px-4 py-2.5 font-extrabold text-slate-500 uppercase tracking-wider text-[9px] text-center">ABC Coverage %</th>
                        <th className="px-4 py-2.5 font-extrabold text-slate-500 uppercase tracking-wider text-[9px] text-center">Pending Targets</th>
                        <th className="px-4 py-2.5 font-extrabold text-slate-500 uppercase tracking-wider text-[9px] text-right">Status</th>
                      </>
                    ) : reportType === 'VACCINATION' ? (
                      <>
                        <th className="px-4 py-2.5 font-extrabold text-slate-500 uppercase tracking-wider text-[9px] text-center">Dog Population</th>
                        <th className="px-4 py-2.5 font-extrabold text-slate-500 uppercase tracking-wider text-[9px] text-center">Vaccinated Count</th>
                        <th className="px-4 py-2.5 font-extrabold text-slate-500 uppercase tracking-wider text-[9px] text-center">ARV Coverage %</th>
                        <th className="px-4 py-2.5 font-extrabold text-slate-500 uppercase tracking-wider text-[9px] text-center">Herd Immunity (70%)</th>
                        <th className="px-4 py-2.5 font-extrabold text-slate-500 uppercase tracking-wider text-[9px] text-right">Camps Advisory</th>
                      </>
                    ) : (
                      <>
                        <th className="px-4 py-2.5 font-extrabold text-slate-500 uppercase tracking-wider text-[9px] text-center">Dog Population</th>
                        <th className="px-4 py-2.5 font-extrabold text-slate-500 uppercase tracking-wider text-[9px] text-center">Sterilized</th>
                        <th className="px-4 py-2.5 font-extrabold text-slate-500 uppercase tracking-wider text-[9px] text-center">Vaccinated</th>
                        <th className="px-4 py-2.5 font-extrabold text-slate-500 uppercase tracking-wider text-[9px] text-center">Bite Incidents</th>
                      </>
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {reportData.map((row, index) => (
                    <tr key={index} className="hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-3 font-bold text-slate-800">Ward {row.wardNumber}</td>
                      <td className="px-4 py-3 font-semibold text-slate-700">{row.wardName}</td>
                      
                      {reportType === 'STERILIZATION' ? (
                        <>
                          <td className="px-4 py-3 text-center">{row.totalPopulation}</td>
                          <td className="px-4 py-3 text-center font-bold text-slate-800">{row.sterilizedCount}</td>
                          <td className="px-4 py-3 text-center font-bold text-success-dark">{row.sterilizationCoverage}</td>
                          <td className="px-4 py-3 text-center">{row.pendingTargets}</td>
                          <td className="px-4 py-3 text-right">
                            <span className={`text-[8px] font-extrabold px-2 py-0.5 rounded border uppercase ${
                              row.status === 'COMPLETE' ? 'bg-success-light/10 text-success-dark border-success-light/20' :
                              row.status === 'MODERATE' ? 'bg-warning-light/10 text-warning-dark border-warning-light/20' :
                              'bg-danger-light/10 text-danger-dark border-danger-light/20'
                            }`}>
                              {row.status}
                            </span>
                          </td>
                        </>
                      ) : reportType === 'VACCINATION' ? (
                        <>
                          <td className="px-4 py-3 text-center">{row.totalPopulation}</td>
                          <td className="px-4 py-3 text-center font-bold text-slate-800">{row.vaccinatedCount}</td>
                          <td className="px-4 py-3 text-center font-bold text-secondary-dark">{row.vaccinationCoverage}</td>
                          <td className="px-4 py-3 text-center font-bold text-slate-700">{row.herdImmunityReached}</td>
                          <td className="px-4 py-3 text-right font-bold text-secondary-dark">{row.campsRecommended}</td>
                        </>
                      ) : (
                        <>
                          <td className="px-4 py-3 text-center font-bold text-slate-800">{row.totalPopulation}</td>
                          <td className="px-4 py-3 text-center">{row.sterilizedCount} ({row.sterilizationCoverage})</td>
                          <td className="px-4 py-3 text-center">{row.vaccinatedCount} ({row.vaccinationCoverage})</td>
                          <td className="px-4 py-3 text-center font-bold text-danger">{row.biteIncidents}</td>
                        </>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Print Signoffs */}
            <div className="grid grid-cols-2 gap-8 border-t border-border pt-12 mt-12 text-center text-xs font-semibold text-slate-600 select-none">
              <div>
                <div className="w-40 border-b border-slate-400 mx-auto h-8"></div>
                <span className="block mt-2">Veterinary Medical Officer</span>
                <span className="text-[9px] text-slate-400 font-medium block">Coimbatore Municipal Corporation</span>
              </div>
              <div>
                <div className="w-40 border-b border-slate-400 mx-auto h-8"></div>
                <span className="block mt-2">Public Health Commissioner</span>
                <span className="text-[9px] text-slate-400 font-medium block">CCMC East Zone Head Office</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
