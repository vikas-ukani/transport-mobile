import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useTranslation } from 'react-i18next';
import { RefreshControl, ScrollView } from 'react-native-gesture-handler';
import apiService from '../../services/api.service';

interface Notification {
  id: string;
  userId: string;
  title: string;
  message: string;
  payload: any;
  type?: 'booking' | 'vehicle' | 'general';
  isRead: boolean;
  data?: any;
  createdAt: string;
  updatedAt: string;
}

const NotificationsScreen = () => {
  const { t } = useTranslation();
  const [notifications, setNotifications] = useState<Notification[]>();

  // Use pagination when loading notifications
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadNotifications();

    // const handleNewNotification = (data: any) => {
    //   const newNotification: Notification = {
    //     id: data.id || Date.now().toString(),
    //     title: data.title || 'New Notification',
    //     message: data.message || '',
    //     read: false,
    //     type: data.type,
    //     data: data.data,
    //   };
    //   setNotifications((prev) => [newNotification, ...prev]);
    // };

    // socketService.on('notification:new', handleNewNotification);

    return () => {
      // socketService.off('notification:new', handleNewNotification);
    };
  }, []);

  const onRefresh = useCallback(() => {
    loadNotifications();
  }, []);

  const loadNotifications = async (nextPage = 1) => {
    try {
      setLoading(true);
      if (nextPage === 1) {
        setHasMore(true);
      }
      const res = await apiService.getNotifications(nextPage);
      if (res && res.success) {
        const data: Notification[] = res.notifications || res.data || [];
        if (nextPage === 1) {
          setNotifications(data);
        } else {
          setNotifications((prev) => (prev ? [...prev, ...data] : data));
        }
        // Decide if more data is available
        if (
          !data.length ||
          (res.total && nextPage * (res.limit || 20) >= res.total)
        ) {
          setHasMore(false);
        } else if (data.length < (res.limit || 20)) {
          setHasMore(false);
        } else {
          setHasMore(true);
        }
        setPage(nextPage);
      } else {
        if (nextPage === 1) setNotifications([]);
        setHasMore(false);
      }
    } catch (error) {
      if (nextPage === 1) setNotifications([]);
      setHasMore(false);
      console.error('Failed to load notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleNotificationPress = async (item: Notification) => {
    if (!item.isRead) {
      try {
        await apiService.markNotificationRead(item.id);
        setNotifications((prev) =>
          prev?.map((n) => (n.id === item.id ? { ...n, isRead: true } : n))
        );
      } catch (error) {
        console.error('Failed to mark notification as read:', error);
      }
    }

    // if (item.type === 'booking' && item.data?.bookingId) {
    //   router.replace('/(apps)', {
    //     screen: 'MainTabs',
    //     params: { screen: 'MyBooking' },
    //   } as any);
    // } else if (item.type === 'vehicle' && item.data?.vehicleId) {
    //   router.replace('/(apps)', {
    //     screen: 'MainTabs',
    //     params: { screen: 'Vehicles' },
    //   } as any);
    // }
  };

  const markAllRead = async () => {
    try {
      setLoading(true);
      // Call the API endpoint to mark all notifications as read
      await apiService.markAllNotificationsRead?.();
      // Optimistically update local state
      setNotifications((prev) => prev?.map((n) => ({ ...n, isRead: true })));
      // Optionally refresh notifications to sync with server (optional)
      // await loadNotifications(1);
    } catch (error) {
      console.error('Failed to mark all notifications as read:', error);
    } finally {
      setLoading(false);
    }
  };

  const renderNotification = ({ item }: { item: Notification }) => (
    <TouchableOpacity
      key={item.id}
      className={`bg-white p-5 mb-3 rounded-xl border-l-4 shadow-md ${
        item.isRead ? 'border-gray-300' : 'border-primary'
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
              {item.createdAt
                ? (() => {
                    const d = Math.floor(
                      (Date.now() - new Date(item.createdAt).getTime()) / 1000
                    );
                    if (d < 60) return `${d} seconds ago`;
                    if (d < 3600) return `${Math.floor(d / 60)} minutes ago`;
                    if (d < 86400) return `${Math.floor(d / 3600)} hours ago`;
                    return `${Math.floor(d / 86400)} days ago`;
                  })()
                : ''}
            </Text>
          </View>
        </View>
        {!item.isRead && (
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
            {t('common.notifications')}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => markAllRead()}
          className='flex-row gap-1 justify-between items-center px-4 py-1 rounded-lg border border-primary'
          activeOpacity={0.7}
        >
          <Ionicons
            name='checkmark-done-sharp'
            size={18}
            className='!text-primary'
          />
          <Text className='text-sm font-normal text-primary'>
            {t('common.markAsReadAll')}
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        className='flex-1 px-5 py-5'
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={onRefresh} />
        }
      >
        {notifications && notifications?.length > 0 ? (
          notifications?.map((notification) =>
            renderNotification({ item: notification })
          )
        ) : (
          <View className='items-center py-16'>
            <Ionicons name='notifications-outline' size={64} color='#D1D5DB' />
            <Text className='mt-4 text-base font-medium text-gray-500'>
              No notifications
            </Text>
          </View>
        )}
        {/* <FlatList
          data={notifications}
          renderItem={renderNotification}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ padding: 20 }}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View className='items-center py-16'>
              <Ionicons
                name='notifications-outline'
                size={64}
                color='#D1D5DB'
              />
              <Text className='mt-4 text-base font-medium text-gray-500'>
                No notifications
              </Text>
            </View>
          }
        /> */}
      </ScrollView>
    </SafeAreaView>
  );
};

export default NotificationsScreen;
