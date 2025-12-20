import { Ionicons } from '@expo/vector-icons';
import { useRoute } from '@react-navigation/native';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import {
  Dimensions,
  Image,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import i18n from '../../i18n/config';

const { width } = Dimensions.get('window');

const PostDetailScreen = () => {
  const { t } = useTranslation();
  const route = useRoute();
  const { post } = (route.params as { post: any }) || { post: null };

  if (!post) {
    return (
      <View className='flex-1 justify-center items-center bg-white'>
        <Ionicons name='alert-circle-outline' size={64} color='#D1D5DB' />
        <Text className='mt-4 text-base font-medium text-gray-500'>
          Post not found
        </Text>
      </View>
    );
  }

  return (
    <View className='flex-1 bg-white'>
      <View className='flex-row items-center px-5 py-4 bg-white border-b border-gray-100 shadow-sm'>
        <TouchableOpacity
          onPress={() => router.push('/(apps)/(tabs)')}
          className='p-2 -ml-2'
          activeOpacity={0.7}
        >
          <Ionicons name='arrow-back' size={24} color='#1F2937' />
        </TouchableOpacity>
        <Text className='ml-3 text-xl font-bold text-gray-900'>
          {i18n.t('post.pageTitle')}
        </Text>
      </View>

      <ScrollView className='flex-1' showsVerticalScrollIndicator={false}>
        {post.images && post.images.length > 0 ? (
          <ScrollView
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            className='bg-gray-100'
          >
            {post.images.map((image: string, index: number) => (
              <Image
                key={index}
                source={{ uri: image }}
                style={{ width, height: 320 }}
                resizeMode='cover'
              />
            ))}
          </ScrollView>
        ) : (
          <View className='justify-center items-center w-full h-64 bg-gray-100'>
            <Ionicons name='image-outline' size={64} color='#D1D5DB' />
            <Text className='mt-3 font-medium text-gray-400'>
              No images available
            </Text>
          </View>
        )}

        <View className='p-6'>
          <Text className='mb-5 text-2xl font-bold leading-7 text-gray-900'>
            {post.title}
          </Text>

          {post.description && (
            <View className='mb-5'>
              <Text className='text-base leading-6 text-gray-700'>
                {post.description}
              </Text>
            </View>
          )}

          <View className='pt-5 space-y-3 border-t border-gray-100'>
            <View className='flex-row items-center'>
              <View className='justify-center items-center mr-3 w-10 h-10 rounded-full bg-primary-100'>
                <Ionicons
                  name='person-circle-outline'
                  size={22}
                  color='#3B82F6'
                />
              </View>
              <View>
                <Text className='text-xs text-gray-500 font-medium mb-0.5'>
                  Posted by
                </Text>
                <Text className='text-base font-semibold text-gray-900'>
                  {post.userName}
                </Text>
              </View>
            </View>
            <View className='flex-row items-center'>
              <View className='justify-center items-center mr-3 w-10 h-10 bg-purple-100 rounded-full'>
                <Ionicons name='calendar-outline' size={22} color='#9333EA' />
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
      </ScrollView>
    </View>
  );
};

export default PostDetailScreen;
