import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { useEffect, useState } from 'react';
import { Truck, MapPin } from 'lucide-react';

// Fix for default marker icons in Leaflet
const markerIcon2x = 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png';
const markerIcon = 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png';
const markerShadow = 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png';

delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconUrl: markerIcon,
  iconRetinaUrl: markerIcon2x,
  shadowUrl: markerShadow,
});

const riderIcon = new L.Icon({
  iconUrl: 'https://cdn-icons-png.flaticon.com/512/2972/2972185.png',
  iconSize: [40, 40],
  iconAnchor: [20, 40],
  popupAnchor: [0, -40],
});

const restaurantIcon = new L.Icon({
  iconUrl: 'https://cdn-icons-png.flaticon.com/512/684/684908.png',
  iconSize: [35, 35],
  iconAnchor: [17, 35],
});

function ChangeView({ center }: { center: [number, number] }) {
  const map = useMap();
  map.setView(center, 15);
  return null;
}

interface LiveTrackingProps {
  riderLocation?: { lat: number; lng: number };
  restaurantLocation?: { lat: number; lng: number };
  status: string;
}

export default function LiveTracking({ riderLocation, restaurantLocation, status }: LiveTrackingProps) {
  const defaultCenter: [number, number] = [12.9716, 77.5946]; // Bangalore
  const [center, setCenter] = useState<[number, number]>(defaultCenter);

  useEffect(() => {
    if (riderLocation) {
      setCenter([riderLocation.lat, riderLocation.lng]);
    } else if (restaurantLocation) {
      setCenter([restaurantLocation.lat, restaurantLocation.lng]);
    }
  }, [riderLocation, restaurantLocation]);

  return (
    <div className="h-64 w-full rounded-xl overflow-hidden shadow-inner border border-gray-200 relative">
      <MapContainer center={center} zoom={15} style={{ height: '100%', width: '100%' }}>
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        />
        <ChangeView center={center} />
        
        {restaurantLocation && (
          <Marker position={[restaurantLocation.lat, restaurantLocation.lng]} icon={restaurantIcon}>
            <Popup>Restaurant Location</Popup>
          </Marker>
        )}

        {riderLocation && (
          <Marker position={[riderLocation.lat, riderLocation.lng]} icon={riderIcon}>
            <Popup>
              <div className="text-center">
                <p className="font-bold text-orange-600">Your Rider</p>
                <p className="text-xs text-gray-500">On the way!</p>
              </div>
            </Popup>
          </Marker>
        )}
      </MapContainer>

      <div className="absolute bottom-4 left-4 z-[1000] bg-white/90 backdrop-blur p-3 rounded-lg shadow-lg border border-orange-100 flex items-center space-x-3">
        <div className="h-10 w-10 bg-orange-100 rounded-full flex items-center justify-center">
          <Truck className="h-6 w-6 text-orange-600" />
        </div>
        <div>
          <p className="text-xs text-gray-500 font-medium uppercase tracking-wider">Status</p>
          <p className="text-sm font-bold text-gray-900 capitalize">{status.replace(/-/g, ' ')}</p>
        </div>
      </div>
    </div>
  );
}
