import * as turf from '@turf/turf';

export function getDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const from = turf.point([lng1, lat1]);
  const to = turf.point([lng2, lat2]);
  return turf.distance(from, to, { units: 'kilometers' });
}

export function simulateRoute(start: [number, number], end: [number, number]): [number, number][] {
  const from = turf.point([start[1], start[0]]);
  const to = turf.point([end[1], end[0]]);
  
  // For a simple simulation, we use a midpoint and slightly deviate it to look like a road
  const midpoint = turf.midpoint(from, to);
  const bearing = turf.bearing(from, to);
  
  // Add some "road-like" deviation
  const curvedMidpoint = turf.destination(midpoint, 0.2, bearing + 90, { units: 'kilometers' });
  
  const line = turf.lineString([
    [start[1], start[0]],
    curvedMidpoint.geometry.coordinates,
    [end[1], end[0]]
  ]);
  
  const bezier = turf.bezierSpline(line);
  return bezier.geometry.coordinates.map(coord => [coord[1], coord[0]] as [number, number]);
}

export function calculateETA(distanceKm: number, avgSpeedKph: number = 25): number {
  // Simple ETA calculation: distance / speed * 60 minutes
  // Add 2 minutes for traffic/signals
  const timeMinutes = (distanceKm / avgSpeedKph) * 60;
  return Math.round(timeMinutes + 2);
}
