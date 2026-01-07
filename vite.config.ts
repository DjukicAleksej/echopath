/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/


import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    
    // helper to clean keys
    const cleanKey = (key: string | undefined) => {
      if (!key) return undefined;
      const k = key.trim();
      // Filter out common placeholders or invalid values
      if (k === '' || k.includes('YOUR_API_KEY')) return undefined;
      return k;
    };

    // Try to find Hack Club API key
    const hackclubApiKey = cleanKey(process.env.HACKCLUB_API_KEY) || 
                          cleanKey(env.HACKCLUB_API_KEY);

    if (!hackclubApiKey) {
       console.warn("⚠️  WARNING: HACKCLUB_API_KEY is undefined. The app may not function correctly.");
    } else {
       console.log("✅ HACKCLUB_API_KEY loaded for build.");
    }

    return {
      server: {
        port: 3000,
        host: '0.0.0.0',
      },
      plugins: [react()],
      define: {
        // Inject Hack Club API key
        'process.env.HACKCLUB_API_KEY': hackclubApiKey ? JSON.stringify(hackclubApiKey) : 'undefined',
      },
      resolve: {
        alias: {
          '@': path.resolve('.'),
        }
      }
    };
});
