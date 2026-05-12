import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import * as Linking from 'expo-linking';
import { Alert, Platform, ToastAndroid } from 'react-native';
import * as Location from 'expo-location';
import * as Speech from 'expo-speech';
import { router } from 'expo-router';

interface SimulationState {
  isSimulating: boolean;
  simulatedLocation: Location.LocationObject | null;
  simulatedQRCode: string | null;
  simulationSpeed: number; // 1x = normal, 2x = faster
  currentStep: string; // Track which step in the simulation we're on
  autoNavigate: boolean; // Whether to auto-navigate between screens
  busLocation: { latitude: number; longitude: number } | null;
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
  resetAlertCounters: () => void;
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
    busLocation: null,
  });

  const [gpsSimulationInterval, setGpsSimulationInterval] = useState<ReturnType<typeof setInterval> | null>(null);

  // Alert counters - limit each notification to 2 occurrences
  const [approachingAlertCount, setApproachingAlertCount] = useState<number>(0);
  const [missedStopAlertCount, setMissedStopAlertCount] = useState<number>(0);
  const [passengerOutsideAlertCount, setPassengerOutsideAlertCount] = useState<number>(0);

  // Alert exclusivity - only one alert type plays at a time
  // Priority order: approaching → missed → safety
  const [activeAlertType, setActiveAlertType] = useState<'approaching' | 'missed' | 'safety' | null>(null);

  // Speech queue system - ensures alerts play sequentially, not overlapping
  const speechQueueRef = React.useRef<Array<{ message: string; type: string }>>([]);
  const isSpeakingRef = React.useRef<boolean>(false);

  const playSpeechSequentially = (message: string, type: string) => {
    speechQueueRef.current.push({ message, type });
    console.log(`📢 ${type} queued: "${message}" (Queue: ${speechQueueRef.current.length})`);
    processNextSpeech();
  };

  const processNextSpeech = async () => {
    // If already speaking, wait
    if (isSpeakingRef.current) {
      console.log('🔊 Speech in progress, waiting...');
      return;
    }

    // If queue empty, stop
    if (speechQueueRef.current.length === 0) {
      console.log('✅ Speech queue empty');
      return;
    }

    const { message, type } = speechQueueRef.current.shift()!;
    isSpeakingRef.current = true;

    console.log(`🎤 ${type} playing: "${message}" (${speechQueueRef.current.length} remaining)`);

    if (Platform.OS !== 'web') {
      await Speech.stop().catch(() => {});
      
      return new Promise<void>((resolve) => {
        // Small delay after stop to ensure clean start
        setTimeout(() => {
          Speech.speak(message, {
            language: 'en',
            pitch: 1.0,
            rate: 1.0,
            onStart: () => {
              console.log(`📣 ${type} started`);
            },
            onDone: () => {
              console.log(`✅ ${type} finished`);
              isSpeakingRef.current = false;
              resolve();
              // Small delay, then process next
              setTimeout(() => processNextSpeech(), 300);
            },
            onError: (error) => {
              console.error(`❌ ${type} error:`, error);
              isSpeakingRef.current = false;
              resolve();
              setTimeout(() => processNextSpeech(), 300);
            },
          });
        }, 150);
      });
    } else {
      isSpeakingRef.current = false;
      setTimeout(() => processNextSpeech(), 300);
    }
  };

  // Auto-dismissing notification helper
  const showAutoNotification = (title: string, message: string) => {
    if (Platform.OS === 'android') {
      // Android: Use ToastAndroid which auto-dismisses
      ToastAndroid.show(`${title}\n${message}`, ToastAndroid.SHORT);
    } else {
      // iOS/other: Show alert and auto-dismiss after 2 seconds
      Alert.alert(title, message);
      setTimeout(() => {
        Alert.alert(''); // This doesn't actually dismiss, so we just let it be
      }, 2000);
    }
  };

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
    // Reset alert counters for new scenario
    setApproachingAlertCount(0);
    setMissedStopAlertCount(0);
    setPassengerOutsideAlertCount(0);
    setActiveAlertType(null);
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
    // Reset alert counters when simulation stops
    setApproachingAlertCount(0);
    setMissedStopAlertCount(0);
    setPassengerOutsideAlertCount(0);
    setActiveAlertType(null);
    console.log('⏹️ GPS simulation stopped and alert counters reset');
  };

  const resetAlertCounters = () => {
    setApproachingAlertCount(0);
    setMissedStopAlertCount(0);
    setPassengerOutsideAlertCount(0);
    setActiveAlertType(null);
    console.log('🔄 Alert counters and active alert type reset');
  };

  const simulateQRScan = (qrCode: string) => {
    setState(prev => ({ ...prev, simulatedQRCode: qrCode }));
    console.log('📱 QR Code simulated:', qrCode);
    Alert.alert('QR Scanned', `Code: ${qrCode}`, [
      { text: 'OK', onPress: () => setState(prev => ({ ...prev, simulatedQRCode: null })) }
    ]);
  };

  const triggerApproachingAlert = (destination: string, distance: number) => {
    if (approachingAlertCount < 2) {
      console.log(`🔔 Approaching ${destination} - ${distance}m away (${approachingAlertCount + 1}/2)`);
      showAutoNotification(
        '📍 Approaching Destination',
        `You are ${distance}m away from ${destination}`
      );
      if (Platform.OS !== 'web') {
        Speech.stop().catch(() => {});
        Speech.speak(`Approaching your destination, ${destination}.`, {
          language: 'en',
          pitch: 1,
          rate: 0.9,
        });
      }
      setApproachingAlertCount(prev => prev + 1);
    }
  };

  const triggerMissedAlert = (destination: string) => {
    if (missedStopAlertCount < 2) {
      console.log(`⚠️ Missed destination: ${destination} (${missedStopAlertCount + 1}/2)`);
      showAutoNotification(
        '⚠️ Missed Destination',
        `You have passed ${destination}. Please notify the driver.`
      );
      if (Platform.OS !== 'web') {
        Speech.stop().catch(() => {});
        Speech.speak(`You missed your stop at ${destination}.`, {
          language: 'en',
          pitch: 1,
          rate: 0.9,
        });
      }
      setMissedStopAlertCount(prev => prev + 1);
    }
  };

  // Fetch continuous Node-RED simulation state
  const fetchNodeRedSimulation = async () => {
    try {
      const apiUrl = Platform.OS === 'android' 
        ? 'http://10.0.2.2:8000' 
        : 'http://localhost:8000';

      const response = await fetch(
        `${apiUrl}/api/trips/simulate/state/`
      );

      const data = await response.json();

      console.log('🔄 Simulation Data from Node-RED:', data);
      console.log('🔀 Active Alert Type:', activeAlertType);

      // UPDATE BUS LOCATION
      if (data.lat && data.lng) {
        setState(prev => ({
          ...prev,
          busLocation: {
            latitude: data.lat,
            longitude: data.lng,
          }
        }));
        console.log(`📍 Bus Location Updated: ${data.lat}, ${data.lng}`);
      }

      // ALERT EXCLUSIVITY: Determine which alert should be active (priority: approaching > missed > safety)
      let shouldBeActiveAlert = null;
      
      if (data.approaching_destination && data.destination) {
        shouldBeActiveAlert = 'approaching';
      } else if (data.missed_destination && data.destination) {
        shouldBeActiveAlert = 'missed';
      } else if (data.bus_moving && data.passengers_outside > 0) {
        shouldBeActiveAlert = 'safety';
      }

      // If no alert should be active, clear all counters and reset active type
      if (!shouldBeActiveAlert) {
        if (approachingAlertCount > 0) {
          setApproachingAlertCount(0);
          console.log('🔄 Approaching alert counter reset');
        }
        if (missedStopAlertCount > 0) {
          setMissedStopAlertCount(0);
          console.log('🔄 Missed alert counter reset');
        }
        if (passengerOutsideAlertCount > 0) {
          setPassengerOutsideAlertCount(0);
          console.log('🔄 Safety alert counter reset');
        }
        setActiveAlertType(null);
        return;
      }

      // Update active alert type
      setActiveAlertType(shouldBeActiveAlert);

      // APPROACHING DESTINATION ALERT - Only if this is the active alert type
      if (shouldBeActiveAlert === 'approaching' && data.approaching_destination && data.destination) {
        console.log(`📍 ACTIVE: Approaching alert - Count: ${approachingAlertCount}/2`);
        if (approachingAlertCount < 2) {
          console.log(`🔔 Approaching ${data.destination} - ${data.distance_m || 5000}m away (${approachingAlertCount + 1}/2)`);
          showAutoNotification(
            '📍 Approaching Destination',
            `You are ${data.distance_m || 5000}m away from ${data.destination}`
          );
          const msg = `Approaching your destination, ${data.destination}.`;
          playSpeechSequentially(msg, '📍 Approaching Alert');
          
          const newCount = approachingAlertCount + 1;
          setApproachingAlertCount(newCount);
          
          // Only clear the flag AFTER both alerts have triggered (when count reaches 2)
          if (newCount === 2) {
            console.log('✅ 2 approaching alerts played');
            fetch(`${apiUrl}/api/trips/simulate/update/`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ approaching_destination: false })
            }).catch(() => {});
          }
        }
      }

      // MISSED DESTINATION ALERT - Only if this is the active alert type
      if (shouldBeActiveAlert === 'missed' && data.missed_destination && data.destination) {
        console.log(`⚠️ ACTIVE: Missed alert - Count: ${missedStopAlertCount}/2`);
        if (missedStopAlertCount < 2) {
          console.log(`⚠️ Missed destination: ${data.destination} (${missedStopAlertCount + 1}/2)`);
          showAutoNotification(
            '⚠️ Missed Destination',
            `You have passed ${data.destination}. Please notify the driver.`
          );
          const msg = `You missed your stop at ${data.destination}.`;
          playSpeechSequentially(msg, '⚠️ Missed Alert');
          
          const newCount = missedStopAlertCount + 1;
          setMissedStopAlertCount(newCount);
          
          // Only clear the flag AFTER both alerts have triggered (when count reaches 2)
          if (newCount === 2) {
            console.log('✅ 2 missed alerts played');
            fetch(`${apiUrl}/api/trips/simulate/update/`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ missed_destination: false })
            }).catch(() => {});
          }
        }
      }

      // BUS BREAK SAFETY ALERT - Only if this is the active alert type
      if (shouldBeActiveAlert === 'safety' && data.bus_moving && data.passengers_outside > 0) {
        console.log(`🚨 ACTIVE: Safety alert - Count: ${passengerOutsideAlertCount}/2`);
        if (passengerOutsideAlertCount < 2) {
          console.log('🚨 Safety Alert: Bus moving with passengers outside! (', passengerOutsideAlertCount + 1, '/2 )');
          showAutoNotification(
            '🚨 Safety Alert',
            'Bus is moving while passengers are outside!'
          );
          const msg = 'Warning. Bus is moving while passengers are outside.';
          playSpeechSequentially(msg, '🚨 Safety Alert');
          
          setPassengerOutsideAlertCount(prev => prev + 1);
        }
      }

    } catch (error) {
      console.log('📡 Simulation Fetch Error:', error);
    }
  };

  // Continuous Node-RED simulation listener (every 2 seconds)
  useEffect(() => {
    const interval = setInterval(() => {
      fetchNodeRedSimulation();
    }, 2000);

    return () => clearInterval(interval);
  }, [approachingAlertCount, missedStopAlertCount, passengerOutsideAlertCount, activeAlertType]);

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
      resetAlertCounters,
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
