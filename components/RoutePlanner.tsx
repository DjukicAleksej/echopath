/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/



import React, { useState, useRef, useEffect } from 'react';
import { MapPin, Navigation, Loader2, Footprints, Car, CloudRain, Sparkles, ScrollText, Sword } from 'lucide-react';
import { RouteDetails, AppState, StoryStyle } from '../types';

interface Props {
  onRouteFound: (details: RouteDetails) => void;
  appState: AppState;
  externalError?: string | null;
}

type TravelMode = 'WALKING' | 'DRIVING';

const STYLES: { id: StoryStyle; label: string; icon: React.ElementType; desc: string }[] = [
    { id: 'NOIR', label: 'Noir Thriller', icon: CloudRain, desc: 'Gritty, mysterious, rain-slicked streets.' },
    { id: 'CHILDREN', label: 'Children\'s Story', icon: Sparkles, desc: 'Whimsical, magical, and full of wonder.' },
    { id: 'HISTORICAL', label: 'Historical Epic', icon: ScrollText, desc: 'Grand, dramatic, echoing the past.' },
    { id: 'FANTASY', label: 'Fantasy Adventure', icon: Sword, desc: 'An epic quest through a magical realm.' },
];

// Simple geocoding function using Nominatim (OpenStreetMap)
const geocodeAddress = async (address: string): Promise<{ lat: number; lon: number; display_name: string } | null> => {
    try {
        const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}&limit=1`);
        const data = await response.json();
        if (data && data.length > 0) {
            return {
                lat: parseFloat(data[0].lat),
                lon: parseFloat(data[0].lon),
                display_name: data[0].display_name
            };
        }
        return null;
    } catch (error) {
        console.error('Geocoding error:', error);
        return null;
    }
};

// Simple routing function using OSRM (Open Source Routing Machine)
const calculateRoute = async (start: { lat: number; lon: number }, end: { lat: number; lon: number }, travelMode: TravelMode) => {
    const profile = travelMode === 'WALKING' ? 'foot' : 'driving';
    try {
        const response = await fetch(`https://router.project-osrm.org/route/v1/${profile}/${start.lon},${start.lat};${end.lon},${end.lat}?overview=false`);
        const data = await response.json();
        if (data.routes && data.routes.length > 0) {
            return data.routes[0];
        }
        return null;
    } catch (error) {
        console.error('Routing error:', error);
        return null;
    }
};

