import { toast } from '@backpackapp-io/react-native-toast';
import {
  FontAwesome5,
  Ionicons,
  MaterialCommunityIcons,
} from '@expo/vector-icons';
import { yupResolver } from '@hookform/resolvers/yup';
import { Picker } from '@react-native-picker/picker';
import * as Location from 'expo-location';
import { router, useGlobalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import {
  ActivityIndicator,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as yup from 'yup';
import { useAuth } from '../../context/AuthContext';
import i18n from '../../i18n/config';
import apiService from '../../services/api.service';
// ---- MISSING COMPONENT and UTILS DEFINITIONS ----

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

// Generate Truck Weight Options function (missing from original selection)
const generateTruckWeightOptions = () => {
  const options = [];
  for (let i = 500; i <= 35000; i += 500) {
    options.push({
      label: `${i} kg`,
      value: i.toString(),
    });
  }
  return options;
};

// ---- END OF MISSING COMPONENTS ----

// Yup schema
const schema = yup.object().shape({
  driverName: yup.string().required('Driver Name is required'),
  mobileNumber: yup.string().required('Driver mobile is required'),
  rcNumber: yup.string().required('RC Book number is required'),
  truckType: yup.string().required('Truck type is required'),
  bodyType: yup.string().required('Body type is required'),
  truckLength: yup.string().required('Truck length is required'),
  loadCapacity: yup.string().required('Load capacity is required'),
  truckHeight: yup.string().required('Truck height is required'),
  truckWeight: yup.string().required('Truck weight is required'),
});

const CreateBookingScreen = () => {
  const { id } = useGlobalSearchParams();
  const { user } = useAuth();

  // State for vehicle registration photos (legacy/unused in this context but required by vehicle logic)
  const [rcPhoto, setRcPhoto] = useState<string>('');
  const [truckPhoto, setTruckPhoto] = useState<string[]>([]);
  const [truckPhotoIds, setTruckPhotoIds] = useState<string[]>([]);
  const [referralCodeVisible, setReferralCodeVisible] = useState(false);
  const [referralCode, setReferralCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [showFromMap, setShowFromMap] = useState(false);

  const [region, setRegion] = useState<any>(null);
  const [address, setAddress] = useState<any>('');

  const {
    control,
    handleSubmit,
    reset,
    getValues,
    formState: { errors },
  } = useForm({
    resolver: yupResolver(schema),
    defaultValues: {
      driverName: user?.name || '',
      mobileNumber: user?.mobile || '',
      rcNumber: '',
      truckType: 'pickup',
      bodyType: 'open',
      truckLength: '7',
      loadCapacity: '10',
      truckHeight: '10',
      truckWeight: '500',
    },
  });

  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        // Permission denied, fallback to India center
        //  setCurrentLocation(null);
        setShowFromMap(true);
        return;
      }

      const current = await Location.getCurrentPositionAsync({});
      const { latitude, longitude }: any = current.coords;
      setRegion({
        latitude,
        longitude,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      });
      getAddress(latitude, longitude);
    })();
  }, []);

  const getAddress = async (lat: number, lng: number) => {
    const [place] = await Location.reverseGeocodeAsync({
      latitude: lat,
      longitude: lng,
    });
    if (place) {
      setAddress(place.formattedAddress || '');
    }
  };
  const onMarkerDragEnd = (e: any) => {
    const { latitude, longitude } = e.nativeEvent.coordinate;
    setRegion({ ...region, latitude, longitude });
    getAddress(latitude, longitude);
  };

  const generateCapacityOptions = () => {
    const options = [];
    for (let i = 0.5; i <= 100; i += 0.5) {
      options.push({
        label: `${i} tons (${i * 1000} kg)`,
        value: i.toString(),
      });
    }
    return options;
  };

  const generateHeightOptions = () => {
    const options = [];
    for (let i = 4; i <= 100; i += 1) {
      options.push({ label: `${i} feet`, value: i.toString() });
    }
    return options;
  };

  // Submission handler (replace with your booking logic)
  const onBookingSubmit = async (data: any) => {
    // You will want to actually submit the data to your apiService
    try {
      setLoading(true);

      // Upload RC Photo (skip in booking context)
      let uploadedRCPhoto: any = null;
      if (rcPhoto && rcPhoto.includes('uploads') === false) {
        uploadedRCPhoto = await apiService.uploadImage(rcPhoto, 'vehicle');
      }

      // Upload Vehicle Photos (skip in booking context)
      const uploadVehiclePhotos = await Promise.all(
        truckPhoto
          .filter((photo) => photo.includes('uploads') === false)
          .map(async (asset) => await apiService.uploadImage(asset, 'vehicle'))
      );

      let imageIds = uploadVehiclePhotos.map((u: any) => u?.id).filter(Boolean);
      if (id) {
        imageIds = Array.from(new Set([...imageIds, ...(truckPhotoIds || [])]));
      }

      // Here call your booking API (replace with real API call)
      const resData = await Promise.resolve({
        success: true,
        message: 'Booking created successfully.',
      });

      if (resData.success) {
        toast.success(
          resData.message || 'Booking request submitted successfully.'
        );
        reset();
        // clear address selections/maps maybe
        router.push('/(apps)/(tabs)/bookings');
      } else {
        toast.error(resData.message || 'Booking failed');
      }
    } catch (error: any) {
      console.log('Catch Error', error.message);
      toast.error(error.message || 'Booking failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView className='flex-1 bg-gray-50'>
      <View className='flex-row items-center px-5 py-4 bg-white border-b border-gray-100 shadow-sm'>
        <TouchableOpacity
          onPress={() => router.back()}
          className='flex-row gap-4 justify-start items-center p-2 -ml-2'
          activeOpacity={0.7}
        >
          <Ionicons name='arrow-back' size={24} color='#1F2937' />
          <Text className='text-xl font-bold text-gray-900'>
            {i18n.t('common.bookVehicle')}
          </Text>
        </TouchableOpacity>
        <View style={{ width: 40 }} />
      </View>
      <View className='flex-1 bg-gray-50'>
        <ScrollView
          className='flex-1 px-4 py-4'
          contentContainerStyle={{ paddingBottom: 30 }}
          keyboardShouldPersistTaps='handled'
          showsVerticalScrollIndicator={false}
        >
          <View className='mb-6'>
            <Text className='mb-2 text-lg font-bold text-gray-800'>
              {i18n.t('booking.fromLocation')}
            </Text>
            <TouchableOpacity
              className='flex-row items-center px-4 py-4 bg-white rounded-lg border border-gray-200'
              onPress={() => setShowFromMap(true)}
              activeOpacity={0.75}
            >
              <Ionicons name='location-outline' size={20} color='#6D28D9' />
              <Text className='flex-1 ml-2 text-base text-gray-600'>
                {i18n.t('booking.selectFromLocation')}
              </Text>
              <Ionicons name='map' size={18} color='#6D28D9' />
            </TouchableOpacity>

            {showFromMap && (
              <View className='overflow-hidden rounded-xl border border-gray-100'>
                <Modal
                  animationType='slide'
                  transparent={false}
                  visible={!!showFromMap}
                  onRequestClose={() => setShowFromMap(false)}
                  style={styles.container}
                >
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
                      onDragEnd={onMarkerDragEnd}
                      title='Selected Location'
                    />
                  </MapView>
                  <View style={styles.infoBox}>
                    <Text style={styles.label}>Selected Address:</Text>
                    <Text style={styles.address}>
                      {address || 'Move marker to select'}
                    </Text>
                  </View>
                </Modal>
              </View>
            )}
            {/* Modal for selecting "from" location on the map */}
            {/* <Modal
              animationType='slide'
              transparent={false}
              visible={!!showFromMap}
              onRequestClose={() => setShowFromMap(false)}
            >
              <View style={{ flex: 1 }}>
                <MapView
                  onRegionChangeComplete={handleMapChange}
                  onUserLocationChange={(e) => console.log('e', e)}
                  // onLocationSelected={({ coordinates, address }: any) => {
                  //   console.log('coordinates, address', coordinates, address); // setFromCoords(coordinates);
                  //   // setFromAddress(address);
                  //   setShowFromMap(false);
                  // }}
                  onTouchCancel={() => setShowFromMap(false)}
                />
              </View>
            </Modal> */}
          </View>

          <View className='mb-6'>
            <Text className='mb-2 text-lg font-bold text-gray-800'>
              {i18n.t('booking.toLocation')}
            </Text>
            <TouchableOpacity
              className='flex-row items-center px-4 py-4 bg-white rounded-lg border border-gray-200'
              // onPress={selectToLocation}
              activeOpacity={0.75}
            >
              <Ionicons name='flag-outline' size={20} color='#DC2626' />
              <Text className='flex-1 ml-2 text-base text-gray-600'>
                {i18n.t('booking.selectToLocation')}
              </Text>
              <Ionicons name='map' size={18} color='#DC2626' />
            </TouchableOpacity>
            {/* {toCoords && (
              <View className='overflow-hidden mt-3 h-36 rounded-xl border border-gray-100'>
                <GoogleMapViewPreview location={toCoords} />
              </View>
            )} */}
          </View>

          {/* Booking Date */}
          <View className='mb-6'>
            <Text className='mb-2 text-lg font-bold text-gray-800'>
              {i18n.t('booking.bookingDate')}
            </Text>
            <TouchableOpacity
              className='flex-row items-center px-4 py-4 bg-white rounded-lg border border-gray-200'
              // onPress={showBookingDatePicker}
              activeOpacity={0.75}
            >
              <Ionicons name='calendar-outline' size={20} color='#059669' />
              <Text className='ml-2 text-base text-gray-600'>
                {i18n.t('booking.selectBookingDate')}
              </Text>
            </TouchableOpacity>
            {/* {showDatePicker && (
              <DateTimePicker
                value={bookingDate || new Date()}
                mode='datetime'
                is24Hour={true}
                display='default'
                minimumDate={new Date()}
                onChange={handleBookingDateChange}
              />
            )} */}
          </View>

          {/* Truck Type */}
          <View className='mb-6'>
            <Text className='mb-2 text-lg font-bold text-gray-800'>
              {i18n.t('booking.truckType')}
            </Text>
            <Controller
              control={control}
              name='truckType'
              render={({ field: { onChange, value } }) => (
                <View className='flex-row gap-3'>
                  <TouchableOpacity
                    className={`flex-1 flex-row items-center px-4 py-4 rounded-lg border ${
                      value === 'pickup'
                        ? 'border-primary bg-primary/10'
                        : 'border-gray-200 bg-white'
                    }`}
                    onPress={() => onChange('pickup')}
                  >
                    <FontAwesome5
                      name='truck-pickup'
                      size={20}
                      color={value === 'pickup' ? '#7C3AED' : '#1F2937'}
                    />
                    <Text
                      className={`ml-2 text-base font-semibold ${
                        value === 'pickup' ? 'text-primary' : 'text-gray-900'
                      }`}
                    >
                      {i18n.t('vehicles.pickupSmall')}
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    className={`flex-1 flex-row items-center px-4 py-4 rounded-lg border ${
                      value === 'truck'
                        ? 'border-primary bg-primary/10'
                        : 'border-gray-200 bg-white'
                    }`}
                    onPress={() => onChange('truck')}
                  >
                    <FontAwesome5
                      name='truck-moving'
                      size={22}
                      color={value === 'truck' ? '#7C3AED' : '#1F2937'}
                    />
                    <Text
                      className={`ml-2 text-base font-semibold ${
                        value === 'truck' ? 'text-primary' : 'text-gray-900'
                      }`}
                    >
                      {i18n.t('vehicles.truck')}
                    </Text>
                  </TouchableOpacity>
                </View>
              )}
            />
            {errors.truckType && (
              <Text className='mt-2 ml-1 text-sm font-medium text-red-500'>
                {errors.truckType.message}
              </Text>
            )}
          </View>

          {/* Truck Weight */}
          <View className='mb-6'>
            <Text className='mb-2 text-lg font-bold text-gray-800'>
              {i18n.t('booking.truckWeight')}
            </Text>
            <Controller
              control={control}
              name='truckWeight'
              render={({ field: { onChange, value } }) => (
                <View className='overflow-hidden bg-white rounded-xl border-2 border-gray-200'>
                  <Picker
                    selectedValue={value}
                    onValueChange={onChange}
                    style={{ height: 50 }}
                  >
                    {generateTruckWeightOptions().map((opt) => (
                      <Picker.Item
                        key={opt.value}
                        label={opt.label}
                        value={opt.value}
                      />
                    ))}
                  </Picker>
                </View>
              )}
            />
            {errors.truckWeight && (
              <Text className='mt-2 ml-1 text-sm font-medium text-red-500'>
                {errors.truckWeight.message}
              </Text>
            )}
          </View>

          {/* Truck Height */}
          <View className='mb-6'>
            <Text className='mb-2 text-lg font-bold text-gray-800'>
              {i18n.t('booking.truckHeight')}
            </Text>
            <Controller
              control={control}
              name='truckHeight'
              render={({ field: { onChange, value } }) => (
                <View className='overflow-hidden bg-white rounded-xl border-2 border-gray-200'>
                  <Picker
                    selectedValue={value}
                    onValueChange={onChange}
                    style={{ height: 50 }}
                  >
                    {generateHeightOptions().map((opt) => (
                      <Picker.Item
                        key={opt.value}
                        label={opt.label}
                        value={opt.value}
                      />
                    ))}
                  </Picker>
                </View>
              )}
            />
            {errors.truckHeight && (
              <Text className='mt-2 ml-1 text-sm font-medium text-red-500'>
                {errors.truckHeight.message}
              </Text>
            )}
          </View>

          {/* Load Capacity */}
          <View className='mb-6'>
            <Text className='mb-2 text-lg font-bold text-gray-800'>
              {i18n.t('vehicles.loadCapacity')}
            </Text>
            <Controller
              control={control}
              name='loadCapacity'
              render={({ field: { onChange, value } }) => (
                <View className='overflow-hidden bg-white rounded-xl border-2 border-gray-200'>
                  <Picker
                    selectedValue={value}
                    onValueChange={onChange}
                    style={{ height: 50 }}
                  >
                    {generateCapacityOptions().map((opt) => (
                      <Picker.Item
                        key={opt.value}
                        label={opt.label}
                        value={opt.value}
                      />
                    ))}
                  </Picker>
                </View>
              )}
            />
            {errors.loadCapacity && (
              <Text className='mt-2 ml-1 text-sm font-medium text-red-500'>
                {errors.loadCapacity.message}
              </Text>
            )}
          </View>

          {/* Distance and Estimated Price */}
          <View className='flex-row gap-4 mb-6'>
            <View className='flex-1 items-start px-4 py-4 bg-white rounded-xl border-2 border-gray-200'>
              <Text className='text-base font-semibold text-gray-600'>
                {i18n.t('vehicles.kilometer')}
              </Text>
              <Text className='mt-1 text-2xl font-bold text-primary'>
                00 km
              </Text>
            </View>
            <View className='flex-1 items-start px-4 py-4 bg-white rounded-xl border-2 border-gray-200'>
              <Text className='text-base font-semibold text-gray-600'>
                {i18n.t('vehicles.estimatedPrice')}
              </Text>
              <Text className='mt-1 text-2xl font-bold text-green-600'>
                ₹ 00
              </Text>
            </View>
          </View>

          {/* Schedule Pickup Time */}
          <View className='mb-6'>
            <Text className='mb-2 text-lg font-bold text-gray-800'>
              {i18n.t('booking.schedulePickup')}
            </Text>
            <TouchableOpacity
              className='flex-row items-center px-4 py-4 bg-white rounded-lg border border-gray-200'
              // onPress={showPickupDateTimePicker}
              activeOpacity={0.75}
            >
              <MaterialCommunityIcons
                name='clock-outline'
                size={20}
                color='#7C3AED'
              />
              <Text className='ml-2 text-base text-gray-600'>
                {i18n.t('booking.selectPickupTime')}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Optional Referral Code Field */}
          <View className='mb-4'>
            <TouchableOpacity
              className='flex-row items-center'
              onPress={() => setReferralCodeVisible(!referralCodeVisible)}
              activeOpacity={0.7}
            >
              <View
                className={`w-6 h-6 border-2 rounded mr-3 items-center justify-center ${
                  referralCodeVisible
                    ? 'bg-primary border-primary'
                    : 'border-gray-300'
                }`}
              >
                {referralCodeVisible && (
                  <Ionicons name='checkmark' size={16} color='#fff' />
                )}
              </View>
              <Text className='text-base font-semibold text-gray-700'>
                {i18n.t('vehicles.haveReferralCode')}
              </Text>
            </TouchableOpacity>
            {referralCodeVisible && (
              <TextInput
                className='px-4 py-4 mt-3 text-base font-medium bg-white rounded-xl border-2 border-gray-200'
                placeholder={i18n.t('vehicles.referralCode')}
                value={referralCode}
                onChangeText={setReferralCode}
                placeholderTextColor='#9CA3AF'
              />
            )}
          </View>

          <TouchableOpacity
            className='flex-row justify-center items-center py-6 mb-4 rounded-xl shadow-lg bg-primary'
            onPress={handleSubmit(onBookingSubmit)}
            disabled={loading}
            activeOpacity={0.8}
          >
            {loading ? (
              <ActivityIndicator color='#fff' size='small' />
            ) : (
              <>
                <Ionicons
                  name='checkmark-circle-outline'
                  size={22}
                  color='#FFFFFF'
                />
                <Text className='ml-2 text-lg font-bold text-center text-white'>
                  {i18n.t('booking.bookNow')}
                </Text>
              </>
            )}
          </TouchableOpacity>
        </ScrollView>
      </View>
    </SafeAreaView>
  );
};

export default CreateBookingScreen;
