import React, { useEffect, useState, useRef, useCallback, createContext, useContext } from 'react';
import NetInfo from '@react-native-community/netinfo';
import { Alert } from 'react-native';
import OfflineQueueManager from './OfflineQueueManager';

type SyncStatus = 'idle' | 'syncing' | 'success' | 'error';

interface SyncResult {
  status: SyncStatus;
  totalSynced: number;
  totalFailed: number;
  pendingCount: {
    trips: number;
    payments: number;
    validations: number;
  };
}

// Hook to monitor connectivity and manage syncing
export const useConnectivitySync = () => {
  const [isOnline, setIsOnline] = useState<boolean>(true);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('idle');
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);
  const [syncResult, setSyncResult] = useState<SyncResult | null>(null);
  const syncInProgressRef = useRef(false);

  // Monitor network connectivity
  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener(async state => {
      const connected = state.isConnected ?? false;
      setIsOnline(connected);

      if (connected && !syncInProgressRef.current) {
        // Auto-sync when connection is restored
        performSync();
      }
    });

    return () => unsubscribe();
  }, []);

  // Perform sync operation
  const performSync = useCallback(async () => {
    if (syncInProgressRef.current) {
      console.log('Sync already in progress');
      return;
    }

    syncInProgressRef.current = true;
    setSyncStatus('syncing');

    try {
      const { totalSynced, totalFailed } = await OfflineQueueManager.syncAll();
      const pendingCount = await OfflineQueueManager.getPendingCount();

      setSyncStatus(totalFailed === 0 ? 'success' : 'error');
      setLastSyncTime(new Date());
      setSyncResult({
        status: totalFailed === 0 ? 'success' : 'error',
        totalSynced,
        totalFailed,
        pendingCount,
      });

      // Show notification if there were synced items
      if (totalSynced > 0) {
        Alert.alert(
          'Sync Complete',
          `${totalSynced} operations synced successfully.${
            totalFailed > 0 ? `\n${totalFailed} failed.` : ''
          }`
        );
      }
    } catch (error) {
      console.error('Sync error:', error);
      setSyncStatus('error');
      setSyncResult({
        status: 'error',
        totalSynced: 0,
        totalFailed: 0,
        pendingCount: { trips: 0, payments: 0, validations: 0 },
      });
    } finally {
      syncInProgressRef.current = false;
    }
  }, []);

  // Manual sync trigger
  const manualSync = useCallback(async () => {
    if (!isOnline) {
      Alert.alert('Offline', 'Cannot sync while offline. Please check your connection.');
      return;
    }
    await performSync();
  }, [isOnline, performSync]);

  return {
    isOnline,
    syncStatus,
    lastSyncTime,
    syncResult,
    manualSync,
  };
};

// Context and Provider for connectivity sync
interface ConnectivityContextType {
  isOnline: boolean;
  syncStatus: SyncStatus;
  lastSyncTime: Date | null;
  syncResult: SyncResult | null;
  manualSync: () => Promise<void>;
}

const ConnectivityContext = createContext<ConnectivityContextType | undefined>(undefined);

export const useConnectivity = () => {
  const context = useContext(ConnectivityContext);
  if (!context) {
    throw new Error('useConnectivity must be used within ConnectivityProvider');
  }
  return context;
};

export const ConnectivityProvider = ({ children }: { children: React.ReactNode }) => {
  const syncState = useConnectivitySync();

  return (
    <ConnectivityContext.Provider value={syncState}>
      {children}
    </ConnectivityContext.Provider>
  );
};
