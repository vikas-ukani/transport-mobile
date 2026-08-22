import { toast } from '@/lib/toast';
import { Ionicons } from '@expo/vector-icons';
import { router, useGlobalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  Image,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Swiper from 'react-native-swiper';
import { useAuth } from '../../context/AuthContext';
import apiService, { getBaseUrl } from '../../services/api.service';
import { Post } from './HomeScreen';

const PostDetailScreen = () => {
  const { user } = useAuth();
  const { post: postId } = useGlobalSearchParams();
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [post, setPost] = useState<Post | null>(null);

  useEffect(() => {
    if (postId) {
      fetchPostDetails();
    }
  }, [postId]);

  const fetchPostDetails = async () => {
    // Call fetch detail api by post id
    // e.g., apiService.getPostDetail or similar (actual service must be imported elsewhere)

    // Example:
    try {
      setLoading(true);
      const res = await apiService.getPostById(postId as string);
      if (res?.success) {
        setPost(res.data);
      } else {
        toast.error(res.message || 'Failed to fetch post details');
      }
    } catch (error: any) {
      toast.error('Failed to fetch post details:', error.mesage);
      console.error('Failed to fetch post details:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView className='flex-1 bg-screen'>
      <View className='flex-row justify-between items-center px-5 py-4 bg-white border-b border-gray-100 shadow-sm'>
        <TouchableOpacity
          onPress={() => router.push('/(apps)/(tabs)')}
          className='p-2 -ml-2'
          activeOpacity={0.7}
        >
          <Ionicons name='arrow-back' size={24} color='#1F2937' />
        </TouchableOpacity>
        <Text className='ml-3 text-xl font-bold text-gray-900'>
          {t('post.pageTitle')}
        </Text>

        {post && post.userId && user && post.userId === user.id && (
          <TouchableOpacity
            className='flex-row items-center px-4 py-2 ml-3 rounded-lg bg-primary'
            activeOpacity={0.8}
            onPress={() => router.push(`/(apps)/post/edit/${post.id}`)}
          >
            <Ionicons name='create-outline' size={18} color='#fff' />
            <Text className='ml-2 text-base font-semibold text-white'>
              {t('common.updatePost')}
            </Text>
          </TouchableOpacity>
        )}
      </View>

      <ScrollView className='flex-1' showsVerticalScrollIndicator={false}>
        {loading ? (
          <View className='justify-center items-center py-24'>
            <ActivityIndicator size='large' color='#3B82F6' />
            <Text className='mt-4 text-base text-gray-400'>
              {t('common.loading')}
            </Text>
          </View>
        ) : (
          <View>
            {post === null ? (
              <View className='flex-1 justify-center items-center bg-white'>
                <Ionicons
                  name='alert-circle-outline'
                  size={64}
                  color='#D1D5DB'
                />
                <Text className='mt-4 text-base font-medium text-gray-500'>
                  Post not found
                </Text>
              </View>
            ) : (
              <>
                <View>
                  <Swiper
                    showsButtons={false}
                    className='!w-full !h-[35rem]'
                    horizontal
                    loop={post?.images && post?.images.length > 1}
                    dotStyle={{
                      backgroundColor: '#E5E7EB',
                      width: 8,
                      height: 8,
                      borderRadius: 4,
                      margin: 2,
                    }}
                    activeDotStyle={{
                      backgroundColor: '#9333EA',
                      width: 10,
                      height: 10,
                      borderRadius: 5,
                      margin: 2,
                    }}
                    screenReaderFocusable
                  >
                    {post?.images &&
                      post?.images.map((img: any, idx: number) => (
                        <View
                          key={idx}
                          className='!object-cover flex-row items-center !w-full !h-full bg-gray-100 '
                        >
                          <Image
                            source={{ uri: `${getBaseUrl()}${img.url}` }}
                            className='!w-full !h-full'
                            resizeMode='stretch'
                          />
                        </View>
                      ))}
                  </Swiper>
                </View>

                <View className='p-6'>
                  <Text className='mb-5 text-2xl font-bold leading-7 text-gray-900'>
                    {post.title}
                  </Text>

                  {post.content && (
                    <View className='mb-5'>
                      <Text className='text-base leading-6 text-gray-700'>
                        {post.content}
                      </Text>
                    </View>
                  )}

                  <View className='pt-5 space-y-3 border-t border-gray-200'>
                    <View className='flex-row justify-between items-center'>
                      <View className='flex-row items-center'>
                        <View className='justify-center items-center mr-3 w-10 h-10 rounded-full bg-primary-100'>
                          <Ionicons
                            name='person-circle-outline'
                            size={30}
                            className='!text-primary'
                          />
                        </View>
                        <View>
                          <Text className='text-xs text-gray-500 font-medium mb-0.5'>
                            Posted by
                          </Text>
                          <Text className='text-base font-semibold text-gray-900'>
                            {post?.user?.name}
                          </Text>
                        </View>
                      </View>
                      <View className='flex-row items-center mt-4'>
                        <View className='justify-center items-center mr-3 w-10 h-10 rounded-full'>
                          <Ionicons
                            name='heart-outline'
                            size={24}
                            className='!text-red-500'
                          />
                        </View>
                        <View>
                          <Text className='text-base font-semibold text-gray-900'>
                            {post.likes?.length ?? 0}
                          </Text>
                        </View>
                      </View>
                    </View>
                    <View className='flex-row items-center mt-4'>
                      <View className='justify-center items-center mr-3 w-10 h-10 rounded-full'>
                        <Ionicons
                          name='calendar-outline'
                          size={24}
                          className='!text-purple-500'
                        />
                      </View>
                      <View>
                        <Text className='text-xs text-gray-500 font-medium mb-0.5'>
                          Posted on
                        </Text>
                        <Text className='text-base font-semibold text-gray-900'>
                          {post.createdAt}
                        </Text>
                      </View>
                    </View>
                  </View>
                </View>
              </>
            )}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

export default PostDetailScreen;
