import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { useEffect, useState, useCallback } from "react";
import { router, useFocusEffect } from "expo-router";
import { getPassengerCount, resetPassengerCount } from "../../utils/passengerCounter";


export default function HomeScreen() {
  const [passengerCount, setPassengerCount] = useState(0);
  const availableSeats = 60 - passengerCount;

  const loadPassengers = useCallback(async () => {
    const count = await getPassengerCount();
    setPassengerCount(count);
  }, []);

  useEffect(() => {
    loadPassengers();
  }, [loadPassengers]);

  // Reload passenger count whenever screen comes into focus
  useFocusEffect(
    useCallback(() => {
      loadPassengers();
    }, [loadPassengers])
  );

  const handleResetCount = async () => {
    await resetPassengerCount();
    loadPassengers();
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerIcon}>🚌</Text>
        <Text style={styles.headerTitle}>Smart Bus Conductor</Text>
      </View>
      <Text style={styles.subtitle}>Digital Ticketing & Passenger Management System</Text>

      {/* Seat Availability Card */}
      <View style={styles.availabilityCard}>
        <View style={styles.cardHeader}>
          <View style={styles.cardTitleRow}>
            <Text style={styles.cardIcon}>👥</Text>
            <View>
              <Text style={styles.cardTitle}>Seat Availability</Text>
              <Text style={styles.cardSubtitle}>Current bus occupancy</Text>
            </View>
          </View>
          <View style={styles.seatInfo}>
            <Text style={styles.seatCount}>{availableSeats} / 60</Text>
            <Text style={styles.seatLabel}>Available Seats</Text>
          </View>
        </View>

        <View style={styles.progressContainer}>
          <View
            style={[
              styles.progressBar,
              { width: `${(passengerCount / 60) * 100}%` },
            ]}
          />
        </View>

        <View style={styles.statsRow}>
          <Text style={styles.statsText}>{passengerCount} Occupied</Text>
          <Text style={styles.statsText}>{availableSeats} Available</Text>
        </View>
      </View>

      {/* Action Cards */}
      <View style={styles.actionsGrid}>
        <View style={styles.actionCard}>
          <View style={[styles.actionIcon, styles.greenBg]}>
            <Text style={styles.actionIconText}>🚌</Text>
          </View>
          <Text style={styles.actionTitle}>Board as Passenger</Text>
          <Text style={styles.actionSubtitle}>Select destination and purchase ticket</Text>
          <TouchableOpacity
            style={[styles.actionButton, styles.greenButton]}
            onPress={() => router.push("/destination")}
          >
            <Text style={styles.actionButtonText}>Start Boarding</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.actionCard}>
          <View style={[styles.actionIcon, styles.redBg]}>
            <Text style={styles.actionIconText}>🚪</Text>
          </View>
          <Text style={styles.actionTitle}>Disembark</Text>
          <Text style={styles.actionSubtitle}>Scan QR code to exit the bus</Text>
          <TouchableOpacity
            style={[styles.actionButton, styles.redButton]}
            onPress={() => router.push("/disembark")}
          >
            <Text style={styles.actionButtonText}>Scan to Exit</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.actionCard}>
          <View style={[styles.actionIcon, styles.orangeBg]}>
            <Text style={styles.actionIconText}>☕</Text>
          </View>
          <Text style={styles.actionTitle}>Bus-Break</Text>
          <Text style={styles.actionSubtitle}>Scan QR to leave/return</Text>
          <TouchableOpacity
            style={[styles.actionButton, styles.orangeButton]}
            onPress={() => router.push("/bus-break")}
          >
            <Text style={styles.actionButtonText}>Scan QR Code</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0F172A",
    padding: 16,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 40,
    marginBottom: 8,
  },
  headerIcon: {
    fontSize: 32,
    marginRight: 12,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "700",
    color: "#F8FAFC",
  },
  subtitle: {
    textAlign: "center",
    color: "#94A3B8",
    fontSize: 14,
    marginBottom: 24,
  },
  availabilityCard: {
    backgroundColor: "#1E293B",
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: "#334155",
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 20,
  },
  cardTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  cardIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#F8FAFC",
    marginBottom: 4,
  },
  cardSubtitle: {
    fontSize: 12,
    color: "#94A3B8",
  },
  seatInfo: {
    alignItems: "flex-end",
  },
  seatCount: {
    fontSize: 24,
    fontWeight: "700",
    color: "#3B82F6",
    marginBottom: 2,
  },
  seatLabel: {
    fontSize: 11,
    color: "#94A3B8",
  },
  progressContainer: {
    width: "100%",
    height: 8,
    backgroundColor: "#334155",
    borderRadius: 4,
    overflow: "hidden",
    marginBottom: 12,
  },
  progressBar: {
    height: "100%",
    backgroundColor: "#3B82F6",
    borderRadius: 4,
  },
  statsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  statsText: {
    fontSize: 13,
    color: "#94A3B8",
  },
  resetButton: {
    backgroundColor: "#DC2626",
    padding: 12,
    borderRadius: 8,
    alignItems: "center",
    marginBottom: 16,
  },
  resetButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "600",
  },
  actionsGrid: {
    flexDirection: "row",
    gap: 12,
    justifyContent: "space-between",
  },
  actionCard: {
    flex: 1,
    backgroundColor: "#1E293B",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "#334155",
    alignItems: "center",
  },
  actionIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  greenBg: {
    backgroundColor: "#10B98133",
  },
  redBg: {
    backgroundColor: "#EF444433",
  },
  orangeBg: {
    backgroundColor: "#F9731633",
  },
  actionIconText: {
    fontSize: 32,
  },
  actionTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#F8FAFC",
    marginBottom: 8,
  },
  actionSubtitle: {
    fontSize: 13,
    color: "#94A3B8",
    textAlign: "center",
    marginBottom: 16,
  },
  actionButton: {
    width: "100%",
    padding: 14,
    borderRadius: 8,
    alignItems: "center",
  },
  greenButton: {
    backgroundColor: "#10B981",
  },
  redButton: {
    backgroundColor: "#EF4444",
  },
  orangeButton: {
    backgroundColor: "#F97316",
  },
  actionButtonText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "600",
  },
});
