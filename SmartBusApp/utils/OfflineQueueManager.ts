import {
  getPendingTrips,
  getPendingPayments,
  getPendingValidations,
  markTripSynced,
  markPaymentSynced,
  markValidationSynced,
} from './offlineDatabase';
import { API_BASE_URL } from './api';

export class OfflineQueueManager {
  // Sync pending trips to backend
  static async syncTrips(): Promise<{ synced: number; failed: number }> {
    try {
      const pendingTrips = await getPendingTrips();
      let synced = 0;
      let failed = 0;

      for (const trip of pendingTrips) {
        try {
          const response = await fetch(`${API_BASE_URL}/api/trips/create/`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              phone_number: trip.phone_number,
              origin_lat: trip.origin_lat,
              origin_lng: trip.origin_lng,
              destination_name: trip.destination_name,
              destination_lat: trip.destination_lat,
              destination_lng: trip.destination_lng,
              distance_km: trip.distance_km,
              fare: trip.fare,
              qr_code: trip.qr_code,
            }),
          });

          if (response.ok) {
            await markTripSynced(trip.trip_id);
            synced++;
          } else {
            failed++;
          }
        } catch (error) {
          console.error('Trip sync error:', error);
          failed++;
        }
      }

      return { synced, failed };
    } catch (error) {
      console.error('Failed to get pending trips:', error);
      return { synced: 0, failed: 0 };
    }
  }

  // Sync pending payments to backend
  static async syncPayments(): Promise<{ synced: number; failed: number }> {
    try {
      const pendingPayments = await getPendingPayments();
      let synced = 0;
      let failed = 0;

      for (const payment of pendingPayments) {
        try {
          const payload: any = {
            payment_method: payment.payment_method,
            phone_number: payment.phone_number,
            amount: payment.amount,
          };

          if (payment.payment_method === 'ecocash') {
            payload.payer_phone = payment.payer_phone;
          } else if (payment.payment_method === 'card') {
            payload.card_token = payment.card_token;
          }

          const response = await fetch(`${API_BASE_URL}/api/trips/payment/initiate/`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          });

          if (response.ok) {
            await markPaymentSynced(payment.reference);
            synced++;
          } else {
            failed++;
          }
        } catch (error) {
          console.error('Payment sync error:', error);
          failed++;
        }
      }

      return { synced, failed };
    } catch (error) {
      console.error('Failed to get pending payments:', error);
      return { synced: 0, failed: 0 };
    }
  }

  // Sync pending QR validations to backend
  static async syncValidations(): Promise<{ synced: number; failed: number }> {
    try {
      const pendingValidations = await getPendingValidations();
      let synced = 0;
      let failed = 0;

      for (const validation of pendingValidations) {
        try {
          const response = await fetch(`${API_BASE_URL}/api/trips/validate/`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ qr_code: validation.qr_code }),
          });

          if (response.ok) {
            await markValidationSynced(validation.id);
            synced++;
          } else {
            failed++;
          }
        } catch (error) {
          console.error('Validation sync error:', error);
          failed++;
        }
      }

      return { synced, failed };
    } catch (error) {
      console.error('Failed to get pending validations:', error);
      return { synced: 0, failed: 0 };
    }
  }

  // Sync all pending operations
  static async syncAll(): Promise<{ totalSynced: number; totalFailed: number }> {
    console.log('Starting sync of all pending operations...');
    
    const [tripsResult, paymentsResult, validationsResult] = await Promise.all([
      this.syncTrips(),
      this.syncPayments(),
      this.syncValidations(),
    ]);

    const totalSynced = tripsResult.synced + paymentsResult.synced + validationsResult.synced;
    const totalFailed = tripsResult.failed + paymentsResult.failed + validationsResult.failed;

    console.log(
      `Sync complete: ${totalSynced} synced, ${totalFailed} failed`,
      {
        trips: tripsResult,
        payments: paymentsResult,
        validations: validationsResult,
      }
    );

    return { totalSynced, totalFailed };
  }

  // Get status of pending operations
  static async getPendingCount(): Promise<{
    trips: number;
    payments: number;
    validations: number;
  }> {
    try {
      const [trips, payments, validations] = await Promise.all([
        getPendingTrips(),
        getPendingPayments(),
        getPendingValidations(),
      ]);

      return {
        trips: trips.length,
        payments: payments.length,
        validations: validations.length,
      };
    } catch (error) {
      console.error('Failed to get pending count:', error);
      return { trips: 0, payments: 0, validations: 0 };
    }
  }
}

export default OfflineQueueManager;
