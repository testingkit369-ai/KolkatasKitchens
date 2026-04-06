import React, { useMemo } from 'react';
import { 
  AlertTriangle, 
  TrendingDown, 
  Package, 
  XCircle, 
  CheckCircle2,
  Clock,
  ArrowRight
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../../lib/utils';

interface InventoryItem {
  id: string;
  name: string;
  stock: number;
  unit: string;
  minStock: number;
  predictedDepletionTime?: number; // minutes
}

interface InventoryAlertsProps {
  items: InventoryItem[];
  onMarkOutOfStock: (id: string) => void;
}

export const InventoryAlerts = ({ items, onMarkOutOfStock }: InventoryAlertsProps) => {
  const lowStockItems = useMemo(() => 
    items.filter(item => item.stock <= item.minStock && item.stock > 0),
    [items]
  );

  const outOfStockItems = useMemo(() => 
    items.filter(item => item.stock <= 0),
    [items]
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-black text-swiggy-dark uppercase tracking-widest">Inventory Health</h3>
        <span className="text-[10px] font-black text-swiggy-orange uppercase tracking-widest">Live Updates</span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Low Stock Alerts */}
        <AnimatePresence>
          {lowStockItems.map(item => (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-orange-50 border border-orange-100 p-4 rounded-2xl flex items-start space-x-3 relative overflow-hidden group"
            >
              <div className="bg-orange-100 p-2 rounded-xl">
                <TrendingDown className="w-4 h-4 text-orange-600" />
              </div>
              <div className="flex-1">
                <div className="flex justify-between items-start">
                  <h4 className="text-sm font-black text-orange-900">{item.name}</h4>
                  <span className="text-[10px] font-black text-orange-600 uppercase tracking-widest">Low Stock</span>
                </div>
                <p className="text-xs font-bold text-orange-700 mt-1">
                  {item.stock} {item.unit} left • <span className="text-orange-900">Min: {item.minStock} {item.unit}</span>
                </p>
                {item.predictedDepletionTime && (
                  <div className="flex items-center space-x-1 mt-2 text-[10px] font-black text-orange-800 uppercase tracking-widest">
                    <Clock className="w-3 h-3" />
                    <span>Predicted depletion in {item.predictedDepletionTime} min</span>
                  </div>
                )}
              </div>
              <button 
                onClick={() => onMarkOutOfStock(item.id)}
                className="absolute right-2 bottom-2 p-1.5 bg-white rounded-lg opacity-0 group-hover:opacity-100 transition-opacity shadow-sm"
                title="Mark Out of Stock"
              >
                <XCircle className="w-4 h-4 text-red-500" />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>

        {/* Out of Stock Alerts */}
        <AnimatePresence>
          {outOfStockItems.map(item => (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-red-50 border border-red-100 p-4 rounded-2xl flex items-start space-x-3"
            >
              <div className="bg-red-100 p-2 rounded-xl">
                <XCircle className="w-4 h-4 text-red-600" />
              </div>
              <div className="flex-1">
                <div className="flex justify-between items-start">
                  <h4 className="text-sm font-black text-red-900">{item.name}</h4>
                  <span className="text-[10px] font-black text-red-600 uppercase tracking-widest">Out of Stock</span>
                </div>
                <p className="text-xs font-bold text-red-700 mt-1">
                  Menu items using this will be disabled.
                </p>
                <button className="mt-2 text-[10px] font-black text-red-800 uppercase tracking-widest flex items-center space-x-1 hover:underline">
                  <span>Update Stock</span>
                  <ArrowRight className="w-3 h-3" />
                </button>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {/* Healthy Inventory */}
        {lowStockItems.length === 0 && outOfStockItems.length === 0 && (
          <div className="col-span-full bg-green-50 border border-green-100 p-6 rounded-3xl flex flex-col items-center justify-center text-center">
            <div className="bg-green-100 p-3 rounded-full mb-3">
              <CheckCircle2 className="w-6 h-6 text-green-600" />
            </div>
            <h4 className="text-sm font-black text-green-900">Inventory Healthy</h4>
            <p className="text-xs font-bold text-green-700 mt-1">All critical items are well-stocked for the current shift.</p>
          </div>
        )}
      </div>
    </div>
  );
};
