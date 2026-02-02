import { View, Text, StyleSheet, ScrollView, TouchableOpacity, useWindowDimensions, Platform, Alert } from 'react-native';
import { router } from 'expo-router';
import { useTrip } from '../utils/TripContext';
import { useEffect, useState } from 'react';
import { incrementPassengerCount } from '../utils/passengerCounter';
import { queueTrip } from '../utils/offlineDatabase';
import { useConnectivity } from '../utils/ConnectivityManager';
import * as Speech from 'expo-speech';
import QRCode from 'react-native-qrcode-svg';

// Generate a mock ticket ID
const generateTicketId = () => {
  const prefix = 'BUS-';
  const random = Math.random().toString().substring(2, 14);
  const suffix = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `${prefix}${random}-${suffix}`;
};

export default function ConfirmationScreen() {
  const { trip } = useTrip();
  const { isOnline } = useConnectivity();
  const [ticketId] = useState(generateTicketId());
  const [timeLeft, setTimeLeft] = useState(5);
  const [qrCode, setQrCode] = useState<string | null>(null);
  const { width } = useWindowDimensions();
  const [totalSeats] = useState(60);
  const [passengerAdded, setPassengerAdded] = useState(false);
  const [syncStatus, setSyncStatus] = useState<'idle' | 'pending' | 'synced'>('idle');

  const qrPayload = {
    ticketId,
    destination: trip?.destination ?? 'Unknown destination',
    origin: trip?.currentLocation ?? 'Unknown origin',
    fare: trip?.fare ?? 0,
    distanceKm: trip?.distance ?? null,
    timestamp: new Date().toISOString(),
    note: 'Show this QR to the conductor for verification',
  };

  const qrValue = JSON.stringify(qrPayload);
  const qrValueToRender = qrCode ?? qrValue;
  const qrSize = 220;

  // Increment passenger count and play welcome voice alert
  useEffect(() => {
    const addPassenger = async () => {
      if (!passengerAdded) {
        await incrementPassengerCount();
        setPassengerAdded(true);
        
        // Play welcome voice alert
        if (Platform.OS !== 'web') {
          try {
            await Speech.speak('Welcome to Smart Bus Conductor. Your payment has been confirmed. Please keep your QR code ready for scanning during the journey.', {
              language: 'en',
              pitch: 1,
              rate: 0.9,
            });
          } catch (error) {
            console.log('Voice alert error:', error);
          }
        }
      }
    };
    addPassenger();
  }, [passengerAdded]);

  // Auto-redirect after 5 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setTimeLeft((prev) => prev - 1);
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  // Handle redirect when time runs out
  useEffect(() => {
    if (timeLeft <= 0) {
      router.replace('/(tabs)');
    }
  }, [timeLeft]);

  // Send trip details to backend (or queue if offline)
  useEffect(() => {
    const sendTripToBackend = async () => {
      if (!trip) return;

      const tripData = {
        phone_number: trip.currentLocation ?? '0000000000',
        origin_lat: trip.destinationCoords?.latitude ?? 0,
        origin_lng: trip.destinationCoords?.longitude ?? 0,
        destination_name: trip.destination ?? 'Unknown',
        destination_lat: trip.destinationCoords?.latitude ?? 0,
        destination_lng: trip.destinationCoords?.longitude ?? 0,
        distance_km: trip.distance ?? 0,
        fare: trip.fare ?? 0,
        qr_code: ticketId,
      };

      if (isOnline) {
        // Send to backend
        try {
          const response = await fetch('http://10.130.5.46:8000/api/trips/create/', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(tripData),
          });

          if (response.ok) {
            const data = await response.json();
            if (data?.qr_code) {
              setQrCode(data.qr_code);
            }
            setSyncStatus('synced');
          } else {
            throw new Error('Failed to create trip');
          }
        } catch (error) {
          console.log('Failed to send trip to backend, queuing offline:', error);
          // Queue for later sync
          await queueTrip(tripData);
          setSyncStatus('pending');
          Alert.alert(
            'Offline Mode',
            'Trip saved locally and will sync when online.'
          );
        }
      } else {
        // Queue offline
        try {
          await queueTrip(tripData);
          setSyncStatus('pending');
          Alert.alert(
            'Offline Mode',
            'Trip saved locally and will sync when online.'
          );
        } catch (error) {
          console.error('Failed to queue trip:', error);
          Alert.alert('Error', 'Failed to save trip locally');
        }
      }
    };

    sendTripToBackend();
  }, [trip, isOnline, ticketId]);

  const handleContinue = () => {
    router.replace('/(tabs)');
  };

  if (!trip) {
    return (
      <View style={styles.container}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>No trip data available.</Text>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <Text style={styles.backButtonText}>← Back</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Sync Status Indicator */}
        {syncStatus !== 'idle' && (
          <View
            style={[
              styles.syncStatusBanner,
              syncStatus === 'synced'
                ? styles.syncStatusSuccess
                : styles.syncStatusPending,
            ]}
          >
            <Text
              style={
                syncStatus === 'synced'
                  ? styles.syncStatusTextSuccess
                  : styles.syncStatusTextPending
              }
            >
              {syncStatus === 'synced'
                ? '✓ Trip synced to server'
                : '⟳ Trip saved locally (will sync when online)'}
            </Text>
          </View>
        )}

        {/* Success Banner */}
        <View style={styles.successBanner}>
          <Text style={styles.successBannerIcon}>✓</Text>
          <Text style={styles.successBannerText}>Payment confirmed! QR code sent to your phone.</Text>
        </View>

        {/* Success Card */}
        <View style={styles.successCard}>
          {/* Checkmark Icon */}
          <View style={styles.checkmarkContainer}>
            <Text style={styles.checkmarkIcon}>✓</Text>
          </View>

          {/* Success Title */}
          <Text style={styles.successTitle}>Payment Successful!</Text>

          {/* Subtitle */}
          <Text style={styles.subtitle}>Your ticket has been confirmed</Text>

          {/* Seat Confirmation Card */}
          <View style={styles.seatConfirmCard}>
            <View style={styles.seatConfirmRow}>
              <Text style={styles.seatConfirmIcon}>🪑</Text>
              <View style={styles.seatConfirmContent}>
                <Text style={styles.seatConfirmLabel}>Seat Assigned</Text>
                <Text style={styles.seatConfirmValue}>Occupancy Updated</Text>
              </View>
            </View>
          </View>

          {/* QR Code Card */}
          <View style={styles.qrCodeCard}>
            <View style={styles.qrCodeContainer}>
              <QRCode
                value={qrCode ?? qrValue}
                size={qrSize}
                color="#0F172A"
                backgroundColor="#E5E7EB"
              />
            </View>

            {/* Ticket ID */}
            <Text style={styles.ticketId}>{ticketId}</Text>
          </View>

          {/* QR Code Sent Info */}
          <View style={styles.qrSentCard}>
            <Text style={styles.qrSentIcon}>📋</Text>
            <View style={styles.qrSentContent}>
              <Text style={styles.qrSentLabel}>QR Code sent to:</Text>
              <Text style={styles.qrSentNumber}>{trip.currentLocation ? `+263777747698` : '+263777747698'}</Text>
            </View>
          </View>

          {/* Instructions List */}
          <View style={styles.instructionsContainer}>
            <View style={styles.instructionItem}>
              <Text style={styles.instructionCheckmark}>✓</Text>
              <Text style={styles.instructionText}>Use this QR code to disembark at your destination</Text>
            </View>
            <View style={styles.instructionItem}>
              <Text style={styles.instructionCheckmark}>✓</Text>
              <Text style={styles.instructionText}>Scan when taking restroom breaks</Text>
            </View>
            <View style={styles.instructionItem}>
              <Text style={styles.instructionCheckmark}>✓</Text>
              <Text style={styles.instructionText}>Keep your phone accessible</Text>
            </View>
          </View>

          {/* Continue Button */}
          <TouchableOpacity style={styles.continueButton} onPress={handleContinue}>
            <Text style={styles.continueButtonText}>
              Continue (Auto-redirect in {timeLeft}s)
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.bottomPadding} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F172A',
  },
  scrollView: {
    flex: 1,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    color: '#94A3B8',
    fontSize: 16,
    marginBottom: 20,
  },
  backButton: {
    paddingVertical: 12,
  },
  backButtonText: {
    color: '#3B82F6',
    fontSize: 16,
    fontWeight: '500',
  },

  // Success Banner
  successBanner: {
    backgroundColor: '#1E293B',
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
    paddingVertical: 12,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  successBannerIcon: {
    fontSize: 18,
    fontWeight: '700',
    color: '#10B981',
  },
  successBannerText: {
    fontSize: 13,
    color: '#10B981',
    fontWeight: '500',
    flex: 1,
  },

  // Success Card
  successCard: {
    backgroundColor: '#1E293B',
    marginHorizontal: 16,
    marginVertical: 20,
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#334155',
  },

  // Checkmark
  checkmarkContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#10B981',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  checkmarkIcon: {
    fontSize: 48,
    color: '#FFFFFF',
    fontWeight: '700',
  },

  // Titles
  successTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#3B82F6',
    marginBottom: 24,
    fontWeight: '500',
  },

  // Seat Confirmation Card
  seatConfirmCard: {
    backgroundColor: '#1E3A8A',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#3B82F6',
    padding: 16,
    marginBottom: 20,
    width: '100%',
  },
  seatConfirmRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  seatConfirmIcon: {
    fontSize: 28,
  },
  seatConfirmContent: {
    flex: 1,
  },
  seatConfirmLabel: {
    fontSize: 12,
    color: '#93C5FD',
    marginBottom: 4,
  },
  seatConfirmValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#3B82F6',
  },

  // QR Code Card
  qrCodeCard: {
    backgroundColor: '#0F172A',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#334155',
    padding: 20,
    alignItems: 'center',
    marginBottom: 20,
    width: '100%',
  },
  qrCodeContainer: {
    backgroundColor: '#1E293B',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#334155',
  },
  ticketId: {
    fontSize: 14,
    fontWeight: '700',
    color: '#94A3B8',
    letterSpacing: 1,
  },

  // QR Sent Info
  qrSentCard: {
    backgroundColor: '#1E3A8A',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#3B82F6',
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 20,
    width: '100%',
  },
  qrSentIcon: {
    fontSize: 24,
  },
  qrSentContent: {
    flex: 1,
  },
  qrSentLabel: {
    fontSize: 12,
    color: '#93C5FD',
    marginBottom: 4,
  },
  qrSentNumber: {
    fontSize: 14,
    fontWeight: '600',
    color: '#3B82F6',
  },

  // Instructions
  instructionsContainer: {
    width: '100%',
    marginBottom: 24,
    gap: 12,
  },
  instructionItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    backgroundColor: '#1E293B',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#334155',
  },
  instructionCheckmark: {
    fontSize: 16,
    color: '#10B981',
    fontWeight: '700',
    minWidth: 20,
  },
  instructionText: {
    fontSize: 13,
    color: '#94A3B8',
    flex: 1,
    lineHeight: 18,
  },

  // Continue Button
  continueButton: {
    backgroundColor: '#8B5CF6',
    borderRadius: 12,
    paddingVertical: 16,
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 0,
    marginBottom: 20,
  },
  continueButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },

  // Sync Status Styles
  syncStatusBanner: {
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  syncStatusSuccess: {
    backgroundColor: '#DCFCE7',
    borderWidth: 1,
    borderColor: '#86EFAC',
  },
  syncStatusPending: {
    backgroundColor: '#FEF3C7',
    borderWidth: 1,
    borderColor: '#FCD34D',
  },
  syncStatusTextSuccess: {
    color: '#166534',
    fontSize: 13,
    fontWeight: '600',
  },
  syncStatusTextPending: {
    color: '#92400E',
    fontSize: 13,
    fontWeight: '600',
  },

  bottomPadding: {
    height: 20,
  },
});
