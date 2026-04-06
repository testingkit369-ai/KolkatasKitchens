export type UserRole = 'customer' | 'restaurant' | 'delivery' | 'admin' | 'outlet_manager' | 'rider' | 'super_admin';

export interface User {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  role: UserRole;
  address?: string;
  outlet_id?: string;
}

export interface Outlet {
  id: string;
  name: string;
  location: string;
  rating: number;
  deliveryTime: string;
  image: string;
  cuisines: string[];
  costForTwo: string;
  ownerId: string;
  status: 'active' | 'inactive' | 'pending';
  revenue?: number;
  activeOrders?: number;
}

export interface MenuItem {
  id: string;
  name: string;
  description: string;
  price: number;
  image: string;
  isVeg: boolean;
  category: string;
  outletId: string;
  originalPrice?: number;
  discountedPrice?: number;
}

export interface Order {
  id: string;
  userId: string;
  outlet_id: string;
  items: any[];
  total: number;
  status: 'pending' | 'preparing' | 'ready' | 'out-for-delivery' | 'delivered' | 'cancelled';
  paymentStatus: 'pending' | 'completed' | 'failed';
  createdAt: any;
  riderId?: string;
}

export interface AuditLog {
  id: string;
  timestamp: any;
  userId: string;
  userEmail: string;
  action: string;
  targetId: string;
  targetType: 'outlet' | 'user' | 'menu' | 'order' | 'role';
  details: string;
  metadata?: any;
}

export interface AnalyticsMetrics {
  ordersPerMin: number;
  avgOrderValue: number;
  riderUtilization: number;
  outletHealth: number; // 0-100
  revenueTrend: { timestamp: string; value: number }[];
  orderTrend: { timestamp: string; value: number }[];
}
