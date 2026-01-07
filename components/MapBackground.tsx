/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import React, { useEffect, useRef, useState } from 'react';
import { RouteDetails } from '../types';

// Simple placeholder component since we're removing Google Maps
// We could add Leaflet here later if needed, but for now a simple background

interface Props {
  route: RouteDetails | null;
}

const MapBackground: React.FC<Props> = ({ route }) => {
  const [backgroundStyle, setBackgroundStyle] = useState<React.CSSProperties>({});

  useEffect(() => {
    // Create a simple animated background that changes when route is available
    const style: React.CSSProperties = {
      background: route 
        ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
        : 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)',
      transition: 'all 0.5s ease-in-out',
    };
    setBackgroundStyle(style);
  }, [route]);

  return (
    <div className="absolute inset-0 z-0 opacity-30 pointer-events-none mix-blend-multiply">
      <div 
        className="w-full h-full"
        style={backgroundStyle}
      />
      {/* Overlay gradient to fade edges */}
      <div className="absolute inset-0 bg-gradient-to-b from-editorial-100 via-transparent to-editorial-100"></div>
      <div className="absolute inset-0 bg-gradient-to-r from-editorial-100 via-transparent to-editorial-100"></div>
      
      {/* Simple route indicator */}
      {route && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center text-stone-600 opacity-50">
            <div className="text-sm font-medium mb-2">Route Active</div>
            <div className="text-xs">
              {route.startAddress.split(',')[0]} → {route.endAddress.split(',')[0]}
            </div>
            <div className="text-xs mt-1">
              {route.distance} • {route.duration}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MapBackground;
