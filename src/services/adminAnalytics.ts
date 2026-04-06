import { openDB, IDBPDatabase } from 'idb';
import { 
  collection, 
  query, 
  where, 
  getDocs, 
  orderBy, 
  limit, 
  db, 
  collectionGroup,
  Timestamp 
} from '../firebase';
import { AnalyticsMetrics, Order } from '../types';

const DB_NAME = 'admin_analytics_cache';
const STORE_NAME = 'metrics';
const CACHE_TTL = 1000 * 60 * 5; // 5 minutes

async function getDB(): Promise<IDBPDatabase> {
  return openDB(DB_NAME, 1, {
    upgrade(db) {
      db.createObjectStore(STORE_NAME);
    },
  });
}

export async function fetchAdminAnalytics(
  timeRange: '24h' | '7d' | '30d' | 'custom',
  outletId?: string,
  customStart?: Date,
  customEnd?: Date
): Promise<AnalyticsMetrics> {
  const cacheKey = `metrics_${timeRange}_${outletId || 'all'}`;
  const idb = await getDB();
  const cached = await idb.get(STORE_NAME, cacheKey);

  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data;
  }

  // Fetch from Firestore
  let startTime: Date;
  const now = new Date();

  switch (timeRange) {
    case '24h':
      startTime = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      break;
    case '7d':
      startTime = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      break;
    case '30d':
      startTime = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      break;
    case 'custom':
      startTime = customStart || new Date(now.getTime() - 24 * 60 * 60 * 1000);
      break;
    default:
      startTime = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  }

  const endTime = customEnd || now;

  // Query orders
  let ordersQuery;
  if (outletId) {
    ordersQuery = query(
      collection(db, 'outlets', outletId, 'orders'),
      where('createdAt', '>=', Timestamp.fromDate(startTime)),
      where('createdAt', '<=', Timestamp.fromDate(endTime)),
      orderBy('createdAt', 'desc')
    );
  } else {
    ordersQuery = query(
      collectionGroup(db, 'orders'),
      where('createdAt', '>=', Timestamp.fromDate(startTime)),
      where('createdAt', '<=', Timestamp.fromDate(endTime)),
      orderBy('createdAt', 'desc')
    );
  }

  const snapshot = await getDocs(ordersQuery);
  const orders = snapshot.docs.map(doc => ({ id: doc.id, ...(doc.data() as any) } as Order));

  // Calculate metrics
  const totalOrders = orders.length;
  const totalRevenue = orders.reduce((acc, o) => acc + (o.total || 0), 0);
  const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;
  
  // Orders per minute (approximate based on range)
  const rangeMinutes = (endTime.getTime() - startTime.getTime()) / (1000 * 60);
  const ordersPerMin = totalOrders / rangeMinutes;

  // Mock rider utilization and outlet health
  const riderUtilization = Math.min(100, Math.max(0, 60 + Math.random() * 20));
  const outletHealth = Math.min(100, Math.max(0, 85 + Math.random() * 10));

  // Trend data (group by day or hour)
  const revenueTrend: { timestamp: string; value: number }[] = [];
  const orderTrend: { timestamp: string; value: number }[] = [];

  // Simple grouping logic
  const groups: { [key: string]: { revenue: number; orders: number } } = {};
  orders.forEach(o => {
    const date = o.createdAt?.toDate ? o.createdAt.toDate() : new Date();
    const key = timeRange === '24h' 
      ? date.getHours() + ':00' 
      : date.toLocaleDateString();
    
    if (!groups[key]) groups[key] = { revenue: 0, orders: 0 };
    groups[key].revenue += o.total || 0;
    groups[key].orders += 1;
  });

  Object.entries(groups).forEach(([timestamp, data]) => {
    revenueTrend.push({ timestamp, value: data.revenue });
    orderTrend.push({ timestamp, value: data.orders });
  });

  const metrics: AnalyticsMetrics = {
    ordersPerMin,
    avgOrderValue,
    riderUtilization,
    outletHealth,
    revenueTrend: revenueTrend.reverse(),
    orderTrend: orderTrend.reverse()
  };

  // Cache result
  await idb.put(STORE_NAME, { data: metrics, timestamp: Date.now() }, cacheKey);

  return metrics;
}