const RoutePlanner: React.FC<Props> = ({ onRouteFound, appState, externalError }) => {
  const [startAddress, setStartAddress] = useState('');
  const [endAddress, setEndAddress] = useState('');
  const [travelMode, setTravelMode] = useState<TravelMode>('WALKING');
  const [selectedStyle, setSelectedStyle] = useState<StoryStyle>('NOIR');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const startInputRef = useRef<HTMLInputElement>(null);
  const endInputRef = useRef<HTMLInputElement>(null);

  // Sync external errors (like timeouts from App.tsx) into local UI
  useEffect(() => {
    if (externalError) {
        setError(externalError);
    }
  }, [externalError]);

  const handleCalculate = async () => {
    const finalStart = startInputRef.current?.value || startAddress;
    const finalEnd = endInputRef.current?.value || endAddress;

    if (!finalStart || !finalEnd) {
      setError("Please enter both a start and end location.");
      return;
    }

    setError(null);
    setIsLoading(true);

    try {
        // Geocode both addresses
        const startCoords = await geocodeAddress(finalStart);
        const endCoords = await geocodeAddress(finalEnd);

        if (!startCoords || !endCoords) {
            setError("Could not find one or both locations. Please check the addresses and try again.");
            setIsLoading(false);
            return;
        }

        // Calculate route
        const route = await calculateRoute(startCoords, endCoords, travelMode);

        if (!route) {
            setError("Could not calculate route between these locations. Please try different locations.");
            setIsLoading(false);
            return;
        }

        const duration = route.duration; // in seconds
        const distance = route.distance; // in meters

        // 4 hours limit (14400 seconds) to prevent generation timeouts
        if (duration > 14400) {
            setError("Sorry, this journey is too long. Please select a route under 4 hours.");
            setIsLoading(false);
            return;
        }

        // Format duration and distance
        const hours = Math.floor(duration / 3600);
        const minutes = Math.floor((duration % 3600) / 60);
        const durationText = hours > 0 ? `${hours}h ${minutes}min` : `${minutes}min`;
        
        const distanceKm = (distance / 1000).toFixed(1);
        const distanceText = `${distanceKm} km`;

        onRouteFound({
            startAddress: startCoords.display_name,
            endAddress: endCoords.display_name,
            distance: distanceText,
            duration: durationText,
            durationSeconds: duration,
            travelMode: travelMode,
            voiceName: 'Kore',
            storyStyle: selectedStyle
        });

    } catch (error) {
        console.error('Route calculation error:', error);
        setError("Failed to calculate route. Please try again.");
    } finally {
        setIsLoading(false);
    }
  };

  const isLocked = appState > AppState.ROUTE_CONFIRMED;

  return (
    <div className={`transition-all duration-700 ${isLocked ? 'opacity-50 pointer-events-none grayscale' : ''}`}>
      <div className="space-y-8 bg-white/80 backdrop-blur-lg p-8 md:p-10 rounded-[2rem] shadow-2xl shadow-stone-200/50 border border-white/50">
        <div className="space-y-1">
            <h2 className="text-2xl font-serif text-editorial-900">Plan Your Journey</h2>
            <p className="text-stone-500">Enter locations and customize your experience.</p>
        </div>

        <div className="space-y-4">
          <div className="relative group z-20 h-14 bg-stone-50/50 border-2 border-stone-100 focus-within:border-editorial-900 focus-within:bg-white rounded-xl transition-all shadow-sm focus-within:shadow-md overflow-hidden">
            <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-400 group-focus-within:text-editorial-900 transition-colors pointer-events-none z-10" size={20} />
            <input
                ref={startInputRef}
                type="text"
                placeholder="Starting Point"
                className="w-full h-full bg-transparent p-0 pl-12 pr-4 text-editorial-900 placeholder-stone-400 outline-none font-medium text-base"
                onChange={(e) => setStartAddress(e.target.value)}
                disabled={isLocked}
            />
          </div>

          <div className="relative group z-10 h-14 bg-stone-50/50 border-2 border-stone-100 focus-within:border-editorial-900 focus-within:bg-white rounded-xl transition-all shadow-sm focus-within:shadow-md overflow-hidden">
            <Navigation className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-400 group-focus-within:text-editorial-900 transition-colors pointer-events-none z-10" size={20} />
            <input
                ref={endInputRef}
                type="text"
                placeholder="Destination"
                className="w-full h-full bg-transparent p-0 pl-12 pr-4 text-editorial-900 placeholder-stone-400 outline-none font-medium text-base"
                onChange={(e) => setEndAddress(e.target.value)}
                disabled={isLocked}
            />
          </div>
        </div>

        {/* Settings Grid */}
        <div className="grid grid-cols-1 gap-6">
            {/* Travel Mode */}
            <div className="space-y-3">
                <label className="text-sm font-medium text-stone-500 uppercase tracking-wider">Travel Mode</label>
                <div className="flex gap-2 bg-stone-100/50 p-1.5 rounded-xl border border-stone-100">
                    {(['WALKING', 'DRIVING'] as TravelMode[]).map((mode) => (
                        <button
                            key={mode}
                            onClick={() => setTravelMode(mode)}
                            disabled={isLocked}
                            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg font-medium text-sm transition-all ${
                                travelMode === mode 
                                    ? 'bg-white text-editorial-900 shadow-md' 
                                    : 'text-stone-500 hover:bg-stone-200/50 hover:text-stone-700'
                            }`}
                        >
                            {mode === 'WALKING' && <Footprints size={18} />}
                            {mode === 'DRIVING' && <Car size={18} />}
                            <span className="hidden lg:inline">
                                {mode === 'WALKING' ? 'Walk' : 'Drive'}
                            </span>
                        </button>
                    ))}
                </div>
            </div>
        </div>

        {/* Story Style Selector */}
        <div className="space-y-3">
            <label className="text-sm font-medium text-stone-500 uppercase tracking-wider">Story Style</label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {STYLES.map((style) => {
                    const Icon = style.icon;
                    const isSelected = selectedStyle === style.id;
                    return (
                        <button
                            key={style.id}
                            onClick={() => setSelectedStyle(style.id)}
                            disabled={isLocked}
                            className={`flex items-start gap-3 p-4 rounded-xl border-2 text-left transition-all ${
                                isSelected
                                    ? 'border-editorial-900 bg-editorial-900 text-white shadow-md'
                                    : 'border-stone-100 bg-stone-50/50 text-stone-600 hover:border-stone-300 hover:bg-stone-100'
                            }`}
                        >
                            <Icon size={24} className={`shrink-0 ${isSelected ? 'text-white' : 'text-stone-400'}`} />
                            <div>
                                <div className={`font-bold ${isSelected ? 'text-white' : 'text-editorial-900'}`}>
                                    {style.label}
                                </div>
                                <div className={`text-xs mt-1 leading-tight ${isSelected ? 'text-stone-300' : 'text-stone-500'}`}>
                                    {style.desc}
                                </div>
                            </div>
                        </button>
                    );
                })}
            </div>
        </div>

        {error && (
          <p className="text-red-600 text-sm bg-red-50 p-3 rounded-lg font-medium animate-fade-in">{error}</p>
        )}

        <button
          onClick={handleCalculate}
          disabled={isLoading || isLocked || !startAddress || !endAddress}
          className="w-full bg-editorial-900 text-white py-4 rounded-full font-bold text-lg hover:bg-stone-800 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg shadow-editorial-900/20 active:scale-[0.99]"
        >
          {isLoading ? (
            <>
              <Loader2 className="animate-spin" /> Planning Journey...
            </>
          ) : (
            <>
               <Sparkles size={20} className="animate-subtle-pulse" />
               Generate your story
            </>
          )}
        </button>
      </div>
    </div>
  );
};

export default RoutePlanner;