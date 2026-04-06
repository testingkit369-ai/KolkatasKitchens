import { useState, useEffect, useMemo } from 'react';
import { useSelector } from 'react-redux';
import { RootState } from '../store/index';
import { db, collection, query, onSnapshot, doc, updateDoc, collectionGroup, where } from '../firebase';
import { motion, AnimatePresence } from 'motion/react';
import { Clock, AlertTriangle, CheckCircle2, ChefHat, Package, LayoutDashboard, ArrowRight, Layers } from 'lucide-react';

interface Order {
  id: string;
  outlet_id: string;
  status: string;
  items: any[];
  totalAmount: number;
  createdAt: any;
  userId: string;
  isPriority?: boolean; // Mocked priority
  customerTier?: 'platinum' | 'gold' | 'silver';
  promiseTime?: number; // ETA timestamp
}

type RoleView = 'manager' | 'chef' | 'packer';
type OrderStatus = 'pending' | 'preparing' | 'ready' | 'out-for-delivery' | 'delivered';

const COLUMNS: { id: OrderStatus; title: string }[] = [
  { id: 'pending', title: 'New' },
  { id: 'preparing', title: 'Preparing' },
  { id: 'ready', title: 'Ready' },
  { id: 'out-for-delivery', title: 'Picked-Up' },
  { id: 'delivered', title: 'Delivered' }
];

