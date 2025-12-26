import { toast } from '@backpackapp-io/react-native-toast';
import { Ionicons } from '@expo/vector-icons';
import { yupResolver } from '@hookform/resolvers/yup';
import * as ImagePicker from 'expo-image-picker';
import { router, useGlobalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import {
  ActivityIndicator,
  Alert,
  Image,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as yup from 'yup';

import { useTranslation } from 'react-i18next';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import apiService, { getBaseUrl } from '../../services/api.service';

const CreatePostScreen = () => {
  const { t } = useTranslation();
  const { id } = useGlobalSearchParams();

  const [images, setImages] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  const schema = yup.object().shape({
    title: yup.string().required('title is required'),
    content: yup.string(),
    imageIds: yup
      .array()
      .of(yup.string().required(t('common.imageOneRequired'))),
  });

  const {
    control,
    handleSubmit,
    formState: { errors },
    reset,
    setValue,
    getValues,
  } = useForm({
    resolver: yupResolver(schema),
  });

  useEffect(() => {
    if (id) {
      getPost(id as string);
    }
  }, [id]);

  const getPost = async (postId: string) => {
    try {
      setLoading(true);
      const res = await apiService.getPostById(postId);
      if (res.success) {
        const post = res.data;
        reset({
          title: post.title,
          content: post.content,
          imageIds: post.imageIds || [],
        });

        if (post.images && post.images.length > 0) {
          // Assuming images are URLs, directly set them
          setImages(post.images.map((img: any) => getBaseUrl() + img.url));
        }
      } else {
        toast.error(res.message);
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to load post');
    } finally {
      setLoading(false);
    }
  };

  const selectPhoto = async () => {
    try {
      const permissionResult =
        await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (permissionResult.granted === false) {
        toast.error('Permission to access the media library is required.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsMultipleSelection: true,
        // allowsMultipleSelection: true,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 1,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const newImages = result.assets.map((asset) => asset.uri);
        setImages([...images, ...newImages]);
      }
    } catch (err: any) {
      Alert.alert('Error', 'Failed to select images ' + err.message);
    }
  };

  const removeImage = (index: number) => {
    setImages(images.filter((_, i) => i !== index));
    setValue(
      'imageIds',
      getValues('imageIds')?.filter((_, i) => i !== index)
    );
  };

  const onSubmit = async (data: any) => {
    try {
      setLoading(true);
      const uploadResults = await Promise.all(
        images
          .filter((photo) => photo.includes('uploads') === false)
          .map(async (asset) => await apiService.uploadImage(asset, 'post'))
      );

      let newImageIds = uploadResults.map((u: any) => u?.id).filter(Boolean);
      if (id) {
        newImageIds = Array.from(
          new Set([
            ...newImageIds, // newly uploaded photos
            ...(getValues('imageIds') || []), // Existing photos
          ])
        );
      }

      const postData = {
        title: data.title,
        content: data.content,
        imageIds: newImageIds,
      };
      let res = null;
      if (id) {
        res = await apiService.updatePost(postData, id as string);
      } else {
        res = await apiService.createPost(postData);
      }
      if (res.success) {
        toast.success(
          id ? 'Post updated successfully' : 'Post created successfully'
        );
        router.push('/(apps)/(tabs)');
      } else {
        toast.error(res.message);
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to save post');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView className='flex-1 bg-gray-50'>
      <KeyboardAwareScrollView
        className='flex-1 bg-white'
        contentContainerStyle={{ flexGrow: 1 }}
        enableOnAndroid
        keyboardShouldPersistTaps='handled'
      >
        <View className='flex-row items-center px-5 py-4 bg-white border-b border-gray-100 shadow-sm'>
          <TouchableOpacity
            onPress={() => router.back()}
            className='flex-row gap-4 justify-start items-center p-2 -ml-2'
            activeOpacity={0.7}
          >
            <Ionicons name='arrow-back' size={24} color='#1F2937' />
            <Text className='text-xl font-bold text-gray-900'>
              {t('post.pageTitle')}
            </Text>
          </TouchableOpacity>

          <View style={{ width: 40 }} />
        </View>

        <ScrollView
          className='flex-1 px-5 py-6'
          showsVerticalScrollIndicator={false}
        >
          {/* title */}
          <View className='mb-6'>
            <Text className='mb-3 text-sm font-bold text-gray-700'>
              {t('post.title')}
            </Text>
            <Controller
              control={control}
              name='title'
              render={({ field: { onChange, onBlur, value } }) => (
                <TextInput
                  className='px-5 py-4 text-base font-medium bg-white rounded-xl border-2 border-gray-200'
                  placeholder={t('post.title')}
                  value={value}
                  onChangeText={onChange}
                  onBlur={onBlur}
                  placeholderTextColor='#9CA3AF'
                />
              )}
            />
            {errors.title && (
              <Text className='mt-2 ml-1 text-sm font-medium text-red-500'>
                {errors.title.message}
              </Text>
            )}
          </View>

          {/* Description */}
          <View className='mb-6'>
            <Text className='mb-3 text-sm font-bold text-gray-700'>
              {t('post.description')}
            </Text>
            <Controller
              control={control}
              name='content'
              render={({ field: { onChange, onBlur, value } }) => (
                <TextInput
                  className='px-5 py-4 text-base font-medium bg-white rounded-xl border-2 border-gray-200'
                  placeholder={t('post.description')}
                  value={value}
                  multiline={true}
                  numberOfLines={10}
                  onChangeText={onChange}
                  onBlur={onBlur}
                  textAlignVertical='top'
                  placeholderTextColor='#9CA3AF'
                  style={{
                    height: 150,
                    textAlignVertical: 'top',
                  }}
                />
              )}
            />
          </View>

          {/* Images */}
          <View className='mb-6'>
            <Text className='mb-3 text-sm font-bold text-gray-700'>
              {t('post.addImages')}
            </Text>
            <TouchableOpacity
              className='items-center py-8 bg-gray-50 rounded-xl border-2 border-gray-300 border-dashed'
              onPress={selectPhoto}
            >
              <Ionicons name='image-outline' size={40} color='#9CA3AF' />
              <Text className='mt-3 text-base font-semibold text-gray-600'>
                {t('post.addImages')}
              </Text>
              <Text className='mt-1 text-sm text-gray-400'>
                Tap to select images
              </Text>
            </TouchableOpacity>
            {images.length === 0 && (
              <Text className='mt-2 ml-1 text-sm font-medium text-red-500'>
                {t('common.imageOneRequired')}
              </Text>
            )}
            {images.length > 0 && (
              <View className='flex-row flex-wrap mt-4'>
                {images.map((uri, index) => (
                  <View key={index} className='relative mr-3 mb-3'>
                    <Image source={{ uri }} className='w-28 h-28 rounded-xl' />
                    <TouchableOpacity
                      className='absolute -top-2 -right-2 bg-red-500 rounded-full p-1.5 shadow-lg'
                      onPress={() => removeImage(index)}
                      activeOpacity={0.8}
                    >
                      <Ionicons name='close' size={18} color='#fff' />
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            )}
          </View>

          <TouchableOpacity
            className=''
            activeOpacity={0.8}
            onPress={handleSubmit(onSubmit)}
            disabled={loading}
          >
            <View
              className={`flex-row justify-center p-2 px-8 items-center !text-white gap-3 rounded-xl shadow-md bg-primary`}
            >
              {loading ? (
                <ActivityIndicator color='#fff' size='small' />
              ) : (
                <>
                  <Ionicons
                    name='add-circle-outline'
                    size={22}
                    color='#FFFFFF'
                  />
                  <Text className='ml-2 text-lg font-bold text-center text-white'>
                    {t('post.title')}
                  </Text>
                </>
              )}
            </View>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAwareScrollView>
    </SafeAreaView>
  );
};

export default CreatePostScreen;
