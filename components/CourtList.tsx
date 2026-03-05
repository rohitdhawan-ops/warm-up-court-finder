import { Court } from '../pages/api/find-courts';

interface CourtListProps {
  courts: Court[];
  venueAddress: string;
  maxDriveMinutes: number;
}

export default function CourtList({ courts, venueAddress, maxDriveMinutes }: CourtListProps) {
  if (courts.length === 0) {
    return (
      <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-6 text-center text-yellow-800">
        <p className="text-lg font-medium">No courts found within {maxDriveMinutes} minutes</p>
        <p className="mt-1 text-sm">Try a different address or check that your API key is active.</p>
      </div>
    );
  }

  return (
    <div>
      <h2 className="mb-3 text-xl font-semibold text-gray-800">
        {courts.length} court{courts.length !== 1 ? 's' : ''} found within {maxDriveMinutes} minutes
      </h2>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {courts.map((court) => {
          const directionsUrl = `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(venueAddress)}&destination=${encodeURIComponent(court.address)}&destination_place_id=${court.placeId}&travelmode=driving`;
          return (
            <div
              key={court.placeId}
              className="flex flex-col justify-between rounded-lg border border-gray-200 bg-white p-4 shadow-sm"
            >
              <div>
                <h3 className="font-semibold text-gray-900">{court.name}</h3>
                <p className="mt-1 text-sm text-gray-500">{court.address}</p>
              </div>
              <div className="mt-4 flex items-center justify-between">
                <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-3 py-1 text-sm font-medium text-green-800">
                  🕐 {court.driveTimeMinutes} min drive
                </span>
                <a
                  href={directionsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm font-medium text-green-600 hover:text-green-800 hover:underline"
                >
                  Get Directions →
                </a>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
