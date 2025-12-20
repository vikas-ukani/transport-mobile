import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useState } from 'react';
import { ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import i18n from '../../i18n/config';

// {
//   id: Date.now().toString(),
//   fromLocation: 'Mock From Location',
//   toLocation: 'Mock To Location',
//   materialType: 'Mock Material',
//   truckType: 'Mock Truck',
//   materialWeight: '1.0',
//   truckLength: '10',
//   truckHeight: '5',
//   status: 'completed',
//   createdAt: new Date().toISOString(),
// },
// {
//   id: Date.now().toString(),
//   fromLocation: 'Mock From Location',
//   toLocation: 'Mock To Location',
//   materialType: 'Mock Material',
//   truckType: 'Mock Truck',
//   materialWeight: '1.0',
//   truckLength: '10',
//   truckHeight: '5',
//   status: 'completed',
//   createdAt: new Date().toISOString(),
// },
// {
//   id: Date.now().toString(),
//   fromLocation: 'Mock From Location',
//   toLocation: 'Mock To Location',
//   materialType: 'Mock Material',
//   truckType: 'Mock Truck',
//   materialWeight: '1.0',
//   truckLength: '10',
//   truckHeight: '5',
//   status: 'completed',
//   createdAt: new Date().toISOString(),
// },
// {
//   id: Date.now().toString(),
//   fromLocation: 'Mock From Location',
//   toLocation: 'Mock To Location',
//   materialType: 'Mock Material',
//   truckType: 'Mock Truck',
//   materialWeight: '1.0',
//   truckLength: '10',
//   truckHeight: '5',
//   status: 'completed',
//   createdAt: new Date().toISOString(),
// },
// {
//   id: Date.now().toString(),
//   fromLocation: 'Mock From Location',
//   toLocation: 'Mock To Location',
//   materialType: 'Mock Material',
//   truckType: 'Mock Truck',
//   materialWeight: '1.0',
//   truckLength: '10',
//   truckHeight: '5',
//   status: 'completed',
//   createdAt: new Date().toISOString(),
// },
// {
//   id: Date.now().toString(),
//   fromLocation: 'Mock From Location',
//   toLocation: 'Mock To Location',
//   materialType: 'Mock Material',
//   truckType: 'Mock Truck',
//   materialWeight: '1.0',
//   truckLength: '10',
//   truckHeight: '5',
//   status: 'completed',
//   createdAt: new Date().toISOString(),
// },
// {
//   id: Date.now().toString(),
//   fromLocation: 'Mock From Location',
//   toLocation: 'Mock To Location',
//   materialType: 'Mock Material',
//   truckType: 'Mock Truck',
//   materialWeight: '1.0',
//   truckLength: '10',
//   truckHeight: '5',
//   status: 'completed',
//   createdAt: new Date().toISOString(),
// },
// {
//   id: Date.now().toString(),
//   fromLocation: 'Mock From Location',
//   toLocation: 'Mock To Location',
//   materialType: 'Mock Material',
//   truckType: 'Mock Truck',
//   materialWeight: '1.0',
//   truckLength: '10',
//   truckHeight: '5',
//   status: 'completed',
//   createdAt: new Date().toISOString(),
// },
// {
//   id: Date.now().toString(),
//   fromLocation: 'Mock From Location',
//   toLocation: 'Mock To Location',
//   materialType: 'Mock Material',
//   truckType: 'Mock Truck',
//   materialWeight: '1.0',
//   truckLength: '10',
//   truckHeight: '5',
//   status: 'completed',
//   createdAt: new Date().toISOString(),
// },
// {
//   id: Date.now().toString(),
//   fromLocation: 'Mock From Location',
//   toLocation: 'Mock To Location',
//   materialType: 'Mock Material',
//   truckType: 'Mock Truck',
//   materialWeight: '1.0',
//   truckLength: '10',
//   truckHeight: '5',
//   status: 'completed',
//   createdAt: new Date().toISOString(),
// },
// {
//   id: Date.now().toString(),
//   fromLocation: 'Mock From Location',
//   toLocation: 'Mock To Location',
//   materialType: 'Mock Material',
//   truckType: 'Mock Truck',
//   materialWeight: '1.0',
//   truckLength: '10',
//   truckHeight: '5',
//   status: 'completed',
//   createdAt: new Date().toISOString(),
// },
// {
//   id: Date.now().toString(),
//   fromLocation: 'Mock From Location',
//   toLocation: 'Mock To Location',
//   materialType: 'Mock Material',
//   truckType: 'Mock Truck',
//   materialWeight: '1.0',
//   truckLength: '10',
//   truckHeight: '5',
//   status: 'completed',
//   createdAt: new Date().toISOString(),
// },
// {
//   id: '2',
//   fromLocation: 'Mock From Location',
//   toLocation: 'Mock To Location',
//   materialType: 'Mock Material',
//   truckType: 'Mock Truck',
//   materialWeight: '1.0',
//   truckLength: '10',
//   truckHeight: '5',
//   status: 'pending',
//   createdAt: new Date().toISOString(),
// },
// {
//   id: '3',
//   fromLocation: 'Mock From Location',
//   toLocation: 'Mock To Location',
//   materialType: 'Mock Material',
//   truckType: 'Mock Truck',
//   materialWeight: '1.0',
//   truckLength: '10',
//   truckHeight: '5',
//   status: 'pending',
//   createdAt: new Date().toISOString(),
// },
interface Booking {
  id: string;
  fromLocation: string;
  toLocation: string;
  materialType: string;
  truckType: string;
  materialWeight: string;
  truckLength: string;
  truckHeight: string;
  status: 'pending' | 'confirmed' | 'completed';
  createdAt: string;
}

const MyBookingScreen = () => {
  const [bookings, setBookings] = useState<Booking[] | []>([]);
  const [loading, setLoading] = useState(false);

  // React.useEffect(() => {
  //   if (activeTab === 'myBookings' || activeTab === 'history') {
  // loadBookings();
  //   }
  // }, [activeTab]);

  // const loadBookings = async () => {
  //   try {
  //     if (activeTab === 'history') {
  //       const data = await apiService.getBookingHistory();
  //       setBookings(data);
  //     } else {
  //       const data = await apiService.getBookings();
  //       setBookings(data);
  //     }
  //   } catch (error) {
  //     console.error('Failed to load bookings:', error);
  //   }
  // };

  // React.useEffect(() => {
  //   const handleBookingUpdate = (data: any) => {
  //     setBookings((prev) =>
  //       prev.map((booking) =>
  //         booking.id === data.bookingId
  //           ? { ...booking, ...data.updates }
  //           : booking
  //       )
  //     );
  //   };

  //   socketService.on('booking:updated', handleBookingUpdate);
  //   socketService.on('booking:matched', handleBookingUpdate);

  //   return () => {
  //     socketService.off('booking:updated', handleBookingUpdate);
  //     socketService.off('booking:matched', handleBookingUpdate);
  //   };
  // }, []);

  const filteredBookings = [...bookings].sort((a, b) => {
    if (a.status < b.status) return 1;
    if (a.status > b.status) return -1;
    return 0;
  });

  return (
    <SafeAreaView className='flex-1 bg-gray-50'>
      <View className='flex-row justify-between items-center px-5 py-4 bg-white border-b border-gray-100 shadow-sm'>
        <Text className='text-xl font-bold text-gray-900'>
          {i18n.t('booking.myBookings')}
        </Text>

        <TouchableOpacity
          className=''
          activeOpacity={0.8}
          onPress={() =>
            router.push('/(apps)/book-vehicle', {
              screen: 'MainTabs',
              params: { screen: 'CreateBookVehicle' },
            } as any)
          }
        >
          <View
            className={`flex-row p-2 px-8 items-center !text-white gap-3 rounded-xl shadow-md bg-primary`}
          >
            <Ionicons name='add-circle-outline' size={22} color='white' />
            <Text className='text-lg font-semibold !text-white'>
              {i18n.t('booking.title')}
            </Text>
          </View>
        </TouchableOpacity>
      </View>
      <ScrollView
        className='flex-1 px-5 py-5'
        showsVerticalScrollIndicator={false}
      >
        {filteredBookings.length > 0 ? (
          filteredBookings.map((booking) => (
            <View
              key={`booking-${booking.id}-${booking.createdAt ?? ''}`}
              className='p-5 mb-4 bg-white rounded-xl border border-gray-100 shadow-md'
            >
              <View className='flex-row justify-between items-start mb-4'>
                <View className='flex-1 mr-3'>
                  <View className='flex-row items-center mb-2'>
                    <Ionicons
                      name='location'
                      size={18}
                      className='!text-primary'
                    />
                    <Text
                      className='ml-2 text-base font-bold text-gray-900'
                      numberOfLines={1}
                    >
                      {booking.fromLocation}
                    </Text>
                  </View>
                  <View className='flex-row items-center'>
                    <Ionicons
                      name='location'
                      size={18}
                      className='!text-primaryLight/50'
                    />
                    <Text
                      className='ml-2 text-base font-bold text-gray-900'
                      numberOfLines={1}
                    >
                      {booking.toLocation}
                    </Text>
                  </View>
                </View>
                <View
                  className={`px-3 py-1.5 rounded-lg ${
                    booking.status === 'confirmed'
                      ? 'bg-green-100'
                      : booking.status === 'completed'
                      ? 'bg-primary-100'
                      : 'bg-yellow-100'
                  }`}
                >
                  <Text
                    className={`text-xs font-bold ${
                      booking.status === 'confirmed'
                        ? 'text-green-700'
                        : booking.status === 'completed'
                        ? 'text-primary'
                        : 'text-yellow-700'
                    }`}
                  >
                    {booking.status.toUpperCase()}
                  </Text>
                </View>
              </View>
              <View className='pt-4 space-y-2 border-t border-gray-100'>
                <View className='flex-row items-center'>
                  <Ionicons name='cube-outline' size={16} color='#6B7280' />
                  <Text className='ml-2 text-sm font-medium text-gray-600'>
                    {i18n.t('booking.materialType')}:{' '}
                    <Text className='font-semibold text-gray-900'>
                      {booking.materialType}
                    </Text>
                  </Text>
                </View>
                <View className='flex-row items-center'>
                  <Ionicons name='car-outline' size={16} color='#6B7280' />
                  <Text className='ml-2 text-sm font-medium text-gray-600'>
                    {i18n.t('booking.truckType')}:{' '}
                    <Text className='font-semibold text-gray-900'>
                      {booking.truckType}
                    </Text>
                  </Text>
                </View>
                <View className='flex-row items-center'>
                  <Ionicons name='scale-outline' size={16} color='#6B7280' />
                  <Text className='ml-2 text-sm font-medium text-gray-600'>
                    {i18n.t('booking.materialWeight')}:{' '}
                    <Text className='font-semibold text-gray-900'>
                      {booking.materialWeight}
                    </Text>
                  </Text>
                </View>
              </View>
            </View>
          ))
        ) : (
          <View className='items-center py-16'>
            <Ionicons name='document-text-outline' size={64} color='#D1D5DB' />
            <Text className='mt-4 text-base font-medium text-gray-500'>
              {i18n.t('booking.noBookings')}
            </Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

export default MyBookingScreen;
