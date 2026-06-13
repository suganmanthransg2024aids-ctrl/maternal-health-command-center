import React, { useState, useEffect } from 'react';
import { UploadCloud, FileSpreadsheet, History, Download, AlertCircle, CheckCircle2 } from 'lucide-react';

export default function ImportCenter({ 
  onUploadDataset, 
  uploadHistory = [], 
  fetchUploadHistory = () => {},
  isUploading = false 
}) {
  const [selectedTable, setSelectedTable] = useState('dog_population');
  const [file, setFile] = useState(null);
  const [uploadStatus, setUploadStatus] = useState({ success: null, message: '', rows: 0 });

  const templates = {
    dog_population: 'sighting_id,sex,age_class,color,lat,lng,ward_number\nSIGHT101,MALE,ADULT,Brown,11.0182,77.0253,7\nSIGHT102,FEMALE,PUPPY,White,11.0225,77.0312,8',
    sterilization_records: 'sighting_id,sterilization_date,clinic_name,veterinary_surgeon,ear_notch_verified,post_op_status\nSIGHT101,2026-05-12,Peelamedu ABC Clinic,Dr. M. Soundar,true,Healthy',
    vaccination_records: 'sighting_id,vaccination_date,valid_until,vaccine_brand,vaccination_type,administered_by\nSIGHT101,2026-05-12,2027-05-12,Nobivac ARV,PRIMARY,CCMC Vet Team',
    dog_bite_incidents: 'incident_id,incident_time,street_name,victim_age,victim_gender,bite_severity,hospital_name,lat,lng,ward_number\nINC5001,2026-05-20 18:30:00,Avinashi Road Peelamedu,24,MALE,GRADE_II,Coimbatore GH,11.0210,77.0280,7'
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      setFile(e.target.files[0]);
      setUploadStatus({ success: null, message: '', rows: 0 });
    }
  };

  // Triggers physical CSV template download on client side
  const downloadTemplate = (key) => {
    const csvContent = templates[key];
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.setAttribute('href', url);
    a.setAttribute('download', `CCMC_CanisIntel_${key}_Template.csv`);
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const handleUploadSubmit = async (e) => {
    e.preventDefault();
    if (!file) return;

    const fileType = file.name.endsWith('.geojson') || file.name.endsWith('.json') ? 'GEOJSON' : 'CSV';
    
    try {
      const result = await onUploadDataset(file, fileType, selectedTable);
      setUploadStatus({
        success: true,
        message: `Successfully processed file "${result.fileName}".`,
        rows: result.rowsProcessed
      });
      setFile(null);
      fetchUploadHistory(); // Refresh history table
    } catch (err) {
      setUploadStatus({
        success: false,
        message: err.message || 'File parser validation failed. Check column structures.',
        rows: 0
      });
    }
  };

  return (
    <div className="space-y-6 select-none">
      {/* Title */}
      <div>
        <h2 className="text-xl font-extrabold text-primary uppercase tracking-wide">CCMC DATA IMPORT & INGESTION HUB</h2>
        <p className="text-xs text-slate-500 font-medium mt-1">Load official GeoJSON boundary files, clinical surgery logs, ARV camp registers, and hospital bite surveillance spreadsheets.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Upload Form Panel */}
        <div className="lg:col-span-2 bg-white border border-border rounded-lg p-5 shadow-sm">
          <div className="flex items-center gap-2 text-primary font-bold border-b border-border pb-2.5 mb-4">
            <UploadCloud className="w-5 h-5" />
            <span className="text-xs uppercase tracking-wide">Active Ingestion Portal</span>
          </div>

          <form onSubmit={handleUploadSubmit} className="space-y-5">
            {/* Target Table Dropdown */}
            <div>
              <label htmlFor="targetTable" className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">Target Database Schema</label>
              <select
                id="targetTable"
                value={selectedTable}
                onChange={(e) => setSelectedTable(e.target.value)}
                className="w-full bg-slate-50 border border-border rounded p-2 text-xs font-bold focus:outline-none focus:ring-1 focus:ring-secondary focus:bg-white"
              >
                <option value="ward_boundaries">Ward Spatial Boundaries (GeoJSON Polygon Layer)</option>
                <option value="dog_population">Dog Sighting Census Records (CSV Tabular)</option>
                <option value="sterilization_records">Sterilization ABC Logs (CSV Tabular)</option>
                <option value="vaccination_records">Vaccination ARV Logs (CSV Tabular)</option>
                <option value="dog_bite_incidents">Hospital Bite Incident Log (CSV Tabular)</option>
              </select>
            </div>

            {/* Input Drag and Drop visual */}
            <div className="border-2 border-dashed border-border hover:border-slate-400 rounded-lg p-6 text-center transition-colors relative">
              <input
                type="file"
                accept=".csv,.geojson,.json"
                onChange={handleFileChange}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              />
              <UploadCloud className="w-10 h-10 text-slate-400 mx-auto" />
              <div className="text-xs font-bold text-slate-600 mt-3">
                {file ? `Selected file: ${file.name}` : 'Drag & drop CCMC file here or click to browse'}
              </div>
              <p className="text-[10px] text-slate-400 font-medium mt-1">Accepts CSV templates or GeoJSON spatial polygons (Max file size: 5MB)</p>
            </div>

            {/* Ingestion results feedback alerts */}
            {uploadStatus.success !== null && (
              <div className={`p-4 rounded border text-xs font-medium flex gap-2.5 ${
                uploadStatus.success 
                  ? 'bg-success-light/5 border-success-light/20 text-success-dark' 
                  : 'bg-danger-light/5 border-danger-light/20 text-danger-dark'
              }`}>
                {uploadStatus.success ? (
                  <>
                    <CheckCircle2 className="w-5 h-5 text-success shrink-0" />
                    <div>
                      <span className="font-extrabold block uppercase tracking-wide text-[10px]">Ingestion successful</span>
                      {uploadStatus.message} Synchronized and wrote <span className="font-bold text-slate-800">{uploadStatus.rows} rows</span> to PostGIS database.
                    </div>
                  </>
                ) : (
                  <>
                    <AlertCircle className="w-5 h-5 text-danger shrink-0" />
                    <div>
                      <span className="font-extrabold block uppercase tracking-wide text-[10px]">Ingestion failed</span>
                      {uploadStatus.message}
                    </div>
                  </>
                )}
              </div>
            )}

            {/* Action submit button */}
            <div className="flex justify-end">
              <button
                type="submit"
                disabled={isUploading || !file}
                className="px-5 py-2.5 bg-secondary hover:bg-secondary-dark disabled:bg-slate-200 disabled:cursor-not-allowed text-white text-xs font-bold rounded shadow transition-colors uppercase tracking-wide"
              >
                {isUploading ? 'Executing ingestion parser...' : 'Commit Upload to PostGIS'}
              </button>
            </div>
          </form>
        </div>

        {/* CSV templates & Guidelines downloads sidebar */}
        <div className="bg-white border border-border rounded-lg p-5 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 text-primary font-bold border-b border-border pb-2.5 mb-4">
              <FileSpreadsheet className="w-5 h-5" />
              <span className="text-xs uppercase tracking-wide">Ingestion templates</span>
            </div>

            <p className="text-[11px] text-slate-500 font-medium leading-relaxed">
              Before loading custom data, CCMC veterinary field staff can download pre-formatted spreadsheet templates. Fill in real-world census details and re-upload.
            </p>

            <div className="mt-5 space-y-2.5">
              <button
                onClick={() => downloadTemplate('dog_population')}
                className="w-full flex items-center justify-between px-3.5 py-2 hover:bg-slate-50 border border-border rounded text-xs font-bold text-slate-700 transition-colors"
              >
                <span>1. Dog Population Template</span>
                <Download className="w-4 h-4 text-slate-400" />
              </button>
              <button
                onClick={() => downloadTemplate('sterilization_records')}
                className="w-full flex items-center justify-between px-3.5 py-2 hover:bg-slate-50 border border-border rounded text-xs font-bold text-slate-700 transition-colors"
              >
                <span>2. Sterilization ABC Template</span>
                <Download className="w-4 h-4 text-slate-400" />
              </button>
              <button
                onClick={() => downloadTemplate('vaccination_records')}
                className="w-full flex items-center justify-between px-3.5 py-2 hover:bg-slate-50 border border-border rounded text-xs font-bold text-slate-700 transition-colors"
              >
                <span>3. Vaccination ARV Template</span>
                <Download className="w-4 h-4 text-slate-400" />
              </button>
              <button
                onClick={() => downloadTemplate('dog_bite_incidents')}
                className="w-full flex items-center justify-between px-3.5 py-2 hover:bg-slate-50 border border-border rounded text-xs font-bold text-slate-700 transition-colors"
              >
                <span>4. Hospital Bite Log Template</span>
                <Download className="w-4 h-4 text-slate-400" />
              </button>
            </div>
          </div>

          <div className="mt-8 border-t border-border pt-4 text-[10px] text-slate-500 font-medium bg-slate-50 p-3 rounded">
            <span className="font-extrabold text-primary block uppercase tracking-wider mb-1">GeoJSON bounds rule:</span>
            Ward boundaries must be valid polygons or multipolygons projected in EPSG:4326 (WGS84).
          </div>
        </div>
      </div>

      {/* Historical logs grids */}
      <div className="bg-white border border-border rounded-lg p-5 shadow-sm">
        <div className="flex items-center gap-2 text-primary font-bold border-b border-border pb-2.5 mb-4">
          <History className="w-5 h-5" />
          <span className="text-xs uppercase tracking-wide">Historical Ingestion Audit Log</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-medium text-slate-600">
            <thead>
              <tr className="bg-slate-50 border-y border-border">
                <th className="px-4 py-2.5 font-extrabold text-slate-500 uppercase tracking-wider text-[10px]">File Name</th>
                <th className="px-4 py-2.5 font-extrabold text-slate-500 uppercase tracking-wider text-[10px]">Format</th>
                <th className="px-4 py-2.5 font-extrabold text-slate-500 uppercase tracking-wider text-[10px]">Target Schema</th>
                <th className="px-4 py-2.5 font-extrabold text-slate-500 uppercase tracking-wider text-[10px] text-center">Row Count</th>
                <th className="px-4 py-2.5 font-extrabold text-slate-500 uppercase tracking-wider text-[10px] text-right">Timestamp Sourced</th>
              </tr>
            </thead>
            <tbody>
              {uploadHistory.length === 0 ? (
                <tr>
                  <td colSpan="5" className="text-center py-6 text-slate-400 font-medium italic">
                    No uploads in current database instance. Ingestion history empty.
                  </td>
                </tr>
              ) : (
                uploadHistory.map((item, index) => (
                  <tr key={index} className="border-b border-border last:border-0 hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3 font-bold text-slate-800">{item.file_name}</td>
                    <td className="px-4 py-3"><span className="px-2 py-0.5 bg-slate-100 border rounded font-mono text-[10px]">{item.file_type}</span></td>
                    <td className="px-4 py-3 text-slate-600 font-semibold">{item.target_table}</td>
                    <td className="px-4 py-3 text-center font-bold text-slate-800">{item.imported_rows}</td>
                    <td className="px-4 py-3 text-right text-slate-400 text-[10px]">{new Date(item.uploaded_at).toLocaleString()}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
