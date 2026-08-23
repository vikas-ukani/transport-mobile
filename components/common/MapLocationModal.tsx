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
  Dimensions,
} from "react-native";
import { TextInput } from "react-native-gesture-handler";
import MapView, {
  PROVIDER_GOOGLE,
  Region,
  Marker,
  UrlTile,
} from "react-native-maps";

const { width, height } = Dimensions.get("window");

const styles = StyleSheet.create({
  container: { flex: 1 },
  map: {
    width: "100%",
    height: "100%",
    minWidth: width,
    minHeight: height,
    flex: 1,
    // If you had any backgroundColor set here, you can uncomment/adapt it.
    // backgroundColor: '#fff',
  },
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
  latitude: 37.78825,
  longitude: -122.4324,
  latitudeDelta: DEFAULT_DELTA,
  longitudeDelta: DEFAULT_DELTA,
  formattedAddress: "",
};
const googleMapKey = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY;

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

  const [region, setRegion] = useState<Region>({
    latitude:
      typeof latitude === "number" && latitude !== 0
        ? latitude
        : INITIAL_REGION.latitude,
    longitude:
      typeof longitude === "number" && longitude !== 0
        ? longitude
        : INITIAL_REGION.longitude,
    latitudeDelta: DEFAULT_DELTA,
    longitudeDelta: DEFAULT_DELTA,
  });

  const [addressInput, setAddressInput] = useState<string>(
    formattedAddress || "",
  );
  const [addressLoading, setAddressLoading] = useState(false);
  const addressRequestId = useRef(0);

  // Helper to get address
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
        setAddressLoading(false);
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
        let formatted =
          place?.name && place?.city
            ? `${place.name}, ${place.city}${place.region ? ", " + place.region : ""}${place.country ? ", " + place.country : ""}`
            : place?.formattedAddress || "";

        setAddressInput(formatted || "");
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
        let newLat =
          typeof latitude === "number" && latitude !== 0 ? latitude : null;
        let newLng =
          typeof longitude === "number" && longitude !== 0 ? longitude : null;
        let regionToSet = { ...region };
        if (
          (newLat === null || isNaN(newLat)) &&
          (newLng === null || isNaN(newLng))
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
            regionToSet = {
              ...regionToSet,
              latitude: coords.latitude,
              longitude: coords.longitude,
            };
            setRegion(regionToSet);
          } catch {
            toast.error(
              t("common.locationError") || "Error accessing location services.",
            );
            return;
          }
        } else {
          regionToSet = {
            ...regionToSet,
            latitude: newLat ?? INITIAL_REGION.latitude,
            longitude: newLng ?? INITIAL_REGION.longitude,
          };
          setRegion(regionToSet);
        }
      })();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [show, latitude, longitude]);

  // Listen to region changes to update address
  const regionTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastRegionRef = useRef<{ latitude: number; longitude: number } | null>(
    null,
  );

  const onRegionChangeComplete = useCallback(
    (newRegion: Region) => {
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

        if (isSameAsLast) return;

        lastRegionRef.current = {
          latitude: newRegion.latitude,
          longitude: newRegion.longitude,
        };

        setRegion({
          ...newRegion,
          latitudeDelta: newRegion.latitudeDelta,
          longitudeDelta: newRegion.longitudeDelta,
        });

        if (regionTimeout.current) {
          clearTimeout(regionTimeout.current);
        }
        regionTimeout.current = setTimeout(() => {
          getAddress(newRegion, true);
        }, 100);
      } catch (err: any) {
        toast.error(err.message);
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    },
    [getAddress],
  );

  // Handle address input changes
  const onAddressTextChange = (text: string) => {
    setAddressInput(text);
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
    if (!addressInput || addressInput.trim() === "") {
      toast.error(
        t("common.enterFullLocation") || "Please enter full location.",
      );
      Keyboard.dismiss();
      return;
    }
    onLocationSelected({
      latitude: region.latitude,
      longitude: region.longitude,
      address: addressInput,
    });
  }, [onLocationSelected, region, addressInput, t]);

  return (
    <View
      style={{
        flex: 1,
        overflow: "hidden",
        borderRadius: 16,
        borderWidth: 1,
        borderColor: "#f1f1f1",
        backgroundColor: "#fff",
      }}
      className="rounded-xl border border-gray-100"
    >
      <Modal
        animationType="slide"
        transparent={false}
        visible={!!show}
        onRequestClose={onHide}
        style={styles.container}
      >
        <View style={{ flex: 1, backgroundColor: "#fff" }} className="flex-1">
          <MapView
            style={styles.map}
            initialRegion={region}
            region={region}
            provider={PROVIDER_GOOGLE}
            onRegionChangeComplete={onRegionChangeComplete}
            showsUserLocation={true}
            followsUserLocation={false}
            zoomEnabled={true}
            showsMyLocationButton={true}
            loadingEnabled={true}
            loadingIndicatorColor="#ef4444"
            loadingBackgroundColor="#fff"
            moveOnMarkerPress={false}
            pitchEnabled={true}
            rotateEnabled={true}
            toolbarEnabled={true}
            showsCompass={true}
            showsIndoors={true}
            showsScale={true}
            showsBuildings={true}
            mapType="standard"
          >
            <UrlTile
              urlTemplate={`https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}?access_token=${googleMapKey}`}
              maximumZ={20}
              tileSize={256}
            />
            {/* For API key to be respected, maps.google.com backend has to be configured in app.json/app.config.js */}
            {/* Marker for center point for clarity, but a floating icon overlays as well */}
            {/* If you want an actual marker, you can uncomment below.
            <Marker
              coordinate={{
                latitude: region.latitude,
                longitude: region.longitude,
              }}
            />
            */}
          </MapView>

          {/* Pin Icon on map center (absolute overlay, matches GarageMapScreen) */}
          <View
            style={{
              position: "absolute",
              top: "50%",
              left: "50%",
              zIndex: 5,
              marginLeft: -24,
              marginTop: -48, // to vertically center the pin point to map center
              pointerEvents: "none",
            }}
            pointerEvents="none"
          >
            <Ionicons name="location-sharp" size={48} color="#ef4444" />
          </View>

          {/* Close Button */}
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
            className="border !border-primary !bg-screen shadow-lg"
            onPress={onHide}
            activeOpacity={0.75}
          >
            <Ionicons name="close" size={24} className="!text-primary" />
          </TouchableOpacity>

          {/* UI: address and confirm bar */}
          <View
            className="absolute right-5 left-5 bottom-8 p-3 py-4 bg-white rounded-2xl border-2 shadow-2xl border-primary"
            style={{
              elevation: 5, // maintain Android shadow
              shadowColor: "#000", // maintain iOS shadow
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.18,
              shadowRadius: 8,
              backgroundColor: "#fff", // ensure bg is white
            }}
          >
            <View
              style={{ flexDirection: "row", alignItems: "center" }}
              className=""
            >
              <TextInput
                className="mr-1.5 min-h-[44px] flex-1 rounded-xl border border-primary  bg-screen px-4 py-4 text-base text-gray-800"
                value={addressInput}
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
                className={`ml-1 items-center justify-center rounded-2xl p-2 ${
                  addressInput && addressInput.trim()
                    ? "border-screen bg-primary opacity-100"
                    : "border-primary bg-gray-200 opacity-55"
                }`}
                disabled={!addressInput || addressInput.trim() === ""}
                onPress={handleSelectionBtn}
              >
                <Ionicons name="checkmark-sharp" size={28} color="#fff" />
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

export default MapLocationModal;
