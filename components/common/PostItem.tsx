import { toast } from '@backpackapp-io/react-native-toast';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Image, Text, TouchableOpacity, View } from 'react-native';
import Swiper from 'react-native-swiper';
import { useAuth } from '../../context/AuthContext';
import i18n from '../../i18n/config';
import apiService, { getBaseUrl } from '../../services/api.service';
import { Post } from '../screens/HomeScreen';

const PostItems = ({
  item,
  refetch,
  accessEdit = false,
  accessDelete = false,
}: {
  item: Post;
  refetch: () => void;
  accessEdit: boolean;
  accessDelete: boolean;
}) => {
  const { user } = useAuth();

  const handleDelete = async (postId: string) => {
    try {
      const res = await apiService.deletePost(postId);
      if (res.success) {
        // Optionally show a success message or update the UI
        toast.success(res.message || 'Post deleted successfully');
        refetch?.();
      }
    } catch (error) {
      console.error('Failed to delete post:', error);
    }
  };

  const handleLikePost = async (postId: string) => {
    try {
      const res = await apiService.likePost(postId);
      if (res.success) {
        toast.success(res.message || 'Post liked successfully');
        refetch?.();
      }
    } catch (error) {
      console.error('Failed to like post:', error);
    }
  };

  return (
    <View
      key={item.id}
      className='overflow-hidden !relative mb-4 bg-white rounded-xl border-2 border-gray-100 shadow'
    >
      <View className='absolute top-2 right-2 z-10 flex-col gap-4'>
        {accessEdit && (
          <TouchableOpacity
            className='p-1.5 bg-purple-50 rounded-full border'
            onPress={() => {
              router.push(`/(apps)/post/edit/${item.id}`);
            }}
            activeOpacity={0.8}
            accessibilityLabel='Edit vehicle'
          >
            <Ionicons
              name='create-outline'
              size={18}
              className='text-primary'
            />
          </TouchableOpacity>
        )}
        {accessDelete && (
          <TouchableOpacity
            className=' bg-red-500 rounded-full p-1.5 shadow-lg '
            onPress={() => handleDelete(item.id)}
            activeOpacity={0.8}
          >
            <Ionicons name='close' size={18} color='#fff' />
          </TouchableOpacity>
        )}
      </View>
      <View>
        <Swiper
          showsButtons={false}
          className='!w-full !h-96'
          horizontal
          loop={item?.images && item?.images.length > 1}
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
          {item?.images &&
            item?.images.map((img: any, idx: number) => (
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
      <View className='p-4'>
        <View className='flex-row justify-between items-center'>
          <View className='flex-row gap-2 justify-between items-center w-full'>
            <TouchableOpacity
              onPress={() =>
                router.push({
                  pathname: `/(apps)/post/[post]`,
                  params: { post: item.id },
                })
              }
              activeOpacity={0.8}
            >
              <Text className='mb-2 text-lg font-bold leading-6 text-gray-900'>
                {item.title}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              className='flex-row gap-1 items-center ml-2'
              onPress={() => handleLikePost(item.id)} // Optional: add onPress for liking post
              activeOpacity={0.7}
            >
              <Text>{i18n.t('common.like')}</Text>
              {item.likes.includes(user?.id || '') ? (
                <Ionicons name='heart-sharp' size={22} color='#EF4444' />
              ) : (
                <Ionicons name='heart-outline' size={22} color='#EF4444' />
              )}
            </TouchableOpacity>
          </View>
        </View>
        <View className='flex-row justify-between items-center'>
          <View className='flex-row items-center'>
            <Ionicons name='person-circle-outline' size={20} color='#6B7280' />
            <Text className='ml-1 text-sm font-medium text-gray-600'>
              {item.user?.name ?? 'Admin'}
            </Text>
          </View>
          <View className='flex-row items-center'>
            <Ionicons name='time-outline' size={14} color='#9CA3AF' />
            <Text className='ml-1 text-sm text-gray-500'>
              {`${new Date(item.createdAt).toLocaleDateString(undefined, {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
              })} ${new Date(item.createdAt).toLocaleTimeString(undefined, {
                hour: '2-digit',
                minute: '2-digit',
              })}`}
            </Text>
          </View>
        </View>
      </View>
    </View>
  );
};

export default PostItems;
