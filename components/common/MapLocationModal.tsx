import { toast } from '@backpackapp-io/react-native-toast';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';

const styles = StyleSheet.create({
  container: { flex: 1 },
  map: { flex: 1 },
  infoBox: {
    position: 'absolute',
    bottom: 40,
    left: 20,
    right: 20,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 10,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 6,
  },
  label: { fontWeight: '600', marginBottom: 4 },
  address: { fontSize: 14, color: '#333' },
});

const MapLocationModal = ({
  show,
  onHide,
  onLocationSelected,
  latitude = null,
  longitude = null,
  isSetDefaultCurrentLocation = false,
}: any) => {
  const [region, setRegion] = useState<any>({
    latitude,
    longitude,
  });

  // To mitigate timeout error on reverseGeocodeAsync, add timeout/robust error handling and retries.
  // Also prevent calling getAddress without valid coordinates.

  const getAddress = async (
    latitude: number,
    longitude: number,
    forceUpdate: boolean = false
  ) => {
    if (typeof latitude !== 'number' || typeof longitude !== 'number') {
      // Don't call reverseGeocodeAsync if coordinates are invalid
      setRegion({
        latitude,
        longitude,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
        formattedAddress: '',
      });
      return;
    }

    // Helper to wrap a promise with a timeout
    const withTimeout = (promise: Promise<any>, ms: number) => {
      return Promise.race([
        promise,
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Geocode timeout')), ms)
        ),
      ]);
    };

    try {
      let place: any = null;
      // Retry logic for transient failures/timeouts
      let lastError = null;
      for (let attempt = 1; attempt <= 2; attempt++) {
        try {
          const [result] = await withTimeout(
            Location.reverseGeocodeAsync({ latitude, longitude }),
            4000 // shorter timeout than 5s
          );
          place = result;
          break;
        } catch (err) {
          lastError = err;
          if (attempt === 2) throw err;
          await new Promise(r => setTimeout(r, 500)); // wait before retry
        }
      }

      setRegion({
        latitude,
        longitude,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
        formattedAddress: place?.formattedAddress || '',
      });

      if (isSetDefaultCurrentLocation || forceUpdate) {
        onLocationSelected({
          latitude,
          longitude,
          address: place?.formattedAddress || '',
        });
      }
    } catch (error: any) {
      setRegion({
        latitude,
        longitude,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
        formattedAddress: '',
      });
      toast.error(
        error?.message?.includes('timeout')
          ? 'Reverse geocoding timed out. Please try again.'
          : 'Failed to get address for this location.'
      );
    }
  };

  const onMarkerDragEnd = (e: any) => {
    const { latitude, longitude } = e.nativeEvent.coordinate;
    setRegion({ ...region, latitude, longitude });
    getAddress(latitude, longitude, true);
  };

  useFocusEffect(
    useCallback(() => {
      (async () => {
        try {
          let { status } = await Location.requestForegroundPermissionsAsync();

          if (status !== 'granted') {
            toast.error('Permission to access location was denied');
            return;
          }

          // Get current position only if region is not set
          if (region && !region.latitude && !region.longitude) {
            const current = await Location.getCurrentPositionAsync({});
            const { latitude, longitude }: any = current.coords;
            getAddress(latitude, longitude);
          }
        } catch (error) {
          toast.error('Error accessing location services.');
          console.error('Error getting location:', error);
        }
      })();
    }, [show])
  );

  return (
    <View className='overflow-hidden rounded-xl border border-gray-100'>
      <Modal
        animationType='slide'
        transparent={false}
        visible={!!show}
        onRequestClose={onHide}
        style={styles.container}
      >
        <TouchableOpacity
          className='absolute top-5 right-5 z-10 p-2 bg-white rounded-full shadow-lg'
          onPress={onHide}
          activeOpacity={0.7}
        >
          <Ionicons name='close' size={24} color='#333' />
        </TouchableOpacity>
        {region && (
          <MapView
            style={styles.map}
            region={region}
            onPress={onMarkerDragEnd}
            provider={PROVIDER_GOOGLE}
          >
            <Marker
              coordinate={region}
              description='Hold and Drag to select location'
              draggable
              centerOffset={{
                x: Location.Accuracy.High,
                y: Location.Accuracy.High,
              }}
              onDragEnd={onMarkerDragEnd}
              title='Selected Location'
            />
          </MapView>
        )}

        <View style={styles.infoBox}>
          <Text style={styles.label}>Selected Address:</Text>
          <Text style={styles.address}>
            {region?.formattedAddress || 'Move marker to select'}
          </Text>
        </View>
      </Modal>
    </View>
  );
};

export default MapLocationModal;
