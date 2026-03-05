import type { NextApiRequest, NextApiResponse } from 'next';

export interface Court {
  name: string;
  address: string;
  driveTimeMinutes: number;
  lat: number;
  lng: number;
  placeId: string;
}

interface GeocodeResult {
  geometry: { location: { lat: number; lng: number } };
  formatted_address: string;
}

interface PlaceResult {
  place_id: string;
  name: string;
  formatted_address: string;
  geometry: { location: { lat: number; lng: number } };
  types: string[];
}

interface DistanceMatrixElement {
  status: string;
  duration?: { value: number; text: string };
}

const API_KEY = process.env.GOOGLE_MAPS_API_KEY;
const MAPS_BASE = 'https://maps.googleapis.com/maps/api';

async function geocodeAddress(address: string): Promise<{ lat: number; lng: number }> {
  const url = `${MAPS_BASE}/geocode/json?address=${encodeURIComponent(address)}&key=${API_KEY}`;
  const res = await fetch(url);
  const data = await res.json();
  if (data.status !== 'OK' || !data.results.length) {
    throw new Error(`Could not find location for: "${address}"`);
  }
  const loc = (data.results[0] as GeocodeResult).geometry.location;
  return { lat: loc.lat, lng: loc.lng };
}

async function fetchTennisCourts(lat: number, lng: number): Promise<PlaceResult[]> {
  // Text Search reliably returns actual tennis courts unlike Nearby Search type filter
  const url = `${MAPS_BASE}/place/textsearch/json?query=public+tennis+courts&location=${lat},${lng}&radius=20000&key=${API_KEY}`;
  const res = await fetch(url);
  const data = await res.json();
  if (data.status !== 'OK' && data.status !== 'ZERO_RESULTS') {
    throw new Error(`Places API error: ${data.status}`);
  }
  return (data.results as PlaceResult[]) || [];
}

async function getDriveTimes(
  origin: string,
  destinations: { lat: number; lng: number }[]
): Promise<number[]> {
  const dests = destinations.map((d) => `${d.lat},${d.lng}`).join('|');
  const url = `${MAPS_BASE}/distancematrix/json?origins=${encodeURIComponent(origin)}&destinations=${encodeURIComponent(dests)}&mode=driving&key=${API_KEY}`;
  const res = await fetch(url);
  const data = await res.json();
  if (data.status !== 'OK') {
    throw new Error(`Distance Matrix API error: ${data.status}`);
  }
  const elements = data.rows[0].elements as DistanceMatrixElement[];
  return elements.map((el) => (el.status === 'OK' && el.duration ? el.duration.value : Infinity));
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<Court[] | { error: string }>
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { address } = req.body as { address: string };
  if (!address?.trim()) {
    return res.status(400).json({ error: 'Address is required' });
  }

  if (!API_KEY || API_KEY === 'YOUR_GOOGLE_MAPS_API_KEY_HERE') {
    return res.status(500).json({ error: 'Google Maps API key is not configured' });
  }

  try {
    // Step 1: Geocode the tournament address
    const origin = await geocodeAddress(address);

    // Step 2: Fetch nearby tennis courts via Text Search
    const allCourts = await fetchTennisCourts(origin.lat, origin.lng);

    if (allCourts.length === 0) {
      return res.status(200).json([]);
    }

    // Step 3: Get drive times in batches of 25 (Distance Matrix limit)
    const BATCH_SIZE = 25;
    const driveTimesSeconds: number[] = [];
    for (let i = 0; i < allCourts.length; i += BATCH_SIZE) {
      const batch = allCourts.slice(i, i + BATCH_SIZE);
      const times = await getDriveTimes(
        address,
        batch.map((c) => c.geometry.location)
      );
      driveTimesSeconds.push(...times);
    }

    // Step 4: Filter to ≤ 15 min drive, build result objects, sort ascending
    const MAX_SECONDS = 15 * 60;
    const results: Court[] = allCourts
      .map((court, i) => ({
        name: court.name,
        address: court.formatted_address,
        driveTimeMinutes: Math.round(driveTimesSeconds[i] / 60),
        lat: court.geometry.location.lat,
        lng: court.geometry.location.lng,
        placeId: court.place_id,
      }))
      .filter((_, i) => driveTimesSeconds[i] <= MAX_SECONDS)
      .sort((a, b) => a.driveTimeMinutes - b.driveTimeMinutes);

    return res.status(200).json(results);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'An unexpected error occurred';
    return res.status(500).json({ error: message });
  }
}
