import React, { useRef, useState } from 'react';
import { Camera, Upload, Trash2, RefreshCw, Compass, MapPin } from 'lucide-react';
import exifr from 'exifr';

interface MediaCaptureProps {
  uploadedImage: string;
  setUploadedImage: (val: string) => void;
  setUploadedFile: (val: File | null) => void;
  onLocationExtracted: (lat: string, lng: string) => void;
  showNotification: (msg: string, type?: string) => void;
}

export default function MediaCapture({
  uploadedImage,
  setUploadedImage,
  setUploadedFile,
  onLocationExtracted,
  showNotification
}: MediaCaptureProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const [isExtracting, setIsExtracting] = useState(false);
  const [hasGPS, setHasGPS] = useState<boolean | null>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadedFile(file);
    setIsExtracting(true);
    setHasGPS(null);

    // 1. Generate local base64/URL preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setUploadedImage(reader.result as string);
    };
    reader.readAsDataURL(file);

    // 2. Extract EXIF data using exifr
    try {
      const gps = await exifr.gps(file);
      if (gps && typeof gps.latitude === 'number' && typeof gps.longitude === 'number') {
        const latStr = gps.latitude.toFixed(6);
        const lngStr = gps.longitude.toFixed(6);
        onLocationExtracted(latStr, lngStr);
        setHasGPS(true);
        showNotification(`GPS Location extracted: ${latStr}, ${lngStr}!`, 'success');
      } else {
        setHasGPS(false);
        showNotification('No location data found in photo. Please pin the location manually.', 'warning');
      }
    } catch (err) {
      console.warn('EXIF metadata parsing failed or not present:', err);
      setHasGPS(false);
      showNotification('No location data found in photo. Please pin the location manually.', 'warning');
    } finally {
      setIsExtracting(false);
    }
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    setUploadedImage('');
    setUploadedFile(null);
    setHasGPS(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
    if (cameraInputRef.current) cameraInputRef.current.value = '';
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  const triggerCameraInput = () => {
    cameraInputRef.current?.click();
  };

  return (
    <div className="space-y-3">
      {/* Hidden standard file inputs */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        className="hidden"
        id="mc-upload-photo"
      />
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleFileChange}
        className="hidden"
        id="mc-open-camera"
      />

      {uploadedImage ? (
        <div className="relative group rounded-2xl overflow-hidden border border-slate-800 bg-slate-950 aspect-video flex items-center justify-center shadow-inner">
          <img
            src={uploadedImage}
            alt="Uploaded Evidence"
            className="w-full h-full object-cover transition duration-300 group-hover:scale-105"
            referrerPolicy="no-referrer"
          />
          
          {/* Subtle info pill on image overlay */}
          <div className="absolute top-3 left-3 flex flex-col gap-1.5">
            {isExtracting ? (
              <span className="flex items-center gap-1 bg-slate-900/90 text-indigo-400 text-[10px] font-bold px-2.5 py-1 rounded-full border border-indigo-500/30 shadow-md">
                <Compass className="w-3 h-3 animate-spin" />
                Reading GPS EXIF...
              </span>
            ) : hasGPS ? (
              <span className="flex items-center gap-1 bg-emerald-500/95 text-slate-950 text-[10px] font-bold px-2.5 py-1 rounded-full border border-emerald-400 shadow-md">
                <MapPin className="w-3 h-3" />
                GPS Extracted
              </span>
            ) : (
              <span className="flex items-center gap-1 bg-amber-500/95 text-slate-950 text-[10px] font-bold px-2.5 py-1 rounded-full border border-amber-400 shadow-md">
                <Compass className="w-3 h-3" />
                No EXIF GPS Metadata
              </span>
            )}
          </div>

          {/* Overlay actions */}
          <div className="absolute inset-0 bg-slate-950/60 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center gap-3">
            <button
              onClick={triggerFileInput}
              type="button"
              className="flex items-center gap-1.5 bg-slate-900/90 hover:bg-slate-800 text-slate-200 text-xs px-3.5 py-2 rounded-xl border border-slate-850 cursor-pointer transition shadow-lg"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Replace</span>
            </button>
            <button
              onClick={handleClear}
              type="button"
              className="flex items-center gap-1.5 bg-red-500 hover:bg-red-600 text-slate-950 text-xs px-3.5 py-2 rounded-xl font-bold cursor-pointer transition shadow-lg"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Remove</span>
            </button>
          </div>
        </div>
      ) : (
        <div className="border border-dashed border-slate-800 rounded-2xl p-5 bg-slate-950 hover:border-slate-700 transition duration-200">
          <div className="flex flex-col items-center text-center space-y-4">
            <div className="w-12 h-12 rounded-full bg-slate-900 border border-slate-850 flex items-center justify-center text-slate-400">
              <Camera className="w-5 h-5 text-indigo-400" />
            </div>
            
            <div className="space-y-1">
              <p className="text-xs font-semibold text-slate-300">Evidence Capture & Smart Extraction</p>
              <p className="text-[10px] text-slate-500 max-w-xs leading-normal">
                Take a photo or upload an existing image. Our engine will auto-extract embedded geolocation tags using EXIF readers.
              </p>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-3 w-full">
              <button
                type="button"
                onClick={triggerFileInput}
                className="flex items-center gap-1.5 bg-slate-900 hover:bg-slate-850 text-slate-200 text-xs px-4 py-2.5 rounded-xl border border-slate-800 cursor-pointer transition"
              >
                <Upload className="w-3.5 h-3.5 text-indigo-400" />
                <span>Upload Photo</span>
              </button>
              
              <button
                type="button"
                onClick={triggerCameraInput}
                className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs px-4 py-2.5 rounded-xl cursor-pointer transition shadow-[0_0_12px_rgba(79,70,229,0.3)]"
              >
                <Camera className="w-3.5 h-3.5" />
                <span>Open Camera</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
