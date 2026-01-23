import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert } from 'react-native';
import { router } from 'expo-router';
import { useTrip } from '../utils/TripContext';
import { useState } from 'react';

export default function PaymentScreen() {
  const { trip } = useTrip();
  const [selectedPayment, setSelectedPayment] = useState<'ecocash' | 'card' | null>(null);
  const [phoneNumber, setPhoneNumber] = useState('+263 77 123 4567');
  const [payerPhoneNumber, setPayerPhoneNumber] = useState('+263 77 987 6543');
  const [cardNumber, setCardNumber] = useState('1234 5678 9012 3456');
  const [expiryDate, setExpiryDate] = useState('MM/YY');
  const [cvv, setCvv] = useState('123');

  const handlePayment = () => {
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

    // Simulate payment processing
    Alert.alert(
      'Processing Payment',
      `Processing ${selectedPayment === 'ecocash' ? 'EcoCash' : 'Card'} payment of $${trip?.fare}...`,
      [
        {
          text: 'OK',
          onPress: () => {
            // Proceed to confirmation after payment simulation
            router.push('/confirmation');
          },
        },
      ]
    );
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
          onPress={handlePayment}
          disabled={!selectedPayment}
        >
          <Text style={styles.payButtonText}>Pay ${trip.fare}</Text>
        </TouchableOpacity>

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

  bottomPadding: {
    height: 20,
  },
});
