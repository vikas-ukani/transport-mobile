import { toast } from '@backpackapp-io/react-native-toast';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { useAuth } from '../../context/AuthContext';
import i18n from '../../i18n/config';
import apiService from '../../services/api.service';

const HomeHeader = () => {
  const { logout, user, updateUser } = useAuth();
  const [languageMenuVisible, setLanguageMenuVisible] = useState(false);

  useEffect(() => {
    if (user && user.changeLanguage) {
      i18n.locale = user.changeLanguage;
    }
  }, [user]);

  const changeLanguage = async (lang: string) => {
    // i18n.locale = 'en';
    if (lang !== i18n.locale) {
      AsyncStorage.setItem('locale', lang);
      // changeLocal(lang);
      i18n.locale = lang;
      if (user && user.id) {
        const res = await apiService.userPartialUpdate(user.id, {
          id: user.id,
          defaultLanguage: lang,
        });
        if (res.success) {
          updateUser(res.data);
          toast.success(i18n.t('common.languageChanged'));
        }
      }
    }
    setLanguageMenuVisible(false);
    router.replace('/');
  };

  return (
    <>
      <View className='flex-row justify-between items-center px-2 py-1 bg-white border-b border-gray-300 shadow'>
        <TouchableOpacity
          // onPress={() => navigation.openDrawer()}
          className='p-1'
          activeOpacity={0.7}
        >
          <Ionicons name='menu' size={28} color='#1F2937' />
        </TouchableOpacity>
        <View className='flex-row gap-2 items-center'>
          {__DEV__ && (
            <TouchableOpacity
              onPress={() => logout()}
              className=''
              activeOpacity={0.8}
            >
              <View className='flex-row gap-1 items-center'>
                <Ionicons name='lock-closed' size={20} color='red' />
              </View>
            </TouchableOpacity>
          )}
          <TouchableOpacity
            onPress={() => router.push('/(apps)/post/create')}
            className=''
            activeOpacity={0.8}
          >
            <View className='flex-row gap-1 items-center'>
              <Ionicons name='add-circle-outline' size={20} color='black' />
              <Text className='text-base font-bold text-black'>
                {i18n.t('home.post')}
              </Text>
            </View>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => router.replace('/(apps)/notifications')}
            className='relative p-2'
            activeOpacity={0.7}
          >
            <Ionicons name='notifications-outline' size={20} color='#1F2937' />
            <View className='absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full' />
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setLanguageMenuVisible(!languageMenuVisible)}
            className='p-2'
            activeOpacity={0.7}
          >
            <Ionicons name='language' size={20} className='!text-primary' />
          </TouchableOpacity>
        </View>
      </View>
      {languageMenuVisible && (
        <View className='overflow-hidden absolute right-5 top-14 z-50 bg-white rounded-xl border border-gray-200 shadow-2xl'>
          <TouchableOpacity
            className='px-5 py-3.5 border-b border-gray-100 active:bg-gray-50'
            onPress={() => changeLanguage('en')}
            activeOpacity={0.7}
          >
            <Text className='font-medium text-gray-900'>
              {i18n.t('common.english')}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            className='px-5 py-3.5 border-b border-gray-100 active:bg-gray-50'
            onPress={() => changeLanguage('hi')}
            activeOpacity={0.7}
          >
            <Text className='font-medium text-gray-900'>
              {i18n.t('common.hindi')}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            className='px-5 py-3.5 active:bg-gray-50'
            onPress={() => changeLanguage('gu')}
            activeOpacity={0.7}
          >
            <Text className='font-medium text-gray-900'>
              {i18n.t('common.gujarati')}
            </Text>
          </TouchableOpacity>
        </View>
      )}
    </>
  );
};

export default HomeHeader;
