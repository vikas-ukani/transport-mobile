import { FontAwesome5, Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { RefreshControl } from 'react-native-gesture-handler';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useTranslation } from 'react-i18next';
import apiService from '../../services/api.service';


interface Booking {
  id: string;
  bookingDate: string;
  status: string;
  driverNotes?: string;

  // Customer details
  customerId: string;

  driver?: any; // Or a more detailed interface for Driver if available
  driverId?: number;

  // Shipment details
  fromAddress: string;
  fromLatitude?: number;
  fromLongitude?: number;
  toAddress: string;
  toLatitude?: number;
  toLongitude?: number;

  truckType: string;
  bodyType: string;
  truckLength?: string;
  truckHeight?: string;
  loadCapacity?: string;

  // Pricing & Payment
  estimatedKm?: string;
  paymentStatus: string;

  shipment?: any[]; // Or a more detailed interface if you have it

  createdAt: string;
  updatedAt: string;

  driverBookingRequests?: any[]; // Or a more detailed interface if you have it
}

const MyBookingScreen = () => {
  const { t } = useTranslation();


  const [bookings, setBookings] = useState<Booking[] | []>([]);
  const [loading, setLoading] = useState(false);
  // Pagination state
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadBookings();
  }, []);

  const onRefresh = useCallback(() => {
    loadBookings(1, false);
  }, []);

  // Use this to fetch bookings with pagination
  const loadBookings = async (pageNum = 1, append = false) => {
    try {
      if (pageNum === 1) setLoading(true);
      setRefreshing(pageNum === 1 && append === false); // Can be used for PullToRefresh

      const data = await apiService.getMyBookings({ page: pageNum, limit: 10 });
      if (data.success) {
        const newBookings = data.bookings || [];
        setHasMore(newBookings.length >= 10);

        setBookings((prev) =>
          pageNum === 1 || !append ? newBookings : [...prev, ...newBookings]
        );
        setPage(pageNum);
      }
    } catch (error) {
      console.error('Failed to fetch bookings:', error);
      return [];
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Adds infinite scroll/pagination logic for loading more bookings
  const handleLoadMore = () => {
    if (!loading && hasMore) {
      loadBookings(page + 1, true);
    }
  };

  const filteredBookings = [...bookings].sort((a, b) => {
    if (a.status < b.status) return 1;
    if (a.status > b.status) return -1;
    return 0;
  });

  return (
    <SafeAreaView className='flex-1 bg-gray-50'>
      <View className='flex-row justify-between items-center px-5 py-4 bg-white border-b border-gray-100 shadow-sm'>
        <Text className='text-xl font-bold text-gray-900'>
          {t('booking.myBookings')}
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
              {t('booking.title')}
            </Text>
          </View>
        </TouchableOpacity>
      </View>

      <ScrollView
        className='flex-1 px-5 py-5'
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={onRefresh} />
        }
      >
        {filteredBookings.length > 0 ? (
          filteredBookings.map((booking: Booking) => (
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
                      {booking?.fromAddress}
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
                      {booking.toAddress}
                    </Text>
                  </View>
                </View>
                <View
                  className={`px-3 py-1.5 !rounded-lg ${
                    booking.status === 'success'
                      ? 'bg-green-100'
                      : booking.status === 'finished'
                      ? ' !rounded-lg bg-primary/30'
                      : 'bg-yellow-100'
                  }`}
                >
                  <Text
                    className={`text-xs font-bold ${
                      booking.status === 'success'
                        ? 'text-green-700'
                        : booking.status === 'finished'
                        ? 'text-primary'
                        : 'text-yellow-700'
                    }`}
                  >
                    {booking.status.toUpperCase()}
                  </Text>
                </View>
              </View>
              <View className='flex-row gap-2'>
                <View className='pt-4 space-y-2 border-t border-gray-100'>
                  {/* Truck Type */}
                  <View className='flex-row items-center'>
                    <FontAwesome5
                      name={
                        booking.bodyType?.toLowerCase() === 'open'
                          ? 'truck'
                          : booking.bodyType?.toLowerCase() === 'container'
                          ? 'truck-moving'
                          : 'truck-pickup'
                      }
                      size={16}
                      color='#6B7280'
                      style={{ marginRight: 5 }}
                    />
                    <Text className='text-sm font-medium text-gray-600'>
                      {booking.truckType} • {booking.bodyType}
                    </Text>
                  </View>
                  {/* Truck Height */}
                  <View className='flex-row gap-8 items-center mt-3'>
                    <View className='flex-row items-center'>
                      <Ionicons
                        name='resize-outline'
                        size={18}
                        color='#6B7280'
                      />
                      <Text className='ml-2 text-sm font-medium text-gray-600'>
                        {booking.truckHeight
                          ? `${booking.truckHeight} feet`
                          : t('vehicles.notMentioned')}
                      </Text>
                    </View>
                    {/* Truck Width */}
                    <View className='flex-row items-center'>
                      <Ionicons name='resize-sharp' size={18} color='#6B7280' />
                      <Text className='ml-2 text-sm font-medium text-gray-600'>
                        {booking.truckLength
                          ? `${booking.truckLength} feet`
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
                        {booking.estimatedKm}
                      </Text>
                    </View>
                    {/* Load Capacity */}
                    <View className='flex-row items-center'>
                      <Ionicons name='cube-outline' size={18} color='#6B7280' />
                      <Text className='ml-2 text-sm font-medium text-gray-600'>
                        {booking.loadCapacity
                          ? `${booking.loadCapacity} kg`
                          : t('vehicles.unknownLoadCapacity')}
                      </Text>
                    </View>
                  </View>
                </View>
                <View className='flex-row items-center mt-3'>
                  <Text className='text-base font-semibold text-gray-600'>
                    {t('vehicles.estimatedKilometer')}
                  </Text>
                  <Text className='mt-1 text-2xl font-bold text-primary'>
                    {booking.estimatedKm}
                  </Text>
                </View>
              </View>
            </View>
          ))
        ) : (
          <View className='items-center py-16'>
            <Ionicons name='document-text-outline' size={64} color='#D1D5DB' />
            <Text className='mt-4 text-base font-medium text-gray-500'>
              {t('booking.noBookings')}
            </Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

export default MyBookingScreen;
