import React, { useState, useEffect } from 'react';
import { Layers, Sliders, AlertTriangle, ShieldCheck, HelpCircle } from 'lucide-react';

export default function RiskZoneAnalysis({ 
  riskData = [], 
  onTriggerRecalculate, 
  isRecalculating = false 
}) {
  const [weights, setWeights] = useState({
    schoolWeight: 0.25,
    marketWeight: 0.15,
    vaccinationWeight: 0.30,
    populationWeight: 0.30
  });

  const handleSliderChange = (e) => {
    const { name, value } = e.target;
    setWeights(prev => {
      const next = { ...prev, [name]: parseFloat(value) };
      // Normalize sum to roughly 1 if needed, but simple relative weights are standard
      return next;
    });
  };

  useEffect(() => {
    onTriggerRecalculate(weights);
  }, [weights]);

  const hasData = riskData.some(r => r.metrics.populationCount > 0 || r.metrics.biteCount > 0);

  const getRiskColor = (level) => {
    switch (level) {
      case 'CRITICAL':
        return 'text-danger bg-danger-light/10 border-danger-light/20';
      case 'MODERATE':
        return 'text-warning bg-warning-light/10 border-warning-light/20';
      default:
        return 'text-success bg-success-light/10 border-success-light/20';
    }
  };

  return (
    <div className="space-y-6 select-none">
      {/* Title */}
      <div>
        <h2 className="text-xl font-extrabold text-primary uppercase tracking-wide">AI SPATIAL RISK ZONE & BIOLOGICAL SURVEILLANCE</h2>
        <p className="text-xs text-slate-500 font-medium mt-1">AI-based spatial weights modeling rabies risk scores per ward based on school proximity, market intersections, and vaccine herd immunity gaps.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Weight Sliders Controls */}
        <div className="bg-white border border-border rounded-lg p-5 shadow-sm space-y-5">
          <div className="flex items-center gap-2 text-primary font-bold border-b border-border pb-2.5">
            <Sliders className="w-5 h-5" />
            <span className="text-xs uppercase tracking-wide">Risk Model Parameters</span>
          </div>

          <p className="text-[11px] text-slate-500 font-medium leading-relaxed">
            Adjust weights representing public health vulnerabilities. The spatial engine runs PostGIS intersections to compute risk indicators for Coimbatore East.
          </p>

          <div className="space-y-4">
            <div>
              <div className="flex justify-between text-xs font-bold text-slate-700 mb-1">
                <span>School Proximity Weight</span>
                <span className="text-secondary font-extrabold">{Math.round(weights.schoolWeight * 100)}%</span>
              </div>
              <input
                type="range"
                name="schoolWeight"
                min="0"
                max="1"
                step="0.05"
                value={weights.schoolWeight}
                onChange={handleSliderChange}
                className="w-full accent-secondary cursor-pointer h-1.5 bg-slate-100 rounded-lg appearance-none"
              />
            </div>

            <div>
              <div className="flex justify-between text-xs font-bold text-slate-700 mb-1">
                <span>Market Proximity Weight</span>
                <span className="text-secondary font-extrabold">{Math.round(weights.marketWeight * 100)}%</span>
              </div>
              <input
                type="range"
                name="marketWeight"
                min="0"
                max="1"
                step="0.05"
                value={weights.marketWeight}
                onChange={handleSliderChange}
                className="w-full accent-secondary cursor-pointer h-1.5 bg-slate-100 rounded-lg appearance-none"
              />
            </div>

            <div>
              <div className="flex justify-between text-xs font-bold text-slate-700 mb-1">
                <span>Vaccination Gap Weight</span>
                <span className="text-secondary font-extrabold">{Math.round(weights.vaccinationWeight * 100)}%</span>
              </div>
              <input
                type="range"
                name="vaccinationWeight"
                min="0"
                max="1"
                step="0.05"
                value={weights.vaccinationWeight}
                onChange={handleSliderChange}
                className="w-full accent-secondary cursor-pointer h-1.5 bg-slate-100 rounded-lg appearance-none"
              />
            </div>

            <div>
              <div className="flex justify-between text-xs font-bold text-slate-700 mb-1">
                <span>Population Density Weight</span>
                <span className="text-secondary font-extrabold">{Math.round(weights.populationWeight * 100)}%</span>
              </div>
              <input
                type="range"
                name="populationWeight"
                min="0"
                max="1"
                step="0.05"
                value={weights.populationWeight}
                onChange={handleSliderChange}
                className="w-full accent-secondary cursor-pointer h-1.5 bg-slate-100 rounded-lg appearance-none"
              />
            </div>
          </div>

          <div className="bg-slate-50 border border-slate-200 p-3 rounded text-[10px] text-slate-500 font-medium leading-relaxed">
            <span className="font-extrabold text-primary block uppercase tracking-wider mb-1">Biological Formula:</span>
            Score calculates: (School Density * Ws) + (Market Density * Wm) + (Vaccine Gap * Wv) + (Sighting Density * Wd) + Sighting Bites.
          </div>
        </div>

        {/* Risk Scores Grid list */}
        <div className="lg:col-span-2 bg-white border border-border rounded-lg p-5 shadow-sm flex flex-col justify-between h-[450px]">
          <div>
            <div className="flex items-center gap-2 text-primary font-bold border-b border-border pb-2.5 mb-4">
              <Layers className="w-5 h-5" />
              <span className="text-xs uppercase tracking-wide">Biological Risk Index ledger</span>
            </div>

            <div className="overflow-y-auto max-h-[350px] space-y-3.5 pr-1">
              {!hasData ? (
                <div className="text-center py-20 bg-slate-50 border border-border border-dashed rounded-lg">
                  <AlertTriangle className="w-8 h-8 text-danger mx-auto" />
                  <span className="text-xs font-extrabold text-danger block mt-3 uppercase tracking-wide">
                    OFFICIAL DATA NOT FOUND – AWAITING IMPORT
                  </span>
                  <p className="text-[10px] text-slate-500 font-semibold px-6 mt-1.5 leading-relaxed">
                    AI biological threat engine requires real population sightings and vaccination logs to compute spatial coordinates risk indices.
                  </p>
                </div>
              ) : (
                riskData.map((w, index) => (
                  <div key={index} className="p-3.5 border border-border hover:border-slate-300 rounded-lg flex items-center justify-between shadow-sm transition-colors">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-800 uppercase tracking-wide">{w.wardName}</span>
                        <span className="text-[10px] text-slate-400 font-semibold">(Ward {w.wardNumber})</span>
                      </div>
                      <div className="grid grid-cols-3 gap-x-4 gap-y-1.5 mt-2.5 text-[9px] text-slate-500 font-semibold">
                        <span>Pop Sighted: <strong className="text-slate-800">{w.metrics.populationCount}</strong></span>
                        <span>ARV Cover: <strong className="text-slate-800">{w.metrics.vaccinationCoverage}%</strong></span>
                        <span>Bites Sourced: <strong className="text-slate-800">{w.metrics.biteCount}</strong></span>
                        <span>Schools: <strong className="text-slate-800">{w.metrics.schoolCount}</strong></span>
                        <span>Markets: <strong className="text-slate-800">{w.metrics.marketCount}</strong></span>
                      </div>
                    </div>

                    <div className="text-right space-y-1">
                      <span className={`text-[9px] font-bold px-2 py-0.5 border rounded-full uppercase tracking-wider block text-center ${getRiskColor(w.level)}`}>
                        {w.level}
                      </span>
                      <span className="text-base font-extrabold text-slate-800 tracking-tight block">
                        Index: {w.score}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
