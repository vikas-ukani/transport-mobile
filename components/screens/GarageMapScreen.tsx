import { toast } from "@/lib/toast";
import { FontAwesome5, Ionicons, MaterialIcons } from "@expo/vector-icons";
// import Mapbox from "@rnmapbox/maps";
import * as Location from "expo-location";
import { router, useFocusEffect } from "expo-router";
import { useCallback, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Text, TouchableOpacity, View } from "react-native";
import MapView, { Marker, Region, UrlTile } from "react-native-maps";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "../../context/AuthContext";
import { apiService } from "../../services/api.service";

const googleMapKey = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY;
// const mapBoxKey = process.env.EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN || "";
// Mapbox.setAccessToken(mapBoxKey);

// Types
type RegionT = Region & {
  latitudeDelta?: number;
  longitudeDelta?: number;
  formattedAddress?: string;
};

type Garage = {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  address?: string;
  types?: string[];
  [key: string]: any;
};

const GARAGE_TYPES = [
  { label: "garage.type.all", value: "" },
  { label: "garage.type.car", value: "car" },
  { label: "garage.type.pickup", value: "pickup" },
  { label: "garage.type.truck", value: "truck" },
];

function getRadiusFromRegion(region: RegionT) {
  if (!region.latitudeDelta) return 10;
  return Math.max((region.latitudeDelta * 111) / 2, 1);
}

