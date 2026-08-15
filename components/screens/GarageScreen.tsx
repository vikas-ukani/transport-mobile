import { Ionicons } from "@expo/vector-icons";
import * as Location from "expo-location";
import { useCallback, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import MapView, {
  Marker,
  PROVIDER_GOOGLE,
  Region,
  UrlTile,
} from "react-native-maps";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "../../context/AuthContext";
import { toast } from "@backpackapp-io/react-native-toast";
import { useFocusEffect } from "expo-router";
// React Query key

const API_KEY = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY || "";

type RegionT = Region & {
  latitudeDelta?: number;
  longitudeDelta?: number;
  formattedAddress?: string;
};
const styles = StyleSheet.create({
  container: { flex: 1 },
  map: { flex: 1 },
});
const GarageScreen = () => {
  const { t } = useTranslation();
  const { user } = useAuth();

  const refreshRef = useRef(false);

  const [region, setRegion] = useState<RegionT>({
    latitude: user?.longitude || 0,
    longitude: user?.longitude || 0,
    latitudeDelta: 0.01,
    longitudeDelta: 0.01,
  });

  useFocusEffect(
    useCallback(() => {
      (async () => {
        try {
          // Check if location is actually needed for this component.
          // If this modal is to display a *given* latitude/longitude (from props),
          // then requesting current device location is unnecessary.
          // Only request permission if you intend to fetch user's current location.

          // Only request permission and fetch location if one is missing.
          let { status } = await Location.requestForegroundPermissionsAsync();
          if (status !== "granted") {
            toast.remove();
            toast.error("Permission to access location was denied");
            return;
          }

          // Actually try to get current position if coordinates are missing
          try {
            const location = await Location.getCurrentPositionAsync({});
            setRegion((prev) => ({
              ...prev,
              latitude: location.coords.latitude,
              longitude: location.coords.longitude,
            }));
          } catch (locError: any) {
            // This will catch 'Current location is unavailable' error
            toast.dismiss();
            toast.error(
              "Current location is unavailable. Make sure that location services are enabled in your device settings.",
            );
            console.error("Error getting device location:", locError);
          }
        } catch (error) {
          toast.dismiss();
          toast.error("Error accessing location permissions.");
          console.error("Error requesting location permission:", error);
        }
      })();
    }, []),
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
            // onPress={() =>
            //   router.push("/(apps)/garages", {
            //     screen: "MainTabs",
            //     params: { screen: "CreateBookVehicle" },
            //   } as any)
            // }
          >
            <View
              className={`flex-row p-2 px-8 items-center !text-white gap-3 rounded-xl shadow-md bg-primary`}
            >
              <Ionicons name="add-circle-outline" size={22} color="white" />
              <Text className="text-lg font-semibold !text-white">
                {t("garage.title", "Create Garage")}
              </Text>
            </View>
          </TouchableOpacity>
        )}
      </View>

      <ScrollView
        className="flex-1"
        showsVerticalScrollIndicator={false}
        // refreshControl={
        //   <RefreshControl
        //     refreshing={isLoading || isFetching || isRefetching}
        //     onRefresh={onRefresh}
        //     colors={["#EF4444"]}
        //   />
        // }
        // onScroll={handleScroll}
        scrollEventThrottle={200}
      >
        <View className="h-screen" style={{ flex: 1 }}>
          {region && region.latitudeDelta && region.longitudeDelta && (
            <MapView
              style={{ flex: 1 }}
              region={{
                latitude: region.latitude || 0,
                longitude: region.longitude || 0,
                latitudeDelta: region.latitudeDelta || 0.01,
                longitudeDelta: region.longitudeDelta || 0.01,
              }}
              // onPress={onMarkerDragEnd}
              provider={PROVIDER_GOOGLE}
              zoomControlEnabled
            >
              <UrlTile
                tileSize={512}
                urlTemplate={`https://api.mapbox.com/styles/v1/fugafuga/hogehoge/tiles/256/{z}/{x}/{y}?access_token=${API_KEY}`}
                maximumZ={19}
              />
              <Marker
                coordinate={{
                  latitude: region?.latitude || 0,
                  longitude: region?.longitude || 0,
                }}
                description="My Location"
                draggable={false}
                centerOffset={{
                  x: Location.Accuracy.High,
                  y: Location.Accuracy.High,
                }}
                // onDragEnd={onMarkerDragEnd}
                title="My Location"
              />
            </MapView>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

export default GarageScreen;
