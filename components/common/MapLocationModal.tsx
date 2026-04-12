import { toast } from "@backpackapp-io/react-native-toast";
import { Ionicons } from "@expo/vector-icons";
import * as Location from "expo-location";
import { useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import { useTranslation } from "react-i18next";
import {
    Modal,
    Pressable,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import MapView, { Marker, PROVIDER_GOOGLE, Region } from "react-native-maps";

const styles = StyleSheet.create({
  container: { flex: 1 },
  map: { flex: 1 },
  infoBox: {
    position: "absolute",
    bottom: 40,
    left: 20,
    right: 20,
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 6,
  },
  label: { fontWeight: "600", marginBottom: 4 },
  address: { fontSize: 14, color: "#333" },
});

type RegionT = Region & {
  latitudeDelta?: number;
  longitudeDelta?: number;
  formattedAddress?: string;
};

const MapLocationModal = ({
  show,
  onHide,
  onLocationSelected,
  latitude = null,
  longitude = null,
  isSetDefaultCurrentLocation = false,
}: any) => {
  const { t } = useTranslation();
  const [region, setRegion] = useState<RegionT>({
    latitude,
    longitude,
    latitudeDelta: 0.01,
    longitudeDelta: 0.01,
  });
  const [isLocationPicked, setIsLocationPicked] = useState<boolean>(false);

  // To mitigate timeout error on reverseGeocodeAsync, add timeout/robust error handling and retries.
  // Prevent calling getAddress without valid coordinates.

  const getAddress = useCallback(
    async (
      latitude: number,
      longitude: number,
      forceUpdate: boolean = false,
    ) => {
      if (typeof latitude !== "number" || typeof longitude !== "number") {
        // Don't call reverseGeocodeAsync if coordinates are invalid
        setRegion({
          latitude,
          longitude,
          latitudeDelta: 0.01,
          longitudeDelta: 0.01,
          formattedAddress: "",
        });
        return;
      }

      // Helper to wrap a promise with a timeout
      const withTimeout = (promise: Promise<any>, ms: number) => {
        return Promise.race([
          promise,
          new Promise((_, reject) =>
            setTimeout(() => reject(new Error("Geocode timeout")), ms),
          ),
        ]);
      };

      try {
        let place: any = null;
        // Retry logic for transient failures/timeouts
        for (let attempt = 1; attempt <= 2; attempt++) {
          try {
            const [result] = await withTimeout(
              Location.reverseGeocodeAsync({ latitude, longitude }),
              4000, // shorter timeout than 5s
            );
            place = result;
            break;
          } catch (err) {
            if (attempt === 2) throw err;
            await new Promise((r) => setTimeout(r, 500)); // wait before retry
          }
        }

        setRegion({
          latitude,
          longitude,
          latitudeDelta: 0.01,
          longitudeDelta: 0.01,
          formattedAddress: place?.formattedAddress || "",
        });

        if (isSetDefaultCurrentLocation || forceUpdate) {
          setIsLocationPicked(true);
        }
      } catch (error: any) {
        console.log("error", error);
        setRegion({
          latitude,
          longitude,
          latitudeDelta: 0.01,
          longitudeDelta: 0.01,
          formattedAddress: "",
        });
        toast.error(
          error?.message?.includes("timeout")
            ? "Reverse geocoding timed out. Please try again."
            : "Failed to get address for this location.",
        );
        setIsLocationPicked(false);
      }
    },
    [show, isSetDefaultCurrentLocation],
  );

  const onMarkerDragEnd = (e: any) => {
    const { latitude, longitude } = e.nativeEvent.coordinate;
    setRegion({
      ...region,
      latitude,
      longitude,
      latitudeDelta: region.latitudeDelta,
      longitudeDelta: region.longitudeDelta,
    });
    getAddress(latitude, longitude, true);
  };

  // useEffect(
  useFocusEffect(
    useCallback(() => {
      (async () => {
        try {
          let { status } = await Location.requestForegroundPermissionsAsync();

          if (status !== "granted") {
            toast.error("Permission to access location was denied");
            return;
          }

          // Get current position only if region is not set
          if (region && !region.latitude && !region.longitude) {
            const current = await Location.getCurrentPositionAsync({});
            const { latitude, longitude }: any = current.coords;
            getAddress(latitude, longitude);
          }
        } catch (error) {
          toast.dismiss();
          toast.error("Error accessing location services.");
          console.error("Error getting location:", error);
        }
      })();
    }, [getAddress, region]),
  );

  return (
    <View className="overflow-hidden rounded-xl border border-gray-100">
      <Modal
        animationType="slide"
        transparent={false}
        visible={!!show}
        onRequestClose={onHide}
        style={styles.container}
      >
        <TouchableOpacity
          className="absolute top-5 right-5 z-10 p-2 bg-white rounded-full shadow-lg"
          onPress={onHide}
          activeOpacity={0.7}
        >
          <Ionicons name="close" size={24} color="#333" />
        </TouchableOpacity>

        {region && region.latitudeDelta && region.longitudeDelta && (
          <MapView
            style={styles.map}
            region={{
              latitude: region.latitude || 0,
              longitude: region.longitude || 0,
              latitudeDelta: region.latitudeDelta || 0.01,
              longitudeDelta: region.longitudeDelta || 0.01,
            }}
            onPress={onMarkerDragEnd}
            provider={PROVIDER_GOOGLE}
          >
            <Marker
              coordinate={{
                latitude: region?.latitude || 0,
                longitude: region?.longitude || 0,
              }}
              description="Hold and Drag to select location"
              draggable
              centerOffset={{
                x: Location.Accuracy.High,
                y: Location.Accuracy.High,
              }}
              onDragEnd={onMarkerDragEnd}
              title="Selected Location"
            />
          </MapView>
        )}

        <View className="absolute right-5 left-5 bottom-10 p-4 bg-white rounded-xl shadow-lg">
          <Text style={styles.label}>Selected Address:</Text>
          <View className="flex-row justify-between items-center">
            <Text
              style={styles.address}
              className="flex-1 pr-3"
              numberOfLines={2}
              ellipsizeMode="tail"
            >
              {region?.formattedAddress ||
                t("common.moveMarkerToSelectLocation")}
            </Text>
            <Pressable
              style={{
                marginLeft: 8,
                padding: 6,
                borderRadius: 16,
                backgroundColor: "#f0f0f0",
              }}
              onPress={() => {
                onLocationSelected({
                  latitude: region?.latitude || 0,
                  longitude: region?.longitude || 0,
                  address: region.formattedAddress || "",
                });
              }}
            >
              <Ionicons
                name="checkmark-sharp"
                size={24}
                color={isLocationPicked ? "green" : "gray"}
              />
            </Pressable>
          </View>
        </View>
      </Modal>
    </View>
  );
};

export default MapLocationModal;
