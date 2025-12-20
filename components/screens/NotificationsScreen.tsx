import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { FlatList, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import i18n from '../../i18n/config';
import socketService from '../../services/socket';

interface Notification {
  id: string;
  title: string;
  message: string;
  time: string;
  read: boolean;
  type?: 'booking' | 'vehicle' | 'general';
  data?: any;
}

const NotificationsScreen = () => {
  const [notifications, setNotifications] = useState<Notification[]>([
    {
      id: '1',
      title: 'New Booking',
      message: 'You have a new booking request',
      time: '2 hours ago',
      read: false,
      type: 'booking',
    },
    {
      id: '2',
      title: 'Vehicle Verified',
      message: 'Your vehicle registration has been verified',
      time: '1 day ago',
      read: true,
      type: 'vehicle',
    },
  ]);

  useEffect(() => {
    loadNotifications();

    const handleNewNotification = (data: any) => {
      const newNotification: Notification = {
        id: data.id || Date.now().toString(),
        title: data.title || 'New Notification',
        message: data.message || '',
        time: 'Just now',
        read: false,
        type: data.type,
        data: data.data,
      };
      setNotifications((prev) => [newNotification, ...prev]);
    };

    socketService.on('notification:new', handleNewNotification);

    return () => {
      socketService.off('notification:new', handleNewNotification);
    };
  }, []);

  const loadNotifications = async () => {
    try {
      // const data = await apiService.getNotifications();
      // setNotifications(data);
    } catch (error) {
      console.error('Failed to load notifications:', error);
    }
  };

  const handleNotificationPress = async (item: Notification) => {
    if (!item.read) {
      try {
        // await apiService.markNotificationRead(item.id);
        // setNotifications((prev) =>
        //   prev.map((n) => (n.id === item.id ? { ...n, read: true } : n))
        // );
      } catch (error) {
        console.error('Failed to mark notification as read:', error);
      }
    }

    if (item.type === 'booking' && item.data?.bookingId) {
      router.replace('/(apps)', {
        screen: 'MainTabs',
        params: { screen: 'MyBooking' },
      } as any);
    } else if (item.type === 'vehicle' && item.data?.vehicleId) {
      router.replace('/(apps)', {
        screen: 'MainTabs',
        params: { screen: 'Vehicles' },
      } as any);
    }
  };

  const renderNotification = ({ item }: { item: Notification }) => (
    <TouchableOpacity
      className={`bg-white p-5 mb-3 rounded-xl border-l-4 shadow-md ${
        item.read ? 'border-gray-300' : 'border-primary'
      }`}
      onPress={() => handleNotificationPress(item)}
      activeOpacity={0.8}
    >
      <View className='flex-row justify-between items-start'>
        <View className='flex-1 mr-3'>
          <View className='flex-row items-center mb-2'>
            {item.type === 'booking' && (
              <View className='justify-center items-center mr-3 w-8 h-8 rounded-lg bg-primary-100'>
                <Ionicons name='calendar-outline' size={18} color='#3B82F6' />
              </View>
            )}
            {item.type === 'vehicle' && (
              <View className='justify-center items-center mr-3 w-8 h-8 bg-green-100 rounded-lg'>
                <Ionicons name='car-outline' size={18} color='#10B981' />
              </View>
            )}
            {!item.type && (
              <View className='justify-center items-center mr-3 w-8 h-8 bg-purple-100 rounded-lg'>
                <Ionicons
                  name='notifications-outline'
                  size={18}
                  color='#9333EA'
                />
              </View>
            )}
            <Text className='flex-1 text-base font-bold text-gray-900'>
              {item.title}
            </Text>
          </View>
          <Text className='mb-3 ml-11 text-sm leading-5 text-gray-600'>
            {item.message}
          </Text>
          <View className='flex-row items-center ml-11'>
            <Ionicons name='time-outline' size={14} color='#9CA3AF' />
            <Text className='ml-1 text-xs font-medium text-gray-400'>
              {item.time}
            </Text>
          </View>
        </View>
        {!item.read && (
          <View className='mt-1 w-3 h-3 rounded-full bg-primary' />
        )}
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView className='flex-1 bg-gray-50'>
      <View className='flex-row justify-between items-center px-5 py-4 bg-white border-b border-gray-100 shadow-sm'>
        <TouchableOpacity
          onPress={() => router.push('/(apps)/(tabs)')}
          className='flex-row justify-between items-center p-2 -ml-2'
          activeOpacity={0.7}
        >
          <Ionicons name='arrow-back' size={24} color='#1F2937' />
          <Text className='ml-3 text-xl font-bold text-gray-900'>
            {i18n.t('common.notifications')}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => console.log('clear read all')}
          className='flex-row gap-1 justify-between items-center px-4 py-1 rounded-lg border shadow border-primary'
          activeOpacity={0.7}
        >
          <Ionicons
            name='checkmark-done-sharp'
            size={18}
            className='text-primary'
          />
          <Text className='text-sm font-normal text-primary'>
            {i18n.t('common.markAsReadAll')}
          </Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={notifications}
        renderItem={renderNotification}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: 20 }}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View className='items-center py-16'>
            <Ionicons name='notifications-outline' size={64} color='#D1D5DB' />
            <Text className='mt-4 text-base font-medium text-gray-500'>
              No notifications
            </Text>
          </View>
        }
      />
    </SafeAreaView>
  );
};

export default NotificationsScreen;
