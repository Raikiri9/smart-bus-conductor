import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import * as Linking from 'expo-linking';
import { Alert, Platform } from 'react-native';
import * as Location from 'expo-location';
import { router } from 'expo-router';

interface SimulationState {
  isSimulating: boolean;
  simulatedLocation: Location.LocationObject | null;
  simulatedQRCode: string | null;
  simulationSpeed: number; // 1x = normal, 2x = faster
  currentStep: string; // Track which step in the simulation we're on
  autoNavigate: boolean; // Whether to auto-navigate between screens
}

interface SimulationContextType {
  state: SimulationState;
  setState: React.Dispatch<React.SetStateAction<SimulationState>>;
  handleDeepLink: (url: string) => void;
  startGPSSimulation: (sessionId: string) => void;
  stopGPSSimulation: () => void;
  simulateQRScan: (qrCode: string) => void;
  triggerApproachingAlert: (destination: string, distance: number) => void;
  triggerMissedAlert: (destination: string) => void;
}

const SimulationContext = createContext<SimulationContextType | undefined>(undefined);

export function SimulationProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<SimulationState>({
    isSimulating: false,
    simulatedLocation: null,
    simulatedQRCode: null,
    simulationSpeed: 1,
    currentStep: 'idle',
    autoNavigate: false,
  });

  const [gpsSimulationInterval, setGpsSimulationInterval] = useState<ReturnType<typeof setInterval> | null>(null);

  // Handle deep link URL
  const handleDeepLink = (url: string) => {
    console.log('📱 Deep link received:', url);
    
    const { hostname, path, queryParams } = Linking.parse(url);
    const action = hostname || path?.split('/')[1];

    console.log('🔗 Parsed:', { action, queryParams });

    switch (action) {
      case 'simulate':
        handleSimulateAction(queryParams);
        break;
      case 'gps':
        handleGPSSimulation(queryParams);
        break;
      case 'qr':
        handleQRSimulation(queryParams);
        break;
      case 'alert':
        handleAlertSimulation(queryParams);
        break;
      case 'navigate':
        handleNavigationAction(queryParams);
        break;
      case 'scenario':
        handleMasterScenario(queryParams);
        break;
      default:
        console.log('Unknown deep link action:', action);
    }
  };

  // Handle different simulation actions
  const handleSimulateAction = (params: any) => {
    const type = params?.type;
    
    switch (type) {
      case 'gps':
        if (params?.lat && params?.lng) {
          const location: Location.LocationObject = {
            coords: {
              latitude: parseFloat(params.lat),
              longitude: parseFloat(params.lng),
              altitude: params.altitude ? parseFloat(params.altitude) : null,
              accuracy: params.accuracy ? parseFloat(params.accuracy) : 10,
              altitudeAccuracy: null,
              heading: params.heading ? parseFloat(params.heading) : null,
              speed: params.speed ? parseFloat(params.speed) : null,
            },
            timestamp: Date.now(),
          };
          
          setState(prev => ({ ...prev, simulatedLocation: location, isSimulating: true }));
          console.log('📍 GPS simulated:', location.coords);
          Alert.alert('GPS Simulated', `Location set to ${params.lat}, ${params.lng}`);
        }
        break;
      
      case 'qr':
        if (params?.code) {
          simulateQRScan(params.code);
        }
        break;
      
      case 'approaching':
        if (params?.destination) {
          triggerApproachingAlert(params.destination, params.distance || 5000);
        }
        break;
      
      case 'missed':
        if (params?.destination) {
          triggerMissedAlert(params.destination);
        }
        break;
    }
  };

  const handleGPSSimulation = (params: any) => {
    handleSimulateAction({ ...params, type: 'gps' });
  };

  const handleQRSimulation = (params: any) => {
    handleSimulateAction({ ...params, type: 'qr' });
  };

  const handleAlertSimulation = (params: any) => {
    if (params?.type === 'approaching') {
      handleSimulateAction({ ...params, type: 'approaching' });
    } else if (params?.type === 'missed') {
      handleSimulateAction({ ...params, type: 'missed' });
    }
  };

  // Handle navigation between screens
  const handleNavigationAction = (params: any) => {
    const screen = params?.screen;
    
    if (!screen) {
      console.error('No screen specified for navigation');
      return;
    }

    console.log(`🧭 Navigating to: ${screen}`);
    setState(prev => ({ ...prev, currentStep: screen }));

    try {
      switch (screen) {
        case 'home':
          router.replace('/(tabs)');
          break;
        case 'destination':
          router.push('/destination');
          break;
        case 'payment':
          router.push('/payment');
          break;
        case 'confirmation':
          router.push('/confirmation');
          break;
        case 'bus-break':
          router.push('/bus-break');
          break;
        case 'disembark':
          router.push('/disembark');
          break;
        default:
          console.warn(`Unknown screen: ${screen}`);
      }
    } catch (error) {
      console.error('Navigation error:', error);
    }
  };

  // Master scenario that orchestrates the complete journey
  const handleMasterScenario = async (params: any) => {
    const type = params?.type || 'full';
    
    console.log('🎬 Starting Master Scenario:', type);
    setState(prev => ({ ...prev, isSimulating: true, autoNavigate: true, currentStep: 'start' }));

    // Different scenario types
    switch (type) {
      case 'full':
        await runFullJourneyScenario();
        break;
      case 'approaching':
        await runApproachingScenario();
        break;
      case 'missed':
        await runMissedDestinationScenario();
        break;
      case 'bus-break':
        await runBusBreakScenario();
        break;
      default:
        console.log('Unknown scenario type');
    }
  };

  // Complete journey scenario
  const runFullJourneyScenario = async () => {
    try {
      // Step 1: Navigate to destination screen
      console.log('📍 Step 1: Destination Selection');
      setState(prev => ({ ...prev, currentStep: 'destination' }));
      router.push('/destination');
      
      // Note: Actual progression handled by master controller (Node-RED)
      // This function just sets up the initial state
    } catch (error) {
      console.error('Scenario error:', error);
      setState(prev => ({ ...prev, isSimulating: false, autoNavigate: false }));
    }
  };

  const runApproachingScenario = async () => {
    console.log('🔔 Running Approaching Destination Scenario');
    setState(prev => ({ ...prev, currentStep: 'approaching' }));
    triggerApproachingAlert('Harare', 500);
  };

  const runMissedDestinationScenario = async () => {
    console.log('⚠️ Running Missed Destination Scenario');
    setState(prev => ({ ...prev, currentStep: 'missed' }));
    triggerMissedAlert('Harare');
  };

  const runBusBreakScenario = async () => {
    console.log('🚻 Running Bus Break Scenario');
    setState(prev => ({ ...prev, currentStep: 'bus-break' }));
    router.push('/bus-break');
  };

  // Start GPS simulation from backend path
  const startGPSSimulation = async (sessionId: string) => {
    console.log('🚀 Starting GPS simulation session:', sessionId);
    
    // Stop any existing simulation
    if (gpsSimulationInterval) {
      clearInterval(gpsSimulationInterval);
    }

    setState(prev => ({ ...prev, isSimulating: true }));

    // Poll backend for next GPS point every 2 seconds
    const interval = setInterval(async () => {
      try {
        const apiUrl = Platform.OS === 'android' 
          ? 'http://10.0.2.2:8000' 
          : 'http://localhost:8000';
        
        const response = await fetch(`${apiUrl}/api/trips/simulate/gps/next/${sessionId}/`);
        const data = await response.json();

        if (data.completed) {
          console.log('✅ GPS simulation completed');
          stopGPSSimulation();
          Alert.alert('Simulation Complete', 'GPS path completed');
          return;
        }

        if (data.location) {
          const location: Location.LocationObject = {
            coords: {
              latitude: data.location.lat,
              longitude: data.location.lng,
              altitude: null,
              accuracy: 10,
              altitudeAccuracy: null,
              heading: data.location.heading || null,
              speed: data.location.speed || null,
            },
            timestamp: Date.now(),
          };
          
          setState(prev => ({ ...prev, simulatedLocation: location }));
          console.log(`📍 Simulated GPS: ${data.location.lat}, ${data.location.lng}`);
        }
      } catch (error) {
        console.error('GPS simulation error:', error);
      }
    }, 2000 / state.simulationSpeed);

    setGpsSimulationInterval(interval);
  };

  const stopGPSSimulation = () => {
    if (gpsSimulationInterval) {
      clearInterval(gpsSimulationInterval);
      setGpsSimulationInterval(null);
    }
    setState(prev => ({ ...prev, isSimulating: false, simulatedLocation: null }));
    console.log('⏹️ GPS simulation stopped');
  };

  const simulateQRScan = (qrCode: string) => {
    setState(prev => ({ ...prev, simulatedQRCode: qrCode }));
    console.log('📱 QR Code simulated:', qrCode);
    Alert.alert('QR Scanned', `Code: ${qrCode}`, [
      { text: 'OK', onPress: () => setState(prev => ({ ...prev, simulatedQRCode: null })) }
    ]);
  };

  const triggerApproachingAlert = (destination: string, distance: number) => {
    console.log(`🔔 Approaching ${destination} - ${distance}m away`);
    Alert.alert(
      '📍 Approaching Destination',
      `You are ${distance}m away from ${destination}`,
      [{ text: 'OK' }]
    );
  };

  const triggerMissedAlert = (destination: string) => {
    console.log(`⚠️ Missed destination: ${destination}`);
    Alert.alert(
      '⚠️ Missed Destination',
      `You have passed ${destination}. Please notify the driver.`,
      [{ text: 'OK' }]
    );
  };

  // Listen for deep links
  useEffect(() => {
    // Handle initial URL (app opened from deep link)
    Linking.getInitialURL().then(url => {
      if (url) {
        handleDeepLink(url);
      }
    });

    // Handle subsequent URLs (app already open)
    const subscription = Linking.addEventListener('url', ({ url }) => {
      handleDeepLink(url);
    });

    return () => {
      subscription.remove();
      if (gpsSimulationInterval) {
        clearInterval(gpsSimulationInterval);
      }
    };
  }, []);

  return (
    <SimulationContext.Provider value={{
      state,
      setState,
      handleDeepLink,
      startGPSSimulation,
      stopGPSSimulation,
      simulateQRScan,
      triggerApproachingAlert,
      triggerMissedAlert,
    }}>
      {children}
    </SimulationContext.Provider>
  );
}

export function useSimulation() {
  const context = useContext(SimulationContext);
  if (context === undefined) {
    throw new Error('useSimulation must be used within a SimulationProvider');
  }
  return context;
}
