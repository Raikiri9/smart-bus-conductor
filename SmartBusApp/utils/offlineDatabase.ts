import * as SQLite from 'expo-sqlite';

const db = SQLite.openDatabaseSync('smartbus_offline.db');

// Initialize database schema
export const initializeDatabase = async () => {
  try {
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS destinations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT UNIQUE,
        latitude REAL,
        longitude REAL,
        sync_status TEXT DEFAULT 'synced',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS offline_trips (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        trip_id TEXT UNIQUE,
        phone_number TEXT,
        origin_lat REAL,
        origin_lng REAL,
        destination_name TEXT,
        destination_lat REAL,
        destination_lng REAL,
        distance_km REAL,
        fare REAL,
        qr_code TEXT,
        sync_status TEXT DEFAULT 'pending',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS offline_payments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        trip_id TEXT,
        payment_method TEXT,
        phone_number TEXT,
        payer_phone TEXT,
        card_token TEXT,
        amount REAL,
        reference TEXT UNIQUE,
        sync_status TEXT DEFAULT 'pending',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS offline_validations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        qr_code TEXT,
        action TEXT,
        sync_status TEXT DEFAULT 'pending',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('Offline database initialized successfully');
  } catch (error) {
    console.error('Failed to initialize database:', error);
    throw error;
  }
};

// Destination operations
export const saveDestination = async (name: string, lat: number, lon: number) => {
  try {
    await db.runAsync(
      'INSERT OR REPLACE INTO destinations (name, latitude, longitude) VALUES (?, ?, ?)',
      [name, lat, lon]
    );
  } catch (error) {
    console.error('Failed to save destination:', error);
    throw error;
  }
};

export const getDestinations = async (): Promise<any[]> => {
  try {
    const result = await db.getAllAsync('SELECT * FROM destinations ORDER BY created_at DESC');
    return result;
  } catch (error) {
    console.error('Failed to get destinations:', error);
    return [];
  }
};

// Offline trip operations
export const queueTrip = async (tripData: any): Promise<string> => {
  try {
    const tripId = `OFFLINE-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    await db.runAsync(
      `INSERT INTO offline_trips (
        trip_id, phone_number, origin_lat, origin_lng, 
        destination_name, destination_lat, destination_lng, 
        distance_km, fare, qr_code
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        tripId,
        tripData.phone_number,
        tripData.origin_lat,
        tripData.origin_lng,
        tripData.destination_name,
        tripData.destination_lat,
        tripData.destination_lng,
        tripData.distance_km,
        tripData.fare,
        tripData.qr_code
      ]
    );
    return tripId;
  } catch (error) {
    console.error('Failed to queue trip:', error);
    throw error;
  }
};

export const getPendingTrips = async (): Promise<any[]> => {
  try {
    const result = await db.getAllAsync(
      'SELECT * FROM offline_trips WHERE sync_status = ? ORDER BY created_at ASC',
      ['pending']
    );
    return result;
  } catch (error) {
    console.error('Failed to get pending trips:', error);
    return [];
  }
};

export const markTripSynced = async (tripId: string) => {
  try {
    await db.runAsync(
      'UPDATE offline_trips SET sync_status = ? WHERE trip_id = ?',
      ['synced', tripId]
    );
  } catch (error) {
    console.error('Failed to mark trip as synced:', error);
    throw error;
  }
};

// Offline payment operations
export const queuePayment = async (paymentData: any) => {
  try {
    await db.runAsync(
      `INSERT INTO offline_payments (
        trip_id, payment_method, phone_number, payer_phone, 
        card_token, amount, reference
      ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        paymentData.trip_id,
        paymentData.payment_method,
        paymentData.phone_number,
        paymentData.payer_phone || null,
        paymentData.card_token || null,
        paymentData.amount,
        paymentData.reference
      ]
    );
  } catch (error) {
    console.error('Failed to queue payment:', error);
    throw error;
  }
};

export const getPendingPayments = async (): Promise<any[]> => {
  try {
    const result = await db.getAllAsync(
      'SELECT * FROM offline_payments WHERE sync_status = ? ORDER BY created_at ASC',
      ['pending']
    );
    return result;
  } catch (error) {
    console.error('Failed to get pending payments:', error);
    return [];
  }
};

export const markPaymentSynced = async (reference: string) => {
  try {
    await db.runAsync(
      'UPDATE offline_payments SET sync_status = ? WHERE reference = ?',
      ['synced', reference]
    );
  } catch (error) {
    console.error('Failed to mark payment as synced:', error);
    throw error;
  }
};

// Offline validation operations
export const queueValidation = async (qrCode: string, action: string) => {
  try {
    await db.runAsync(
      'INSERT INTO offline_validations (qr_code, action) VALUES (?, ?)',
      [qrCode, action]
    );
  } catch (error) {
    console.error('Failed to queue validation:', error);
    throw error;
  }
};

export const getPendingValidations = async (): Promise<any[]> => {
  try {
    const result = await db.getAllAsync(
      'SELECT * FROM offline_validations WHERE sync_status = ? ORDER BY created_at ASC',
      ['pending']
    );
    return result;
  } catch (error) {
    console.error('Failed to get pending validations:', error);
    return [];
  }
};

export const markValidationSynced = async (validationId: number) => {
  try {
    await db.runAsync(
      'UPDATE offline_validations SET sync_status = ? WHERE id = ?',
      ['synced', validationId]
    );
  } catch (error) {
    console.error('Failed to mark validation as synced:', error);
    throw error;
  }
};

// Clear all offline data
export const clearAllOfflineData = async () => {
  try {
    await db.execAsync(`
      DELETE FROM offline_trips;
      DELETE FROM offline_payments;
      DELETE FROM offline_validations;
      DELETE FROM destinations;
    `);
    console.log('All offline data cleared');
  } catch (error) {
    console.error('Failed to clear offline data:', error);
    throw error;
  }
};

// Clear trips only
export const clearOfflineTrips = async () => {
  try {
    await db.runAsync('DELETE FROM offline_trips');
    console.log('Offline trips cleared');
  } catch (error) {
    console.error('Failed to clear offline trips:', error);
    throw error;
  }
};

// Clear payments only
export const clearOfflinePayments = async () => {
  try {
    await db.runAsync('DELETE FROM offline_payments');
    console.log('Offline payments cleared');
  } catch (error) {
    console.error('Failed to clear offline payments:', error);
    throw error;
  }
};

// Clear validations only
export const clearOfflineValidations = async () => {
  try {
    await db.runAsync('DELETE FROM offline_validations');
    console.log('Offline validations cleared');
  } catch (error) {
    console.error('Failed to clear offline validations:', error);
    throw error;
  }
};
