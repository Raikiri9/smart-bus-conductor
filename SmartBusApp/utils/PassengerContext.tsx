import { createContext, useContext, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

type PassengerContextType = {
  count: number;
  loaded: boolean;
  addPassenger: () => Promise<void>;
  resetPassengers: () => Promise<void>;
};

const PassengerContext = createContext<PassengerContextType | undefined>(undefined);

export function PassengerProvider({ children }: { children: React.ReactNode }) {
  const [count, setCount] = useState<number>(0);
  const [loaded, setLoaded] = useState<boolean>(false);

  useEffect(() => {
    loadCount();
  }, []);

  const loadCount = async () => {
    try {
      // Get API base URL (same logic as app uses)
      const apiUrl = Platform.OS === 'android' 
        ? 'http://10.0.2.2:8000' 
        : 'http://localhost:8000';

      // Fetch active trips from Django
      const response = await fetch(`${apiUrl}/api/trips/active/`);
      
      if (response.ok) {
        const activeTrips = await response.json();
        const activeCount = Array.isArray(activeTrips) ? activeTrips.length : 0;
        
        console.log('PassengerContext: loaded active trips from Django ->', activeCount);
        setCount(activeCount);
        
        // Also update local storage for offline fallback
        await AsyncStorage.setItem('PASSENGER_COUNT', activeCount.toString());
        setLoaded(true);
        return;
      }
    } catch (error) {
      console.log('PassengerContext: Failed to fetch from Django, using local storage', error);
    }

    // Fallback to local storage if Django fetch fails
    const saved = await AsyncStorage.getItem('PASSENGER_COUNT');
    console.log('PassengerContext: loaded count from storage ->', saved);
    setCount(saved ? Number(saved) : 0);
    setLoaded(true);
  };

  const addPassenger = async () => {
    setCount(prev => {
      const newCount = prev + 1;
      // eslint-disable-next-line no-console
      console.log('PassengerContext: addPassenger -> newCount', newCount);
      AsyncStorage.setItem('PASSENGER_COUNT', newCount.toString()).catch(() => {});
      return newCount;
    });
  };

  const resetPassengers = async () => {
    setCount(0);
    await AsyncStorage.removeItem('PASSENGER_COUNT');
  };

  return (
    <PassengerContext.Provider value={{ count, loaded, addPassenger, resetPassengers }}>
      {children}
    </PassengerContext.Provider>
  );
}

export function usePassengers() {
  const context = useContext(PassengerContext);
  if (!context) {
    throw new Error('usePassengers must be used within PassengerProvider');
  }
  return context;
}
