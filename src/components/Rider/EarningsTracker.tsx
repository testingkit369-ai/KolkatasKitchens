import React from 'react';
import { 
  DollarSign, 
  TrendingUp, 
  Award, 
  Download, 
  BarChart3, 
  Clock, 
  MapPin, 
  Zap 
} from 'lucide-react';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer 
} from 'recharts';
import { motion } from 'motion/react';
import { cn } from '../../lib/utils';

interface EarningsTrackerProps {
  sessionEarnings: number;
  tips: number;
  bonuses: number;
  completedOrders: number;
  isNightMode?: boolean;
}

const mockChartData = [
  { time: '10 AM', earnings: 120 },
  { time: '12 PM', earnings: 340 },
  { time: '2 PM', earnings: 210 },
  { time: '4 PM', earnings: 450 },
  { time: '6 PM', earnings: 680 },
  { time: '8 PM', earnings: 520 },
  { time: '10 PM', earnings: 310 },
];

export const EarningsTracker: React.FC<EarningsTrackerProps> = ({ 
  sessionEarnings, 
  tips, 
  bonuses, 
  completedOrders,
  isNightMode 
}) => {
  const total = sessionEarnings + tips + bonuses;

  return (
    <div className="space-y-6">
      {/* Main Earnings Card */}
      <motion.div 
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className={cn(
          "p-8 rounded-[40px] shadow-sm border text-center transition-all",
          isNightMode ? "bg-gray-800 border-gray-700" : "bg-white border-gray-100"
        )}
      >
        <div className="bg-green-50 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
          <DollarSign className="w-10 h-10 text-green-600" />
        </div>
        <h3 className="text-sm font-black text-swiggy-gray uppercase tracking-widest mb-2">Session Earnings</h3>
        <p className={cn(
          "text-5xl font-black mb-4",
          isNightMode ? "text-white" : "text-swiggy-dark"
        )}>₹{total.toLocaleString()}</p>
        
        <div className="flex justify-center space-x-6">
          <div className="text-center">
            <p className="text-[10px] font-black text-swiggy-gray uppercase tracking-widest">Orders</p>
            <p className="text-sm font-bold text-swiggy-dark">{completedOrders}</p>
          </div>
          <div className="w-px h-8 bg-gray-100" />
          <div className="text-center">
            <p className="text-[10px] font-black text-swiggy-gray uppercase tracking-widest">Tips</p>
            <p className="text-sm font-bold text-green-600">₹{tips}</p>
          </div>
          <div className="w-px h-8 bg-gray-100" />
          <div className="text-center">
            <p className="text-[10px] font-black text-swiggy-gray uppercase tracking-widest">Bonuses</p>
            <p className="text-sm font-bold text-blue-600">₹{bonuses}</p>
          </div>
        </div>
      </motion.div>

      {/* Earnings Chart */}
      <div className={cn(
        "p-6 rounded-3xl border shadow-sm",
        isNightMode ? "bg-gray-800 border-gray-700" : "bg-white border-gray-100"
      )}>
        <div className="flex items-center justify-between mb-6">
          <h3 className={cn(
            "text-sm font-black uppercase tracking-widest",
            isNightMode ? "text-white" : "text-swiggy-dark"
          )}>Earnings Trend</h3>
          <TrendingUp className="w-4 h-4 text-green-500" />
        </div>
        <div className="h-48 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={mockChartData}>
              <defs>
                <linearGradient id="colorEarnings" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#fc8019" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#fc8019" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={isNightMode ? "#374151" : "#f3f4f6"} />
              <XAxis 
                dataKey="time" 
                axisLine={false} 
                tickLine={false} 
                tick={{ fontSize: 10, fill: '#9ca3af' }} 
              />
              <YAxis hide />
              <Tooltip 
                contentStyle={{ 
                  borderRadius: '12px', 
                  border: 'none', 
                  boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)',
                  backgroundColor: isNightMode ? '#1f2937' : '#ffffff',
                  color: isNightMode ? '#ffffff' : '#1f2937'
                }} 
              />
              <Area 
                type="monotone" 
                dataKey="earnings" 
                stroke="#fc8019" 
                strokeWidth={3}
                fillOpacity={1} 
                fill="url(#colorEarnings)" 
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Heatmap Insight */}
      <div className={cn(
        "p-6 rounded-3xl border shadow-sm",
        isNightMode ? "bg-gray-800 border-gray-700" : "bg-white border-gray-100"
      )}>
        <div className="flex items-start space-x-4">
          <div className="bg-purple-100 p-3 rounded-2xl">
            <Zap className="w-6 h-6 text-purple-600" />
          </div>
          <div>
            <h4 className={cn(
              "text-sm font-black uppercase tracking-widest",
              isNightMode ? "text-white" : "text-swiggy-dark"
            )}>Heatmap Insight</h4>
            <p className="text-xs text-swiggy-gray mt-1">
              Salt Lake Sector V is currently a <span className="text-purple-600 font-bold">High Earning Zone</span>. 
              Average earnings are 1.5x higher than your current location.
            </p>
          </div>
        </div>
      </div>

      {/* Export & Payout */}
      <div className="grid grid-cols-2 gap-4">
        <button className="flex flex-col items-center justify-center p-4 bg-gray-100 rounded-2xl space-y-2 hover:bg-gray-200 transition-all">
          <Download className="w-5 h-5 text-swiggy-dark" />
          <span className="text-[10px] font-black uppercase tracking-widest">Tax Export</span>
        </button>
        <button className="flex flex-col items-center justify-center p-4 bg-swiggy-orange text-white rounded-2xl space-y-2 hover:bg-swiggy-orange/90 transition-all shadow-lg shadow-swiggy-orange/20">
          <TrendingUp className="w-5 h-5" />
          <span className="text-[10px] font-black uppercase tracking-widest">Weekly Payout</span>
        </button>
      </div>
    </div>
  );
};
