import { db, doc, setDoc, serverTimestamp, OperationType, handleFirestoreError } from '../firebase';

interface LocationData {
  lat: number;
  lng: number;
  timestamp: any;
  accuracy: number;
  speed: number | null;
}

class RiderLocationService {
  private watchId: number | null = null;
  private lastUpdateTime: number = 0;
  private throttleInterval: number = 3000; // 3 seconds
  private isPaused: boolean = false;

  constructor() {
    document.addEventListener('visibilitychange', this.handleVisibilityChange);
  }

  private handleVisibilityChange = () => {
    if (document.visibilityState === 'hidden') {
      this.pauseTracking();
    } else {
      this.resumeTracking();
    }
  };

  public startTracking(riderId: string, orderStatus: string) {
    if (this.watchId !== null) return;
    if (orderStatus !== 'out-for-delivery') {
      console.log('Tracking not started: Order is not out-for-delivery');
      return;
    }

    this.watchId = navigator.geolocation.watchPosition(
      (position) => this.updateLocation(riderId, position),
      (error) => console.error('Geolocation error:', error),
      {
        enableHighAccuracy: true,
        maximumAge: 0,
        timeout: 5000,
      }
    );
  }

  public stopTracking() {
    if (this.watchId !== null) {
      navigator.geolocation.clearWatch(this.watchId);
      this.watchId = null;
    }
    document.removeEventListener('visibilitychange', this.handleVisibilityChange);
  }

  private pauseTracking() {
    this.isPaused = true;
    console.log('Tracking paused (app minimized)');
  }

  private resumeTracking() {
    this.isPaused = false;
    console.log('Tracking resumed');
  }

  private async updateLocation(riderId: string, position: GeolocationPosition) {
    if (this.isPaused) return;

    const now = Date.now();
    if (now - this.lastUpdateTime < this.throttleInterval) return;

    this.lastUpdateTime = now;

    const locationData: LocationData = {
      lat: position.coords.latitude,
      lng: position.coords.longitude,
      timestamp: serverTimestamp(),
      accuracy: position.coords.accuracy,
      speed: position.coords.speed,
    };

    const path = `riders/${riderId}/live_location/current`;
    try {
      await setDoc(doc(db, 'riders', riderId, 'live_location', 'current'), locationData);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, path);
    }
  }
}

export const riderLocationService = new RiderLocationService();
