import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, Platform } from "react-native";
import * as Location from "expo-location";
import { useEffect, useState, useRef } from "react";
import { router } from "expo-router";
import { useTrip } from '../utils/TripContext';

// Conditionally load MapView and Marker only on native platforms
const getNativeMapComponents = () => {
  if (Platform.OS === 'web') {
    return { MapView: null, Marker: null };
  }
  try {
    const ReactNativeMaps = require('react-native-maps');
    return {
      MapView: ReactNativeMaps.default,
      Marker: ReactNativeMaps.Marker
    };
  } catch (error) {
    console.log('Maps not available:', error);
    return { MapView: null, Marker: null };
  }
};

const { MapView, Marker } = getNativeMapComponents();

export default function DestinationScreen() {
  const { startTrip } = useTrip();
  const mapRef = useRef<any>(null);
  
  const [currentLocation, setCurrentLocation] = useState<any>(null);
  const [currentLocationName, setCurrentLocationName] = useState<string>("Loading...");
  const [destination, setDestination] = useState<any>(null);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<any[]>([]);
  const [distance, setDistance] = useState(0);
  const [fare, setFare] = useState(0);

  // Get bus GPS location
  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") return;

      const loc = await Location.getCurrentPositionAsync({});
      const coords = {
        latitude: loc.coords.latitude,
        longitude: loc.coords.longitude,
      };
      setCurrentLocation(coords);

      // Reverse geocode to get location name
      try {
        const response = await fetch(
          `https://nominatim.openstreetmap.org/reverse?format=json&lat=${coords.latitude}&lon=${coords.longitude}`,
          {
            headers: {
              'User-Agent': 'SmartBusApp/1.0'
            }
          }
        );
        
        if (response.ok) {
          const data = await response.json();
          const locationName = data.address?.city || 
                              data.address?.town || 
                              data.address?.village || 
                              data.address?.county ||
                              'Current Location';
          setCurrentLocationName(locationName);
        } else {
          setCurrentLocationName('Current Location');
        }
      } catch (error) {
        console.log('Reverse geocoding error:', error);
        setCurrentLocationName('Current Location');
      }
    })();
  }, []);

  // Search destination using OpenStreetMap (Nominatim)
  const searchDestination = async () => {
    if (!query) return;

    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${query}&countrycodes=zw`,
        {
          headers: {
            'User-Agent': 'SmartBusApp/1.0'
          }
        }
      );
      
      if (!response.ok) {
        console.log('Search failed:', response.status);
        setResults([]);
        return;
      }

      const data = await response.json();
      setResults(data || []);
    } catch (error) {
      console.log('Search error:', error);
      setResults([]);
    }
  };

  // Distance calculation (Haversine)
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

    const dist = calculateDistanceKm(
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
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${coordinate.latitude}&lon=${coordinate.longitude}`,
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
          name: data.display_name,
        };

        setDestination(dest);

        const dist = calculateDistanceKm(
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
          <Text style={styles.loadingText}>Loading location...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
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
              <Text style={styles.subtitle}>Choose from available destinations in Zimbabwe</Text>
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
            {results.map((item, index) => (
              <TouchableOpacity
                key={index}
                style={styles.resultItem}
                onPress={() => selectDestination(item)}
              >
                <Text style={styles.resultText}>{item.display_name}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Map */}
        <View style={styles.mapContainer}>
          {Platform.OS === 'web' || !MapView ? (
            <View style={styles.mapPlaceholder}>
              <Text style={styles.mapPlaceholderText}>🗺️</Text>
              <Text style={styles.mapPlaceholderSubtext}>
                {Platform.OS === 'web' ? 'Map View (Available on Mobile)' : 'Map Loading...'}
              </Text>
              <Text style={styles.mapPlaceholderNote}>Use the search box above to find destinations</Text>
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
    maxHeight: 200,
  },
  resultItem: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },
  resultText: {
    color: '#FFFFFF',
    fontSize: 14,
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
});
