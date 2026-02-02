import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useConnectivity } from '../utils/ConnectivityManager';

export default function OfflineIndicator() {
  const { isOnline, syncStatus, syncResult, manualSync } = useConnectivity();

  if (isOnline && syncStatus === 'idle') {
    return null; // Don't show anything when online and nothing to sync
  }

  const getPendingTotal = () => {
    if (!syncResult) return 0;
    const { trips, payments, validations } = syncResult.pendingCount;
    return trips + payments + validations;
  };

  const pendingCount = getPendingTotal();

  return (
    <View
      style={[
        styles.container,
        !isOnline ? styles.offline : styles.online,
      ]}
    >
      <View style={styles.content}>
        {/* Status Icon */}
        {syncStatus === 'syncing' ? (
          <ActivityIndicator size="small" color="#FFFFFF" />
        ) : (
          <Text style={styles.icon}>
            {!isOnline ? '📶' : syncStatus === 'success' ? '✓' : '⟳'}
          </Text>
        )}

        {/* Status Text */}
        <Text style={styles.text}>
          {!isOnline
            ? `Offline${pendingCount > 0 ? ` (${pendingCount} pending)` : ''}`
            : syncStatus === 'syncing'
            ? 'Syncing...'
            : syncStatus === 'success'
            ? 'Synced'
            : pendingCount > 0
            ? `${pendingCount} pending`
            : 'Online'}
        </Text>

        {/* Manual Sync Button */}
        {isOnline && pendingCount > 0 && syncStatus !== 'syncing' && (
          <TouchableOpacity
            style={styles.syncButton}
            onPress={manualSync}
          >
            <Text style={styles.syncButtonText}>Sync Now</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 6,
    marginBottom: 8,
  },
  offline: {
    backgroundColor: '#DC2626',
  },
  online: {
    backgroundColor: '#059669',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  icon: {
    fontSize: 14,
  },
  text: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
    flex: 1,
  },
  syncButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 4,
  },
  syncButtonText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
});
