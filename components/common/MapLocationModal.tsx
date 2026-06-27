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
  TouchableOpacity,
  View,
} from "react-native";
import { TextInput } from "react-native-gesture-handler";
import MapView, { PROVIDER_GOOGLE, Region } from "react-native-maps";

const styles = StyleSheet.create({
  container: { flex: 1 },
  map: { flex: 1 },
  marker: {
    height: 48,
    width: 48,
  },
  // markerFixed: {
  //   // left: "50%",
  //   // marginLeft: -24,
  //   // marginTop: -48,
  //   // position: "absolute",
  //   top: "50%",
  //   zIndex: 100,
  // },
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
        console.log("error reverseGeocodeAsync: ", error.message);
        setRegion({
          latitude,
          longitude,
          latitudeDelta: 0.01,
          longitudeDelta: 0.01,
          formattedAddress: "",
        });
        toast.remove();
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
            toast.remove();
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

  // Corrected and optimized handler for region change completion
  const onRegionChangeComplete = useCallback(
    (newRegion: Region) => {
      // setRegion((prev) => ({
      //   ...prev,
      //   ...newRegion,
      //   // Maintain deltas if available, or use new ones
      //   latitudeDelta: newRegion.latitudeDelta ?? prev.latitudeDelta,
      //   longitudeDelta: newRegion.longitudeDelta ?? prev.longitudeDelta,
      // }));
      // Use the correct new lat/lng, not old props
      getAddress(newRegion.latitude, newRegion.longitude, true);
    },
    []
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
        <View className="absolute top-[50%] left-[50%] rig z-10 p-2">
          <Ionicons
            name="location-sharp"
            size={26}
            className="!text-danger"
          ></Ionicons>
        </View>
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
            // style={styles.map}
            region={{
              latitude: region.latitude || 0,
              longitude: region.longitude || 0,
              latitudeDelta: region.latitudeDelta || 0.01,
              longitudeDelta: region.longitudeDelta || 0.01,
            }}
            // onPress={onMarkerDragEnd}
            provider={PROVIDER_GOOGLE}
            onRegionChangeComplete={onRegionChangeComplete}
          >
            {/* <Marker
              coordinate={{
                latitude: region?.latitude || 0,
                longitude: region?.longitude || 0,
              }}
              description="Hold and Drag to select location"
              draggable
              style={styles.marker}
              centerOffset={{
                x: Location.Accuracy.High,
                y: Location.Accuracy.High,
              }}
              onDragEnd={onMarkerDragEnd}
              title="Selected Location"
            /> */}
          </MapView>
        )}

        <View className="absolute right-5 left-5 bottom-10 p-4 bg-white rounded-xl shadow-lg">
          <View className="flex-row justify-between items-center">
            <TextInput
              style={[styles.address, { minHeight: 40 }]}
              className="flex-1 py-1 pr-3 px-5 text-base font-medium bg-white rounded-xl border-2 border-gray-200 !min-h-[60px] align-text-top"
              value={
                typeof region?.formattedAddress === "string"
                  ? region.formattedAddress
                  : ""
              }
              placeholder={t("common.moveMarkerToSelectLocation")}
              multiline
              numberOfLines={4}
              onChangeText={(text) => {
                // If you have setRegion in parent, lift the handler up; else do it via local state (may need useState in parent).
                if (typeof setRegion === "function") {
                  setRegion({
                    ...region,
                    formattedAddress: text,
                  });
                } else if (region) {
                  region.formattedAddress = text;
                }
              }}
              editable={true}
              defaultValue={region?.formattedAddress || ""}
            />

            <Pressable
              style={{
                marginLeft: 8,
                padding: 6,
                borderRadius: 16,
                backgroundColor: "#f0f0f0",
              }}
              className="!bg-primaryLight disabled:!bg-gray-100"
              disabled={
                !region.formattedAddress || region.formattedAddress === ""
              }
              onPress={() => {
                console.log("region.formattedAddress", region.formattedAddress);
                if (
                  !region.formattedAddress ||
                  region.formattedAddress === ""
                ) {
                  console.log(
                    '"Please enter full location."',
                    "Please enter full location.",
                  );
                  toast.dismiss();
                  toast.error("Please enter full location.");
                  return;
                }

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
                className={
                  "!text-white"
                  // isLocationPicked &&
                  // (!region.formattedAddress || region.formattedAddress === "")
                  //   ? ""
                  //   : "!text-black"
                }
              />
            </Pressable>
          </View>
        </View>
      </Modal>
    </View>
  );
};

export default MapLocationModal;
