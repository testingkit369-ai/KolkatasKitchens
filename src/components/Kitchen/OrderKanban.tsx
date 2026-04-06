import React, { useMemo, useState } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragOverlay,
  defaultDropAnimationSideEffects,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { 
  Clock, 
  AlertTriangle, 
  CheckCircle2, 
  ChefHat, 
  Package, 
  Bike,
  MoreVertical,
  ChevronRight,
  Zap
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../../lib/utils';

interface OrderItem {
  id: string;
  name: string;
  quantity: number;
  status: 'pending' | 'preparing' | 'ready';
}

interface Order {
  id: string;
  customerName: string;
  customerTier: 'gold' | 'silver' | 'regular';
  total: number;
  status: 'new' | 'preparing' | 'ready' | 'picked-up' | 'delivered';
  createdAt: any;
  promiseTime: any;
  items: OrderItem[];
  station?: string;
}

interface KanbanColumnProps {
  id: string;
  title: string;
  orders: Order[];
  icon: React.ReactNode;
}

interface SortableOrderCardProps {
  order: Order;
}

const SortableOrderCard = ({ order }: SortableOrderCardProps) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: order.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const isAtRisk = useMemo(() => {
    const now = new Date().getTime();
    const promise = new Date(order.promiseTime?.toDate?.() || order.promiseTime).getTime();
    return promise - now < 10 * 60 * 1000; // Less than 10 mins left
  }, [order.promiseTime]);

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={cn(
        "bg-white p-4 rounded-2xl shadow-sm border mb-3 cursor-grab active:cursor-grabbing group transition-all hover:border-swiggy-orange/30",
        isAtRisk && "border-red-200 bg-red-50/30"
      )}
    >
      <div className="flex justify-between items-start mb-3">
        <div className="flex items-center space-x-2">
          <span className={cn(
            "text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-tighter",
            order.customerTier === 'gold' ? "bg-yellow-100 text-yellow-700" :
            order.customerTier === 'silver' ? "bg-gray-100 text-gray-600" :
            "bg-blue-50 text-blue-600"
          )}>
            {order.customerTier}
          </span>
          <span className="text-[10px] font-black text-swiggy-gray uppercase tracking-widest">
            #{order.id.slice(-4).toUpperCase()}
          </span>
        </div>
        {isAtRisk && <Zap className="w-4 h-4 text-red-500 animate-pulse" />}
      </div>

      <h4 className="text-sm font-black text-swiggy-dark mb-1">{order.customerName}</h4>
      <p className="text-[10px] text-swiggy-gray font-bold mb-3">
        {order.items.length} Items • ₹{order.total}
      </p>

      <div className="flex items-center justify-between pt-3 border-t border-gray-50">
        <div className="flex items-center space-x-1">
          <Clock className={cn("w-3 h-3", isAtRisk ? "text-red-500" : "text-swiggy-gray")} />
          <span className={cn("text-[10px] font-bold", isAtRisk ? "text-red-600" : "text-swiggy-gray")}>
            {isAtRisk ? 'BREACH RISK' : '12m left'}
          </span>
        </div>
        <div className="flex -space-x-1">
          {order.items.slice(0, 3).map((_, i) => (
            <div key={i} className="w-5 h-5 rounded-full bg-gray-100 border-2 border-white flex items-center justify-center">
              <ChefHat className="w-2 h-2 text-gray-400" />
            </div>
          ))}
          {order.items.length > 3 && (
            <div className="w-5 h-5 rounded-full bg-gray-50 border-2 border-white flex items-center justify-center text-[8px] font-black text-gray-400">
              +{order.items.length - 3}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const KanbanColumn = ({ id, title, orders, icon }: KanbanColumnProps) => {
  return (
    <div className="flex-1 min-w-[300px] bg-gray-50/50 rounded-3xl p-4 flex flex-col h-full">
      <div className="flex items-center justify-between mb-4 px-2">
        <div className="flex items-center space-x-2">
          <div className="p-1.5 bg-white rounded-lg shadow-sm">
            {icon}
          </div>
          <h3 className="text-xs font-black text-swiggy-dark uppercase tracking-widest">{title}</h3>
          <span className="bg-gray-200 text-gray-600 text-[10px] font-black px-2 py-0.5 rounded-full">
            {orders.length}
          </span>
        </div>
        <button className="p-1 hover:bg-gray-200 rounded-lg transition-colors">
          <MoreVertical className="w-4 h-4 text-gray-400" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto no-scrollbar">
        <SortableContext
          id={id}
          items={orders.map(o => o.id)}
          strategy={verticalListSortingStrategy}
        >
          {orders.map(order => (
            <SortableOrderCard key={order.id} order={order} />
          ))}
        </SortableContext>
      </div>
    </div>
  );
};

export const OrderKanban = ({ orders, onStatusChange }: { orders: Order[], onStatusChange: (id: string, status: string) => void }) => {
  const [activeId, setActiveId] = useState<string | null>(null);
  
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const columns = [
    { id: 'new', title: 'New Orders', icon: <Zap className="w-4 h-4 text-blue-500" /> },
    { id: 'preparing', title: 'Preparing', icon: <ChefHat className="w-4 h-4 text-orange-500" /> },
    { id: 'ready', title: 'Ready', icon: <CheckCircle2 className="w-4 h-4 text-green-500" /> },
    { id: 'picked-up', title: 'Out for Delivery', icon: <Bike className="w-4 h-4 text-purple-500" /> },
  ];

  const handleDragStart = (event: any) => {
    setActiveId(event.active.id);
  };

  const handleDragEnd = (event: any) => {
    const { active, over } = event;
    setActiveId(null);

    if (!over) return;

    const activeOrder = orders.find(o => o.id === active.id);
    const overColumnId = over.id;

    if (activeOrder && activeOrder.status !== overColumnId) {
      onStatusChange(active.id, overColumnId);
    }
  };

  const activeOrder = useMemo(() => 
    orders.find(o => o.id === activeId),
    [orders, activeId]
  );

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="flex space-x-6 h-[calc(100vh-280px)] overflow-x-auto pb-4 no-scrollbar">
        {columns.map(col => (
          <KanbanColumn
            key={col.id}
            id={col.id}
            title={col.title}
            icon={col.icon}
            orders={orders.filter(o => o.status === col.id)}
          />
        ))}
      </div>

      <DragOverlay dropAnimation={{
        sideEffects: defaultDropAnimationSideEffects({
          styles: {
            active: {
              opacity: '0.5',
            },
          },
        }),
      }}>
        {activeId && activeOrder ? (
          <div className="bg-white p-4 rounded-2xl shadow-2xl border-2 border-swiggy-orange rotate-3 scale-105">
            <h4 className="text-sm font-black text-swiggy-dark">{activeOrder.customerName}</h4>
            <p className="text-[10px] text-swiggy-gray font-bold">#{activeOrder.id.slice(-4).toUpperCase()}</p>
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
};
