import { toast } from "@/lib/toast";
import { FontAwesome5, Ionicons, MaterialIcons } from "@expo/vector-icons";
import * as Location from "expo-location";
import { router, useFocusEffect } from "expo-router";
import React, { useCallback, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Text, TouchableOpacity, View } from "react-native";
import MapView, { Marker, PROVIDER_GOOGLE, Region, UrlTile } from "react-native-maps";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "../../context/AuthContext";
import { apiService } from "../../services/api.service";

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
  // Approximate radius in km, from latitudeDelta (surface approximation)
  if (!region.latitudeDelta) return 10;
  // Each degree latitude ~111km, take half the displayed delta as radius
  return Math.max((region.latitudeDelta * 111) / 2, 1); // minimum 1km
}

const GarageMapScreen = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const mapRef = useRef<MapView | null>(null);

  const [region, setRegion] = useState<RegionT>({
    latitude: user?.latitude || 21.2160293,
    longitude: user?.longitude || 72.8887858,
    latitudeDelta: 0.05,
    longitudeDelta: 0.05,
  });

  const [garages, setGarages] = useState<Garage[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedGarageType, setSelectedGarageType] = useState<string | null>("");

  // Fetch initial user location
  useFocusEffect(
    useCallback(() => {
      (async () => {
        try {
          let { status } = await Location.requestForegroundPermissionsAsync();
          if (status !== "granted") {
            toast.remove();
            toast.error(t("garage.permissionDenied", "Permission to access location was denied"));
            return;
          }

          try {
            const location = await Location.getCurrentPositionAsync({});
            const newRegion: RegionT = {
              latitude: location.coords.latitude,
              longitude: location.coords.longitude,
              latitudeDelta: 0.05,
              longitudeDelta: 0.05,
            };
            setRegion(newRegion);
            mapRef.current?.animateToRegion(newRegion, 1000);
            fetchNearbyGarages(newRegion, selectedGarageType);
          } catch (locError: any) {
            toast.dismiss();
            toast.error(
              t(
                "garage.locationUnavailable",
                "Current location is unavailable. Make sure that location services are enabled in your device settings.",
              ),
            );
            console.error("Error getting device location:", locError);
          }
        } catch (error) {
          toast.dismiss();
          toast.error(t("garage.permissionError", "Error accessing location permissions."));
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
        console.log("err.message", err.message);
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
          className={`px-4 py-2 rounded-xl border ${selectedGarageType === type.value
              ? "bg-primary border-primary"
              : "bg-gray-50 border-gray-200"
            }`}
          onPress={() =>
            setSelectedGarageType(
              selectedGarageType === type.value ? null : type.value,
            )
          }
        >
          <Text
            className={`font-semibold ${selectedGarageType === type.value ? "text-white" : "text-gray-800"
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
    <SafeAreaView className="flex-1 bg-screen">
      <View className="flex-row justify-between items-center px-5 py-4 bg-white border-b border-gray-100 shadow-sm">
        <Text className="text-xl font-bold text-gray-900">
          {t("garage.title", "Find Garage")}
        </Text>
        {user?.type === "customer" && (
          <TouchableOpacity
            className=""
            activeOpacity={0.8}
            onPress={() =>
              router.push("/(apps)/garage/my-garages", {
                screen: "MainTabs",
                params: { screen: "MyGarages" },
              } as any)
            }
          >
            <View
              className={`flex-row p-2 px-8 items-center !text-white gap-3 rounded-xl shadow-md bg-primary`}
            >
              {/* <Ionicons name="" size={22} color="white" /> */}
              <Text className="text-lg font-semibold !text-white">
                {t("garage.myGarages", "View Garages")}
              </Text>
            </View>
          </TouchableOpacity>
        )}
      </View>

      {/* Garage type filter bar */}
      {renderGarageTypeFilter()}

      <View style={{ flex: 1 }} className="!h-full">
        {error && (
          <View className="flex absolute right-0 left-0 top-12 z-10 items-center">
            <Text className="text-red-500">
              {t("garage.error", error ?? "An error occurred")}
            </Text>
          </View>
        )}
        <MapView
          ref={mapRef}
          style={{ flex: 1 }}
          region={{
            latitude: region.latitude || 21.2160293,
            longitude: region.longitude || 72.8887858,
            latitudeDelta: region.latitudeDelta || 0.05,
            longitudeDelta: region.longitudeDelta || 0.05,
          }}
          provider={PROVIDER_GOOGLE}
          onRegionChangeComplete={handleRegionChangeComplete}
          scrollEnabled={true}
          zoomEnabled={true}
          showsMyLocationButton={true}
          zoomControlEnabled={true}
          showsUserLocation={true}
          followsUserLocation={true}
        >
          <UrlTile
            urlTemplate="https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}"
            maximumZ={20}
            tileSize={256}
          />

          {/* Render found garages */}
          {garages.map((garage) => (
            <Marker
              key={garage.id}
              coordinate={{
                latitude: garage.latitude,
                longitude: garage.longitude,
              }}
              title={garage.name}
            >
              <MaterialIcons
                name="car-repair"
                size={32}
                className="!text-primary"
              />
              <View className="rounded-xl p-4 min-w-[220px] shadow-lg">
                <Text
                  style={{ fontWeight: "600", fontSize: 17, marginBottom: 3 }}
                >
                  {garage.name}
                </Text>
                {garage.address ? (
                  <Text
                    style={{
                      fontSize: 14,
                      marginBottom: 6,
                      color: "#555",
                    }}
                    numberOfLines={2}
                  >
                    {garage.address}
                  </Text>
                ) : null}
                {garage.mobile ? (
                  <TouchableOpacity
                    onPress={() => {
                      // Use dialpad with the mobile number
                      const phone = garage.mobile.replace(/[^+\d]/g, "");
                      if (phone) {
                        // Open the dialer
                        import("react-native").then(({ Linking }) => {
                          Linking.openURL(`tel:${phone}`);
                        });
                      }
                    }}
                    style={{
                      backgroundColor: "#E8F0FE",
                      borderRadius: 8,
                      paddingVertical: 7,
                      paddingHorizontal: 12,
                      flexDirection: "row",
                      alignItems: "center",
                      alignSelf: "flex-start",
                      marginTop: 8,
                    }}
                  >
                    <Ionicons
                      name="call-outline"
                      size={18}
                      color="#2574A9"
                      style={{ marginRight: 6 }}
                    />
                    <Text style={{ color: "#2574A9", fontWeight: "500" }}>
                      {garage.mobile}
                    </Text>
                  </TouchableOpacity>
                ) : null}
              </View>
            </Marker>
          ))}
        </MapView>
      </View>
    </SafeAreaView>
  );
};

export default GarageMapScreen;
