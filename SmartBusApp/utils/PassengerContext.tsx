import { createContext, useContext, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

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
    const saved = await AsyncStorage.getItem('PASSENGER_COUNT');
    // eslint-disable-next-line no-console
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
