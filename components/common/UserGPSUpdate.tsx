import * as Location from "expo-location";
import { useFocusEffect } from "expo-router";
import { useCallback, useRef } from "react";
import { View } from "react-native";
import { useAuth } from "../../context/AuthContext";
import apiService from "../../services/api.service";

// Utility to check if coordinates have changed significantly
function hasLocationSignificantlyChanged(
  last: { lat: number; lon: number } | null,
  curr: { lat: number; lon: number },
  threshold: number = 0.0005,
) {
  if (!last) return true;
  // Roughly ~55m at equator per 0.0005 degree
  const latDiff = Math.abs(last.lat - curr.lat);
  const lonDiff = Math.abs(last.lon - curr.lon);
  return latDiff > threshold || lonDiff > threshold;
}

const UserGPSUpdate = () => {
  const { user, updateUser } = useAuth();
  const watchSubscription = useRef<Location.LocationSubscription | null>(null);
  const lastSentLocation = useRef<{ lat: number; lon: number } | null>(null);

  useFocusEffect(
    useCallback(() => {
      let isActive = true;
      const startWatching = async () => {
        try {
          if (user && user.id) {
            let { status } = await Location.requestForegroundPermissionsAsync();
            if (status !== "granted") {
              return;
            }

            watchSubscription.current = await Location.watchPositionAsync(
              {
                accuracy: Location.Accuracy.High,
                distanceInterval: 25, // meters: update as soon as user moves 25m or more
                // Remove timeInterval for change-based
              },
              async (current) => {
                if (!isActive) return;
                const { latitude, longitude } = current.coords;
                const currLoc = { lat: latitude, lon: longitude };

                // Only update the backend if position changes significantly (default threshold ≈50m)
                if (
                  !hasLocationSignificantlyChanged(
                    lastSentLocation.current,
                    currLoc,
                    0.0005,
                  )
                ) {
                  // Not significantly changed, do nothing
                  return;
                }

                lastSentLocation.current = currLoc;
                try {
                  const [place] = await Location.reverseGeocodeAsync({
                    latitude,
                    longitude,
                  });
                  console.log("USER LOCATION CHANGED", {
                    id: user.id,
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
                  console.log(
                    "CATCH: Set user location Default (watcher): ",
                    err.message,
                  );
                }
              },
            );
          }
        } catch (error: any) {
          console.log("CATCH: Set user location Default:: ", error.message);
        }
      };

      startWatching();

      // Clean up: stop watching on blur/unmount
      return () => {
        isActive = false;
        if (watchSubscription.current) {
          watchSubscription.current.remove();
          watchSubscription.current = null;
        }
      };
    }, [user]), // re-run if user changes
  );

  return <View />;
};

export default UserGPSUpdate;
