import React, { useState } from 'react';
import { motion, useMotionValue, useTransform } from 'motion/react';
import { 
  Package, 
  MapPin, 
  Clock, 
  DollarSign, 
  ChevronRight, 
  CheckCircle2, 
  AlertCircle 
} from 'lucide-react';
import { cn } from '../../lib/utils';

interface Order {
  id: string;
  address: string;
  earnings: number;
  time: number;
  distance: number;
}

interface BatchCardProps {
  batchId: string;
  orders: Order[];
  onAccept: (batchId: string) => void;
  onSkip: (batchId: string) => void;
}

export const BatchCard: React.FC<BatchCardProps> = ({ batchId, orders, onAccept, onSkip }) => {
  const [isAccepted, setIsAccepted] = useState(false);
  const x = useMotionValue(0);
  const opacity = useTransform(x, [0, 150], [1, 0]);
  const scale = useTransform(x, [0, 150], [1, 0.9]);
  const rotate = useTransform(x, [0, 150], [0, -5]);

  const totalEarnings = orders.reduce((acc, o) => acc + o.earnings, 0);
  const totalDistance = orders.reduce((acc, o) => acc + o.distance, 0);
  const totalTime = orders.reduce((acc, o) => acc + o.time, 0);

  const handleDragEnd = (_: any, info: any) => {
    if (info.offset.x > 150) {
      setIsAccepted(true);
      onAccept(batchId);
      // Haptic feedback if available
      if ('vibrate' in navigator) {
        navigator.vibrate(200);
      }
    } else if (info.offset.x < -150) {
      onSkip(batchId);
    }
  };

  return (
    <motion.div
      style={{ x, opacity, scale, rotate }}
      drag="x"
      dragConstraints={{ left: -200, right: 200 }}
      onDragEnd={handleDragEnd}
      className={cn(
        "relative bg-white rounded-[32px] p-6 shadow-xl border-2 transition-colors overflow-hidden",
        isAccepted ? "border-green-500 bg-green-50" : "border-swiggy-orange/20"
      )}
    >
      {/* Swipe Indicators */}
      <div className="absolute inset-y-0 left-0 w-12 flex items-center justify-center bg-red-50 text-red-500 opacity-0 group-hover:opacity-100 transition-opacity">
        <AlertCircle className="w-6 h-6" />
      </div>
      <div className="absolute inset-y-0 right-0 w-12 flex items-center justify-center bg-green-50 text-green-500 opacity-0 group-hover:opacity-100 transition-opacity">
        <CheckCircle2 className="w-6 h-6" />
      </div>

      <div className="flex justify-between items-start mb-6">
        <div>
          <div className="flex items-center space-x-2 mb-1">
            <span className="bg-swiggy-orange text-white text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-tighter">
              🔥 Smart Batch
            </span>
            <span className="text-[10px] font-black text-swiggy-gray uppercase tracking-widest">
              {orders.length} Orders
            </span>
          </div>
          <h3 className="text-2xl font-black text-swiggy-dark">
            ₹{totalEarnings} <span className="text-sm text-swiggy-gray font-bold">in {totalTime} min</span>
          </h3>
        </div>
        <div className="bg-gray-50 px-3 py-1 rounded-full text-[10px] font-black text-swiggy-gray uppercase tracking-widest">
          {totalDistance.toFixed(1)} km
        </div>
      </div>

      <div className="space-y-4 mb-6 relative">
        {/* Vertical line connecting orders */}
        <div className="absolute left-[7px] top-4 bottom-4 w-0.5 bg-gray-100" />
        
        {orders.map((order, idx) => (
          <div key={order.id} className="flex items-start space-x-4 relative z-10">
            <div className={cn(
              "w-4 h-4 rounded-full mt-1.5 border-2 border-white shadow-sm",
              idx === 0 ? "bg-green-500" : "bg-swiggy-orange"
            )} />
            <div className="flex-1">
              <div className="flex justify-between items-center">
                <p className="text-[10px] font-black text-swiggy-gray uppercase tracking-widest">
                  {idx === 0 ? 'Pickup 1' : `Drop ${idx}`}
                </p>
                <span className="text-[10px] font-bold text-swiggy-orange">₹{order.earnings}</span>
              </div>
              <p className="text-sm font-bold text-swiggy-dark truncate w-48">{order.address}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="flex items-center justify-center space-x-2 py-4 bg-gray-50 rounded-2xl border border-dashed border-gray-200">
        <ChevronRight className="w-4 h-4 text-swiggy-gray animate-pulse" />
        <span className="text-[10px] font-black text-swiggy-gray uppercase tracking-widest">
          Swipe Right to Accept Batch
        </span>
      </div>

      {isAccepted && (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="absolute inset-0 bg-green-500 flex items-center justify-center text-white"
        >
          <div className="text-center">
            <CheckCircle2 className="w-12 h-12 mx-auto mb-2 animate-bounce" />
            <p className="text-lg font-black uppercase tracking-widest">Accepted!</p>
          </div>
        </motion.div>
      )}
    </motion.div>
  );
};
