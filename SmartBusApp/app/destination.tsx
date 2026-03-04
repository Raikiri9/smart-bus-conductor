import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, Platform, Alert, ActivityIndicator } from "react-native";
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Location from "expo-location";
import { useEffect, useState, useRef } from "react";
import { router } from "expo-router";
import { useTrip } from '../utils/TripContext';
import { useConnectivity } from '../utils/ConnectivityManager';
import { saveDestination, getDestinations } from '../utils/offlineDatabase';

// Conditionally load MapView and Marker only on native platforms
const getNativeMapComponents = () => {
  if (Platform.OS === 'web') {
    console.log('Platform is web, maps not available');
    return { MapView: null, Marker: null };
  }
  try {
    console.log('Attempting to load react-native-maps...');
    const ReactNativeMaps = require('react-native-maps');
    console.log('✓ react-native-maps loaded successfully');
    return {
      MapView: ReactNativeMaps.default,
      Marker: ReactNativeMaps.Marker
    };
  } catch (error) {
    console.error('❌ Maps not available:', error);
    console.error('Error details:', (error as any)?.message);
    return { MapView: null, Marker: null };
  }
};

const { MapView, Marker } = getNativeMapComponents();
console.log('MapView component status:', MapView ? 'Available' : 'Not Available');

export default function DestinationScreen() {
  const { startTrip } = useTrip();
  const { isOnline } = useConnectivity();
  const mapRef = useRef<any>(null);
  
  const [currentLocation, setCurrentLocation] = useState<any>(null);
  const [currentLocationName, setCurrentLocationName] = useState<string>("Loading...");
  const [destination, setDestination] = useState<any>(null);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<any[]>([]);
  const [distance, setDistance] = useState(0);
  const [fare, setFare] = useState(0);
  const [cachedDestinations, setCachedDestinations] = useState<any[]>([]);

  const formatPlaceName = (place: any) => {
    if (!place) return 'Unknown location';
    
    const address = place?.address || {};
    const locality = address.city || address.town || address.village || address.suburb || address.hamlet;
    const province = address.state || address.county || address.region;
    const country = address.country;

    // Build formatted name with locality, province, country
    const parts = [locality, province, country].filter(p => p && p.trim());
    
    if (parts.length > 0) {
      return parts.join(', ');
    }
    
    // Fallback to display_name if formatting doesn't work
    return place?.display_name || 'Unknown location';
  };

  // Get bus GPS location
  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      
      if (status !== "granted") {
        Alert.alert(
          'Location Permission Required', 
          'Please enable location permissions in your device settings to use this app.',
          [
            { text: 'OK' }
          ]
        );
        return;
      }

      const updateLocation = async (coords: { latitude: number; longitude: number }) => {
        setCurrentLocation(coords);

        // Reverse geocode to get location name
        try {
          // Check cache first
          const cacheKey = `geocode_${coords.latitude.toFixed(4)}_${coords.longitude.toFixed(4)}`;
          const cached = await AsyncStorage.getItem(cacheKey);
          
          if (cached) {
            console.log('Using cached location name:', cached);
            setCurrentLocationName(cached);
            return;
          }

          console.log('Fetching reverse geocode for:', coords.latitude, coords.longitude);
          const response = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${coords.latitude}&lon=${coords.longitude}`,
            {
              headers: {
                'User-Agent': 'SmartBusApp/1.0'
              }
            }
          );
          
          console.log('Reverse geocode response status:', response.status);
          
          if (response.ok) {
            const data = await response.json();
            console.log('Address data:', JSON.stringify(data.address, null, 2));
            const locationName = data.address?.city || 
                                data.address?.town || 
                                data.address?.village || 
                                data.address?.county ||
                                'Current Location';
            console.log('Final location name:', locationName);
            
            // Cache the result for 24 hours
            await AsyncStorage.setItem(cacheKey, locationName);
            setCurrentLocationName(locationName);
          } else if (response.status === 509) {
            console.log('Rate limited (509). Using coordinates as fallback.');
            const coordsName = `Location (${coords.latitude.toFixed(4)}, ${coords.longitude.toFixed(4)})`;
            setCurrentLocationName(coordsName);
          } else {
            console.log('Response not OK, using fallback');
            setCurrentLocationName('Current Location');
          }
        } catch (error) {
          console.log('Reverse geocoding error:', error);
          setCurrentLocationName('Current Location');
        }
      };

      try {
        // Try to get current position with 15 second timeout
        const locationPromise = Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });

        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Location timeout')), 15000)
        );

        const loc = await Promise.race([locationPromise, timeoutPromise]) as any;
        
        await updateLocation({
          latitude: loc.coords.latitude,
          longitude: loc.coords.longitude,
        });
      } catch (error) {
        console.log('Current location error:', error);
        
        // Use default location for Harare, Zimbabwe as fallback (good for emulators)
        const defaultLocation = {
          latitude: -17.8292,
          longitude: 31.0522
        };
        
        console.log('Using default location (Harare, Zimbabwe):', defaultLocation);
        await updateLocation(defaultLocation);
        
        Alert.alert(
          'Using Default Location', 
          'GPS location unavailable. Using Harare, Zimbabwe as starting point.\n\n' +
          'For emulators: Set a mock location in the emulator settings.\n' +
          'For physical devices: Enable location services.',
          [{ text: 'OK' }]
        );
      }
    })();
  }, []);

  // Load cached destinations on mount
  useEffect(() => {
    const loadCachedDestinations = async () => {
      try {
        const cached = await getDestinations();
        setCachedDestinations(cached);
      } catch (error) {
        console.log('Error loading cached destinations:', error);
      }
    };
    loadCachedDestinations();
  }, []);

  // Search destination using OpenStreetMap (Nominatim) or cached destinations
  const searchDestination = async () => {
    const trimmedQuery = query.trim();
    if (!trimmedQuery) {
      setResults([]);
      return;
    }

    const buildCachedResults = () => {
      const filtered = cachedDestinations.filter(dest =>
        dest.name.toLowerCase().includes(trimmedQuery.toLowerCase())
      );

      const formattedResults = filtered.map(dest => ({
        lat: dest.latitude.toString(),
        lon: dest.longitude.toString(),
        display_name: dest.name,
        cached: true
      }));

      setResults(formattedResults);
      return formattedResults;
    };

    const shouldTryOnline = isOnline || cachedDestinations.length === 0;

    if (shouldTryOnline) {
      try {
        const encodedQuery = encodeURIComponent(trimmedQuery);

        const response = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&addressdetails=1&q=${encodedQuery}&countrycodes=zw&limit=10`,
          {
            headers: {
              'User-Agent': 'SmartBusApp/1.0'
            }
          }
        );

        if (!response.ok) {
          console.log('Search failed:', response.status);
          const cached = buildCachedResults();
          if (cached.length === 0) setResults([]);
          return;
        }

        const data = await response.json();
        console.log('Raw API response:', JSON.stringify(data, null, 2));
        console.log('Number of results:', data?.length);
        
        if (!data || data.length === 0) {
          console.log('No results returned from API');
          setResults([]);
          return;
        }

        const normalized = (data || []).map((item: any) => ({
          ...item,
          display_name: formatPlaceName(item),
        }));
        console.log('Normalized results:', JSON.stringify(normalized, null, 2));
        setResults(normalized);
        return;
      } catch (error) {
        console.log('Search error:', error);
        const cached = buildCachedResults();

        if (cached.length > 0) {
          Alert.alert(
            'Connection Issue',
            'Showing cached destinations due to network error.',
            [{ text: 'OK' }]
          );
        }

        if (cached.length === 0 && !isOnline) {
          Alert.alert(
            'Offline Mode',
            'No cached destinations match your search. Previously visited destinations are available offline.',
            [{ text: 'OK' }]
          );
        }
        return;
      }
    }

    // Offline search from cached destinations
    const cached = buildCachedResults();
    if (cached.length === 0) {
      Alert.alert(
        'Offline Mode',
        'No cached destinations match your search. Previously visited destinations are available offline.',
        [{ text: 'OK' }]
      );
    }
  };

  // Distance calculation (Haversine fallback)
  const calculateDistanceKm = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371;
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;

    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) ** 2;

    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  };

  // Road distance using OSRM (online)
  const getRoadDistanceKm = async (lat1: number, lon1: number, lat2: number, lon2: number) => {
    if (!isOnline) return null;

    try {
      const url = `https://router.project-osrm.org/route/v1/driving/${lon1},${lat1};${lon2},${lat2}?overview=false`;
      const response = await fetch(url);
      if (!response.ok) return null;

      const data = await response.json();
      const meters = data?.routes?.[0]?.distance;
      if (typeof meters !== 'number') return null;

      return meters / 1000;
    } catch (error) {
      console.log('Road distance error:', error);
      return null;
    }
  };

  const getDistanceKm = async (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const roadKm = await getRoadDistanceKm(lat1, lon1, lat2, lon2);
    return roadKm ?? calculateDistanceKm(lat1, lon1, lat2, lon2);
  };

  // Fare logic: $1 per 30km (margin >= 0.5 rounds up to next dollar)
  const calculateFare = (km: number) => Math.round(km / 30);

  // When destination selected from search results
  const selectDestination = async (place: any) => {
    const dest = {
      latitude: parseFloat(place.lat),
      longitude: parseFloat(place.lon),
      name: place.display_name,
    };

    setDestination(dest);

    const dist = await getDistanceKm(
      currentLocation.latitude,
      currentLocation.longitude,
      dest.latitude,
      dest.longitude
    );

    setDistance(dist);
    const calculatedFare = calculateFare(dist);
    setFare(calculatedFare);
    setResults([]);
    setQuery('');

    // Cache destination for offline use (only if not already cached)
    if (!place.cached) {
      try {
        await saveDestination(dest.name, dest.latitude, dest.longitude);
        // Refresh cached destinations list
        const cached = await getDestinations();
        setCachedDestinations(cached);
      } catch (error) {
        console.log('Failed to cache destination:', error);
      }
    }

    // Animate map to show both markers
    if (Platform.OS !== 'web' && mapRef.current) {
      setTimeout(() => {
        mapRef.current.fitToCoordinates(
          [currentLocation, dest],
          {
            edgePadding: { top: 100, right: 50, bottom: 100, left: 50 },
            animated: true,
          }
        );
      }, 100);
    }
  };

  // When destination selected by clicking on map
  const handleMapPress = async (event: any) => {
    console.log('Map pressed with event:', event);
    
    if (!event?.nativeEvent?.coordinate) {
      console.log('No coordinate in event');
      return;
    }
    
    const coordinate = event.nativeEvent.coordinate;
    console.log('Tapped coordinate:', coordinate);
    
    try {
      // Reverse geocode the selected point
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&addressdetails=1&lat=${coordinate.latitude}&lon=${coordinate.longitude}`,
        {
          headers: {
            'User-Agent': 'SmartBusApp/1.0'
          }
        }
      );
      
      if (response.ok) {
        const data = await response.json();
        
        // Only accept locations with proper city/town/village names
        const locationName = data.address?.city || 
                data.address?.town || 
                data.address?.village || 
                data.address?.suburb ||
                null;
        
        if (!locationName) {
          console.log('No named location found at this point');
          return;
        }
        
        console.log('Got location name:', locationName);
        
        const dest = {
          latitude: coordinate.latitude,
          longitude: coordinate.longitude,
          name: formatPlaceName(data),
        };

        setDestination(dest);

        const dist = await getDistanceKm(
          currentLocation.latitude,
          currentLocation.longitude,
          dest.latitude,
          dest.longitude
        );

        setDistance(dist);
        const calculatedFare = calculateFare(dist);
        setFare(calculatedFare);
        setResults([]);
        setQuery('');

        // Animate map to show both markers (only on native platforms)
        if (mapRef.current && Platform.OS !== 'web') {
          setTimeout(() => {
            mapRef.current.fitToCoordinates(
              [currentLocation, dest],
              {
                edgePadding: { top: 100, right: 50, bottom: 100, left: 50 },
                animated: true,
              }
            );
          }, 100);
        }
      }
    } catch (error) {
      console.log('Map press geocoding error:', error);
    }
  };

  const handleProceedToPayment = async () => {
    if (!destination) return;

    const started = await startTrip({
      destination: destination.name,
      fare: fare,
      distance: distance,
      currentLocation: currentLocationName,
      destinationCoords: { latitude: destination.latitude, longitude: destination.longitude }
    });

    if (!started) return;

    router.push('/payment');
  };

  if (!currentLocation) {
    return (
      <View style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#3B82F6" />
          <Text style={styles.loadingText}>Getting your location...</Text>
          <Text style={styles.loadingSubtext}>
            This may take a few seconds.{'\n'}
            {Platform.OS === 'android' ? 'Emulator users: Set mock location in settings.' : ''}
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* DEBUG: Check if results exist */}
        {results.length > 0 && console.log('🔴 RENDERING RESULTS:', results.length)}
        
        {/* Header */}
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Text style={styles.backButtonText}>← Back to Home</Text>
        </TouchableOpacity>

        {/* Title Card */}
        <View style={styles.titleCard}>
          <View style={styles.titleRow}>
            <Text style={styles.titleIcon}>📍</Text>
            <View style={styles.titleTextContainer}>
              <Text style={styles.title}>Select Your Destination</Text>
              <Text style={styles.subtitle}>
                {isOnline 
                  ? 'Choose from available destinations in Zimbabwe'
                  : '🔴 Offline Mode - Showing cached destinations only'
                }
              </Text>
            </View>
          </View>
        </View>

        {/* Current Location */}
        <View style={styles.locationCard}>
          <Text style={styles.locationIcon}>📌</Text>
          <View>
            <Text style={styles.locationLabel}>Current Location</Text>
            <Text style={styles.locationValue}>{currentLocationName}</Text>
          </View>
        </View>

        {/* Search Box */}
        <View style={styles.searchContainer}>
          <Text style={styles.searchIcon}>🔍</Text>
          <TextInput
            style={styles.searchInput}
            placeholder="Search or tap map to select..."
            placeholderTextColor="#64748B"
            value={query}
            onChangeText={setQuery}
            onSubmitEditing={searchDestination}
            returnKeyType="search"
          />
          {query.length > 0 && (
            <TouchableOpacity 
              style={styles.searchButton}
              onPress={searchDestination}
            >
              <Text style={styles.searchButtonText}>Search</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Search Results */}
        {results.length > 0 && (
          <View style={styles.resultsContainer}>
            {results.map((item, index) => {
              console.log(`Item ${index}:`, item.display_name);
              return (
                <TouchableOpacity
                  key={index}
                  style={styles.resultItem}
                  onPress={() => selectDestination(item)}
                >
                  <View style={styles.resultContent}>
                    <Text style={styles.resultText}>{item.display_name}</Text>
                    {item.cached && (
                      <View style={styles.cachedBadge}>
                        <Text style={styles.cachedBadgeText}>💾 Cached</Text>
                      </View>
                    )}
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        {/* Popular Cached Destinations - Show when not searching and offline */}
        {!isOnline && query.length === 0 && results.length === 0 && cachedDestinations.length > 0 && (
          <View style={styles.cachedDestinationsContainer}>
            <Text style={styles.cachedDestinationsTitle}>💾 Recently Visited Destinations</Text>
            <Text style={styles.cachedDestinationsSubtitle}>Tap to select from your history</Text>
            {cachedDestinations.slice(0, 5).map((dest, index) => (
              <TouchableOpacity
                key={index}
                style={styles.cachedDestinationItem}
                onPress={() => selectDestination({
                  lat: dest.latitude.toString(),
                  lon: dest.longitude.toString(),
                  display_name: dest.name,
                  cached: true
                })}
              >
                <Text style={styles.cachedDestinationIcon}>📍</Text>
                <Text style={styles.cachedDestinationText}>{dest.name}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Map */}
        <View style={styles.mapContainer}>
          {Platform.OS === 'web' || !MapView || !currentLocation ? (
            <View style={styles.mapPlaceholder}>
              <Text style={styles.mapPlaceholderText}>🗺️</Text>
              <Text style={styles.mapPlaceholderSubtext}>
                {Platform.OS === 'web' 
                  ? 'Map View (Available on Mobile)' 
                  : !MapView 
                  ? 'Map component not loaded' 
                  : !currentLocation
                  ? 'Getting your location...'
                  : 'Loading map...'}
              </Text>
              {currentLocation && (
                <Text style={styles.mapPlaceholderNote}>
                  Current: {currentLocation.latitude.toFixed(4)}, {currentLocation.longitude.toFixed(4)}
                </Text>
              )}
              <Text style={styles.mapPlaceholderNote}>
                {!MapView 
                  ? 'Check console for map loading errors' 
                  : 'Note: Map tiles require internet connection'}
              </Text>
            </View>
          ) : (
            <MapView
              ref={mapRef}
              style={styles.map}
              initialRegion={{
                latitude: currentLocation.latitude,
                longitude: currentLocation.longitude,
                latitudeDelta: 0.5,
                longitudeDelta: 0.5,
              }}
              onPress={handleMapPress}
              scrollEnabled={true}
              zoomEnabled={true}
              rotateEnabled={false}
              pitchEnabled={false}
              loadingEnabled={true}
              loadingIndicatorColor="#3B82F6"
              loadingBackgroundColor="#0F172A"
            >
              <Marker 
                coordinate={currentLocation} 
                title="Bus Location"
                pinColor="#10B981"
              />

              {destination && (
                <Marker 
                  coordinate={destination} 
                  title={destination.name}
                  description={`${distance.toFixed(2)} km away`}
                  pinColor="#EF4444"
                />
              )}
            </MapView>
          )}
        </View>

        {/* Map Legend */}
        <View style={styles.legendCard}>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: '#10B981' }]} />
            <Text style={styles.legendText}>Current Location</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: '#EF4444' }]} />
            <Text style={styles.legendText}>Selected/Viewed</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: '#3B82F6' }]} />
            <Text style={styles.legendText}>Available</Text>
          </View>
        </View>

        {/* Distance and Fare Info */}
        {destination && (
          <View style={styles.infoBox}>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Distance:</Text>
              <Text style={styles.infoValue}>{distance.toFixed(2)} km</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Fare:</Text>
              <Text style={styles.infoValue}>${fare}</Text>
            </View>
          </View>
        )}

        {/* Fare Calculation Info */}
        <View style={styles.infoCard}>
          <Text style={styles.infoIcon}>💡</Text>
          <Text style={styles.infoText}>
            Fare Calculation: $1 per 30km traveled
          </Text>
        </View>

        {/* Proceed Button */}
        <TouchableOpacity
          style={[
            styles.proceedButton,
            !destination && styles.proceedButtonDisabled,
          ]}
          disabled={!destination}
          onPress={handleProceedToPayment}
        >
          <Text style={styles.proceedButtonText}>Proceed to Payment</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F172A',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0F172A',
  },
  loadingText: {
    color: '#94A3B8',
    fontSize: 16,
    marginTop: 16,
    fontWeight: '500',
  },
  loadingSubtext: {
    color: '#64748B',
    fontSize: 13,
    marginTop: 8,
    textAlign: 'center',
    paddingHorizontal: 40,
  },
  scrollView: {
    flex: 1,
  },
  backButton: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    marginTop: 8,
  },
  backButtonText: {
    color: '#3B82F6',
    fontSize: 16,
    fontWeight: '500',
  },
  titleCard: {
    backgroundColor: '#1E293B',
    marginHorizontal: 20,
    marginBottom: 16,
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#334155',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  titleIcon: {
    fontSize: 32,
    marginRight: 12,
  },
  titleTextContainer: {
    flex: 1,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#94A3B8',
  },
  locationCard: {
    backgroundColor: '#1E293B',
    marginHorizontal: 20,
    marginBottom: 16,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#334155',
    flexDirection: 'row',
    alignItems: 'center',
  },
  locationIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  locationLabel: {
    fontSize: 12,
    color: '#94A3B8',
    marginBottom: 2,
  },
  locationValue: {
    fontSize: 16,
    color: '#3B82F6',
    fontWeight: '600',
  },
  searchContainer: {
    backgroundColor: '#1E293B',
    marginHorizontal: 20,
    marginBottom: 16,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#334155',
    flexDirection: 'row',
    alignItems: 'center',
  },
  searchIcon: {
    fontSize: 20,
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 16,
  },
  searchButton: {
    backgroundColor: '#3B82F6',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    marginLeft: 8,
  },
  searchButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  resultsContainer: {
    backgroundColor: '#1E293B',
    marginHorizontal: 20,
    marginBottom: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#334155',
    maxHeight: 300,
    overflow: 'hidden',
  },
  resultItem: {
    padding: 12,
    minHeight: 44,
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
    justifyContent: 'center',
  },
  resultText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '500',
  },
  mapContainer: {
    marginHorizontal: 20,
    marginBottom: 16,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#334155',
    height: 300,
  },
  map: {
    width: '100%',
    height: '100%',
  },
  mapPlaceholder: {
    height: 300,
    backgroundColor: '#1E293B',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  mapPlaceholderText: {
    fontSize: 48,
    marginBottom: 8,
  },
  mapPlaceholderSubtext: {
    fontSize: 16,
    color: '#94A3B8',
    fontWeight: '500',
    marginBottom: 4,
  },
  mapPlaceholderNote: {
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
  },
  legendCard: {
    backgroundColor: '#1E293B',
    marginHorizontal: 20,
    marginBottom: 16,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#334155',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 6,
  },
  legendText: {
    fontSize: 11,
    color: '#94A3B8',
  },
  infoBox: {
    backgroundColor: '#1E293B',
    marginHorizontal: 20,
    marginBottom: 16,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#334155',
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  infoLabel: {
    fontSize: 14,
    color: '#94A3B8',
  },
  infoValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  infoCard: {
    backgroundColor: '#1E293B',
    marginHorizontal: 20,
    marginBottom: 16,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#334155',
    flexDirection: 'row',
    alignItems: 'center',
  },
  infoIcon: {
    fontSize: 20,
    marginRight: 12,
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    color: '#94A3B8',
  },
  proceedButton: {
    backgroundColor: '#10B981',
    marginHorizontal: 20,
    marginBottom: 32,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  proceedButtonDisabled: {
    backgroundColor: '#334155',
  },
  proceedButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  resultContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flex: 1,
  },
  cachedBadge: {
    backgroundColor: '#3B82F6',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginLeft: 8,
  },
  cachedBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '600',
  },
  cachedDestinationsContainer: {
    backgroundColor: '#1E293B',
    marginHorizontal: 20,
    marginBottom: 16,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#334155',
  },
  cachedDestinationsTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  cachedDestinationsSubtitle: {
    fontSize: 12,
    color: '#94A3B8',
    marginBottom: 12,
  },
  cachedDestinationItem: {
    backgroundColor: '#0F172A',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#334155',
  },
  cachedDestinationIcon: {
    fontSize: 18,
    marginRight: 12,
  },
  cachedDestinationText: {
    fontSize: 14,
    color: '#E2E8F0',
    flex: 1,
  },
});
