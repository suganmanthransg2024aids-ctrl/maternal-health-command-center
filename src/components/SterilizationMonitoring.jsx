import React from 'react';
import { Activity, AlertTriangle, ShieldCheck, HelpCircle } from 'lucide-react';

export default function SterilizationMonitoring({ 
  stats = {},
  sightingMarkers = [],
  reportData = [] 
}) {
  const hasData = sightingMarkers.length > 0 && stats.sterilizedCount > 0;
  const sterPercent = hasData ? stats.sterilizationCoverage : 0;

  return (
    <div className="space-y-6 select-none">
      {/* Title */}
      <div>
        <h2 className="text-xl font-extrabold text-primary uppercase tracking-wide">CCMC ANIMAL BIRTH CONTROL (ABC) SURVEILLANCE</h2>
        <p className="text-xs text-slate-500 font-medium mt-1">Track sterilization surgery counts, monitor ear-notch verifications, and schedule ABC camps in high-density wards.</p>
      </div>

      {!hasData ? (
        <div className="bg-slate-50 border border-border border-dashed rounded-lg p-16 text-center">
          <AlertTriangle className="w-10 h-10 text-danger mx-auto" />
          <h3 className="text-sm font-extrabold text-danger uppercase tracking-wide mt-3">Official sterilization data pending import.</h3>
          <p className="text-xs text-slate-500 font-medium px-10 mt-1 max-w-xl mx-auto leading-relaxed">
            No active CCMC Animal Birth Control records found in database. Ingest the sterilization logs spreadsheet in the Data Import Center to calculate surgical coverage indices.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Target coverage cards */}
          <div className="bg-white border border-border rounded-lg p-5 shadow-sm space-y-4">
            <h3 className="text-xs font-extrabold text-primary uppercase tracking-wide border-b border-border pb-2.5">ABC Coverage Goals</h3>
            
            <div className="text-center py-4">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Overall East Zone Coverage</span>
              <span className="text-3xl font-extrabold text-success tracking-tight mt-1.5 block">{sterPercent}%</span>
              <span className="text-[9px] font-bold text-slate-500 mt-2 block leading-relaxed">Municipal Target: 80% coverage to suppress canine fertility rates.</span>
            </div>

            <div className="border-t border-border pt-4 space-y-2 text-[10px] text-slate-500 font-semibold leading-relaxed">
              <div className="flex justify-between">
                <span>Total Sterilized:</span>
                <span className="font-extrabold text-slate-800">{stats.sterilizedCount}</span>
              </div>
              <div className="flex justify-between">
                <span>Pending Target:</span>
                <span className="font-extrabold text-slate-800">{Math.max(0, Math.round(sightingMarkers.length * 0.80) - stats.sterilizedCount)}</span>
              </div>
            </div>
          </div>

          {/* Ward comparative tables */}
          <div className="lg:col-span-2 bg-white border border-border rounded-lg p-5 shadow-sm flex flex-col justify-between h-[350px]">
            <div>
              <h3 className="text-xs font-extrabold text-primary uppercase tracking-wide border-b border-border pb-2.5 mb-3">Surgical Coverage by Wards</h3>
              
              <div className="overflow-y-auto max-h-[260px] divide-y divide-border pr-1">
                {reportData.map((w, index) => (
                  <div key={index} className="py-2.5 flex items-center justify-between text-xs font-semibold">
                    <div>
                      <span className="font-bold text-slate-800">{w.wardName}</span>
                      <span className="text-[9px] text-slate-400 mt-0.5 block">Sighted: {w.totalPopulation} &bull; Sterilized: {w.sterilizedCount}</span>
                    </div>
                    <span className="text-[10px] font-extrabold text-success bg-success-light/5 px-2 py-0.5 border border-success-light/20 rounded">
                      {w.sterilizationCoverage}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
