import React, { useState } from 'react';
import { Settings, ShieldAlert, Database, HelpCircle, HardDrive } from 'lucide-react';

export default function Administration({ 
  dbConnected = false,
  dbConfig = {},
  onResetDatabase = () => {} 
}) {
  const [arvTarget, setArvTarget] = useState(70);
  const [abcTarget, setAbcTarget] = useState(80);

  const handleWipeClick = () => {
    if (confirm('🚨 WARNING: You are about to clear all ingested dog population, vaccination, sterilization, and bite incident records from the database. This action is irreversible. Proceed?')) {
      onResetDatabase();
      alert('CCMC Database truncated successfully. All tables restored to empty pending states.');
    }
  };

  return (
    <div className="space-y-6 select-none max-w-4xl mx-auto">
      {/* Title */}
      <div>
        <h2 className="text-xl font-extrabold text-primary uppercase tracking-wide">CCMC SYSTEM ADMINISTRATION</h2>
        <p className="text-xs text-slate-500 font-medium mt-1">Configure threshold indices, inspect PostGIS database sockets, and audit active datasets.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Core Benchmarks Configuration */}
        <div className="bg-white border border-border rounded-lg p-5 shadow-sm space-y-5">
          <div className="flex items-center gap-2 text-primary font-bold border-b border-border pb-2.5">
            <Settings className="w-5 h-5" />
            <span className="text-xs uppercase tracking-wide">Public Health Targets</span>
          </div>

          <div className="space-y-4">
            <div>
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">ARV Target Threshold (%)</label>
              <input
                type="number"
                value={arvTarget}
                onChange={(e) => setArvTarget(parseInt(e.target.value, 10))}
                className="w-full bg-slate-50 border border-border rounded p-2 text-xs font-bold focus:outline-none focus:ring-1 focus:ring-secondary focus:bg-white"
              />
              <span className="text-[8px] text-slate-400 mt-1 block">WHO recommended herd immunity coefficient is 70%.</span>
            </div>

            <div>
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">ABC Target Threshold (%)</label>
              <input
                type="number"
                value={abcTarget}
                onChange={(e) => setAbcTarget(parseInt(e.target.value, 10))}
                className="w-full bg-slate-50 border border-border rounded p-2 text-xs font-bold focus:outline-none focus:ring-1 focus:ring-secondary focus:bg-white"
              />
              <span className="text-[8px] text-slate-400 mt-1 block">CCMC Animal Birth Control policy target is 80% coverage.</span>
            </div>
          </div>
        </div>

        {/* Database Diagnostic specifications */}
        <div className="bg-white border border-border rounded-lg p-5 shadow-sm space-y-5">
          <div className="flex items-center gap-2 text-primary font-bold border-b border-border pb-2.5">
            <Database className="w-5 h-5" />
            <span className="text-xs uppercase tracking-wide">Database Diagnostic Specs</span>
          </div>

          <div className="space-y-3.5 text-xs">
            <div className="flex justify-between border-b border-border pb-2">
              <span className="text-slate-500 font-semibold">Active Database:</span>
              <span className="font-bold text-slate-800">{dbConnected ? 'PostgreSQL + PostGIS' : 'Local Memory Storage'}</span>
            </div>
            <div className="flex justify-between border-b border-border pb-2">
              <span className="text-slate-500 font-semibold">Database Node Host:</span>
              <span className="font-bold text-slate-800 font-mono text-[10px]">{dbConfig.host || 'localhost'}</span>
            </div>
            <div className="flex justify-between border-b border-border pb-2">
              <span className="text-slate-500 font-semibold">Port Connection:</span>
              <span className="font-bold text-slate-800 font-mono text-[10px]">{dbConfig.port || '5432'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500 font-semibold">Spatial Catalog Indexing:</span>
              <span className="font-bold text-success-dark">ACTIVE (EPSG:4326 WGS84)</span>
            </div>
          </div>
        </div>
      </div>

      {/* Critical actions panel */}
      <div className="bg-white border border-danger-light rounded-lg p-5 shadow-sm space-y-4">
        <div className="flex items-center gap-2 text-danger font-bold border-b border-danger-light pb-2.5">
          <ShieldAlert className="w-5 h-5 text-danger" />
          <span className="text-xs uppercase tracking-wide text-danger-dark">Critical Maintenance Operations</span>
        </div>

        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="text-left">
            <span className="text-xs font-extrabold text-slate-800 block uppercase tracking-wide">Truncate Sourced Database Tables</span>
            <span className="text-[10px] text-slate-500 font-semibold mt-1 block">Wipes all clinical records, GPS sightings, and bites data, returning all tables to clean empty states.</span>
          </div>

          <button
            onClick={handleWipeClick}
            className="px-4 py-2.5 bg-danger hover:bg-danger-dark text-white text-xs font-bold rounded shadow transition-colors uppercase tracking-wide"
          >
            Clear Ingested Records
          </button>
        </div>
      </div>
    </div>
  );
}
