import React, { useEffect, useRef, useState } from 'react';
import { Layers, HelpCircle, MapPin, Loader } from 'lucide-react';

export default function GISMap({ 
  selectedWard, 
  setSelectedWard, 
  onCoordinateCapture, 
  surveyMode = false,
  schoolMarkers = [],
  hospitalMarkers = [],
  vetMarkers = [],
  marketMarkers = [],
  parkMarkers = [],
  sightingMarkers = [],
  biteMarkers = [],
  wardGeoJSON = null,
  isFetchingOSM = false
}) {
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const geoJsonLayerRef = useRef(null);
  
  // Layer visibility state
  const [layers, setLayers] = useState({
    wards: true,
    schools: true,
    hospitals: true,
    vets: true,
    markets: true,
    parks: true,
    sightings: true,
    bites: true,
  });

  const L = window.L; // Fetch Leaflet from global scope (CDN)

  // 1. Initialize Map Viewport centered on Peelamedu / Coimbatore East Zone
  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return;

    console.log('🗺️ GIS: Initializing Leaflet Map centring on Coimbatore East...');

    // Peelamedu/Singanallur Coordinates
    const centerLat = 11.0180;
    const centerLng = 77.0220;

    const map = L.map(mapRef.current, {
      zoomControl: false, // Custom position control
      attributionControl: true
    }).setView([centerLat, centerLng], 13);

    // Standard OpenStreetMap Tile Layer
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 18,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(map);

    // Add Zoom Control at bottom right
    L.control.zoom({ position: 'bottomright' }).addTo(map);

    mapInstanceRef.current = map;

    // GPS Coordinate Capture for Field Survey Clicking
    map.on('click', (e) => {
      const { lat, lng } = e.latlng;
      if (surveyMode && onCoordinateCapture) {
        onCoordinateCapture(lat, lng);
        
        // Add a temporary pulsing marker to visual coordinate capture
        const captureIcon = L.divIcon({
          className: 'custom-div-icon',
          html: `<div class='w-5 h-5 rounded-full bg-danger border-2 border-white animate-ping absolute -left-2 -top-2'></div>
                 <div class='w-3 h-3 rounded-full bg-danger border-2 border-white absolute -left-1 -top-1'></div>`,
          iconSize: [12, 12]
        });
        
        L.marker([lat, lng], { icon: captureIcon })
          .addTo(map)
          .bindPopup(`<div class="text-xs font-bold text-slate-800">CAPTURED GPS POINT</div><div class="text-[10px] text-slate-500 font-medium mt-1">Lat: ${lat.toFixed(5)}<br/>Lng: ${lng.toFixed(5)}</div>`)
          .openPopup();
      }
    });

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  // 2. Render GeoJSON Ward Boundaries Polygons
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !L) return;

    // Clear old GeoJSON layer
    if (geoJsonLayerRef.current) {
      map.removeLayer(geoJsonLayerRef.current);
      geoJsonLayerRef.current = null;
    }

    if (wardGeoJSON && layers.wards) {
      console.log('🗺️ GIS: Overlaying Ward Polygons...');
      
      const geoLayer = L.geoJSON(wardGeoJSON, {
        style: (feature) => {
          const isSel = selectedWard && selectedWard.wardNumber === feature.properties.ward_number;
          return {
            color: isSel ? '#2563EB' : '#1E3A5F',
            weight: isSel ? 3 : 1.5,
            fillColor: isSel ? '#2563EB' : '#1E3A5F',
            fillOpacity: isSel ? 0.25 : 0.08,
            dashArray: isSel ? '4' : '3'
          };
        },
        onEachFeature: (feature, layer) => {
          const props = feature.properties;
          
          // Click handler to select ward
          layer.on('click', (e) => {
            L.DomEvent.stopPropagation(e);
            setSelectedWard({
              wardNumber: props.ward_number,
              wardName: props.ward_name,
              population: props.population,
              area: props.area_sq_km
            });
          });

          // Bind Popup with Ward Metadata details
          layer.bindPopup(`
            <div class="p-1 select-none">
              <div class="text-xs font-bold text-primary uppercase tracking-wide">${props.ward_name}</div>
              <table class="text-[10px] text-slate-600 font-medium w-full mt-2.5">
                <tr><td class="pr-3 pb-1">Ward Number:</td><td class="font-bold text-slate-800">${props.ward_number}</td></tr>
                <tr><td class="pr-3 pb-1">Census Pop:</td><td class="font-bold text-slate-800">${props.population || 'Awaiting Sync'}</td></tr>
                <tr><td class="pr-3">Ward Area:</td><td class="font-bold text-slate-800">${props.area_sq_km ? props.area_sq_km + ' sq km' : 'Awaiting Sync'}</td></tr>
              </table>
            </div>
          `);
        }
      }).addTo(map);

      geoJsonLayerRef.current = geoLayer;
      
      // Auto-zoom to show boundaries on first upload
      if (wardGeoJSON.features?.length > 0) {
        map.fitBounds(geoLayer.getBounds(), { padding: [20, 20] });
      }
    }
  }, [wardGeoJSON, selectedWard, layers.wards]);

  // Helper marker storage ref to enable clearing of markers
  const markerGroupRef = useRef([]);

  // 3. Clear and Render Dynamic Point Markers (POIs, Sightings, Bites)
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !L) return;

    // Remove existing markers
    markerGroupRef.current.forEach(marker => map.removeLayer(marker));
    markerGroupRef.current = [];

    const pinLayers = [
      { key: 'schools', data: schoolMarkers, color: '#2563EB', iconHtml: '🏫', label: 'School' },
      { key: 'hospitals', data: hospitalMarkers, color: '#DC2626', iconHtml: '🏥', label: 'Hospital' },
      { key: 'vets', data: vetMarkers, color: '#16A34A', iconHtml: '🐾', label: 'Vet Center' },
      { key: 'markets', data: marketMarkers, color: '#F59E0B', iconHtml: '🛒', label: 'Market' },
      { key: 'parks', data: parkMarkers, color: '#10B981', iconHtml: '🌳', label: 'Park' },
      { key: 'sightings', data: sightingMarkers, color: '#7C3AED', iconHtml: '🐕', label: 'Dog Sighting' },
      { key: 'bites', data: biteMarkers, color: '#EF4444', iconHtml: '🚨', label: 'Bite Sighting' },
    ];

    pinLayers.forEach(({ key, data, color, iconHtml, label }) => {
      if (!layers[key] || !data || data.length === 0) return;

      data.forEach(item => {
        const lat = item.lat;
        const lng = item.lng;
        if (!lat || !lng) return;

        // Custom Leaflet DivIcon
        const customIcon = L.divIcon({
          className: 'custom-leaflet-marker',
          html: `<div class="w-7 h-7 rounded-full flex items-center justify-center bg-white border border-border shadow-md select-none text-xs hover:scale-110 hover:border-slate-400 transition-all">
                   ${iconHtml}
                 </div>`,
          iconSize: [28, 28],
          iconAnchor: [14, 14]
        });

        // Set popup detail content dynamically by category
        let popupContent = `<div class="p-1">
          <div class="text-xs font-bold text-slate-800">${item.name || label}</div>`;
        
        if (key === 'schools' || key === 'hospitals') {
          popupContent += `<div class="text-[10px] text-slate-500 font-medium mt-1">Street: ${item.street || 'Coimbatore East Zone'}<br/>Type: ${item.type || 'POI'}</div>`;
        } else if (key === 'vets') {
          popupContent += `<div class="text-[10px] text-slate-500 font-medium mt-1">Operator: ${item.managed_by || 'CCMC'}</div>`;
        } else if (key === 'sightings') {
          popupContent += `<div class="text-[10px] text-slate-500 font-medium mt-1">ID: ${item.sighting_id}<br/>Ward: ${item.ward_number}<br/>Sex: ${item.sex}<br/>Class: ${item.age_class}</div>`;
        } else if (key === 'bites') {
          popupContent += `<div class="text-[10px] text-slate-500 font-medium mt-1">ID: ${item.incident_id}<br/>Ward: ${item.ward_number}<br/>Street: ${item.street_name}<br/>Severity: <span class="font-bold text-danger">${item.bite_severity}</span></div>`;
        }

        popupContent += `</div>`;

        const marker = L.marker([lat, lng], { icon: customIcon })
          .addTo(map)
          .bindPopup(popupContent);

        markerGroupRef.current.push(marker);
      });
    });

  }, [
    schoolMarkers, hospitalMarkers, vetMarkers, marketMarkers, parkMarkers, sightingMarkers, biteMarkers,
    layers
  ]);

  const toggleLayer = (layerKey) => {
    setLayers(prev => ({ ...prev, [layerKey]: !prev[layerKey] }));
  };

  return (
    <div className="relative w-full h-full border border-border rounded-lg bg-slate-100 overflow-hidden flex flex-col">
      {/* Top Banner Loader during live sync */}
      {isFetchingOSM && (
        <div className="absolute top-4 left-4 z-[400] bg-white border border-border rounded shadow-md px-3 py-1.5 flex items-center gap-2 text-xs font-bold text-primary">
          <Loader className="w-4 h-4 animate-spin text-secondary" />
          <span>OSM Overpass Sync Active...</span>
        </div>
      )}

      {/* Main Map Div */}
      <div ref={mapRef} className="flex-1 w-full h-full z-0"></div>

      {/* GIS Sidebar Layer Controller overlay */}
      <div className="absolute top-4 right-4 z-[400] bg-white border border-border rounded-lg shadow-lg w-52 p-4 text-xs font-semibold text-slate-800 select-none">
        <div className="flex items-center gap-2 text-primary font-bold border-b border-border pb-2 mb-2.5">
          <Layers className="w-4 h-4" />
          <span>MAP CONTROLLER</span>
        </div>

        <div className="space-y-2">
          {Object.keys(layers).map(k => (
            <label key={k} className="flex items-center gap-2.5 cursor-pointer select-none text-[11px]">
              <input
                type="checkbox"
                checked={layers[k]}
                onChange={() => toggleLayer(k)}
                className="w-3.5 h-3.5 rounded border-border text-secondary focus:ring-secondary cursor-pointer"
              />
              <span className="capitalize">{k === 'vets' ? 'Vet Centers' : k === 'wards' ? 'Ward Bounds' : k}</span>
            </label>
          ))}
        </div>

        {surveyMode && (
          <div className="mt-4 border-t border-border pt-3 text-[10px] text-danger-dark bg-danger-light/10 border border-danger-light rounded p-2 flex gap-1.5">
            <MapPin className="w-3.5 h-3.5 flex-shrink-0" />
            <div>
              <span className="font-bold">SURVEY GPS MODE</span><br/>
              Click any coordinate point on the map viewport to capture GPS locations.
            </div>
          </div>
        )}
      </div>

      {/* Map Legend Overlay at bottom left */}
      <div className="absolute bottom-4 left-4 z-[400] bg-white/95 border border-border rounded-lg shadow px-3.5 py-2 text-[10px] text-slate-600 font-semibold flex items-center gap-4 select-none">
        <div className="flex items-center gap-1.5"><span className="text-sm">🏫</span> <span>Schools</span></div>
        <div className="flex items-center gap-1.5"><span className="text-sm">🏥</span> <span>Clinics</span></div>
        <div className="flex items-center gap-1.5"><span className="text-sm">🐾</span> <span>Vet Centers</span></div>
        <div className="flex items-center gap-1.5"><span className="text-sm">🐕</span> <span>Dog Sightings</span></div>
        <div className="flex items-center gap-1.5"><span className="text-sm">🚨</span> <span>Bites</span></div>
      </div>
    </div>
  );
}
