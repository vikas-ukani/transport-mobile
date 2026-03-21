import * as Location from "expo-location";
import { useFocusEffect } from "expo-router";
import { useCallback } from "react";
import { View } from "react-native";
import { useAuth } from "../../context/AuthContext";
import apiService from "../../services/api.service";

const UserGPSUpdate = () => {
  const { user } = useAuth();

  useFocusEffect(
    useCallback(() => {
      async function getCurrentLocation() {
        try {
          let { status } = await Location.requestForegroundPermissionsAsync();
          // let { status } = await Location.requestForegroundPermissionsAsync();

          if (status !== "granted") {
            return;
          }

          // Get current position only if region is not set
          const current = await Location.getCurrentPositionAsync({});
          const { latitude, longitude }: any = current.coords;
          const [place] = await Location.reverseGeocodeAsync({
            latitude,
            longitude,
          });
          if (user && user.id) {
            await apiService.userPartialUpdate(user?.id as string, {
              id: user.id,
              latitude,
              longitude,
              address: place?.formattedAddress,
            });
          }
        } catch (error: any) {
          console.log("Set user location Default:: ", error.message);
        }
      }
      getCurrentLocation();
    }, [user?.id])
  );

  return <View />;
};

export default UserGPSUpdate;
