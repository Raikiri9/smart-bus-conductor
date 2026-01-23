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
  const host = (baseUrl || 'https://router.project-osrm.org').replace(/\/$/, '');
  const url = `${host}/route/v1/driving/${startLon},${startLat};${endLon},${endLat}?overview=false&alternatives=false&steps=false&annotations=distance`;

  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const json = await res.json();
    const meters = json?.routes?.[0]?.distance;
    if (typeof meters !== 'number' || !Number.isFinite(meters)) return null;
    return meters / 1000;
  } catch (error) {
    return null;
  }
}

function toRad(value: number) {
  return (value * Math.PI) / 180;
}

export default calculateDistance;
