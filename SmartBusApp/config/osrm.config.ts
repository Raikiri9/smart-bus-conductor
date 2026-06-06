/**
 * OSRM Configuration
 * Dynamically uses ngrok tunnel for reliable cross-platform distance calculation
 * Especially critical for LD Player x86 emulator which has network bridging issues
 */

import { Platform } from 'react-native';

export const OSRM_URLS = {
  // Ngrok tunnel for OSRM proxy - auto-updated by start-ngrok.ps1
  // Works across all platforms: Android Emulator, LD Player, physical devices
  NGROK: process.env.EXPO_PUBLIC_OSRM_NGROK_URL,
  
  // For Android Emulator: special IP to reach host machine
  ANDROID_EMULATOR: 'http://10.0.2.2:3001',
  
  // For LD Player: use your machine's actual IP (if ngrok unavailable)
  // IMPORTANT: Replace YOUR_IP with your actual IPv4 address from ipconfig
  LD_PLAYER: 'http://YOUR_IP:3001',
  
  // Fallback: public OSRM (only used if local proxy unavailable)
  PUBLIC: 'https://router.project-osrm.org'
};

/**
 * Get the appropriate OSRM URL for current platform
 * Priority: ngrok tunnel (most reliable) → platform-specific → public fallback
 */
export function getOsrmUrl(): string {
  // 1. Try ngrok tunnel first (works for all platforms including LD Player)
  if (OSRM_URLS.NGROK) {
    console.log('[OSRM] Using ngrok tunnel:', OSRM_URLS.NGROK);
    return OSRM_URLS.NGROK;
  }

  // 2. Fall back to platform-specific URLs
  if (Platform.OS === 'android') {
    console.log('[OSRM] Using Android Emulator URL');
    return OSRM_URLS.ANDROID_EMULATOR;
  }

  // 3. Final fallback to public OSRM
  console.log('[OSRM] Using public OSRM fallback');
  return OSRM_URLS.PUBLIC;
}
