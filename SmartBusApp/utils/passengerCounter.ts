import AsyncStorage from "@react-native-async-storage/async-storage";

const PASSENGER_KEY = "passengerCount";

export const getPassengerCount = async () => {
  const value = await AsyncStorage.getItem(PASSENGER_KEY);
  return value ? parseInt(value, 10) : 0;
};

export const incrementPassengerCount = async () => {
  const current = await getPassengerCount();
  const updated = current + 1;
  await AsyncStorage.setItem(PASSENGER_KEY, updated.toString());
  return updated;
};

export const decrementPassengerCount = async () => {
  const current = await getPassengerCount();
  const updated = Math.max(0, current - 1);
  await AsyncStorage.setItem(PASSENGER_KEY, updated.toString());
  return updated;
};

export const resetPassengerCount = async () => {
  await AsyncStorage.setItem(PASSENGER_KEY, "0");
  return 0;
};
