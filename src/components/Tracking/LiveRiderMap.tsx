import React, { useEffect, useState, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { db, doc, onSnapshot, updateDoc, OperationType, handleFirestoreError } from '../../firebase';
import { motion, AnimatePresence } from 'motion/react';
import { MapPin, Bike, Navigation, Share2, CheckCircle2, Clock, AlertCircle } from 'lucide-react';
import { getDistance, simulateRoute, calculateETA } from '../../lib/geoUtils';
import { cn } from '../../lib/utils';

// Custom Kolkata-themed rider icon (Yellow Taxi style)
const riderIcon = L.divIcon({
  className: 'custom-rider-icon',
  html: `
    <div class="relative w-10 h-10 flex items-center justify-center bg-yellow-400 rounded-full border-2 border-zinc-900 shadow-lg">
      <svg class="w-6 h-6 text-zinc-900" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.4 2.9A3.7 3.7 0 0 0 2 12v4c0 .6.4 1 1 1h2"/>
        <circle cx="7" cy="17" r="2"/>
        <path d="M9 17h6"/>
        <circle cx="17" cy="17" r="2"/>
      </svg>
      <div class="absolute -top-1 -right-1 w-3 h-3 bg-blue-500 rounded-full border border-white animate-pulse"></div>
    </div>
  `,
  iconSize: [40, 40],
  iconAnchor: [20, 20],
});

const customerIcon = L.divIcon({
  className: 'custom-customer-icon',
  html: `
    <div class="w-8 h-8 flex items-center justify-center bg-blue-500 rounded-full border-2 border-white shadow-lg">
      <svg class="w-5 h-5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
        <polyline points="9 22 9 12 15 12 15 22"/>
      </svg>
    </div>
  `,
  iconSize: [32, 32],
  iconAnchor: [16, 16],
});

interface LiveRiderMapProps {
  outletId: string;
  orderId: string;
  isRiderView?: boolean;
}

// Component to handle map view updates
function MapUpdater({ center }: { center: [number, number] }) {
  const map = useMap();
  useEffect(() => {
    map.setView(center, map.getZoom());
  }, [center, map]);
  return null;
}

export default function LiveRiderMap({ outletId, orderId, isRiderView = false }: LiveRiderMapProps) {
  const [order, setOrder] = useState<any>(null);
  const [riderLocation, setRiderLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [route, setRoute] = useState<[number, number][]>([]);
  const [eta, setEta] = useState<number | null>(null);
  const [distance, setDistance] = useState<number | null>(null);
  const [isNear, setIsNear] = useState(false);

  useEffect(() => {
    // 1. Subscribe to order
    const orderRef = doc(db, 'outlets', outletId, 'orders', orderId);
    const unsubscribeOrder = onSnapshot(orderRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setOrder(data);
        
        // 2. If rider assigned, subscribe to location
        if (data.riderId) {
          const locRef = doc(db, 'riders', data.riderId, 'live_location', 'current');
          const unsubscribeLoc = onSnapshot(locRef, (locSnap) => {
            if (locSnap.exists()) {
              const locData = locSnap.data();
              setRiderLocation({ lat: locData.lat, lng: locData.lng });
            }
          }, (err) => handleFirestoreError(err, OperationType.GET, `riders/${data.riderId}/live_location/current`));
          
          return () => unsubscribeLoc();
        }
      }
    }, (err) => handleFirestoreError(err, OperationType.GET, `outlets/${outletId}/orders/${orderId}`));

    return () => unsubscribeOrder();
  }, [outletId, orderId]);

  useEffect(() => {
    if (riderLocation && order?.customerLocation) {
      const dist = getDistance(
        riderLocation.lat, 
        riderLocation.lng, 
        order.customerLocation.lat, 
        order.customerLocation.lng
      );
      setDistance(dist);
      setEta(calculateETA(dist));
      setIsNear(dist < 0.05); // 50 meters

      // Simulate route for visualization
      const simulated = simulateRoute(
        [riderLocation.lat, riderLocation.lng],
        [order.customerLocation.lat, order.customerLocation.lng]
      );
      setRoute(simulated);
    }
  }, [riderLocation, order?.customerLocation]);

  const handleMarkDelivered = async () => {
    if (!order) return;
    try {
      await updateDoc(doc(db, 'outlets', outletId, 'orders', orderId), {
        status: 'delivered',
        deliveredAt: new Date().toISOString()
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `outlets/${outletId}/orders/${orderId}`);
    }
  };

  const handleShareLocation = () => {
    const url = `${window.location.origin}/track/${outletId}/${orderId}`;
    navigator.clipboard.writeText(url);
    alert('Tracking link copied to clipboard!');
  };

  if (!order || !order.customerLocation) {
    return (
      <div className="h-full flex flex-col items-center justify-center bg-zinc-900 text-zinc-400 p-6 space-y-4">
        <Clock className="w-12 h-12 animate-pulse" />
        <p className="text-sm font-medium">Initializing live tracking...</p>
      </div>
    );
  }

  const mapCenter: [number, number] = riderLocation 
    ? [riderLocation.lat, riderLocation.lng] 
    : [order.customerLocation.lat, order.customerLocation.lng];

  return (
    <div className="relative h-full w-full overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-950">
      <MapContainer 
        center={mapCenter} 
        zoom={15} 
        className="h-full w-full z-0"
        zoomControl={false}
      >
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
        />
        
        {riderLocation && (
          <>
            <Marker position={[riderLocation.lat, riderLocation.lng]} icon={riderIcon}>
              <Popup>Rider is here</Popup>
            </Marker>
            <MapUpdater center={[riderLocation.lat, riderLocation.lng]} />
          </>
        )}

        <Marker position={[order.customerLocation.lat, order.customerLocation.lng]} icon={customerIcon}>
          <Popup>Delivery Location</Popup>
        </Marker>

        {route.length > 0 && (
          <Polyline 
            positions={route} 
            color="#3b82f6" 
            weight={4} 
            opacity={0.6} 
            dashArray="10, 10"
          />
        )}
      </MapContainer>

      {/* Floating UI Elements */}
      <div className="absolute top-4 left-4 right-4 flex justify-between items-start pointer-events-none z-10">
        <motion.div 
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="bg-zinc-900/90 backdrop-blur-md border border-zinc-800 p-4 rounded-2xl shadow-2xl pointer-events-auto"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-500/10 rounded-xl flex items-center justify-center">
              <Bike className="w-5 h-5 text-blue-500" />
            </div>
            <div>
              <p className="text-[10px] text-zinc-500 uppercase font-bold tracking-wider">Estimated Arrival</p>
              <p className="text-lg font-bold text-white">{eta ? `${eta} mins` : 'Calculating...'}</p>
            </div>
          </div>
        </motion.div>

        <button 
          onClick={handleShareLocation}
          className="p-3 bg-zinc-900/90 backdrop-blur-md border border-zinc-800 rounded-xl text-zinc-400 hover:text-white transition-colors pointer-events-auto shadow-xl"
        >
          <Share2 className="w-5 h-5" />
        </button>
      </div>

      <div className="absolute bottom-6 left-4 right-4 pointer-events-none z-10">
        <AnimatePresence>
          {isNear && order.status === 'out-for-delivery' && (
            <motion.div 
              initial={{ y: 50, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 50, opacity: 0 }}
              className="bg-blue-600 p-4 rounded-2xl shadow-2xl pointer-events-auto flex items-center justify-between gap-4"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                  <Navigation className="w-5 h-5 text-white animate-bounce" />
                </div>
                <div>
                  <p className="text-white font-bold">Rider is nearby!</p>
                  <p className="text-blue-100 text-xs">Less than 50m away</p>
                </div>
              </div>
              {isRiderView && (
                <button 
                  onClick={handleMarkDelivered}
                  className="bg-white text-blue-600 px-4 py-2 rounded-xl text-sm font-bold hover:bg-blue-50 shadow-lg transition-colors"
                >
                  Mark Delivered
                </button>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        <div className="mt-4 bg-zinc-900/90 backdrop-blur-md border border-zinc-800 p-4 rounded-2xl shadow-2xl pointer-events-auto">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={cn(
                "w-2 h-2 rounded-full animate-pulse",
                order.status === 'out-for-delivery' ? "bg-green-500" : "bg-amber-500"
              )} />
              <p className="text-sm font-semibold text-white capitalize">{order.status.replace(/-/g, ' ')}</p>
            </div>
            <p className="text-xs text-zinc-500">{distance ? `${distance.toFixed(2)} km away` : ''}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
