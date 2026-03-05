import { useState } from 'react';
import Head from 'next/head';
import SearchForm from '../components/SearchForm';
import CourtMap from '../components/CourtMap';
import CourtList from '../components/CourtList';
import { Court } from './api/find-courts';

interface VenueLocation {
  lat: number;
  lng: number;
}

export default function Home() {
  const [courts, setCourts] = useState<Court[] | null>(null);
  const [venueLocation, setVenueLocation] = useState<VenueLocation | null>(null);
  const [venueAddress, setVenueAddress] = useState('');
  const [maxDriveMinutes, setMaxDriveMinutes] = useState(15);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSearch(address: string, minutes: number) {
    setIsLoading(true);
    setError('');
    setCourts(null);
    setVenueLocation(null);
    setVenueAddress(address);
    setMaxDriveMinutes(minutes);

    try {
      const res = await fetch('/api/find-courts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address, maxDriveMinutes: minutes }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Something went wrong');
      }

      // Geocode the venue address to get coordinates for the map center
      const geoRes = await fetch(
        `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}`
      );
      const geoData = await geoRes.json();
      if (geoData.status === 'OK' && geoData.results.length > 0) {
        setVenueLocation(geoData.results[0].geometry.location);
      }

      setCourts(data as Court[]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <>
      <Head>
        <title>Warm Up Court Finder</title>
        <meta name="description" content="Find public tennis courts near your USTA tournament site" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>

      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <header className="bg-green-700 text-white shadow">
          <div className="mx-auto max-w-5xl px-4 py-6">
            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">🎾 Warm Up Court Finder</h1>
            <p className="mt-1 text-green-100">
              Find public tennis courts within a {maxDriveMinutes}-minute drive of your tournament venue
            </p>
          </div>
        </header>

        {/* Main content */}
        <main className="mx-auto max-w-5xl px-4 py-8 space-y-8">
          {/* Search */}
          <section className="rounded-xl bg-white p-6 shadow-sm">
            <label className="mb-2 block text-sm font-medium text-gray-700">
              Tournament Venue Address
            </label>
            <SearchForm onSearch={handleSearch} isLoading={isLoading} />
          </section>

          {/* Error */}
          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-800">
              <strong>Error:</strong> {error}
            </div>
          )}

          {/* Loading skeleton */}
          {isLoading && (
            <div className="space-y-4 animate-pulse">
              <div className="h-64 rounded-xl bg-gray-200" />
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-32 rounded-lg bg-gray-200" />
                ))}
              </div>
            </div>
          )}

          {/* Results */}
          {!isLoading && courts !== null && venueLocation && (
            <>
              <section className="overflow-hidden rounded-xl shadow-sm">
                <CourtMap
                  venueLocation={venueLocation}
                  venueAddress={venueAddress}
                  courts={courts}
                />
              </section>
              <section>
                <CourtList courts={courts} venueAddress={venueAddress} maxDriveMinutes={maxDriveMinutes} />
              </section>
            </>
          )}

          {/* Courts returned but venue geocode failed */}
          {!isLoading && courts !== null && !venueLocation && (
            <section>
              <CourtList courts={courts} venueAddress={venueAddress} maxDriveMinutes={maxDriveMinutes} />
            </section>
          )}
        </main>

        <footer className="mt-12 border-t border-gray-200 py-6 text-center text-sm text-gray-400">
          Powered by Google Maps • Built for USTA tournament players
        </footer>
      </div>
    </>
  );
}
