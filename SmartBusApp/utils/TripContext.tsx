import { createContext, useContext, useEffect, useRef, useState } from 'react';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Location from 'expo-location';
import * as Speech from 'expo-speech';
import calculateDistance, { routeDistanceKm } from './distance';
import { API_BASE_URL } from './api';

type TripType = {
  destination: string;
  fare: number;
  distance?: number;
  currentLocation?: string;
  destinationCoords?: { latitude: number; longitude: number };
  approachingNotified?: boolean;
  overTravelNotified?: boolean;
  email?: string;
};

type TripContextType = {
  trip: TripType | null;
  journeyActive: boolean;
  setJourneyActive: (flag: boolean) => void;
  setTrip: (trip: TripType) => Promise<void>;
  startTrip: (trip: TripType) => Promise<boolean>;
  updateTrip: (updates: Partial<TripType>) => Promise<void>;
  clearTrip: () => Promise<void>;
};

const TripContext = createContext<TripContextType | undefined>(undefined);

export function TripProvider({ children }: { children: React.ReactNode }) {
  const [trip, setTripState] = useState<TripType | null>(null);
  const [journeyActive, setJourneyActiveState] = useState<boolean>(false);
  const [busLocation, setBusLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const lastCoordsRef = useRef<{ lat: number; lon: number } | null>(null);
  const movingAlertRef = useRef(false);
  const alertedTrips = useRef<Set<string>>(new Set());
  const OUTSIDE_KEY = 'OUTSIDE_PASSENGERS';

  const setJourneyActive = (flag: boolean) => {
    setJourneyActiveState(flag);
  }; 

  useEffect(() => {
    loadTrip();
  }, []);

  const loadOutsidePassengers = async () => {
    try {
      const raw = await AsyncStorage.getItem(OUTSIDE_KEY);
      if (!raw) return [] as string[];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? (parsed as string[]) : [];
    } catch (error) {
      return [] as string[];
    }
  };

  const persist = async (value: TripType | null) => {
    if (value === null) {
      await AsyncStorage.removeItem('ACTIVE_TRIP');
    } else {
      await AsyncStorage.setItem('ACTIVE_TRIP', JSON.stringify(value));
    }
  };

  const loadTrip = async () => {
    const saved = await AsyncStorage.getItem('ACTIVE_TRIP');
    if (saved) setTripState(JSON.parse(saved));
    setJourneyActiveState(!!saved);
  }; 

  const setTrip = async (tripData: TripType) => {
    const newTrip = { ...tripData, approachingNotified: false, overTravelNotified: false };
    setTripState(newTrip);
    await persist(newTrip);
    setJourneyActiveState(true);
  }; 

  // Backwards-compatible alias expected by some callers
  const startTrip = async (tripData: TripType) => {
    // Allow overwriting existing trip with new destination selection
    await setTrip(tripData);
    return true;
  };

  const updateTrip = async (updates: Partial<TripType>) => {
    setTripState(prev => {
      if (!prev) return prev;
      const next = { ...prev, ...updates };
      // Fire-and-forget persisting; keep UI responsive
      persist(next).catch(() => {});
      return next;
    });
  };

  const clearTrip = async () => {
    setTripState(null);
    setJourneyActiveState(false);
    await persist(null);
  }; 

  // Monitor bus location to drive voice alerts for approaching/over-travel and passengers outside during breaks
  useEffect(() => {
    let subscription: Location.LocationSubscription | null = null;
    let canceled = false;

    const startWatcher = async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return;

      subscription = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.High,
          timeInterval: 5000,
          distanceInterval: 50,
        },
        async ({ coords }) => {
          if (canceled) return;
          const { latitude, longitude } = coords;
          const previous = lastCoordsRef.current;
          lastCoordsRef.current = { lat: latitude, lon: longitude };
          setBusLocation({ latitude, longitude });

          // If bus moves while passengers are marked outside, alert
          const outsideList = await loadOutsidePassengers();
          if (outsideList.length === 0) {
            movingAlertRef.current = false;
            return;
          }

          // We consider movement if we receive a position update with a change > 0.3 km
          if (previous) {
            const movedKm = calculateDistance(
              previous.lat,
              previous.lon,
              latitude,
              longitude
            );

            if (movedKm >= 0.3 && !movingAlertRef.current && Platform.OS !== 'web') {
              Speech.speak(
                'Alert: the bus is moving while registered passengers are still outside. Please ensure everyone is onboard.',
                { rate: 0.95, pitch: 1 }
              );
              movingAlertRef.current = true;
            }
          }
        }
      );
    };

    startWatcher();

    return () => {
      canceled = true;
      subscription?.remove();
    };
  }, []);

  // Trigger voice alerts when GPS updates
  useEffect(() => {
    if (busLocation) {
      checkVoiceAlerts();
    }
  }, [busLocation]);

  const checkVoiceAlerts = async () => {
    if (!busLocation) return;
    try {
      const res = await fetch(`${API_BASE_URL}/api/trips/active/`);
      const trips = await res.json();

      for (const t of trips) {
        // Try road-based distance first, fall back to straight-line
        let distanceKm = await routeDistanceKm(
          busLocation.latitude,
          busLocation.longitude,
          t.destination_lat,
          t.destination_lng
        );

        if (distanceKm === null) {
          // Fallback to straight-line distance if OSRM fails
          distanceKm = calculateDistance(
            busLocation.latitude,
            busLocation.longitude,
            t.destination_lat,
            t.destination_lng
          );
        }

        if (distanceKm <= 5 && !alertedTrips.current.has(`approach-${t.id}`) && Platform.OS !== 'web') {
          Speech.speak(`Passenger going to ${t.destination_name}, your destination is approaching.`);
          alertedTrips.current.add(`approach-${t.id}`);
        }

        if (
          distanceKm >= 20 &&
          alertedTrips.current.has(`approach-${t.id}`) &&
          !alertedTrips.current.has(`missed-${t.id}`) &&
          Platform.OS !== 'web'
        ) {
          Speech.speak(`Passenger going to ${t.destination_name}, you have missed your destination.`);
          alertedTrips.current.add(`missed-${t.id}`);
        }
      }
    } catch (error) {
      // ignore network errors
    }
  };

  return (
    <TripContext.Provider value={{ trip, journeyActive, setJourneyActive, setTrip, startTrip, updateTrip, clearTrip }}>
      {children}
    </TripContext.Provider>
  );
}

export function useTrip() {
  const context = useContext(TripContext);
  if (!context) throw new Error('useTrip must be used within TripProvider');
  return context;
}
