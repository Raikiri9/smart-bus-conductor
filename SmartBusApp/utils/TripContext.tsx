import { createContext, useContext, useEffect, useRef, useState } from 'react';
import { Platform, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Location from 'expo-location';
import * as Speech from 'expo-speech';
import calculateDistance, { routeDistanceKm } from './distance';
import { API_BASE_URL, apiFetch, getApiHeaders } from './api';

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
  const isSpeakingRef = useRef(false);
  const speechQueueRef = useRef<Array<() => Promise<void>>>([]);
  const OUTSIDE_KEY = 'OUTSIDE_PASSENGERS';

  // Sanitize and prepare text for speech engine
  const prepareSpeechText = (text: string): { text: string; rate: number } => {
    // Remove only truly problematic characters, keep alphanumeric and common punctuation
    const cleaned = text
      .replace(/[<>{}[\]|\\^`~]/g, '') // Remove only highly problematic symbols
      .replace(/\s+/g, ' ') // Collapse multiple spaces
      .trim();
    
    // If text contains multiple words or special formatting, use slower rate
    const hasComplexDestination = /going to|past|away/i.test(cleaned);
    const rate = hasComplexDestination ? 0.85 : 0.95;
    
    return { text: cleaned, rate };
  };

  const setJourneyActive = (flag: boolean) => {
    setJourneyActiveState(flag);
  }; 

  // Queue-based speech handler to prevent overlapping voices
  const queueAndPlaySpeech = async (text: string, alertName: string): Promise<void> => {
    return new Promise<void>((resolve) => {
      const speechTask = async () => {
        try {
          // Wait for any current speech to finish
          while (isSpeakingRef.current) {
            await new Promise(r => setTimeout(r, 100));
          }
          
          isSpeakingRef.current = true;
          console.log(`🔊 [QUEUE] Starting: ${alertName}`);
          
          // Stop any existing speech
          await Speech.stop().catch(() => {});
          await new Promise(r => setTimeout(r, 150)); // Brief pause for clean stop
          
          // Play the speech
          return new Promise<void>((speechResolve) => {
            const timeout = setTimeout(() => {
              console.warn(`⚠️ [TIMEOUT] Speech took too long: ${alertName}`);
              isSpeakingRef.current = false;
              speechResolve();
            }, 15000);
            
            const { text: cleanedText, rate: dynamicRate } = prepareSpeechText(text);
            
            Speech.speak(cleanedText, {
              language: 'en',
              pitch: 1.0,
              rate: dynamicRate,
              onDone: () => {
                clearTimeout(timeout);
                console.log(`✅ [DONE] ${alertName}`);
                isSpeakingRef.current = false;
                speechResolve();
              },
              onError: (error: any) => {
                clearTimeout(timeout);
                console.warn(`❌ [ERROR] ${alertName}:`, error);
                isSpeakingRef.current = false;
                speechResolve();
              },
            });
          });
        } catch (error) {
          console.error(`❌ [EXCEPTION] ${alertName}:`, error);
          isSpeakingRef.current = false;
          throw error;
        }
      };
      
      // Add to queue and process
      speechQueueRef.current.push(speechTask);
      
      const processQueue = async () => {
        if (speechQueueRef.current.length === 0) {
          resolve();
          return;
        }
        
        const task = speechQueueRef.current.shift();
        if (task) {
          try {
            await task();
          } catch (err) {
            console.error('Queue task error:', err);
          }
        }
        
        // Process next item
        await processQueue();
      };
      
      // Start processing if not already running
      if (speechQueueRef.current.length === 1) {
        processQueue().then(resolve).catch(() => resolve());
      }
    });
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
    // Only start location watcher when a trip is actually active
    if (!journeyActive || !trip) {
      return;
    }

    let subscription: Location.LocationSubscription | null = null;
    let canceled = false;

    const startWatcher = async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return;

      subscription = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.Balanced,
          timeInterval: 10000,
          distanceInterval: 100,
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
              movingAlertRef.current = true;
              queueAndPlaySpeech(
                'Alert: the bus is moving while registered passengers are still outside. Please ensure everyone is onboard.',
                'Bus movement alert'
              ).catch(() => {});
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
  }, [journeyActive, trip]);

  // Trigger voice alerts when GPS updates
  useEffect(() => {
    if (busLocation) {
      checkVoiceAlerts();
    }
  }, [busLocation]);

  const checkVoiceAlerts = async () => {
    if (!busLocation) return;
    try {
      const res = await apiFetch(`${API_BASE_URL}/api/trips/active/`);
      const trips = await res.json();

      for (const t of trips) {
        // Try road-based distance using local proxy or public OSRM
        // For LD Player: replace YOUR_IP with your actual machine IP from ipconfig
        const osrmUrl = 'http://10.0.2.2:3001'; // Android Emulator - reaches host via special IP
        // For LD Player, use instead: 'http://YOUR_IP:3001' where YOUR_IP is from ipconfig
        
        let distanceKm = await routeDistanceKm(
          busLocation.latitude,
          busLocation.longitude,
          t.destination_lat,
          t.destination_lng,
          osrmUrl // Pass local proxy URL
        );

        if (distanceKm === null) {
          // Fallback to straight-line distance if OSRM fails
          console.log(`[Distance] OSRM/Proxy failed for trip ${t.id}, using straight-line distance`);
          distanceKm = calculateDistance(
            busLocation.latitude,
            busLocation.longitude,
            t.destination_lat,
            t.destination_lng
          );
        } else {
          console.log(`[Distance] Used road distance for trip ${t.id}: ${distanceKm.toFixed(1)}km`);
        }

        if (distanceKm <= 5 && !alertedTrips.current.has(`approach-${t.id}`) && Platform.OS !== 'web') {
          const distanceText = distanceKm < 1 
            ? `${Math.round(distanceKm * 1000)} meters` 
            : `${distanceKm.toFixed(1)} kilometers`;
          
          const alertText = `Passenger going to ${t.destination_name}, your destination is approaching. You are ${distanceText} away.`;
          queueAndPlaySpeech(alertText, `Approaching alert: ${t.destination_name}`).catch(() => {});
          
          // Also show visual alert with distance
          Alert.alert(
            '📍 Approaching Destination',
            `You are ${distanceText} away from ${t.destination_name}`,
            [{ text: 'OK' }]
          );
          
          alertedTrips.current.add(`approach-${t.id}`);
        }

        if (
          distanceKm >= 20 &&
          alertedTrips.current.has(`approach-${t.id}`) &&
          !alertedTrips.current.has(`missed-${t.id}`) &&
          Platform.OS !== 'web'
        ) {
          const distancePastText = distanceKm < 1 
            ? `${Math.round(distanceKm * 1000)} meters` 
            : `${distanceKm.toFixed(1)} kilometers`;
          
          const alertText = `Passenger going to ${t.destination_name}, you have missed your destination. You are now ${distancePastText} past it.`;
          queueAndPlaySpeech(alertText, `Missed destination alert: ${t.destination_name}`).catch(() => {});
          
          // Visual alert for missed destination
          Alert.alert(
            '⚠️ Missed Destination',
            `You have passed ${t.destination_name}. You are now ${distancePastText} past it. Please notify the driver.`,
            [{ text: 'OK' }]
          );
          
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
