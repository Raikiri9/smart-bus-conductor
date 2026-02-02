import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import { useTrip } from '../utils/TripContext';
import { queuePayment } from '../utils/offlineDatabase';
import { useConnectivity } from '../utils/ConnectivityManager';
import { useState, useEffect } from 'react';

const API_BASE_URL = 'http://10.130.5.46:8000';

// Simple UUID generator
const generateUUID = () => {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
};

// Helper component for test data items
function TestDataItem({ label, value, onCopy }: { label: string; value: string; onCopy: () => void }) {
  return (
    <TouchableOpacity style={styles.testDataItem} onPress={onCopy}>
      <View style={styles.testDataItemContent}>
        <Text style={styles.testDataItemLabel}>{label}:</Text>
        <Text style={styles.testDataItemValue}>{value}</Text>
      </View>
      <Text style={styles.testDataItemCopy}>Tap to Copy</Text>
    </TouchableOpacity>
  );
}

export default function PaymentScreen() {
  const { trip } = useTrip();
  const { isOnline } = useConnectivity();
  const [selectedPayment, setSelectedPayment] = useState<'ecocash' | 'card' | null>(null);
  const [phoneNumber, setPhoneNumber] = useState('+263 77 123 4567');
  const [payerPhoneNumber, setPayerPhoneNumber] = useState('+263 77 987 6543');
  const [cardNumber, setCardNumber] = useState('1234 5678 9012 3456');
  const [expiryDate, setExpiryDate] = useState('MM/YY');
  const [cvv, setCvv] = useState('123');
  const [isProcessing, setIsProcessing] = useState(false);
  const [testData, setTestData] = useState<any>(null);
  const [showTestPanel, setShowTestPanel] = useState(false);

  // Fetch test data on component mount
  useEffect(() => {
    fetchTestData();
  }, []);

  const fetchTestData = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/trips/payment/test-data/`);
      if (response.ok) {
        const data = await response.json();
        setTestData(data);
      }
    } catch (error) {
      console.log('Test data not available (production mode)');
    }
  };

  const initiatePayment = async () => {
    if (!selectedPayment) {
      Alert.alert('Payment Method Required', 'Please select a payment method');
      return;
    }

    if (!phoneNumber.trim()) {
      Alert.alert('Phone Number Required', 'Please enter your phone number');
      return;
    }

    if (selectedPayment === 'ecocash' && !payerPhoneNumber.trim()) {
      Alert.alert('Payer Phone Number Required', 'Please enter the payer phone number');
      return;
    }

    if (selectedPayment === 'card') {
      if (!cardNumber.trim() || cardNumber === '1234 5678 9012 3456') {
        Alert.alert('Card Number Required', 'Please enter a valid card number');
        return;
      }
      if (!expiryDate.trim() || expiryDate === 'MM/YY') {
        Alert.alert('Expiry Date Required', 'Please enter card expiry date (MM/YY)');
        return;
      }
      if (!cvv.trim() || cvv === '123') {
        Alert.alert('CVV Required', 'Please enter card CVV');
        return;
      }
    }

    setIsProcessing(true);

    const reference = `BUS-${Date.now()}-${generateUUID().substring(0, 8)}`;
    const paymentData: any = {
      payment_method: selectedPayment,
      phone_number: phoneNumber,
      amount: trip?.fare,
      destination: trip?.destination,
      reference,
    };

    if (selectedPayment === 'ecocash') {
      paymentData.payer_phone = payerPhoneNumber;
    } else if (selectedPayment === 'card') {
      paymentData.card_token = cardNumber.replace(/\s/g, '');
    }

    try {
      if (isOnline) {
        // Send to backend
        const response = await fetch(`${API_BASE_URL}/api/trips/payment/initiate/`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(paymentData),
        });

        const result = await response.json();

        if (result.success) {
          Alert.alert(
            'Payment Processing',
            `${selectedPayment === 'ecocash' ? 'EcoCash' : 'Card'} payment initiated.\nReference: ${result.reference}\n\nProceeding to confirmation...`,
            [
              {
                text: 'OK',
                onPress: () => {
                  router.push('/confirmation');
                },
              },
            ]
          );
        } else {
          Alert.alert(
            'Payment Failed',
            result.error || 'Payment could not be processed. Please try again.'
          );
        }
      } else {
        // Queue payment for later
        await queuePayment({
          trip_id: 'unknown',
          ...paymentData,
        });

        Alert.alert(
          'Offline Mode',
          `Payment queued successfully.\nReference: ${reference}\n\nYour payment will be processed when online.`,
          [
            {
              text: 'OK',
              onPress: () => {
                router.push('/confirmation');
              },
            },
          ]
        );
      }
    } catch (error) {
      console.error('Payment error:', error);

      if (!isOnline) {
        // Try to queue even if online request failed
        try {
          await queuePayment({
            trip_id: 'unknown',
            ...paymentData,
          });
          Alert.alert(
            'Offline Queued',
            'Payment saved locally and will sync when online.'
          );
          router.push('/confirmation');
        } catch (queueError) {
          Alert.alert('Error', 'Failed to process or queue payment.');
        }
      } else {
        Alert.alert('Error', 'Failed to process payment. Please try again.');
      }
    } finally {
      setIsProcessing(false);
    }
  };

  if (!trip) {
    return (
      <View style={styles.container}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>No trip selected.</Text>
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

  // Extract current location from trip (we'll use a default or get it from context)
  const currentLocationName = trip.currentLocation || 'Harare';
  const destinationName = trip.destination?.split(',')[0] || trip.destination || 'Destination';

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Back Button */}
        <TouchableOpacity 
          style={styles.backButtonHeader}
          onPress={() => router.back()}
        >
          <Text style={styles.backButtonText}>← Back</Text>
        </TouchableOpacity>

        {/* Trip Summary Card */}
        <View style={styles.summaryCard}>
          <Text style={styles.summaryTitle}>Trip Summary</Text>

          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>From:</Text>
            <Text style={styles.summaryValue}>{currentLocationName}</Text>
          </View>

          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>To:</Text>
            <Text style={styles.summaryValue}>{destinationName}</Text>
          </View>

          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Distance:</Text>
            <Text style={styles.summaryValue}>
              {trip.distance ? trip.distance.toFixed(2) : '0.00'} km
            </Text>
          </View>

          <View style={[styles.summaryRow, styles.totalFareRow]}>
            <Text style={styles.summaryLabel}>Total Fare:</Text>
            <Text style={styles.totalFareValue}>${trip.fare}</Text>
          </View>
        </View>

        {/* Payment Method Selection */}
        <View style={styles.paymentMethodCard}>
          <Text style={styles.paymentMethodTitle}>Select Payment Method</Text>

          <View style={styles.paymentOptionsContainer}>
            {/* EcoCash Option */}
            <TouchableOpacity
              style={[
                styles.paymentOption,
                selectedPayment === 'ecocash' && styles.paymentOptionSelected,
              ]}
              onPress={() => setSelectedPayment('ecocash')}
            >
              <Text style={styles.paymentIcon}>📱</Text>
              <Text style={styles.paymentOptionTitle}>EcoCash</Text>
              <Text style={styles.paymentOptionSubtitle}>Mobile Money</Text>
              {selectedPayment === 'ecocash' && (
                <View style={styles.selectedCheckmark}>
                  <Text style={styles.checkmarkText}>✓</Text>
                </View>
              )}
            </TouchableOpacity>

            {/* Card Option */}
            <TouchableOpacity
              style={[
                styles.paymentOption,
                selectedPayment === 'card' && styles.paymentOptionSelected,
              ]}
              onPress={() => setSelectedPayment('card')}
            >
              <Text style={styles.paymentIcon}>💳</Text>
              <Text style={styles.paymentOptionTitle}>Card</Text>
              <Text style={styles.paymentOptionSubtitle}>Credit/Debit</Text>
              {selectedPayment === 'card' && (
                <View style={styles.selectedCheckmark}>
                  <Text style={styles.checkmarkText}>✓</Text>
                </View>
              )}
            </TouchableOpacity>
          </View>
        </View>

        {/* Phone Number Section */}
        <View style={styles.phoneCard}>
          <Text style={styles.phoneLabel}>Passenger's Phone Number <Text style={styles.required}>*</Text></Text>
          <View style={styles.phoneInputContainer}>
            <Text style={styles.phonePrefix}>📞</Text>
            <TextInput
              style={styles.phoneInput}
              value={phoneNumber}
              onChangeText={setPhoneNumber}
              placeholder="+263 77 123 4567"
              placeholderTextColor="#64748B"
              keyboardType="phone-pad"
            />
          </View>
          <Text style={styles.phoneNote}>QR code will be sent to this number via SMS</Text>
        </View>

        {/* EcoCash Specific Fields */}
        {selectedPayment === 'ecocash' && (
          <>
            {/* Note Section */}
            <View style={styles.noteCard}>
              <Text style={styles.noteLabel}>Note:</Text>
              <Text style={styles.noteText}>Someone else can pay for this passenger</Text>
            </View>

            {/* Payer Phone Number */}
            <View style={styles.phoneCard}>
              <Text style={styles.phoneLabel}>Payer's Phone Number (EcoCash) <Text style={styles.required}>*</Text></Text>
              <View style={styles.phoneInputContainer}>
                <Text style={styles.phonePrefix}>📞</Text>
                <TextInput
                  style={styles.phoneInput}
                  value={payerPhoneNumber}
                  onChangeText={setPayerPhoneNumber}
                  placeholder="+263 77 987 6543"
                  placeholderTextColor="#64748B"
                  keyboardType="phone-pad"
                />
              </View>
              <Text style={styles.phoneNote}>Payment prompt will be sent to this number</Text>
            </View>

            {/* Payment Instructions */}
            <View style={styles.instructionsCard}>
              <Text style={styles.instructionsTitle}>EcoCash Payment Instructions:</Text>
              <View style={styles.instructionItem}>
                <Text style={styles.instructionNumber}>1.</Text>
                <Text style={styles.instructionText}>Payment prompt will be sent to the payer's number</Text>
              </View>
              <View style={styles.instructionItem}>
                <Text style={styles.instructionNumber}>2.</Text>
                <Text style={styles.instructionText}>Payer enters their EcoCash PIN to confirm</Text>
              </View>
              <View style={styles.instructionItem}>
                <Text style={styles.instructionNumber}>3.</Text>
                <Text style={styles.instructionText}>QR code will be sent to the passenger's number</Text>
              </View>
            </View>
          </>
        )}

        {/* Card Specific Fields */}
        {selectedPayment === 'card' && (
          <>
            {/* Card Number */}
            <View style={styles.phoneCard}>
              <Text style={styles.phoneLabel}>Card Number</Text>
              <View style={styles.phoneInputContainer}>
                <Text style={styles.phonePrefix}>💳</Text>
                <TextInput
                  style={styles.phoneInput}
                  value={cardNumber}
                  onChangeText={setCardNumber}
                  placeholder="1234 5678 9012 3456"
                  placeholderTextColor="#64748B"
                  keyboardType="numeric"
                  maxLength={19}
                />
              </View>
            </View>

            {/* Expiry Date and CVV Row */}
            <View style={styles.cardFieldsRow}>
              <View style={[styles.phoneCard, styles.flexHalf]}>
                <Text style={styles.phoneLabel}>Expiry Date</Text>
                <View style={styles.phoneInputContainer}>
                  <TextInput
                    style={styles.phoneInput}
                    value={expiryDate}
                    onChangeText={setExpiryDate}
                    placeholder="MM/YY"
                    placeholderTextColor="#64748B"
                    keyboardType="numeric"
                    maxLength={5}
                  />
                </View>
              </View>

              <View style={[styles.phoneCard, styles.flexHalf]}>
                <Text style={styles.phoneLabel}>CVV</Text>
                <View style={styles.phoneInputContainer}>
                  <TextInput
                    style={styles.phoneInput}
                    value={cvv}
                    onChangeText={setCvv}
                    placeholder="123"
                    placeholderTextColor="#64748B"
                    keyboardType="numeric"
                    maxLength={4}
                  />
                </View>
              </View>
            </View>
          </>
        )}

        {/* Pay Button */}
        <TouchableOpacity
          style={[
            styles.payButton,
            !selectedPayment && styles.payButtonDisabled,
          ]}
          onPress={initiatePayment}
          disabled={!selectedPayment || isProcessing}
        >
          {isProcessing ? (
            <ActivityIndicator color="#FFFFFF" size="small" />
          ) : (
            <Text style={styles.payButtonText}>Pay ${trip.fare}</Text>
          )}
        </TouchableOpacity>

        {/* Test Mode Panel */}
        {testData && (
          <>
            <TouchableOpacity
              style={styles.testToggleButton}
              onPress={() => setShowTestPanel(!showTestPanel)}
            >
              <Text style={styles.testToggleText}>
                {showTestPanel ? '▼' : '▶'} Test Mode Available - Tap to View Test Data
              </Text>
            </TouchableOpacity>

            {showTestPanel && (
              <View style={styles.testPanel}>
                <Text style={styles.testPanelTitle}>🧪 Test Mode - EcoCash Numbers</Text>
                <TestDataItem
                  label="Success (5s)"
                  value={testData.ecocash_test_numbers.success_5s}
                  onCopy={() => {
                    setPayerPhoneNumber(testData.ecocash_test_numbers.success_5s);
                    Alert.alert('Copied', 'Payer phone number set to ' + testData.ecocash_test_numbers.success_5s);
                  }}
                />
                <TestDataItem
                  label="Success Delayed (30s)"
                  value={testData.ecocash_test_numbers.success_30s}
                  onCopy={() => {
                    setPayerPhoneNumber(testData.ecocash_test_numbers.success_30s);
                    Alert.alert('Copied', 'Payer phone number set to ' + testData.ecocash_test_numbers.success_30s);
                  }}
                />
                <TestDataItem
                  label="Failed - User Cancelled"
                  value={testData.ecocash_test_numbers.failed_user_cancelled}
                  onCopy={() => {
                    setPayerPhoneNumber(testData.ecocash_test_numbers.failed_user_cancelled);
                    Alert.alert('Copied', 'Payer phone number set to ' + testData.ecocash_test_numbers.failed_user_cancelled);
                  }}
                />
                <TestDataItem
                  label="Failed - Insufficient Balance"
                  value={testData.ecocash_test_numbers.failed_insufficient_balance}
                  onCopy={() => {
                    setPayerPhoneNumber(testData.ecocash_test_numbers.failed_insufficient_balance);
                    Alert.alert('Copied', 'Payer phone number set to ' + testData.ecocash_test_numbers.failed_insufficient_balance);
                  }}
                />

                <Text style={[styles.testPanelTitle, { marginTop: 16 }]}>💳 Test Mode - Card Tokens</Text>
                <TestDataItem
                  label="Success (5s)"
                  value={testData.card_test_tokens.success_5s}
                  onCopy={() => {
                    setCardNumber(testData.card_test_tokens.success_5s);
                    Alert.alert('Copied', 'Card token set');
                  }}
                />
                <TestDataItem
                  label="Success Delayed (30s)"
                  value={testData.card_test_tokens.success_30s}
                  onCopy={() => {
                    setCardNumber(testData.card_test_tokens.success_30s);
                    Alert.alert('Copied', 'Card token set');
                  }}
                />
                <TestDataItem
                  label="Failed - User Cancelled"
                  value={testData.card_test_tokens.failed_user_cancelled}
                  onCopy={() => {
                    setCardNumber(testData.card_test_tokens.failed_user_cancelled);
                    Alert.alert('Copied', 'Card token set');
                  }}
                />
                <TestDataItem
                  label="Failed - Insufficient Balance"
                  value={testData.card_test_tokens.failed_insufficient_balance}
                  onCopy={() => {
                    setCardNumber(testData.card_test_tokens.failed_insufficient_balance);
                    Alert.alert('Copied', 'Card token set');
                  }}
                />
              </View>
            )}
          </>
        )}

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
    padding: 20,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0F172A',
  },
  errorText: {
    color: '#94A3B8',
    fontSize: 16,
    marginBottom: 20,
  },
  backButtonHeader: {
    paddingVertical: 8,
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

  // Trip Summary Card
  summaryCard: {
    backgroundColor: '#1E293B',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#334155',
    padding: 20,
    marginBottom: 24,
  },
  summaryTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 16,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },
  totalFareRow: {
    borderBottomWidth: 0,
    paddingTop: 16,
  },
  summaryLabel: {
    fontSize: 14,
    color: '#94A3B8',
    fontWeight: '500',
  },
  summaryValue: {
    fontSize: 14,
    color: '#3B82F6',
    fontWeight: '600',
  },
  totalFareValue: {
    fontSize: 20,
    color: '#3B82F6',
    fontWeight: '700',
  },

  // Payment Method Selection
  paymentMethodCard: {
    backgroundColor: '#1E293B',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#334155',
    padding: 20,
    marginBottom: 24,
  },
  paymentMethodTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 16,
  },
  paymentOptionsContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  paymentOption: {
    flex: 1,
    backgroundColor: '#0F172A',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#334155',
    padding: 16,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  paymentOptionSelected: {
    borderColor: '#3B82F6',
    backgroundColor: '#1E3A8A',
  },
  paymentIcon: {
    fontSize: 32,
    marginBottom: 8,
  },
  paymentOptionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 2,
  },
  paymentOptionSubtitle: {
    fontSize: 12,
    color: '#94A3B8',
  },
  selectedCheckmark: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: '#3B82F6',
    borderRadius: 12,
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkmarkText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },

  // Phone Card
  phoneCard: {
    backgroundColor: '#1E293B',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#334155',
    padding: 20,
    marginBottom: 20,
  },
  phoneLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 12,
  },
  required: {
    color: '#EF4444',
  },
  phoneInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0F172A',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#334155',
    paddingHorizontal: 12,
    marginBottom: 8,
  },
  phonePrefix: {
    fontSize: 18,
    marginRight: 8,
  },
  phoneInput: {
    flex: 1,
    paddingVertical: 12,
    color: '#FFFFFF',
    fontSize: 14,
  },
  phoneNote: {
    fontSize: 12,
    color: '#94A3B8',
    fontStyle: 'italic',
  },

  // Note Card
  noteCard: {
    backgroundColor: '#F0F9FF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#BFDBFE',
    padding: 16,
    marginBottom: 20,
  },
  noteLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1E40AF',
    marginBottom: 4,
  },
  noteText: {
    fontSize: 14,
    color: '#1E40AF',
  },

  // Instructions Card
  instructionsCard: {
    backgroundColor: '#DCFCE7',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#86EFAC',
    padding: 16,
    marginBottom: 20,
  },
  instructionsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#166534',
    marginBottom: 12,
  },
  instructionItem: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  instructionNumber: {
    fontSize: 14,
    fontWeight: '700',
    color: '#166534',
    marginRight: 8,
    minWidth: 20,
  },
  instructionText: {
    fontSize: 13,
    color: '#166534',
    flex: 1,
  },

  // Card Fields Row
  cardFieldsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  flexHalf: {
    flex: 1,
    marginBottom: 0,
  },

  // Pay Button
  payButton: {
    backgroundColor: '#8B5CF6',
    borderRadius: 12,
    paddingVertical: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  payButtonDisabled: {
    backgroundColor: '#334155',
    opacity: 0.6,
  },
  payButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },

  // Test Mode Panel
  testToggleButton: {
    backgroundColor: '#1E293B',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#8B5CF6',
    padding: 16,
    marginBottom: 12,
  },
  testToggleText: {
    color: '#8B5CF6',
    fontSize: 14,
    fontWeight: '600',
  },
  testPanel: {
    backgroundColor: '#1E293B',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#8B5CF6',
    padding: 16,
    marginBottom: 20,
  },
  testPanelTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#8B5CF6',
    marginBottom: 12,
  },
  testDataItem: {
    backgroundColor: '#0F172A',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  testDataItemContent: {
    flex: 1,
  },
  testDataItemLabel: {
    fontSize: 12,
    color: '#94A3B8',
    marginBottom: 4,
  },
  testDataItemValue: {
    fontSize: 13,
    color: '#3B82F6',
    fontWeight: '600',
    fontFamily: 'monospace',
  },
  testDataItemCopy: {
    fontSize: 11,
    color: '#8B5CF6',
    fontWeight: '600',
  },

  bottomPadding: {
    height: 20,
  },
});
