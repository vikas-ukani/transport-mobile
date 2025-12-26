import { toast } from '@backpackapp-io/react-native-toast';
import { FontAwesome5, Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Image, Text, TouchableOpacity, View } from 'react-native';
import { RefreshControl, ScrollView } from 'react-native-gesture-handler';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as yup from 'yup';
import { useAuth } from '../../context/AuthContext';

import { useTranslation } from 'react-i18next';
import apiService, { getBaseUrl } from '../../services/api.service';
import ConfirmPopup from '../common/ConfirmPopup';

const schema = yup.object().shape({
  driverName: yup.string().required('Driver Name is required'),
  mobileNumber: yup.string().required('Driver mobile is required'),
  rcNumber: yup.string().required('RC Book number is required'),
  truckType: yup.string().required('Truck type is required'),
  bodyType: yup.string().required('Body type is required'),
  truckLength: yup.string().required('Truck length is required'),
  loadCapacity: yup.string().required('Load capacity is required'),
  truckHeight: yup.string().required('Truck height is required'),
});

interface Vehicle {
  id: string;
  rcNumber: string;
  truckType: string;
  bodyType: string;
  truckLength: string;
  loadCapacity: string;
  truckHeight: string;
  rcPhoto: string;
  rating: number;
  travelled: string;
  status: 'verified' | 'pending';
  createdAt: string;
}

