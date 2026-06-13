import React, { useState } from 'react';
import { Smartphone, MapPin, CheckCircle, Navigation, Camera, AlertCircle } from 'lucide-react';

export default function FieldStaffPortal({ 
  onSubmitSighting,
  recentSightings = [],
  capturedCoordinates = null,
  setCapturedCoordinates = () => {},
  dbConnected = false 
}) {
  const [formData, setFormData] = useState({
    sex: 'UNKNOWN',
    ageClass: 'ADULT',
    color: '',
    wardNumber: 7,
    distinctiveFeatures: '',
  });

  const [formStatus, setFormStatus] = useState({ success: null, message: '' });
  const [isCapturingGPS, setIsCapturingGPS] = useState(false);

  // HTML5 Device Geolocation API Integration
  const captureDeviceGPS = () => {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by your browser.');
      return;
    }

    setIsCapturingGPS(true);
    console.log('📡 Geolocation: Fetching current GPS location...');

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        setCapturedCoordinates({ lat: latitude, lng: longitude });
        setIsCapturingGPS(false);
        console.log(`📡 Geolocation: Coordinates successfully captured: [${latitude}, ${longitude}]`);
      },
      (error) => {
        console.warn('📡 Geolocation: Capture failed:', error.message);
        alert(`Device GPS capture failed: ${error.message}. Please click on the GIS Map to select coordinates manually.`);
        setIsCapturingGPS(false);
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!capturedCoordinates) {
      alert('Sighting location coordinates are required. Use Geolocation capture or click on the GIS map.');
      return;
    }

    const payload = {
      ...formData,
      lat: capturedCoordinates.lat,
      lng: capturedCoordinates.lng
    };

    try {
      await onSubmitSighting(payload);
      setFormStatus({
        success: true,
        message: `Sighting successfully registered. Sighting ID logged in PostGIS.`
      });
      // Clear forms
      setFormData({ sex: 'UNKNOWN', ageClass: 'ADULT', color: '', wardNumber: 7, distinctiveFeatures: '' });
      setCapturedCoordinates(null);
    } catch (err) {
      setFormStatus({
        success: false,
        message: err.message || 'Verification failed. Database rejected input.'
      });
    }
  };

  return (
    <div className="space-y-6 select-none max-w-2xl mx-auto">
      {/* Title */}
      <div className="text-center">
        <Smartphone className="w-10 h-10 text-primary mx-auto mb-2" />
        <h2 className="text-xl font-extrabold text-primary uppercase tracking-wide">CCMC FIELD SURVEY OPERATIONS</h2>
        <p className="text-xs text-slate-500 font-medium mt-1">Mobile-optimized interface for CCMC ward surveyors to log sightings, update ARVs, and record bite coordinates.</p>
      </div>

      {/* Main Survey Panel */}
      <div className="bg-white border border-border rounded-lg p-6 shadow-md">
        <div className="flex items-center gap-2 text-primary font-bold border-b border-border pb-3 mb-5">
          <Smartphone className="w-5 h-5" />
          <span className="text-xs uppercase tracking-wide">Dog Sighting Log Sourced</span>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Spatial GPS Capturer row */}
          <div className="bg-slate-50 p-4 border border-border rounded-lg space-y-3.5">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">1. Spatial Coordinates (WGS84)</span>
            
            <div className="flex gap-3">
              <button
                type="button"
                onClick={captureDeviceGPS}
                disabled={isCapturingGPS}
                className="flex-1 py-2.5 px-4 bg-primary hover:bg-primary-light text-white text-xs font-bold rounded shadow transition-colors flex items-center justify-center gap-2 uppercase tracking-wide disabled:bg-slate-300"
              >
                <Navigation className={`w-4 h-4 ${isCapturingGPS ? 'animate-spin' : ''}`} />
                {isCapturingGPS ? 'Querying Satellites...' : 'Get Device GPS'}
              </button>
            </div>

            {capturedCoordinates ? (
              <div className="bg-success-light/5 border border-success-light/20 p-2.5 rounded text-xs font-bold text-success-dark flex items-center justify-between">
                <span>Coordinates Locked: [{capturedCoordinates.lat.toFixed(5)}, {capturedCoordinates.lng.toFixed(5)}]</span>
                <MapPin className="w-4 h-4" />
              </div>
            ) : (
              <div className="bg-slate-100 border border-slate-200 p-2.5 rounded text-xs text-slate-500 font-semibold text-center italic">
                Awaiting GPS coordinate capture. Use button above or tap on the GIS Map.
              </div>
            )}
          </div>

          {/* Ward & Color Class */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="wardNumber" className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">Ward Number</label>
              <select
                id="wardNumber"
                name="wardNumber"
                value={formData.wardNumber}
                onChange={handleInputChange}
                className="w-full bg-slate-50 border border-border rounded p-2 text-xs font-bold focus:outline-none focus:ring-1 focus:ring-secondary focus:bg-white"
              >
                {[7, 8, 9, 10, 11, 12, 13, 14, 15, 22, 23, 24, 38, 39, 40].map(n => (
                  <option key={n} value={n}>Ward {n}</option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="color" className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">Coat Color</label>
              <input
                id="color"
                type="text"
                name="color"
                placeholder="e.g. Brown, White/Black patch"
                value={formData.color}
                onChange={handleInputChange}
                className="w-full bg-slate-50 border border-border rounded p-2 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-secondary focus:bg-white"
              />
            </div>
          </div>

          {/* Sex & Age classification */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="sex" className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">Gender Class</label>
              <select
                id="sex"
                name="sex"
                value={formData.sex}
                onChange={handleInputChange}
                className="w-full bg-slate-50 border border-border rounded p-2 text-xs font-bold focus:outline-none focus:ring-1 focus:ring-secondary focus:bg-white"
              >
                <option value="UNKNOWN">UNKNOWN</option>
                <option value="MALE">MALE</option>
                <option value="FEMALE">FEMALE</option>
              </select>
            </div>

            <div>
              <label htmlFor="ageClass" className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">Age Class</label>
              <select
                id="ageClass"
                name="ageClass"
                value={formData.ageClass}
                onChange={handleInputChange}
                className="w-full bg-slate-50 border border-border rounded p-2 text-xs font-bold focus:outline-none focus:ring-1 focus:ring-secondary focus:bg-white"
              >
                <option value="ADULT">ADULT</option>
                <option value="PUPPY">PUPPY</option>
              </select>
            </div>
          </div>

          {/* Photo & Notes */}
          <div>
            <label htmlFor="distinctiveFeatures" className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">Distinctive Physical Features / Notes</label>
            <textarea
              id="distinctiveFeatures"
              name="distinctiveFeatures"
              rows="3"
              placeholder="Describe notched ears, collar, limps, tail shape..."
              value={formData.distinctiveFeatures}
              onChange={handleInputChange}
              className="w-full bg-slate-50 border border-border rounded p-2.5 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-secondary focus:bg-white"
            ></textarea>
          </div>

          {/* Camera upload visual */}
          <div className="border border-border rounded p-4 flex items-center justify-between bg-slate-50">
            <div className="flex items-center gap-3">
              <Camera className="w-5 h-5 text-slate-400" />
              <div className="text-left">
                <span className="text-[10px] font-bold text-slate-700 block uppercase tracking-wider">Photo Capture</span>
                <span className="text-[9px] text-slate-400 font-medium">Attach sighting image file</span>
              </div>
            </div>
            <input 
              type="file" 
              accept="image/*" 
              className="text-[10px] text-slate-500 font-bold focus:outline-none max-w-[200px]" 
            />
          </div>

          {/* Form Result alerts */}
          {formStatus.success !== null && (
            <div className={`p-4 rounded border text-xs font-semibold flex gap-2.5 ${
              formStatus.success 
                ? 'bg-success-light/5 border-success-light/20 text-success-dark' 
                : 'bg-danger-light/5 border-danger-light/20 text-danger-dark'
            }`}>
              {formStatus.success ? <CheckCircle className="w-5 h-5 shrink-0 text-success" /> : <AlertCircle className="w-5 h-5 shrink-0 text-danger" />}
              <span>{formStatus.message}</span>
            </div>
          )}

          {/* Action button */}
          <button
            type="submit"
            className="w-full text-center py-3 bg-secondary hover:bg-secondary-dark text-white text-xs font-bold rounded shadow transition-colors uppercase tracking-wider"
          >
            Submit Sighting Sourced
          </button>
        </form>
      </div>

      {/* Dynamic Session log listings */}
      {recentSightings.length > 0 && (
        <div className="bg-white border border-border rounded-lg p-5 shadow-sm">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-3">Recently Logged Sightings Sourced</span>
          <div className="divide-y divide-border">
            {recentSightings.map((s, index) => (
              <div key={index} className="py-2.5 flex items-center justify-between text-xs font-semibold">
                <div className="text-left">
                  <span className="font-bold text-primary block">{s.sighting_id}</span>
                  <span className="text-[9px] text-slate-400 mt-0.5 block">Ward {s.ward_number} &bull; {s.sex} &bull; {s.age_class}</span>
                </div>
                <div className="text-right text-[10px] text-slate-500 font-mono">
                  [{s.lat.toFixed(5)}, {s.lng.toFixed(5)}]
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
