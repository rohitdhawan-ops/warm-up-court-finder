import { useCallback, useState } from 'react';
import {
  GoogleMap,
  Marker,
  InfoWindow,
  useJsApiLoader,
} from '@react-google-maps/api';
import { Court } from '../pages/api/find-courts';

interface CourtMapProps {
  venueLocation: { lat: number; lng: number };
  venueAddress: string;
  courts: Court[];
}

const MAP_CONTAINER_STYLE = { width: '100%', height: '400px' };

export default function CourtMap({ venueLocation, venueAddress, courts }: CourtMapProps) {
  const { isLoaded, loadError } = useJsApiLoader({
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? '',
  });

  const [selectedCourt, setSelectedCourt] = useState<Court | null>(null);
  const [map, setMap] = useState<google.maps.Map | null>(null);

  const onLoad = useCallback((mapInstance: google.maps.Map) => {
    setMap(mapInstance);
  }, []);

  const onUnmount = useCallback(() => {
    setMap(null);
  }, []);

  if (loadError) {
    return (
      <div className="flex h-64 items-center justify-center rounded-lg bg-red-50 text-red-700">
        Failed to load map. Check that your API key has Maps JavaScript API enabled.
      </div>
    );
  }

  if (!isLoaded) {
    return (
      <div className="flex h-64 items-center justify-center rounded-lg bg-gray-100 text-gray-500">
        Loading map...
      </div>
    );
  }

  // Fit bounds to show venue + all courts
  const handleMapLoad = (mapInstance: google.maps.Map) => {
    if (courts.length > 0) {
      const bounds = new window.google.maps.LatLngBounds();
      bounds.extend(venueLocation);
      courts.forEach((c) => bounds.extend({ lat: c.lat, lng: c.lng }));
      mapInstance.fitBounds(bounds, 60);
    }
  };

  return (
    <GoogleMap
      mapContainerStyle={MAP_CONTAINER_STYLE}
      center={venueLocation}
      zoom={12}
      onLoad={(m) => { onLoad(m); handleMapLoad(m); }}
      onUnmount={onUnmount}
    >
      {/* Tournament venue marker - red */}
      <Marker
        position={venueLocation}
        title={venueAddress}
        label={{ text: '🎾', fontSize: '20px' }}
        zIndex={10}
      />

      {/* Court markers - green */}
      {courts.map((court) => (
        <Marker
          key={court.placeId}
          position={{ lat: court.lat, lng: court.lng }}
          title={court.name}
          onClick={() => setSelectedCourt(court)}
          icon={{
            path: window.google.maps.SymbolPath.CIRCLE,
            scale: 10,
            fillColor: '#16a34a',
            fillOpacity: 1,
            strokeColor: '#ffffff',
            strokeWeight: 2,
          }}
        />
      ))}

      {/* Info window for selected court */}
      {selectedCourt && (
        <InfoWindow
          position={{ lat: selectedCourt.lat, lng: selectedCourt.lng }}
          onCloseClick={() => setSelectedCourt(null)}
        >
          <div className="max-w-xs">
            <p className="font-semibold text-gray-900">{selectedCourt.name}</p>
            <p className="text-sm text-gray-600">{selectedCourt.address}</p>
            <p className="mt-1 text-sm font-medium text-green-700">
              {selectedCourt.driveTimeMinutes} min drive
            </p>
          </div>
        </InfoWindow>
      )}
    </GoogleMap>
  );
}
