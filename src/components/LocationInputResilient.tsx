import React, { useState } from 'react';
import { MapPin, Navigation, Search, CheckCircle, AlertTriangle, Loader2 } from 'lucide-react';
import InteractiveMap from './InteractiveMap';

interface LocationInputResilientProps {
  lat: string;
  lng: string;
  onCoordinatesChange: (lat: string, lng: string) => void;
  showNotification: (msg: string, type?: string) => void;
}

export default function LocationInputResilient({
  lat,
  lng,
  onCoordinatesChange,
  showNotification
}: LocationInputResilientProps) {
  const [activeTab, setActiveTab] = useState<'map' | 'address' | 'gps'>('map');
  const [addressInput, setAddressInput] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [isLocating, setIsLocating] = useState(false);

  // Derive validated SRID=4326 format
  const parsedLat = parseFloat(lat) || 28.6139;
  const parsedLng = parseFloat(lng) || 77.2090;
  const sridString = `SRID=4326;POINT(${parsedLng.toFixed(6)} ${parsedLat.toFixed(6)})`;

  // Method A: GPS auto-locator
  const handleGPSLocate = () => {
    if (!navigator.geolocation) {
      showNotification('Geolocation is not supported by your browser.', 'error');
      return;
    }

    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const newLat = position.coords.latitude.toFixed(6);
        const newLng = position.coords.longitude.toFixed(6);
        onCoordinatesChange(newLat, newLng);
        showNotification('GPS coordinates acquired successfully!', 'success');
        setIsLocating(false);
      },
      (error) => {
        console.warn('GPS lookup error:', error);
        showNotification('Failed to obtain GPS. Please try manual pinning.', 'warning');
        setIsLocating(false);
      },
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 0 }
    );
  };

  // Method C: Geocoding via Nominatim OpenStreetMap API
  const handleAddressSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addressInput.trim()) return;

    setIsSearching(true);
    try {
      // Nominatim requires an email contact or identifier to avoid excessive scraping blocks
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(addressInput)}&limit=1`,
        {
          headers: {
            'Accept-Language': 'en',
            'User-Agent': 'FixNGo-Municipal-Dispatches-App'
          }
        }
      );

      if (!response.ok) {
        throw new Error('Nominatim query returned non-200 response status');
      }

      const data = await response.json();
      if (data && data.length > 0) {
        const foundLat = parseFloat(data[0].lat).toFixed(6);
        const foundLng = parseFloat(data[0].lon).toFixed(6);
        onCoordinatesChange(foundLat, foundLng);
        showNotification(`Centered on: ${data[0].display_name}`, 'success');
      } else {
        showNotification('No coordinates found for that address. Please try refining or pin on map.', 'warning');
      }
    } catch (err) {
      console.error('Nominatim request exception:', err);
      showNotification('Geocoding service unavailable. Please pin manually.', 'error');
    } finally {
      setIsSearching(false);
    }
  };

  return (
    <div className="space-y-4 bg-slate-900 border border-slate-800 rounded-2xl p-4">
      {/* Tab Selector */}
      <div className="grid grid-cols-3 gap-2 bg-slate-950 p-1 rounded-xl border border-slate-850">
        <button
          type="button"
          onClick={() => setActiveTab('map')}
          className={`flex items-center justify-center gap-1.5 py-2 text-[11px] font-bold rounded-lg cursor-pointer transition ${
            activeTab === 'map'
              ? 'bg-indigo-600 text-white shadow'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <MapPin className="w-3.5 h-3.5" />
          <span>Manual Pin</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('address')}
          className={`flex items-center justify-center gap-1.5 py-2 text-[11px] font-bold rounded-lg cursor-pointer transition ${
            activeTab === 'address'
              ? 'bg-indigo-600 text-white shadow'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Search className="w-3.5 h-3.5" />
          <span>Address Search</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('gps')}
          className={`flex items-center justify-center gap-1.5 py-2 text-[11px] font-bold rounded-lg cursor-pointer transition ${
            activeTab === 'gps'
              ? 'bg-indigo-600 text-white shadow'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Navigation className="w-3.5 h-3.5" />
          <span>GPS Locate</span>
        </button>
      </div>

      {/* Dynamic Tab Body */}
      {activeTab === 'gps' && (
        <div className="bg-slate-950 rounded-xl p-3 border border-slate-850 text-center space-y-2.5 animate-fade-in">
          <p className="text-[10px] text-slate-400 leading-normal">
            Request instant device-level triangulation coordinates from high-accuracy GPS arrays.
          </p>
          <button
            type="button"
            onClick={handleGPSLocate}
            disabled={isLocating}
            className="inline-flex items-center gap-2 bg-indigo-500 hover:bg-indigo-600 text-slate-950 font-bold text-xs px-5 py-2.5 rounded-xl transition cursor-pointer disabled:opacity-55"
          >
            {isLocating ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Acquiring Signals...</span>
              </>
            ) : (
              <>
                <Navigation className="w-3.5 h-3.5" />
                <span>Fetch GPS Coordinates</span>
              </>
            )}
          </button>
        </div>
      )}

      {activeTab === 'address' && (
        <form onSubmit={handleAddressSearch} className="bg-slate-950 rounded-xl p-3 border border-slate-850 space-y-2.5 animate-fade-in">
          <p className="text-[10px] text-slate-400 leading-normal">
            Enter a street address, locality, or landmark name to geocode via OpenStreetMap index:
          </p>
          <div className="flex gap-2">
            <input
              type="text"
              value={addressInput}
              onChange={(e) => setAddressInput(e.target.value)}
              placeholder="e.g. Connaught Place, New Delhi"
              className="flex-1 bg-slate-900 border border-slate-800 text-slate-200 text-xs rounded-xl px-3 py-2 outline-none focus:border-indigo-500 transition-colors"
            />
            <button
              type="submit"
              disabled={isSearching || !addressInput.trim()}
              className="bg-indigo-500 hover:bg-indigo-600 disabled:bg-slate-800 disabled:text-slate-500 text-slate-950 font-bold text-xs px-4 py-2 rounded-xl transition flex items-center justify-center cursor-pointer"
            >
              {isSearching ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Search className="w-3.5 h-3.5" />}
            </button>
          </div>
        </form>
      )}

      {/* Map Element (Remains persistent & active in all modes so users can fine-tune) */}
      <div className="space-y-2 animate-fade-in">
        {activeTab === 'map' && (
          <p className="text-[10px] text-slate-400 leading-normal mb-1">
            Drag the crosshair or click anywhere on the Greater Mohalla grid map below to manually pin coordinates:
          </p>
        )}
        <div className="rounded-xl overflow-hidden border border-slate-850">
          <InteractiveMap
            lat={lat}
            lng={lng}
            onCoordinatesChange={(newLat, newLng) => {
              onCoordinatesChange(newLat, newLng);
            }}
            showNotification={showNotification}
            showWKT={false} // Hidden per user requirement to only show in Admin
          />
        </div>
      </div>


    </div>
  );
}
