import { FontAwesome5, MaterialIcons } from "@expo/vector-icons";
import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Linking, Text, TouchableOpacity, View } from "react-native";
import MapView, { Marker, PROVIDER_GOOGLE, UrlTile } from "react-native-maps";

// Helper for fallback region based on user/owner location
function getDefaultRegion(activeRide: any) {
  const userLat =
    activeRide?.owner?.latitude != null && !isNaN(Number(activeRide.owner.latitude))
      ? Number(activeRide.owner.latitude)
      : 21.2160293;
  const userLng =
    activeRide?.owner?.longitude != null && !isNaN(Number(activeRide.owner.longitude))
      ? Number(activeRide.owner.longitude)
      : 72.8887858;
  return {
    latitude: userLat,
    longitude: userLng,
    latitudeDelta: 0.055,
    longitudeDelta: 0.055,
  };
}

const RideMapLocationBlock = ({ activeRide }: any) => {
  const { t } = useTranslation();
  const mapRef = useRef<MapView | null>(null);
  const [mapReady, setMapReady] = useState(false);
  const [region, setRegion] = useState(() => getDefaultRegion(activeRide));

  // Always parse pickup and dropoff coordinates even when 0 or string
  const parseCoordinate = (lat: any, lng: any) => {
    const nLat = Number(lat);
    const nLng = Number(lng);
    return (
      nLat !== undefined &&
      nLng !== undefined &&
      !isNaN(nLat) &&
      !isNaN(nLng)
    )
      ? { latitude: nLat, longitude: nLng }
      : null;
  };

  const pickupCoordinate = useMemo(
    () => parseCoordinate(activeRide?.fromLatitude, activeRide?.fromLongitude),
    [activeRide?.fromLatitude, activeRide?.fromLongitude]
  );
  const dropoffCoordinate = useMemo(
    () => parseCoordinate(activeRide?.toLatitude, activeRide?.toLongitude),
    [activeRide?.toLatitude, activeRide?.toLongitude]
  );

  // Effect to always fit/center map on pickup/dropoff locations
  useEffect(() => {
    if (mapRef.current && mapReady) {
      // If both pickup and dropoff, fit both
      if (pickupCoordinate && dropoffCoordinate) {
        setTimeout(() => {
          try {
            mapRef.current?.fitToCoordinates(
              [pickupCoordinate, dropoffCoordinate],
              {
                edgePadding: { top: 70, bottom: 70, left: 70, right: 70 },
                animated: true,
              }
            );
          } catch (err) {
            // fallback below on error
          }
        }, 200);
      } else if (pickupCoordinate) {
        setTimeout(() => {
          mapRef.current?.animateToRegion({
            ...pickupCoordinate,
            latitudeDelta: 0.038,
            longitudeDelta: 0.038,
          }, 400);
        }, 200);
      } else if (dropoffCoordinate) {
        setTimeout(() => {
          mapRef.current?.animateToRegion({
            ...dropoffCoordinate,
            latitudeDelta: 0.038,
            longitudeDelta: 0.038,
          }, 400);
        }, 200);
      } else {
        setTimeout(() => {
          mapRef.current?.animateToRegion(getDefaultRegion(activeRide), 400);
        }, 200);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    pickupCoordinate?.latitude,
    pickupCoordinate?.longitude,
    dropoffCoordinate?.latitude,
    dropoffCoordinate?.longitude,
    activeRide?.owner?.latitude,
    activeRide?.owner?.longitude,
    mapReady
  ]);

  // Provide MapView with always a non-null region (even if none valid)
  useEffect(() => {
    if (!pickupCoordinate && !dropoffCoordinate) {
      setRegion(getDefaultRegion(activeRide));
    } else if (pickupCoordinate && dropoffCoordinate) {
      // Calculate center and delta that fits both
      const minLat = Math.min(pickupCoordinate.latitude, dropoffCoordinate.latitude);
      const maxLat = Math.max(pickupCoordinate.latitude, dropoffCoordinate.latitude);
      const minLng = Math.min(pickupCoordinate.longitude, dropoffCoordinate.longitude);
      const maxLng = Math.max(pickupCoordinate.longitude, dropoffCoordinate.longitude);
      const latDelta = Math.max(0.05, (maxLat - minLat) * 2.6); // widen for comfort
      const lngDelta = Math.max(0.05, (maxLng - minLng) * 2.6);
      setRegion({
        latitude: (minLat + maxLat) / 2,
        longitude: (minLng + maxLng) / 2,
        latitudeDelta: latDelta,
        longitudeDelta: lngDelta,
      });
    } else if (pickupCoordinate) {
      setRegion({
        ...pickupCoordinate,
        latitudeDelta: 0.045,
        longitudeDelta: 0.045
      });
    } else if (dropoffCoordinate) {
      setRegion({
        ...dropoffCoordinate,
        latitudeDelta: 0.045,
        longitudeDelta: 0.045
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    pickupCoordinate?.latitude,
    pickupCoordinate?.longitude,
    dropoffCoordinate?.latitude,
    dropoffCoordinate?.longitude,
    activeRide?.owner?.latitude,
    activeRide?.owner?.longitude,
  ]);

  // Helper to render map and markers
  const renderMap = () => (
    <MapView
      provider={PROVIDER_GOOGLE}
      style={{ flex: 1, minHeight: 220, minWidth: "100%", backgroundColor: "#e5e7eb" }}
      initialRegion={region}
      region={region}
      ref={mapRef}
      scrollEnabled={true}
      zoomEnabled={true}
      pitchEnabled={false}
      rotateEnabled={false}
      showsBuildings={true}
      showsIndoors={false}
      mapType="standard"
      showsMyLocationButton={true}
      showsUserLocation={true}
      followsUserLocation={false}
      onMapReady={() => setMapReady(true)}
      zoomControlEnabled={true}
      userLocationCalloutEnabled
      loadingEnabled={true}
      loadingIndicatorColor="#555"
      loadingBackgroundColor="#e5e7eb"
    >
      <UrlTile
        urlTemplate="https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}"
        maximumZ={20}
        tileSize={256}
      />
      {pickupCoordinate && (
        <Marker
          coordinate={pickupCoordinate}
          title={t("booking.pickup", "Pickup Location")}
          description={activeRide?.fromAddress}
          identifier="pickup"
          anchor={{ x: 0.5, y: 1 }}
          tracksViewChanges={false}
        >
          <FontAwesome5 name="map-marker" size={36} color="#2dc275" style={{ textShadowColor: "#fff", textShadowRadius: 1 }} />
        </Marker>
      )}
      {dropoffCoordinate && (
        <Marker
          coordinate={dropoffCoordinate}
          title={t("booking.dropoff", "Drop Location")}
          description={activeRide?.toAddress}
          identifier="dropoff"
          anchor={{ x: 0.5, y: 1 }}
          tracksViewChanges={false}
        >
          <MaterialIcons name="pin-drop" size={40} color="#0b7fff" style={{ textShadowColor: "#fff", textShadowRadius: 1 }} />
        </Marker>
      )}
    </MapView>
  );

  return (
    <View>
      <View
        className="overflow-hidden rounded-xl border border-gray-200"
        style={{ height: 380, backgroundColor: "#e5e7eb" }}
      >
        {renderMap()}
        {pickupCoordinate && dropoffCoordinate && (
          <View className="absolute bottom-4 z-50 px-4 w-2/3 text-center">
            <TouchableOpacity
              onPress={() => {
                const fromLat = activeRide?.fromLatitude;
                const fromLng = activeRide?.fromLongitude;
                const toLat = activeRide?.toLatitude;
                const toLng = activeRide?.toLongitude;
                let url = `https://www.google.com/maps/dir/?api=1&origin=${fromLat},${fromLng}&destination=${toLat},${toLng}&travelmode=driving`;
                Linking.openURL(url);
              }}
              className="flex-row justify-center items-center py-4 w-full h-full text-center rounded-xl shadow bg-primary"
              style={{
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.3,
                shadowRadius: 5,
                elevation: 2,
              }}
              activeOpacity={0.85}
            >
              <FontAwesome5
                name="directions"
                size={18}
                color="#ffffff"
                style={{ marginRight: 8 }}
              />
              <Text
                style={{
                  color: "#fff",
                  fontWeight: "bold",
                  fontSize: 16,
                }}
              >
                {t("booking.getDirection", "Get Direction")}
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      <View className="flex-row items-center px-4 py-2">
        <View className="flex overflow-hidden justify-center items-center w-10 h-10 rounded-full border border-primary bg-primary/10">
          <Text className="text-lg font-bold text-primary">
            {(activeRide?.owner?.name || "U")[0]}
          </Text>
        </View>
        <View className="flex-1 ml-3">
          <Text className="font-bold text-gray-900">
            {activeRide?.owner?.name || t("booking.unknownUser", "Customer")}
          </Text>
        </View>
        {activeRide?.estimatedKm && (
          <View className="items-end mr-4">
            <Text className="text-2xl font-bold text-primary">
              {activeRide?.estimatedKm} km
            </Text>
            <Text className="mt-0.5 text-xs text-gray-400">
              {t("booking.estimatedKm", "Est. km")}
            </Text>
          </View>
        )}
      </View>

      <View className="flex-row gap-4 items-center px-4">
        <View className="flex-1">
          <View className="flex-row gap-2 items-center">
            <FontAwesome5
              name="map-marker-alt"
              size={22}
              className="!text-pickPin"
            />
            <Text
              className="text-base font-semibold text-gray-900"
              numberOfLines={1}
            >
              {activeRide?.fromAddress}
            </Text>
          </View>
          <View className="ml-[9px] h-4 border-l-2 border-dashed border-gray-300" />
          <View className="flex-row gap-2 items-center">
            <FontAwesome5
              name="map-marker-alt"
              size={22}
              className="!text-dropPin"
            />
            <Text
              className="text-base font-semibold text-gray-700"
              numberOfLines={1}
            >
              {activeRide?.toAddress}
            </Text>
          </View>
        </View>
        <View className="items-end"></View>
      </View>
    </View>
  );
};

export default RideMapLocationBlock;
