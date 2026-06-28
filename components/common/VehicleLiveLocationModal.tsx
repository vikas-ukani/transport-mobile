import { toast } from "@backpackapp-io/react-native-toast";
import { Ionicons } from "@expo/vector-icons";
import * as Location from "expo-location";
import { useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import { useTranslation } from "react-i18next";
import { Modal, StyleSheet, TouchableOpacity, View } from "react-native";
import MapView, {
  Marker,
  PROVIDER_GOOGLE,
  Region,
  UrlTile,
} from "react-native-maps";

const API_KEY = "";

const styles = StyleSheet.create({
  container: { flex: 1 },
  map: { flex: 1 },
  label: { fontWeight: "600", marginBottom: 4 },
  address: { fontSize: 14, color: "#333" },
});

type RegionT = Region & {
  latitudeDelta?: number;
  longitudeDelta?: number;
  formattedAddress?: string;
};

const VehicleLiveLocationModal = ({
  show,
  onHide,
  latitude = null,
  longitude = null,
}: any) => {
  const { t } = useTranslation();
  const [region, setRegion] = useState<RegionT>({
    latitude,
    longitude,
    latitudeDelta: 0.01,
    longitudeDelta: 0.01,
  });

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
        } catch (error) {
          toast.dismiss();
          toast.error("Error accessing location services.");
          console.error("Error getting location:", error);
        }
      })();
    }, []),
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
            // onPress={onMarkerDragEnd}
            provider={PROVIDER_GOOGLE}
          >
            <UrlTile
              tileSize={512}
              urlTemplate="https://api.mapbox.com/styles/v1/fugafuga/hogehoge/tiles/256/{z}/{x}/{y}?access_token=${API_KEY}"
              maximumZ={19}
            />
            <Marker
              coordinate={{
                latitude: region?.latitude || 0,
                longitude: region?.longitude || 0,
              }}
              description="Vehicle Location"
              draggable={false}
              centerOffset={{
                x: Location.Accuracy.High,
                y: Location.Accuracy.High,
              }}
              // onDragEnd={onMarkerDragEnd}
              title="Vehicle Location"
            />
          </MapView>
        )}
      </Modal>
    </View>
  );
};

export default VehicleLiveLocationModal;