const GarageMapScreen = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const mapRef = useRef<MapView | null>(null);

  const isInitialLoad = useRef(true);

  const [region, setRegion] = useState<RegionT>({
    latitude: user?.latitude || 21.2160293,
    longitude: user?.longitude || 72.8887858,
    latitudeDelta: 0.05,
    longitudeDelta: 0.05,
  });

  const [garages, setGarages] = useState<Garage[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedGarageType, setSelectedGarageType] = useState<string | null>(
    "",
  );
  // 2. Use useFocusEffect strictly for user-driven structural focus events
  useFocusEffect(
    useCallback(() => {
      // Only execute position tracking on the very first screen layout mount
      if (!isInitialLoad.current) return;

      (async () => {
        try {
          let { status } = await Location.requestForegroundPermissionsAsync();
          if (status !== "granted") {
            toast.dismiss();
            toast.error(
              t(
                "garage.permissionDenied",
                "Permission to access location was denied",
              ),
            );
            return;
          }

          try {
            // Accuracy optimized balanced mode prevents freeze delays on simulators
            const location = await Location.getCurrentPositionAsync({
              accuracy: Location.Accuracy.Balanced,
            });

            const newRegion: RegionT = {
              latitude: location.coords.latitude,
              longitude: location.coords.longitude,
              latitudeDelta: 0.05,
              longitudeDelta: 0.05,
            };

            isInitialLoad.current = false; // Kill future loops immediately
            setRegion(newRegion);

            // Small layout timeout lets the native platform paint the map container first
            setTimeout(() => {
              mapRef.current?.animateToRegion(newRegion, 800);
            }, 100);

            fetchNearbyGarages(newRegion, selectedGarageType);
          } catch (locError: any) {
            console.error("Error getting device location:", locError);
            // If GPS fails, still attempt to fetch garages using your fallback state coords!
            fetchNearbyGarages(region, selectedGarageType);
          }
        } catch (error) {
          console.error("Error requesting location permission:", error);
        }
      })();
    }, [t]),
  );

  // Fetch nearby garages when region or filter changes
  const fetchNearbyGarages = useCallback(
    async (mapRegion: RegionT, garageType?: string | null) => {
      setLoading(true);
      setError(null);
      try {
        const radius = getRadiusFromRegion(mapRegion);

        const res = await apiService.getNearByGarages({
          lat: mapRegion.latitude,
          lng: mapRegion.longitude,
          radius,
          type: garageType,
        });
        let fetched = (res?.garages ?? []) as Garage[];

        // Only keep those within the displayed region (map bounds)
        const minLat = mapRegion.latitude - mapRegion.latitudeDelta! / 2;
        const maxLat = mapRegion.latitude + mapRegion.latitudeDelta! / 2;
        const minLng = mapRegion.longitude - mapRegion.longitudeDelta! / 2;
        const maxLng = mapRegion.longitude + mapRegion.longitudeDelta! / 2;
        const visible = fetched.filter(
          (g) =>
            g.latitude >= minLat &&
            g.latitude <= maxLat &&
            g.longitude >= minLng &&
            g.longitude <= maxLng,
        );
        setGarages(visible);
      } catch (err: any) {
        setGarages([]);
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  // Handle map region movement
  const handleRegionChangeComplete = (r: Region) => {
    setRegion((prev) => ({
      ...prev,
      latitude: r.latitude,
      longitude: r.longitude,
      latitudeDelta: r.latitudeDelta,
      longitudeDelta: r.longitudeDelta,
    }));
  };

  // Garage type filter UI
  const renderGarageTypeFilter = () => (
    <View className="flex-row gap-2 px-5 py-2 bg-screen">
      {GARAGE_TYPES.map((type) => (
        <TouchableOpacity
          key={type.value}
          className={`rounded-xl border px-4 py-2 ${
            selectedGarageType === type.value
              ? "border-primary bg-primary"
              : "border-gray-200 bg-gray-50"
          }`}
          onPress={() =>
            setSelectedGarageType(
              selectedGarageType === type.value ? null : type.value,
            )
          }
        >
          <Text
            className={`font-semibold ${
              selectedGarageType === type.value ? "text-white" : "text-gray-800"
            }`}
          >
            {t(type.label, {
              defaultValue:
                type.value === ""
                  ? "All"
                  : type.value[0].toUpperCase() + type.value.slice(1),
            })}
          </Text>
        </TouchableOpacity>
      ))}
      <TouchableOpacity
        className="flex-row items-center px-4 py-2 rounded-xl bg-primary"
        onPress={() => fetchNearbyGarages(region, selectedGarageType)}
        activeOpacity={0.85}
        style={{ marginLeft: "auto" }}
      >
        <Text className="mr-2 font-semibold text-white">
          {t("garage.search", "Search")}
        </Text>
        {loading ? (
          <FontAwesome5
            name="spinner"
            size={18}
            className="!animate-spin !text-white"
          />
        ) : (
          <Ionicons name="search" size={18} className="!text-white" />
        )}
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#f8fafc" }}>
      <View
        className="flex-row items-center justify-between border-b border-b-[#f4f4f4] bg-white px-5 py-4 shadow"
        style={{
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 1 },
          shadowOpacity: 0.04,
          shadowRadius: 1,
        }}
      >
        <Text style={{ fontSize: 20, fontWeight: "bold", color: "#111827" }}>
          {t("garage.title", "Find Garage")}
        </Text>
        {user?.type === "customer" && (
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() =>
              router.push("/(apps)/garage/my-garages", {
                screen: "MainTabs",
                params: { screen: "MyGarages" },
              } as any)
            }
          >
            <View
              className="flex-row gap-3 items-center px-8 py-2 text-white rounded-xl bg-primary"
              style={{ elevation: 2 }}
            >
              <Text
                style={{ fontSize: 18, fontWeight: "600" }}
                className="text-white"
              >
                {t("garage.myGarages", "View Garages")}
              </Text>
            </View>
          </TouchableOpacity>
        )}
      </View>

      {/* Garage type filter bar */}
      {renderGarageTypeFilter()}

      <View style={{ flex: 1, minHeight: 200, minWidth: "100%" }}>
        {error && (
          <View
            style={{
              position: "absolute",
              left: 0,
              right: 0,
              top: 48,
              zIndex: 10,
              alignItems: "center",
            }}
          >
            <Text style={{ color: "#ef4444" }}>
              {t("garage.error", error ?? "An error occurred")}
            </Text>
          </View>
        )}

        <MapView
          ref={mapRef}
          key={garages.length}
          style={{
            flex: 1,
            minHeight: 350,
            // --- Ensures map is always drawn even if view bug --- //
            // ...(Platform.OS === "android" ? { elevation: 1 } : { zIndex: 1 }),
          }}
          initialRegion={region}
          provider={undefined}
          // region={{
          //   latitude: region.latitude || 37.4219979,
          //   longitude: region.longitude || -122.084,
          //   latitudeDelta: region.latitudeDelta || 0.05,
          //   longitudeDelta: region.longitudeDelta || 0.05,
          // }}
          // provider={PROVIDER_GOOGLE}
          onRegionChangeComplete={handleRegionChangeComplete}
          zoomEnabled={true}
          showsMyLocationButton={true}
          zoomControlEnabled={true}
          showsUserLocation={true}
          showsIndoorLevelPicker={true}
        >
          <UrlTile
            urlTemplate={`https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}?access_token=${googleMapKey}`}
            maximumZ={19}
            tileSize={256}
            zIndex={1} // Keeps tiles under markers
          />
        
          {/* Do not remove this */}
          {/* Render UrlTile first for custom base map, then Marker overlays explicitly above it */}
          {/* <UrlTile
            urlTemplate={`https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}?access_token=${googleMapKey}`}
            maximumZ={20}
            tileSize={256}
            zIndex={0} // Make sure it's at the bottom
          /> */}

          {garages.map((garage) => (
            <Marker
              key={garage.id}
              coordinate={{
                latitude: Number(garage.latitude),
                longitude: Number(garage.longitude),
              }}
              // zIndex={9999}
              tracksViewChanges={true} // Helps fix invisible markers on tile maps sometimes
              title={garage.name}
              // pinColor="#2563eb" // Optionally set a color to ensure visibility over custom tiles
              // opacity={1}
            >
              <View
                className="justify-center items-center w-10 h-10"
                style={{
                  width: 44,
                  height: 44,
                  alignItems: "center",
                  justifyContent: "center",
                  backgroundColor: "#ffffff",
                  borderWidth: 2,
                  borderColor: "#2563eb",
                  overflow: "hidden", // Stops clipping bugs

                  borderRadius: 99,
                  shadowColor: "#000",
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.2,
                  shadowRadius: 3,
                  elevation: 8,
                }}
              >
                <MaterialIcons
                  name="car-repair"
                  size={36}
                  color="#2563eb"
                  style={{
                    // Provide background for icon to ensure it's visible on any tile
                    backgroundColor: "rgba(255,255,255,0.75)",
                    borderRadius: 20,
                    padding: 1,
                  }}
                />
              </View>
            </Marker>
          ))}
        </MapView>
      </View>
    </SafeAreaView>
  );
};

export default GarageMapScreen;