const MyVehiclesScreen = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [showConfirmDelete, setShowConfirmDelete] = useState(null);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);

  useEffect(() => {
    fetchVehicles();
  }, []);

  const onRefresh = useCallback(() => {
    fetchVehicles();
  }, []);

  // Function to fetch all vehicles using the getVehicles API service
  const fetchVehicles = async () => {
    try {
      setLoading(true);
      const data = await apiService.getVehicles();
      if (data.success) {
        setVehicles(data.vehicles); // Assuming the API returns a 'vehicles' array
      }
    } catch (error) {
      console.error('Failed to fetch vehicles:', error);
      return [];
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (vehicleId: string) => {
    try {
      setLoading(true);
      const data = await apiService.deleteVehicle(vehicleId);
      if (data.success) {
        toast.success(t('vehicles.vehicleDeleted'));
        // Refresh the vehicle list after deletion
        fetchVehicles();
      }
    } catch (error) {
      console.error('Failed to delete vehicle:', error);
    } finally {
      setLoading(false);
      setShowConfirmDelete(null);
    }
  };

  const renderVehicleItem = ({ item }: { item: any }) => (
    <View
      key={item.id}
      className='p-5 mb-4 bg-white rounded-xl border border-gray-100 shadow-md'
    >
      <View className='flex-row'>
        {item.images && item.images.length > 0 && (
          <Image
            source={{
              uri: item.images ? getBaseUrl() + item.images[0].url : '',
            }}
            className='mr-4 w-28 h-28 rounded-xl'
          />
        )}
        <View className='flex-1'>
          <View className='flex-row justify-between items-start mb-3'>
            <View className='flex-1'>
              <Text className='mb-2 text-base font-bold text-gray-900'>
                RC: {item.rcNumber}
              </Text>

              {/* Truck Type */}
              <View className='flex-row items-center'>
                <FontAwesome5
                  name={
                    item.bodyType?.toLowerCase() === 'open'
                      ? 'truck'
                      : item.bodyType?.toLowerCase() === 'container'
                      ? 'truck-moving'
                      : 'truck-pickup'
                  }
                  size={16}
                  color='#6B7280'
                  style={{ marginRight: 5 }}
                />
                <Text className='text-sm font-medium text-gray-600'>
                  {item.truckType} • {item.bodyType}
                </Text>
              </View>
              {/* Truck Height */}
              <View className='flex-row gap-8 items-center mt-3'>
                <View className='flex-row items-center'>
                  <Ionicons name='resize-outline' size={18} color='#6B7280' />
                  <Text className='ml-2 text-sm font-medium text-gray-600'>
                    {item.truckHeight
                      ? `${item.truckHeight} feet`
                      : t('vehicles.notMentioned')}
                  </Text>
                </View>
                {/* Truck Width */}
                <View className='flex-row items-center'>
                  <Ionicons name='resize-sharp' size={18} color='#6B7280' />
                  <Text className='ml-2 text-sm font-medium text-gray-600'>
                    {item.truckLength
                      ? `${item.truckLength} feet`
                      : t('vehicles.notMentioned')}
                  </Text>
                </View>
              </View>
              <View className='flex-row gap-8 items-center mt-3'>
                {/* Traveled Distance */}
                <View className='flex-row items-center'>
                  <Ionicons
                    name='speedometer-outline'
                    size={18}
                    color='#6B7280'
                  />
                  <Text className='ml-2 text-sm font-medium text-gray-600'>
                    {item.traveledInKM}
                  </Text>
                </View>
                {/* Load Capacity */}
                <View className='flex-row items-center'>
                  <Ionicons name='cube-outline' size={18} color='#6B7280' />
                  <Text className='ml-2 text-sm font-medium text-gray-600'>
                    {item.loadCapacity
                      ? `${item.loadCapacity} kg`
                      : t('vehicles.unknownLoadCapacity')}
                  </Text>
                </View>
              </View>
            </View>
            <View className='flex-col gap-4 justify-start items-end h-full'>
              <View
                className={`px-3 py-1.5 rounded-lg ml-2 ${
                  item.status === 'verified' ? 'bg-green-100' : 'bg-yellow-100'
                }`}
              >
                <Text
                  className={`text-xs font-bold ${
                    item.status === 'verified'
                      ? 'text-green-700'
                      : 'text-yellow-700'
                  }`}
                >
                  {item.status === 'verified'
                    ? t('vehicles.verified')
                    : t('vehicles.pending')}
                </Text>
              </View>
              <View className='flex-col gap-2'>
                {item.status !== 'verified' && item.status !== 'completed' && (
                  <TouchableOpacity
                    className='p-2 bg-purple-50 rounded-full'
                    onPress={() => {
                      router.push(`/(apps)/vehicle/${item.id}`);
                      // Implement your edit logic here (e.g., open edit modal/page)
                      // Example: router.push(`/edit-vehicle/${item.id}`)
                    }}
                    activeOpacity={0.8}
                    accessibilityLabel='Edit vehicle'
                  >
                    <Ionicons
                      name='create-outline'
                      size={20}
                      className='text-primary'
                    />
                  </TouchableOpacity>
                )}
                <TouchableOpacity
                  className='p-2 bg-red-50 rounded-full'
                  onPress={() => setShowConfirmDelete(item.id)}
                  activeOpacity={0.8}
                  accessibilityLabel='Delete vehicle'
                >
                  <Ionicons name='trash-outline' size={20} color='#EF4444' />
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>
      </View>
    </View>
  );

  return (
    <SafeAreaView className='flex-1 bg-gray-50'>
      <ConfirmPopup
        loading={loading}
        show={showConfirmDelete !== null}
        onCancel={() => setShowConfirmDelete(null)}
        onConfirm={() => handleDelete(showConfirmDelete!)}
        title='Delete?'
        subTitle='Are you sure you want to delete?'
      />
      <View className='flex-row items-center px-5 py-4 bg-white border-b border-gray-100 shadow-sm'>
        <TouchableOpacity
          className='flex-row gap-4 justify-start items-center p-2 -ml-2'
          activeOpacity={0.7}
        >
          <Text className='text-xl font-bold text-gray-900'>
            {t('vehicles.myVehicles')}
          </Text>
        </TouchableOpacity>

        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        className='flex-1'
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={onRefresh} />
        }
      >
        {vehicles.length > 0 ? (
          vehicles.map((vehicle) => renderVehicleItem({ item: vehicle }))
        ) : (
          <View className='items-center py-16' key={`no-vehicles`}>
            <Ionicons name='car-outline' size={64} color='#D1D5DB' />
            <Text className='mt-4 text-base font-medium text-gray-500'>
              {t('vehicles.noVehicles')}
            </Text>
          </View>
        )}
      </ScrollView>
      {/* New Add Vehicle Form */}
      <View className='px-5 py-5 bg-white border-b border-gray-100 shadow-md'>
        <TouchableOpacity
          className='py-4 rounded-xl shadow-md bg-primary'
          onPress={() => router.push('/(apps)/vehicle/new-vehicle')}
          activeOpacity={0.8}
        >
          <View className='flex-row justify-center items-center'>
            <Ionicons name='add-circle-outline' size={22} color='#FFFFFF' />
            <Text className='ml-2 text-base font-bold text-center text-white'>
              {t('vehicles.addVehicle')}
            </Text>
          </View>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

export default MyVehiclesScreen;
