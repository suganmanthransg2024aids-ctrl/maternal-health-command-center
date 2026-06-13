import React from 'react';
import { AlertTriangle, ShieldCheck, Activity, Users } from 'lucide-react';

export default function DogBiteAnalytics({ 
  stats = {},
  biteMarkers = [] 
}) {
  const hasData = biteMarkers.length > 0;
  
  // Calculate severity indices
  const grade1 = biteMarkers.filter(b => b.bite_severity === 'GRADE_I').length;
  const grade2 = biteMarkers.filter(b => b.bite_severity === 'GRADE_II').length;
  const grade3 = biteMarkers.filter(b => b.bite_severity === 'GRADE_III').length;

  return (
    <div className="space-y-6 select-none">
      {/* Title */}
      <div>
        <h2 className="text-xl font-extrabold text-primary uppercase tracking-wide">CCMC DOG BITE SURVEILLANCE & EPIDEMIOLOGY</h2>
        <p className="text-xs text-slate-500 font-medium mt-1">Track clinical dog bite reports Sourced from Coimbatore Government Hospitals and monitor WHO Category classifications.</p>
      </div>

      {!hasData ? (
        <div className="bg-slate-50 border border-border border-dashed rounded-lg p-16 text-center">
          <AlertTriangle className="w-10 h-10 text-danger mx-auto" />
          <h3 className="text-sm font-extrabold text-danger uppercase tracking-wide mt-3">DATA NOT AVAILABLE – AWAITING CCMC IMPORT</h3>
          <p className="text-xs text-slate-500 font-medium px-10 mt-1 max-w-xl mx-auto leading-relaxed">
            Dog bite surveillance registers empty. Ingest hospital log records in the Data Import Center to calculate incident trends and hot-spots.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* WHO Severity Classification cards */}
          <div className="bg-white border border-border rounded-lg p-5 shadow-sm space-y-4">
            <h3 className="text-xs font-extrabold text-primary uppercase tracking-wide border-b border-border pb-2.5">WHO Severity Analysis</h3>
            
            <div className="space-y-3.5">
              <div>
                <div className="flex justify-between text-xs font-bold text-slate-700 mb-1">
                  <span>Grade I (Muted/No Lesion)</span>
                  <span className="font-extrabold">{grade1}</span>
                </div>
                <div className="w-full bg-slate-100 h-2 rounded-lg overflow-hidden">
                  <div className="bg-success h-full rounded-lg" style={{ width: `${biteMarkers.length > 0 ? (grade1 / biteMarkers.length) * 100 : 0}%` }}></div>
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs font-bold text-slate-700 mb-1">
                  <span>Grade II (Minor Scratch/Abrasions)</span>
                  <span className="font-extrabold">{grade2}</span>
                </div>
                <div className="w-full bg-slate-100 h-2 rounded-lg overflow-hidden">
                  <div className="bg-warning h-full rounded-lg" style={{ width: `${biteMarkers.length > 0 ? (grade2 / biteMarkers.length) * 100 : 0}%` }}></div>
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs font-bold text-slate-700 mb-1">
                  <span>Grade III (Severe Transdermal Wound)</span>
                  <span className="font-extrabold text-danger">{grade3}</span>
                </div>
                <div className="w-full bg-slate-100 h-2 rounded-lg overflow-hidden">
                  <div className="bg-danger h-full rounded-lg" style={{ width: `${biteMarkers.length > 0 ? (grade3 / biteMarkers.length) * 100 : 0}%` }}></div>
                </div>
              </div>
            </div>
          </div>

          {/* Sighting list details */}
          <div className="lg:col-span-2 bg-white border border-border rounded-lg p-5 shadow-sm flex flex-col justify-between h-[350px]">
            <div>
              <h3 className="text-xs font-extrabold text-primary uppercase tracking-wide border-b border-border pb-2.5 mb-3">Hospital Incident Logs Ingested</h3>
              
              <div className="overflow-y-auto max-h-[260px] divide-y divide-border pr-1">
                {biteMarkers.map((b, index) => (
                  <div key={index} className="py-2.5 flex items-center justify-between text-xs font-semibold">
                    <div>
                      <span className="font-bold text-slate-800">{b.incident_id}</span>
                      <span className="text-[9px] text-slate-500 font-semibold block mt-0.5">Street: {b.street_name || 'Unspecified'} &bull; Sourced: {b.hospital_name || 'GH'}</span>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] font-extrabold text-danger bg-danger-light/5 px-2.5 py-0.5 border border-danger-light/20 rounded">
                        {b.bite_severity}
                      </span>
                      <span className="text-[8px] text-slate-400 block mt-0.5">Ward {b.ward_number}</span>
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
