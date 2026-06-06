// Haversine formula to calculate distance between two GPS points (km)
export function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Earth radius in km
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// OSRM driving distance in km; falls back to null on any failure
export async function routeDistanceKm(
  startLat: number,
  startLon: number,
  endLat: number,
  endLon: number,
  baseUrl?: string
): Promise<number | null> {
  // Debug flag: set to true to force straight-line distance (for testing LD Player network issues)
  const FORCE_HAVERSINE = false; // Change to true to disable OSRM
  if (FORCE_HAVERSINE) {
    console.log('[OSRM] Bypassed - using straight-line distance only');
    return null;
  }

  // Default to local proxy if available, otherwise use public OSRM
  // For Android Emulator: use http://10.0.2.2:3001 (special IP to reach host machine)
  // For LD Player: use http://<YOUR_IP>:3001 (your actual machine IP)
  // For physical phone/external: use https://router.project-osrm.org
  const host = (baseUrl || 'https://router.project-osrm.org').replace(/\/$/, '');
  const url = `${host}/route/v1/driving/${startLon},${startLat};${endLon},${endLat}?overview=false&alternatives=false&steps=false&annotations=distance`;

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000); // 8 second timeout for proxy

    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timeoutId);

    if (!res.ok) {
      console.warn(`[OSRM] HTTP ${res.status}: ${res.statusText}`);
      return null;
    }
    const json = await res.json();
    const meters = json?.routes?.[0]?.distance;
    if (typeof meters !== 'number' || !Number.isFinite(meters)) {
      console.warn(`[OSRM] Invalid distance data:`, json);
      return null;
    }
    return meters / 1000;
  } catch (error) {
    console.warn(`[OSRM] Fetch failed:`, error instanceof Error ? error.message : String(error));
    return null;
  }
}

function toRad(value: number) {
  return (value * Math.PI) / 180;
}

export default calculateDistance;
