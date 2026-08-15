import AsyncStorage from "@react-native-async-storage/async-storage";

export const AUTH_TOKEN_KEY = "authToken";
export const LOCALE_KEY = "locale";

export const getStoreBy = async (key: string) => {
  try {
    const result = await AsyncStorage.getItem(key);
    return result ? result : null;
  } catch (e) {
    // Web fallback: could use localStorage if you want
    return null;
  }
};

export const setStoreBy = async (key: string, value: string) => {
  console.log("SAVING STORE DATA", { key, value });
  try {
    await AsyncStorage.setItem(key, value);
  } catch (e) {
    // Web fallback: do nothing or use localStorage
    return;
  }
};

export const deleteStoreBy = async (key: string) => {
  try {
    await AsyncStorage.removeItem(key);
  } catch (e) {
    // Web fallback: do nothing or remove from localStorage
    return;
  }
};
