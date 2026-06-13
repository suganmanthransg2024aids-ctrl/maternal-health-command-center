import React from 'react';
import { Users, AlertTriangle, TrendingUp, HelpCircle } from 'lucide-react';

export default function PopulationMonitoring({ 
  stats = {},
  sightingMarkers = [] 
}) {
  const hasData = sightingMarkers.length > 0;
  
  // Calculate male/female puppy breakdown based on markers
  const maleCount = sightingMarkers.filter(s => s.sex === 'MALE').length;
  const femaleCount = sightingMarkers.filter(s => s.sex === 'FEMALE').length;
  const adultCount = sightingMarkers.filter(s => s.age_class === 'ADULT').length;
  const puppyCount = sightingMarkers.filter(s => s.age_class === 'PUPPY').length;

  return (
    <div className="space-y-6 select-none">
      {/* Title */}
      <div>
        <h2 className="text-xl font-extrabold text-primary uppercase tracking-wide">CCMC DOG POPULATION SURVEILLANCE & DENSITY</h2>
        <p className="text-xs text-slate-500 font-medium mt-1">Ward-level density tracking, gender distribution ratios, and population grow projections under active control mandates.</p>
      </div>

      {!hasData ? (
        <div className="bg-slate-50 border border-border border-dashed rounded-lg p-16 text-center">
          <AlertTriangle className="w-10 h-10 text-danger mx-auto" />
          <h3 className="text-sm font-extrabold text-danger uppercase tracking-wide mt-3">DATA NOT AVAILABLE – AWAITING CCMC IMPORT</h3>
          <p className="text-xs text-slate-500 font-medium px-10 mt-1 max-w-xl mx-auto leading-relaxed">
            Dog sightings population metrics empty. Please access the Data Import Center to upload CCMC dog census spreadsheets or log sightings via the Field Staff Portal.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Sighting Distribution Metrics */}
          <div className="bg-white border border-border rounded-lg p-5 shadow-sm space-y-4">
            <h3 className="text-xs font-extrabold text-primary uppercase tracking-wide border-b border-border pb-2.5">Distribution Analysis</h3>
            
            <div className="space-y-3.5">
              <div>
                <div className="flex justify-between text-xs font-bold text-slate-700 mb-1">
                  <span>Male Count</span>
                  <span className="font-extrabold">{maleCount}</span>
                </div>
                <div className="w-full bg-slate-100 h-2 rounded-lg overflow-hidden">
                  <div className="bg-primary h-full rounded-lg" style={{ width: `${sightingMarkers.length > 0 ? (maleCount / sightingMarkers.length) * 100 : 0}%` }}></div>
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs font-bold text-slate-700 mb-1">
                  <span>Female Count</span>
                  <span className="font-extrabold">{femaleCount}</span>
                </div>
                <div className="w-full bg-slate-100 h-2 rounded-lg overflow-hidden">
                  <div className="bg-secondary h-full rounded-lg" style={{ width: `${sightingMarkers.length > 0 ? (femaleCount / sightingMarkers.length) * 100 : 0}%` }}></div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 border-t border-border pt-4">
                <div className="bg-slate-50 p-3 border border-border rounded text-center">
                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Adult Dogs</span>
                  <span className="text-base font-extrabold text-slate-800 tracking-tight mt-1 block">{adultCount}</span>
                </div>
                <div className="bg-slate-50 p-3 border border-border rounded text-center">
                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Puppy Count</span>
                  <span className="text-base font-extrabold text-slate-800 tracking-tight mt-1 block">{puppyCount}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Sighting list details */}
          <div className="lg:col-span-2 bg-white border border-border rounded-lg p-5 shadow-sm flex flex-col justify-between h-[350px]">
            <div>
              <h3 className="text-xs font-extrabold text-primary uppercase tracking-wide border-b border-border pb-2.5 mb-3">Dog Census Records Ingested</h3>
              
              <div className="overflow-y-auto max-h-[260px] divide-y divide-border pr-1">
                {sightingMarkers.map((s, index) => (
                  <div key={index} className="py-2.5 flex items-center justify-between text-xs font-semibold">
                    <div>
                      <span className="font-bold text-slate-800">{s.sighting_id}</span>
                      <span className="text-[9px] text-slate-500 font-semibold block mt-0.5">Sex: {s.sex} &bull; Age: {s.age_class} &bull; Color: {s.color || 'Unspecified'}</span>
                    </div>
                    <span className="text-[10px] font-mono text-slate-500 bg-slate-50 px-2 py-0.5 border border-border rounded">
                      Ward {s.ward_number}
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