export default function Kitchen() {
  const { user } = useSelector((state: RootState) => state.auth);
  const [orders, setOrders] = useState<Order[]>([]);
  const [viewRole, setViewRole] = useState<RoleView>('manager');
  const [loading, setLoading] = useState(true);
  const [selectedOrders, setSelectedOrders] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!user) return;

    // In a real app, we'd query by the manager's outlet_id.
    const q = query(collectionGroup(db, 'orders'));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetchedOrders: Order[] = [];
      snapshot.forEach((doc) => {
        fetchedOrders.push({ id: doc.id, ...doc.data() } as Order);
      });
      
      // Mock priority and customer tier for demonstration
      const enrichedOrders = fetchedOrders.map((o, i) => {
        const isHighValue = o.totalAmount > 500;
        const tier = i % 3 === 0 ? 'platinum' : i % 2 === 0 ? 'gold' : 'silver';
        const promiseTime = o.createdAt?.toMillis ? o.createdAt.toMillis() + 30 * 60000 : Date.now() + 30 * 60000;
        
        return {
          ...o,
          isPriority: isHighValue || tier === 'platinum',
          customerTier: tier as any,
          promiseTime
        };
      });

      // Intelligent Prioritization:
      // 1. Promise time breach risk (ETA vs actual)
      // 2. Order value & Customer tier (VIPs first)
      enrichedOrders.sort((a, b) => {
        // If one is priority and other is not
        if (a.isPriority && !b.isPriority) return -1;
        if (!a.isPriority && b.isPriority) return 1;
        
        // Sort by promise time (closest to breach first)
        const timeA = a.promiseTime || 0;
        const timeB = b.promiseTime || 0;
        return timeA - timeB;
      });

      setOrders(enrichedOrders);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  const handleDragStart = (e: React.DragEvent, orderId: string, sourceOutletId: string) => {
    e.dataTransfer.setData('orderId', orderId);
    e.dataTransfer.setData('outletId', sourceOutletId);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = async (e: React.DragEvent, newStatus: OrderStatus) => {
    e.preventDefault();
    const orderId = e.dataTransfer.getData('orderId');
    const outletId = e.dataTransfer.getData('outletId');
    
    if (!orderId || !outletId) return;

    updateOrderStatus(orderId, outletId, newStatus);
  };

  const updateOrderStatus = async (orderId: string, outletId: string, newStatus: OrderStatus) => {
    try {
      await updateDoc(doc(db, 'outlets', outletId, 'orders', orderId), {
        status: newStatus
      });
      console.log(`Manager moved Order #${orderId} to ${newStatus}`);
    } catch (error) {
      console.error("Error updating order status:", error);
    }
  };

  const handleBulkAction = async (currentStatus: OrderStatus, newStatus: OrderStatus) => {
    const ordersToUpdate = orders.filter(o => o.status === currentStatus && selectedOrders.has(o.id));
    if (ordersToUpdate.length === 0) return;

    // Debounce/Batch updates logic (simulated with Promise.all for now, 
    // in production use Firestore Batched Writes)
    try {
      await Promise.all(ordersToUpdate.map(o => 
        updateDoc(doc(db, 'outlets', o.outlet_id, 'orders', o.id), { status: newStatus })
      ));
      setSelectedOrders(new Set());
      console.log(`Bulk moved ${ordersToUpdate.length} orders to ${newStatus}`);
    } catch (error) {
      console.error("Error in bulk update:", error);
    }
  };

  const toggleSelection = (orderId: string) => {
    const newSelection = new Set(selectedOrders);
    if (newSelection.has(orderId)) {
      newSelection.delete(orderId);
    } else {
      newSelection.add(orderId);
    }
    setSelectedOrders(newSelection);
  };

  const getUrgencyColor = (order: Order) => {
    if (!order.createdAt?.toMillis) return 'border-gray-200 bg-white';
    
    const elapsedMins = (Date.now() - order.createdAt.toMillis()) / 60000;

    if (order.status === 'preparing' && elapsedMins > 15) {
      return 'border-red-500 bg-red-50 shadow-red-100'; // Red: >15 min in preparing
    }
    if (order.status === 'ready' && elapsedMins > 20) {
      return 'border-yellow-500 bg-yellow-50 shadow-yellow-100'; // Yellow: Rider waiting >3 min
    }
    if (order.status === 'pending' || order.status === 'preparing' || order.status === 'ready') {
      return 'border-green-500 bg-green-50 shadow-green-100'; // Green: On-track
    }
    return 'border-gray-200 bg-white';
  };

  const filteredColumns = useMemo(() => {
    if (viewRole === 'chef') return COLUMNS.filter(c => ['pending', 'preparing'].includes(c.id));
    if (viewRole === 'packer') return COLUMNS.filter(c => ['preparing', 'ready'].includes(c.id));
    return COLUMNS;
  }, [viewRole]);

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Loading Kitchen Pulse...</div>;
  }

  return (
    <div className="min-h-screen bg-[#f8f9fa] p-6 font-sans">
      {/* Header & Role Selector */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-black text-swiggy-dark tracking-tight">Kitchen Pulse</h1>
          <p className="text-swiggy-gray font-bold text-sm mt-1 flex items-center">
            <span className="w-2 h-2 rounded-full bg-green-500 mr-2 animate-pulse"></span>
            Live Order Management Interface
          </p>
        </div>

        <div className="flex bg-white rounded-xl shadow-sm p-1 border border-gray-200">
          <button
            onClick={() => setViewRole('chef')}
            className={`flex items-center space-x-2 px-6 py-3 rounded-lg font-bold text-sm transition-all ${
              viewRole === 'chef' ? 'bg-orange-100 text-orange-600' : 'text-gray-500 hover:bg-gray-50'
            }`}
          >
            <ChefHat className="w-4 h-4" />
            <span>Chef View</span>
          </button>
          <button
            onClick={() => setViewRole('packer')}
            className={`flex items-center space-x-2 px-6 py-3 rounded-lg font-bold text-sm transition-all ${
              viewRole === 'packer' ? 'bg-blue-100 text-blue-600' : 'text-gray-500 hover:bg-gray-50'
            }`}
          >
            <Package className="w-4 h-4" />
            <span>Packer View</span>
          </button>
          <button
            onClick={() => setViewRole('manager')}
            className={`flex items-center space-x-2 px-6 py-3 rounded-lg font-bold text-sm transition-all ${
              viewRole === 'manager' ? 'bg-swiggy-dark text-white' : 'text-gray-500 hover:bg-gray-50'
            }`}
          >
            <LayoutDashboard className="w-4 h-4" />
            <span>Manager View</span>
          </button>
        </div>
      </div>

      {/* Kanban Board */}
      <div className="flex gap-6 overflow-x-auto pb-8 snap-x">
        {filteredColumns.map(column => {
          const columnOrders = orders.filter(o => o.status === column.id);
          const selectedInColumn = columnOrders.filter(o => selectedOrders.has(o.id));
          
          return (
            <div 
              key={column.id}
              className="flex-shrink-0 w-80 bg-gray-100/80 rounded-3xl p-4 border border-gray-200 snap-start flex flex-col h-[calc(100vh-200px)]"
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, column.id)}
            >
              <div className="flex justify-between items-center mb-4 px-2">
                <div className="flex items-center space-x-2">
                  <h2 className="font-black text-swiggy-dark uppercase tracking-widest text-sm">{column.title}</h2>
                  <span className="bg-white text-swiggy-dark font-bold text-xs px-2 py-1 rounded-md shadow-sm border border-gray-200">
                    {columnOrders.length}
                  </span>
                </div>
                
                {/* Bulk Actions */}
                {selectedInColumn.length > 0 && column.id === 'pending' && (
                  <button 
                    onClick={() => handleBulkAction('pending', 'preparing')}
                    className="flex items-center space-x-1 bg-orange-500 text-white text-[10px] font-bold px-2 py-1 rounded-md hover:bg-orange-600 transition-colors"
                  >
                    <Layers className="w-3 h-3" />
                    <span>Start {selectedInColumn.length}</span>
                  </button>
                )}
                {selectedInColumn.length > 0 && column.id === 'preparing' && (
                  <button 
                    onClick={() => handleBulkAction('preparing', 'ready')}
                    className="flex items-center space-x-1 bg-green-500 text-white text-[10px] font-bold px-2 py-1 rounded-md hover:bg-green-600 transition-colors"
                  >
                    <Layers className="w-3 h-3" />
                    <span>Ready {selectedInColumn.length}</span>
                  </button>
                )}
              </div>

              <div className="flex-1 overflow-y-auto space-y-4 pr-2 custom-scrollbar">
                <AnimatePresence>
                  {columnOrders.map(order => (
                    <motion.div
                      layout
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.9 }}
                      key={order.id}
                      draggable
                      onDragStart={(e) => handleDragStart(e as any, order.id, order.outlet_id)}
                      onClick={() => toggleSelection(order.id)}
                      className={`p-4 rounded-2xl shadow-sm border-2 cursor-grab active:cursor-grabbing transition-all ${getUrgencyColor(order)} ${selectedOrders.has(order.id) ? 'ring-2 ring-swiggy-orange ring-offset-2' : ''}`}
                    >
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <span className="text-xs font-black text-gray-500 uppercase tracking-widest">#{order.id.slice(-6)}</span>
                          {order.isPriority && (
                            <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-purple-100 text-purple-800 border border-purple-200">
                              {order.customerTier === 'platinum' ? 'PLATINUM' : 'VIP'}
                            </span>
                          )}
                        </div>
                        <span className="font-black text-swiggy-dark">₹{order.totalAmount}</span>
                      </div>

                      <div className="space-y-2 mb-4 bg-white/50 p-2 rounded-xl">
                        {order.items.map((item, idx) => (
                          <div key={idx} className="flex justify-between text-sm">
                            <span className="font-bold text-swiggy-dark">{item.quantity}x {item.name}</span>
                          </div>
                        ))}
                      </div>

                      <div className="flex items-center justify-between pt-3 border-t border-gray-200/50">
                        <div className="flex items-center text-xs font-bold text-gray-500">
                          <Clock className="w-3 h-3 mr-1" />
                          {order.createdAt?.toMillis ? Math.floor((Date.now() - order.createdAt.toMillis()) / 60000) : 0} mins ago
                        </div>
                        
                        {/* Quick Action Buttons based on Role */}
                        {viewRole === 'chef' && column.id === 'pending' && (
                          <button 
                            onClick={(e) => { e.stopPropagation(); updateOrderStatus(order.id, order.outlet_id, 'preparing'); }}
                            className="bg-orange-500 text-white p-2 rounded-xl shadow-md hover:bg-orange-600 transition-colors"
                          >
                            <ArrowRight className="w-4 h-4" />
                          </button>
                        )}
                        {viewRole === 'chef' && column.id === 'preparing' && (
                          <button 
                            onClick={(e) => { e.stopPropagation(); updateOrderStatus(order.id, order.outlet_id, 'ready'); }}
                            className="bg-green-500 text-white p-2 rounded-xl shadow-md hover:bg-green-600 transition-colors"
                          >
                            <CheckCircle2 className="w-4 h-4" />
                          </button>
                        )}
                        {viewRole === 'packer' && column.id === 'preparing' && (
                          <span className="text-xs font-bold text-orange-500 bg-orange-50 px-2 py-1 rounded-md">Cooking...</span>
                        )}
                        {viewRole === 'packer' && column.id === 'ready' && (
                          <button 
                            onClick={(e) => { e.stopPropagation(); updateOrderStatus(order.id, order.outlet_id, 'out-for-delivery'); }}
                            className="bg-blue-500 text-white p-2 rounded-xl shadow-md hover:bg-blue-600 transition-colors"
                          >
                            <ArrowRight className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
                
                {columnOrders.length === 0 && (
                  <div className="h-32 flex items-center justify-center border-2 border-dashed border-gray-300 rounded-2xl bg-gray-50/50">
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">No Orders</p>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
