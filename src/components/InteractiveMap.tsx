import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { MapPin, Navigation, AlertTriangle, Loader, RefreshCw, CheckCircle } from 'lucide-react';

// Custom modern DivIcon to avoid Vite relative asset resolving issues and provide a high-contrast futuristic visual feel
const customMarkerIcon = L.divIcon({
  html: `
    <div class="relative flex items-center justify-center">
      <div class="absolute w-8 h-8 bg-indigo-500/30 rounded-full animate-ping"></div>
      <div class="relative w-5 h-5 bg-indigo-500 border-2 border-white rounded-full flex items-center justify-center shadow-lg">
        <div class="w-1.5 h-1.5 bg-white rounded-full"></div>
      </div>
    </div>
  `,
  className: 'custom-interactive-marker',
  iconSize: [32, 32],
  iconAnchor: [16, 16],
});

interface InteractiveMapProps {
  lat: string;
  lng: string;
  onCoordinatesChange: (lat: string, lng: string, wkt: string) => void;
  showNotification?: (msg: string, type?: string) => void;
  showWKT?: boolean;
}

// Inner helper component to manage map viewing center dynamically
function MapUpdater({ center }: { center: [number, number] }) {
  const map = useMap();
  useEffect(() => {
    map.setView(center, map.getZoom());
  }, [center, map]);
  return null;
}

// Inner helper component to capture click events
interface MapEventsHandlerProps {
  onMapClick: (latlng: L.LatLng) => void;
}

function MapEventsHandler({ onMapClick }: MapEventsHandlerProps) {
  useMapEvents({
    click(e) {
      onMapClick(e.latlng);
    }
  });
  return null;
}

