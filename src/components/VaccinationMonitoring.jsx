import React from 'react';
import { ShieldCheck, AlertTriangle, HelpCircle } from 'lucide-react';

export default function VaccinationMonitoring({ 
  stats = {},
  sightingMarkers = [],
  reportData = []
}) {
  const hasData = sightingMarkers.length > 0 && stats.vaccinatedCount > 0;
  const vacPercent = hasData ? stats.vaccinationCoverage : 0;
  const herdImmunityReached = vacPercent >= 70;

  return (
    <div className="space-y-6 select-none">
      {/* Title */}
      <div>
        <h2 className="text-xl font-extrabold text-primary uppercase tracking-wide">CCMC ANTI-RABIES VACCINATION (ARV) SURVEILLANCE</h2>
        <p className="text-xs text-slate-500 font-medium mt-1">Track Anti-Rabies Vaccination logs, monitor herd immunity thresholds, and schedule vaccination drives in high-risk zones.</p>
      </div>

      {!hasData ? (
        <div className="bg-slate-50 border border-border border-dashed rounded-lg p-16 text-center">
          <AlertTriangle className="w-10 h-10 text-danger mx-auto" />
          <h3 className="text-sm font-extrabold text-danger uppercase tracking-wide mt-3">Official vaccination data pending import.</h3>
          <p className="text-xs text-slate-500 font-medium px-10 mt-1 max-w-xl mx-auto leading-relaxed">
            No active ARV vaccination logs found in database. Ingest the vaccination camp register spreadsheets in the Data Import Center to calculate biological coverage gaps.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Target coverage card */}
          <div className="bg-white border border-border rounded-lg p-5 shadow-sm space-y-4">
            <h3 className="text-xs font-extrabold text-primary uppercase tracking-wide border-b border-border pb-2.5">Herd Immunity Summary</h3>
            
            <div className="text-center py-4">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Active ARV Coverage</span>
              <span className="text-3xl font-extrabold text-secondary tracking-tight mt-1.5 block">{vacPercent}%</span>
              
              <div className="mt-4 flex justify-center">
                <span className={`text-[9px] font-extrabold px-3 py-1 border rounded-full uppercase tracking-wider ${
                  herdImmunityReached ? 'bg-success-light/10 text-success-dark border-success-light/20' : 'bg-danger-light/10 text-danger-dark border-danger-light/20'
                }`}>
                  {herdImmunityReached ? 'HERD IMMUNITY REACHED' : 'IMMUNITY DEFICIT ALERT'}
                </span>
              </div>
            </div>

            <div className="border-t border-border pt-4 text-[10px] text-slate-500 font-semibold leading-relaxed">
              <p>WHO target of <span className="font-extrabold text-slate-800">70% vaccination coverage</span> is required to effectively break the transmission cycle of the rabies virus.</p>
            </div>
          </div>

          {/* Ward comparative tables */}
          <div className="lg:col-span-2 bg-white border border-border rounded-lg p-5 shadow-sm flex flex-col justify-between h-[350px]">
            <div>
              <h3 className="text-xs font-extrabold text-primary uppercase tracking-wide border-b border-border pb-2.5 mb-3">ARV Coverage Gaps by Wards</h3>
              
              <div className="overflow-y-auto max-h-[260px] divide-y divide-border pr-1">
                {reportData.map((w, index) => (
                  <div key={index} className="py-2.5 flex items-center justify-between text-xs font-semibold">
                    <div>
                      <span className="font-bold text-slate-800">{w.wardName}</span>
                      <span className="text-[9px] text-slate-400 mt-0.5 block">Sighted: {w.totalPopulation} &bull; Vaccinated: {w.vaccinatedCount}</span>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] font-bold text-secondary-dark block">{w.vaccinationCoverage}</span>
                      <span className={`text-[8px] font-bold block mt-0.5 ${w.herdImmunityReached === 'YES' ? 'text-success' : 'text-danger'}`}>
                        {w.herdImmunityReached === 'YES' ? 'PROTECTED' : 'DEFICIT'}
                      </span>
                    </div>
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
