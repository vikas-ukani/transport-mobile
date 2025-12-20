import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { RefreshControl } from 'react-native-gesture-handler';
import { SafeAreaView } from 'react-native-safe-area-context';
import i18n from '../../i18n/config';
import apiService from '../../services/api.service';
import socketService from '../../services/socket';
import PostItems from '../common/PostItem';
import { Post } from './HomeScreen';

const MyPostListScreen = () => {
  const [filterPosts, setFilterPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Load posts on mount
  useEffect(() => {
    loadPosts();

    // Listen for new posts
    const handleNewPost = (data: any) => {
      setFilterPosts((prev) => [data, ...prev]);
    };

    socketService.on('post:new', handleNewPost);

    return () => {
      socketService.off('post:new', handleNewPost);
    };
  }, []);

  const onRefresh = useCallback(() => {
    loadPosts();
  }, []);

  const loadPosts = async () => {
    try {
      setLoading(true);
      const res = await apiService.getMyPosts();
      if (res.success) {
        setFilterPosts(res.data);
      }
    } catch (error: any) {
      // Fallback to mock data
      setFilterPosts([]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView className='flex-1 bg-gray-50'>
      <View className='flex-row justify-between items-center px-5 py-4 bg-white border-b border-gray-100 shadow-sm'>
        <TouchableOpacity
          onPress={() => router.replace('/(apps)/(tabs)')}
          className='flex-row gap-4 justify-start items-center p-2 -ml-2'
          activeOpacity={0.7}
        >
          <Ionicons name='arrow-back' size={24} color='#1F2937' />
          <Text className='text-xl font-bold text-gray-900'>
            {i18n.t('home.title')}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => router.push('/(apps)/post/create')}
          className=''
          activeOpacity={0.8}
        >
          <View className='flex-row gap-1 items-center'>
            <Ionicons name='add-circle-outline' size={24} color='black' />
            <Text className='text-xl font-bold text-black'>
              {i18n.t('home.post')}
            </Text>
          </View>
        </TouchableOpacity>
      </View>

      <ScrollView
        className='flex-1 px-5 py-5'
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {filterPosts && Array.isArray(filterPosts) && filterPosts.length > 0 ? (
          filterPosts.map((post) => (
            <PostItems
              key={post.id}
              item={post}
              refetch={loadPosts}
              accessDelete={true}
              accessEdit={true}
            />
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

export default MyPostListScreen;
