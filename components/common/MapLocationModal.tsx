import { toast } from "@/lib/toast";
import { Ionicons } from "@expo/vector-icons";
import * as Location from "expo-location";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Keyboard,
  Modal,
  Platform,
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
  label: { fontWeight: "600", marginBottom: 4 },
  address: { fontSize: 14, color: "#333" },
});

interface MapLocationModalProps {
  show: boolean;
  onHide: () => void;
  onLocationSelected: (location: {
    latitude: number;
    longitude: number;
    address: string;
  }) => void;
  latitude?: number | null;
  longitude?: number | null;
  formattedAddress?: string;
  isSetDefaultCurrentLocation?: boolean;
}

const DEFAULT_DELTA = 0.0922;

const INITIAL_REGION = {
  latitude: 0,
  longitude: 0,
  latitudeDelta: DEFAULT_DELTA,
  longitudeDelta: DEFAULT_DELTA,
  formattedAddress: "",
};

const MapLocationModal: React.FC<MapLocationModalProps> = ({
  show,
  onHide,
  onLocationSelected,
  latitude = null,
  longitude = null,
  formattedAddress = "",
  isSetDefaultCurrentLocation = false,
}) => {
  const { t } = useTranslation();

  const currentRegionRef = useRef({
    latitude: typeof latitude === "number" ? latitude : INITIAL_REGION.latitude,
    longitude:
      typeof longitude === "number" ? longitude : INITIAL_REGION.longitude,
    latitudeDelta: DEFAULT_DELTA,
    longitudeDelta: DEFAULT_DELTA,
    formattedAddress: formattedAddress,
  });

  const [addressLoading, setAddressLoading] = useState(false);
  const addressRequestId = useRef(0);

  // Helper to get address with robust error handling, cancel outdated requests
  const getAddress = useCallback(
    async (newRegion: Region, forceUpdate = false) => {
      toast.dismiss();
      setAddressLoading(true);
      if (
        typeof newRegion.latitude !== "number" ||
        isNaN(newRegion.latitude) ||
        typeof newRegion.longitude !== "number" ||
        isNaN(newRegion.longitude)
      ) {
        return null;
      }
      addressRequestId.current += 1;
      const currentRequestId = addressRequestId.current;

      const runGeocode = async () => {
        for (let attempt = 1; attempt <= 2; attempt++) {
          try {
            const geocodePromise = Location.reverseGeocodeAsync({
              latitude: newRegion.latitude,
              longitude: newRegion.longitude,
            });
            const timeoutPromise = new Promise((_, reject) =>
              setTimeout(() => reject(new Error("Geocode timeout")), 4500),
            );
            const result = await Promise.race([geocodePromise, timeoutPromise]);
            if (currentRequestId !== addressRequestId.current) return null;
            // Always take the first item from reverseGeocodeAsync's array
            return Array.isArray(result) ? result[0] : null;
          } catch (err) {
            if (attempt === 2) throw err;
            await new Promise((r) => setTimeout(r, 450));
          }
        }
        return null;
      };

      try {
        const place = await runGeocode();
        let formattedAddress =
          place?.name && place?.city
            ? `${place.name}, ${place.city}${place.region ? ", " + place.region : ""}${place.country ? ", " + place.country : ""}`
            : place?.formattedAddress || "";

        currentRegionRef.current = {
          latitudeDelta: newRegion.latitudeDelta,
          longitudeDelta: newRegion.longitudeDelta,
          latitude: newRegion.latitude,
          longitude: newRegion.longitude,
          formattedAddress: formattedAddress || "",
        };
      } catch (error: any) {
        if (currentRequestId !== addressRequestId.current) return;
        toast.error(
          error?.message?.toLowerCase().includes("timeout")
            ? t("common.geocodeTimeout") ||
            "Reverse geocoding timed out. Please try again."
            : t("common.geocodeFailed") ||
            "Failed to get address for this location.",
        );
        return null;
      } finally {
        setAddressLoading(false);
      }
    },
    [t],
  );

  // Effect: When modal opens, set to passed-in region or current location
  useEffect(() => {
    if (!show) return;
    if (isSetDefaultCurrentLocation) {
      (async () => {
        toast.dismiss();
        let newLat = typeof latitude === "number" ? latitude : null;
        let newLng = typeof longitude === "number" ? longitude : null;
        if (
          (newLat === null || isNaN(newLat) || newLat === 0) &&
          (newLng === null || isNaN(newLng) || newLng === 0)
        ) {
          // Try requesting location permission and get actual location
          try {
            let { status } = await Location.requestForegroundPermissionsAsync();
            if (status !== "granted") {
              toast.error(
                t("common.permissionDenied") ||
                "Permission to access location was denied",
              );
              return;
            }
            const { coords } = await Location.getCurrentPositionAsync({});
            newLat = coords.latitude;
            newLng = coords.longitude;
          } catch {
            toast.error(
              t("common.locationError") || "Error accessing location services.",
            );
            return;
          }
        }
      })();
    }

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [show, latitude, longitude]);

  // Handles when user moves the map: recenter region & lookup address
  // Optimization: Only run if region has truly changed
  const regionTimeout = useRef<NodeJS.Timeout | null>(null);
  const lastRegionRef = useRef<{ latitude: number; longitude: number } | null>(
    null,
  );

  const onRegionChangeComplete = useCallback(async (newRegion: Region) => {
    try {
      if (
        typeof newRegion.latitude !== "number" ||
        typeof newRegion.longitude !== "number"
      ) {
        return;
      }

      // Only trigger if the new region is significantly different
      const last = lastRegionRef.current;
      const precision = 0.00001;
      const isSameAsLast =
        last &&
        Math.abs(last.latitude - newRegion.latitude) < precision &&
        Math.abs(last.longitude - newRegion.longitude) < precision;

      if (isSameAsLast) return; // Prevent unnecessary reloads

      // Save new values before scheduling
      lastRegionRef.current = {
        latitude: newRegion.latitude,
        longitude: newRegion.longitude,
      };

      // Debounce calls to getAddress (wait for the user to stop moving)
      if (regionTimeout.current) {
        clearTimeout(regionTimeout.current);
      }
      await getAddress(newRegion, true);
    } catch (err: any) {
      toast.error(err.message);
    }

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Handle address input changes
  const onAddressTextChange = (text: string) => {
    currentRegionRef.current = {
      latitudeDelta: currentRegionRef.current.latitudeDelta,
      longitudeDelta: currentRegionRef.current.longitudeDelta,
      latitude: currentRegionRef.current.latitude,
      longitude: currentRegionRef.current.longitude,
      formattedAddress: text,
    };
  };

  // Prevent body scrolling/interactions when modal open (for web, no-op on native)
  useEffect(() => {
    if (Platform.OS === "web" && show) {
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = "";
      };
    }
  }, [show]);

  // Optimize: Don't call onLocationSelected unless address is truly set
  const handleSelectionBtn = useCallback(() => {
    toast.dismiss();
    if (
      !currentRegionRef.current.formattedAddress ||
      currentRegionRef.current.formattedAddress.trim() === ""
    ) {
      toast.error(
        t("common.enterFullLocation") || "Please enter full location.",
      );
      Keyboard.dismiss();
      return;
    }
    onLocationSelected({
      latitude: currentRegionRef.current.latitude,
      longitude: currentRegionRef.current.longitude,
      address: currentRegionRef.current.formattedAddress,
    });
  }, [onLocationSelected, t]);

  return (
    <View className="overflow-hidden rounded-xl border border-gray-100">
      <Modal
        animationType="slide"
        transparent={false}
        visible={!!show}
        onRequestClose={onHide}
        style={styles.container}
      >
        {/* Pin Icon on map center */}
        <View
          style={{
            position: "absolute",
            top: "45%",
            left: "50%",
            zIndex: 5,
            marginLeft: -30, // since icon is 48px wide
            marginTop: -20, // since icon is 48px high, visually center (offset as needed)
            pointerEvents: "none",
          }}
        >
          <Ionicons name="location-sharp" size={48} color="#ef4444" />
        </View>

        <TouchableOpacity
          style={{
            position: "absolute",
            top: 18,
            left: 18,
            zIndex: 10,
            backgroundColor: "#fff",
            borderRadius: 24,
            padding: 8,
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.12,
            shadowRadius: 4,
            elevation: 2,
          }}
          className="!bg-screen border shadow-lg !border-primary"
          onPress={onHide}
          activeOpacity={0.75}
        >
          <Ionicons name="close" size={24} className="!text-primary" />
        </TouchableOpacity>

        {currentRegionRef.current.latitude !== undefined &&
          currentRegionRef.current.longitude !== undefined && (
            <MapView
              style={styles.map}
              className="!w-screen h-screen"
              provider={PROVIDER_GOOGLE}
              initialRegion={currentRegionRef.current}
              // Use a debounced callback to optimize region updates (prevents excessive updates)
              onRegionChangeComplete={onRegionChangeComplete}
              showsUserLocation={true}
              followsUserLocation={false}
              zoomEnabled={true}
              showsMyLocationButton={true}
              // showsCompass={false}

              loadingIndicatorColor="#ef4444"
            />
          )}

        {/* UI: address and confirm bar */}
        <View
          className="absolute right-5 left-5 bottom-8 p-3 py-4 bg-white rounded-2xl border-2 shadow-2xl border-primary"
          style={{
            elevation: 5, // maintain Android shadow
            shadowColor: "#000", // maintain iOS shadow
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.18,
            shadowRadius: 8,
          }}
        >
          <View
            style={{ flexDirection: "row", alignItems: "center" }}
            className=""
          >
            <TextInput
              className="flex-1 min-h-[44px] bg-screen rounded-xl border border-primary  px-4 py-4 mr-1.5 text-base text-gray-800"
              defaultValue={currentRegionRef.current.formattedAddress || ""}
              placeholder={
                addressLoading
                  ? t("common.loadingAddress") || "Loading address..."
                  : t("common.moveMarkerToSelectLocation") ||
                  "Move marker to select location"
              }
              multiline
              numberOfLines={3}
              onChangeText={onAddressTextChange}
              editable={!addressLoading}
            />

            <Pressable
              className={`ml-1 p-2 rounded-2xl items-center justify-center ${currentRegionRef.current.formattedAddress &&
                currentRegionRef.current.formattedAddress.trim()
                ? "bg-primary opacity-100 border-screen"
                : "bg-gray-200 opacity-55 border-primary"
                }`}
              disabled={
                !currentRegionRef.current.formattedAddress ||
                currentRegionRef.current.formattedAddress.trim() === ""
              }
              onPress={handleSelectionBtn}
            >
              <Ionicons name="checkmark-sharp" size={28} color="#fff" />
            </Pressable>
          </View>
        </View>
      </Modal>
    </View>
  );
};

export default MapLocationModal;
