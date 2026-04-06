import { useState, useEffect } from 'react';
import { doc, updateDoc, db, OperationType, handleFirestoreError, onSnapshot, collectionGroup, query, where } from '../firebase';
import { useParams } from 'react-router-dom';
import { Truck, MapPin, CheckCircle } from 'lucide-react';

export default function RiderDashboard() {
  const { id } = useParams<{ id: string }>();
  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    const q = query(collectionGroup(db, 'orders'), where('id', '==', id));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      if (!snapshot.empty) {
        const docSnap = snapshot.docs[0];
        setOrder({ id: docSnap.id, ref: docSnap.ref, ...docSnap.data() });
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, [id]);

  const updateStatus = async (status: string) => {
    if (!order?.ref) return;
    try {
      await updateDoc(order.ref, { status });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, order.ref.path);
    }
  };

  const simulateMovement = async () => {
    if (!order?.ref) return;
    const startLat = 12.9716;
    const startLng = 77.5946;
    const endLat = 12.9750;
    const endLng = 77.6000;

    let currentStep = 0;
    const totalSteps = 10;

    const interval = setInterval(async () => {
      currentStep++;
      const lat = startLat + (endLat - startLat) * (currentStep / totalSteps);
      const lng = startLng + (endLng - startLng) * (currentStep / totalSteps);

      try {
        await updateDoc(order.ref, {
          riderLocation: { lat, lng },
          status: currentStep === totalSteps ? 'delivered' : 'out-for-delivery'
        });
      } catch (error) {
        console.error('Movement simulation failed:', error);
        clearInterval(interval);
      }

      if (currentStep === totalSteps) {
        clearInterval(interval);
      }
    }, 3000);
  };

  if (loading) return <div className="p-8">Loading...</div>;
  if (!order) return <div className="p-8">Order not found</div>;

  return (
    <div className="max-w-2xl mx-auto p-8">
      <h1 className="text-3xl font-bold mb-8">Rider Dashboard (Simulator)</h1>
      
      <div className="bg-white rounded-2xl shadow-lg p-8 border border-gray-100">
        <div className="flex justify-between items-center mb-8">
          <div>
            <p className="text-sm text-gray-500 uppercase font-bold">Order ID</p>
            <p className="text-xl font-mono">#{id?.slice(-6).toUpperCase()}</p>
          </div>
          <div className="bg-orange-100 text-orange-600 px-4 py-2 rounded-full font-bold capitalize">
            {order.status}
          </div>
        </div>

        <div className="space-y-4">
          <button
            onClick={() => updateStatus('preparing')}
            className="w-full bg-blue-600 text-white py-3 rounded-xl font-bold hover:bg-blue-700 transition-colors"
          >
            Mark as Preparing
          </button>
          <button
            onClick={() => {
              updateStatus('out-for-delivery');
              simulateMovement();
            }}
            className="w-full bg-orange-600 text-white py-3 rounded-xl font-bold hover:bg-orange-700 transition-colors flex items-center justify-center"
          >
            <Truck className="h-5 w-5 mr-2" />
            Start Delivery Simulation
          </button>
          <button
            onClick={() => updateStatus('delivered')}
            className="w-full bg-green-600 text-white py-3 rounded-xl font-bold hover:bg-green-700 transition-colors flex items-center justify-center"
          >
            <CheckCircle className="h-5 w-5 mr-2" />
            Mark as Delivered
          </button>
        </div>

        <div className="mt-8 p-4 bg-gray-50 rounded-xl">
          <p className="text-sm text-gray-500 mb-2">Current Location</p>
          <div className="flex items-center text-gray-700">
            <MapPin className="h-5 w-5 mr-2 text-red-500" />
            <span>{order.riderLocation ? `${order.riderLocation.lat.toFixed(4)}, ${order.riderLocation.lng.toFixed(4)}` : 'Not started'}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
