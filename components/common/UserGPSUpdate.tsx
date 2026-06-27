import * as Location from "expo-location";
import { useFocusEffect } from "expo-router";
import { useCallback } from "react";
import { View } from "react-native";
import { useAuth } from "../../context/AuthContext";
import apiService from "../../services/api.service";

const UserGPSUpdate = () => {
  const { user, updateUser } = useAuth();

  useFocusEffect(
    useCallback(() => {
      async function getCurrentLocation() {
        try {
          if (user && user.id) {
            let { status } = await Location.requestForegroundPermissionsAsync();

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
            // Update location every 1 minute when the screen is focused
            const updateLocation = async () => {
              try {
                const current = await Location.getCurrentPositionAsync({});
                const { latitude, longitude }: any = current.coords;
                const [place] = await Location.reverseGeocodeAsync({
                  latitude,
                  longitude,
                });
                const { data } = await apiService.userPartialUpdate(
                  user?.id as string,
                  {
                    id: user.id,
                    latitude,
                    longitude,
                    address: place?.formattedAddress,
                  },
                );
                if (data) {
                  updateUser(data);
                }
              } catch (err: any) {
                console.log("CATCH: Set user location Default:: ", err.message);
              }
            };

            // First update immediately, then every minute
            await updateLocation();
            const intervalId = setInterval(updateLocation, 60 * 1000);

            // Clean up interval on blur/unmount
            return () => clearInterval(intervalId);
          }
        } catch (error: any) {
          console.log("CATCH: Set user location Default:: ", error.message);
        }
      }
      getCurrentLocation();
    }, []),
    // }, [user]),
  );

  return <View />;
};

export default UserGPSUpdate;