export default function InteractiveMap({
  lat,
  lng,
  onCoordinatesChange,
  showNotification,
  showWKT = false
}: InteractiveMapProps) {
  const [currentCenter, setCurrentCenter] = useState<[number, number]>([28.6139, 77.2090]); // Default to New Delhi
  const [markerPos, setMarkerPos] = useState<[number, number] | null>(null);
  const [isLocating, setIsLocating] = useState<boolean>(false);
  const [tilesLoading, setTilesLoading] = useState<boolean>(true);
  const [gpsError, setGpsError] = useState<string | null>(null);
  const [wktString, setWktString] = useState<string>('');

  // Update WKT format whenever marker position changes
  const updateWKT = (latitude: number, longitude: number) => {
    const formattedLat = latitude.toFixed(6);
    const formattedLng = longitude.toFixed(6);
    const wkt = `SRID=4326;POINT(${formattedLng} ${formattedLat})`;
    setWktString(wkt);
    onCoordinatesChange(formattedLat, formattedLng, wkt);
  };

  // Attempt to acquire Geolocation coordinates
  const acquireGPSLocation = () => {
    if (!navigator.geolocation) {
      const errMsg = 'Geolocation API is not supported by your browser.';
      setGpsError(errMsg);
      if (showNotification) showNotification(errMsg, 'error');
      return;
    }

    setIsLocating(true);
    setGpsError(null);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        setCurrentCenter([latitude, longitude]);
        setMarkerPos([latitude, longitude]);
        updateWKT(latitude, longitude);
        setIsLocating(false);
        if (showNotification) {
          showNotification('GPS Coordinates locked successfully!', 'success');
        }
      },
      (error) => {
        setIsLocating(false);
        let detailedError = 'Failed to acquire location.';
        switch (error.code) {
          case error.PERMISSION_DENIED:
            detailedError = 'Location access denied. Please allow location permissions or pin manual coordinates.';
            break;
          case error.POSITION_UNAVAILABLE:
            detailedError = 'GPS position is currently unavailable.';
            break;
          case error.TIMEOUT:
            detailedError = 'GPS request timed out.';
            break;
        }
        setGpsError(detailedError);
        if (showNotification) {
          showNotification(detailedError, 'warning');
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 8000,
        maximumAge: 0
      }
    );
  };

  // Run on mount to initialize user's center
  useEffect(() => {
    // If we have initial values passed from state, use them
    const parseLat = parseFloat(lat);
    const parseLng = parseFloat(lng);
    if (!isNaN(parseLat) && !isNaN(parseLng) && parseLat !== 0 && parseLng !== 0) {
      setCurrentCenter([parseLat, parseLng]);
      setMarkerPos([parseLat, parseLng]);
      updateWKT(parseLat, parseLng);
      setTilesLoading(false);
    } else {
      acquireGPSLocation();
    }
  }, []);

  const handleMapClick = (latlng: L.LatLng) => {
    setMarkerPos([latlng.lat, latlng.lng]);
    updateWKT(latlng.lat, latlng.lng);
  };

  return (
    <div className="space-y-3" id="interactive-map-container">
      <div className="flex justify-between items-center bg-slate-900/80 border border-slate-850 p-3 rounded-2xl">
        <div className="flex items-center gap-2">
          <MapPin className="w-4 h-4 text-indigo-400" />
          <span className="text-[11px] font-bold text-slate-300">Geospatial Locator (PostGIS Align)</span>
        </div>
        <button
          type="button"
          onClick={acquireGPSLocation}
          disabled={isLocating}
          className="flex items-center gap-1.5 bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/20 text-indigo-400 rounded-xl px-2.5 py-1 text-[10px] font-bold transition disabled:opacity-50 cursor-pointer"
        >
          <RefreshCw className={`w-3 h-3 ${isLocating ? 'animate-spin' : ''}`} />
          <span>{isLocating ? 'Acquiring GPS...' : 'Locate Me'}</span>
        </button>
      </div>

      <div className="relative h-64 w-full rounded-2xl overflow-hidden border border-slate-850 bg-slate-950 shadow-inner group">
        {/* Leaflet map container */}
        <MapContainer
          center={currentCenter}
          zoom={15}
          className="h-full w-full z-10"
          style={{ background: '#020617' }}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
            eventHandlers={{
              add: () => setTilesLoading(false),
              loading: () => setTilesLoading(true),
            }}
          />

          <MapUpdater center={currentCenter} />

          <MapEventsHandler 
            onMapClick={handleMapClick}
          />

          {markerPos && (
            <Marker position={markerPos} icon={customMarkerIcon} />
          )}
        </MapContainer>

        {/* Tiles Loading State Overlay */}
        {tilesLoading && (
          <div className="absolute inset-0 bg-slate-950/80 z-20 flex items-center justify-center pointer-events-none transition-all duration-300 animate-fade-in">
            <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 rounded-2xl px-4 py-2 shadow-xl">
              <Loader className="w-4 h-4 text-indigo-400 animate-spin" />
              <span className="text-[10px] font-mono text-slate-300">Rendering tile matrix...</span>
            </div>
          </div>
        )}

        {/* GPS Location Prompt Overlay */}
        {isLocating && (
          <div className="absolute inset-0 bg-slate-950/70 z-20 flex items-center justify-center pointer-events-none animate-fade-in">
            <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 rounded-2xl px-4 py-2 shadow-xl">
              <Navigation className="w-4 h-4 text-emerald-400 animate-pulse" />
              <span className="text-[10px] font-mono text-slate-300">Acquiring orbital GPS data...</span>
            </div>
          </div>
        )}
      </div>

      {gpsError && (
        <div className="bg-amber-500/10 border border-amber-500/20 text-amber-400 text-[10px] rounded-xl p-3 flex items-start gap-2 animate-fade-in">
          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
          <p className="leading-normal">{gpsError}</p>
        </div>
      )}

      {/* Geospatial feedback block showing live coordinates and computed PostGIS WKT string */}
      {markerPos && (
        <div className="bg-slate-950/90 border border-slate-850 rounded-xl p-3 space-y-1.5 animate-fade-in">
          <div className="flex justify-between items-center">
            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider font-mono">PostGIS Feature Alignment</span>
            <div className="flex items-center gap-1 text-[9px] text-emerald-400 font-mono">
              <CheckCircle className="w-3.5 h-3.5" />
              <span>Aligned</span>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3 pt-1">
            <div className="bg-slate-900 border border-slate-850 p-2 rounded-lg">
              <p className="text-[9px] text-slate-500 uppercase font-bold font-mono">Latitude</p>
              <p className="text-xs text-white font-mono font-medium mt-0.5">{markerPos[0].toFixed(6)}</p>
            </div>
            <div className="bg-slate-900 border border-slate-850 p-2 rounded-lg">
              <p className="text-[9px] text-slate-500 uppercase font-bold font-mono">Longitude</p>
              <p className="text-xs text-white font-mono font-medium mt-0.5">{markerPos[1].toFixed(6)}</p>
            </div>
          </div>
          {showWKT && (
            <div className="pt-2">
              <p className="text-[9px] text-slate-500 uppercase font-bold font-mono mb-1">Generated WKT String</p>
              <div className="bg-slate-900 border border-slate-850 p-2 rounded-lg font-mono text-[10px] text-indigo-400 select-all break-all leading-normal">
                {wktString}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
