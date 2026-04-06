import React, { useMemo } from 'react';
import { 
  ChefHat, 
  Package, 
  LayoutDashboard, 
  AlertCircle, 
  Clock, 
  CheckCircle2,
  TrendingUp,
  TrendingDown,
  BarChart3
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../../lib/utils';

interface Station {
  id: string;
  name: string;
  backlog: number;
  avgPrepTime: number;
  estPrepTime: number;
  status: 'clear' | 'busy' | 'critical';
}

interface StationCoordinatorProps {
  stations: Station[];
  activeRole: 'chef' | 'packer' | 'manager';
  onRoleChange: (role: 'chef' | 'packer' | 'manager') => void;
}

export const StationCoordinator = ({ stations, activeRole, onRoleChange }: StationCoordinatorProps) => {
  const roles = [
    { id: 'chef', title: 'Chef View', icon: <ChefHat className="w-4 h-4" /> },
    { id: 'packer', title: 'Packer View', icon: <Package className="w-4 h-4" /> },
    { id: 'manager', title: 'Manager View', icon: <LayoutDashboard className="w-4 h-4" /> },
  ];

  const filteredStations = useMemo(() => {
    if (activeRole === 'manager') return stations;
    // In a real app, filter based on station-role mapping
    return stations;
  }, [stations, activeRole]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex bg-gray-100 p-1 rounded-2xl">
          {roles.map(role => (
            <button
              key={role.id}
              onClick={() => onRoleChange(role.id as any)}
              className={cn(
                "flex items-center space-x-2 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                activeRole === role.id ? "bg-white text-swiggy-dark shadow-sm" : "text-swiggy-gray hover:text-swiggy-dark"
              )}
            >
              {role.icon}
              <span>{role.title}</span>
            </button>
          ))}
        </div>
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2 bg-blue-50 px-3 py-1.5 rounded-xl border border-blue-100">
            <BarChart3 className="w-4 h-4 text-blue-600" />
            <span className="text-[10px] font-black text-blue-900 uppercase tracking-widest">Efficiency: 94%</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {filteredStations.map(station => (
          <motion.div
            key={station.id}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className={cn(
              "p-5 rounded-3xl border shadow-sm transition-all",
              station.status === 'critical' ? "bg-red-50 border-red-100" :
              station.status === 'busy' ? "bg-orange-50 border-orange-100" :
              "bg-white border-gray-100"
            )}
          >
            <div className="flex justify-between items-start mb-4">
              <div className="flex items-center space-x-3">
                <div className={cn(
                  "p-2 rounded-xl",
                  station.status === 'critical' ? "bg-red-100 text-red-600" :
                  station.status === 'busy' ? "bg-orange-100 text-orange-600" :
                  "bg-gray-100 text-gray-600"
                )}>
                  <ChefHat className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-sm font-black text-swiggy-dark">{station.name}</h4>
                  <p className="text-[10px] font-black text-swiggy-gray uppercase tracking-widest">{station.status}</p>
                </div>
              </div>
              {station.status === 'critical' && <AlertCircle className="w-4 h-4 text-red-500 animate-bounce" />}
            </div>

            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-[10px] font-black text-swiggy-gray uppercase tracking-widest">Backlog</span>
                <span className={cn(
                  "text-sm font-black",
                  station.backlog > 10 ? "text-red-600" : "text-swiggy-dark"
                )}>{station.backlog} Orders</span>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between text-[10px] font-black text-swiggy-gray uppercase tracking-widest mb-1">
                  <span>Prep Time</span>
                  <div className="flex items-center space-x-1">
                    {station.avgPrepTime > station.estPrepTime ? (
                      <TrendingUp className="w-3 h-3 text-red-500" />
                    ) : (
                      <TrendingDown className="w-3 h-3 text-green-500" />
                    )}
                    <span className={station.avgPrepTime > station.estPrepTime ? "text-red-600" : "text-green-600"}>
                      {station.avgPrepTime}m / {station.estPrepTime}m
                    </span>
                  </div>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-1.5 overflow-hidden">
                  <div 
                    className={cn(
                      "h-1.5 rounded-full transition-all duration-500",
                      station.avgPrepTime > station.estPrepTime ? "bg-red-500" : "bg-green-500"
                    )} 
                    style={{ width: `${Math.min((station.avgPrepTime / station.estPrepTime) * 100, 100)}%` }}
                  ></div>
                </div>
              </div>
            </div>

            {station.status === 'clear' && (
              <div className="mt-4 flex items-center space-x-2 text-[10px] font-black text-green-600 uppercase tracking-widest">
                <CheckCircle2 className="w-3 h-3" />
                <span>Station ready for load</span>
              </div>
            )}
          </motion.div>
        ))}
      </div>
    </div>
  );
};
