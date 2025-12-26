import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useState } from 'react';
import { ScrollView, Switch, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../context/AuthContext';

import { useTranslation } from 'react-i18next';

const SettingsScreen = () => {
  const { t, i18n } = useTranslation();
  const { user, updateUser } = useAuth();
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [locationEnabled, setLocationEnabled] = useState(true);

  const changeLanguage = async (lang: string) => {
    // i18n.locale = 'en';
    // if (lang !== i18n.locale) {
    // i18n.locale = lang;
    i18n.changeLanguage(lang);
    // if (user && user.id) {
    //   const res = await apiService.userPartialUpdate(user.id, {
    //     id: user.id,
    //     defaultLanguage: lang,
    //   });
    //   if (res.success) {
    //     updateUser(res.data);
    //     toast.success(t('common.languageChanged'));
    //   }
    // }
    // }
  };

  return (
    <SafeAreaView className='flex-1 bg-gray-50'>
      <View className='flex-row items-center px-5 py-4 bg-white border-b border-gray-100 shadow-sm'>
        <TouchableOpacity
          onPress={() => router.back()}
          className='p-2 -ml-2'
          activeOpacity={0.7}
        >
          <Ionicons name='arrow-back' size={24} color='#1F2937' />
        </TouchableOpacity>
        <Text className='ml-3 text-xl font-bold text-gray-900'>
          {t('common.settings')}
        </Text>
      </View>

      <ScrollView className='flex-1' showsVerticalScrollIndicator={false}>
        {/* Language Settings */}
        <View className='px-5 py-5 mt-4 bg-white shadow-sm'>
          <Text className='mb-5 text-lg font-bold text-gray-900'>
            {t('common.language')}
          </Text>
          <TouchableOpacity
            className={`flex-row items-center justify-between py-4 px-3 rounded-xl mb-2 ${
              i18n.language === 'en'
                ? 'bg-primary-50 border-2 border-primary-200'
                : 'bg-gray-50'
            }`}
            onPress={() => changeLanguage('en')}
            activeOpacity={0.7}
          >
            <View className='flex-row items-center'>
              <Ionicons name='language-outline' size={22} color='#3B82F6' />
              <Text className='ml-4 text-base font-semibold text-gray-900'>
                {t('common.english')}
              </Text>
            </View>
            {i18n.language === 'en' && (
              <Ionicons name='checkmark-circle' size={24} color='#3B82F6' />
            )}
          </TouchableOpacity>
          <TouchableOpacity
            className={`flex-row items-center justify-between py-4 px-3 rounded-xl mb-2 ${
              i18n.language === 'hi'
                ? 'bg-primary-50 border-2 border-primary-200'
                : 'bg-gray-50'
            }`}
            onPress={() => changeLanguage('hi')}
            activeOpacity={0.7}
          >
            <View className='flex-row items-center'>
              <Ionicons name='language-outline' size={22} color='#3B82F6' />
              <Text className='ml-4 text-base font-semibold text-gray-900'>
                {t('common.hindi')}
              </Text>
            </View>
            {i18n.language === 'hi' && (
              <Ionicons name='checkmark-circle' size={24} color='#3B82F6' />
            )}
          </TouchableOpacity>
          <TouchableOpacity
            className={`flex-row items-center justify-between py-4 px-3 rounded-xl ${
              i18n.language === 'gu'
                ? 'bg-primary-50 border-2 border-primary-200'
                : 'bg-gray-50'
            }`}
            onPress={() => changeLanguage('gu')}
            activeOpacity={0.7}
          >
            <View className='flex-row items-center'>
              <Ionicons name='language-outline' size={22} color='#3B82F6' />
              <Text className='ml-4 text-base font-semibold text-gray-900'>
                {t('common.gujarati')}
              </Text>
            </View>
            {i18n.language === 'gu' && (
              <Ionicons name='checkmark-circle' size={24} color='#3B82F6' />
            )}
          </TouchableOpacity>
        </View>

        {/* Notification Settings */}
        <View className='px-5 py-5 mt-4 bg-white shadow-sm'>
          <Text className='mb-5 text-lg font-bold text-gray-900'>
            {t('common.notification')}
          </Text>
          <View className='flex-row justify-between items-center px-3 py-4 bg-gray-50 rounded-xl'>
            <View className='flex-row items-center'>
              <Ionicons
                name='notifications-outline'
                size={22}
                color='#3B82F6'
              />
              <Text className='ml-4 text-base font-semibold text-gray-900'>
                {t('common.pushnotification')}
              </Text>
            </View>
            <Switch
              value={notificationsEnabled}
              onValueChange={setNotificationsEnabled}
              trackColor={{ false: '#D1D5DB', true: '#3B82F6' }}
              thumbColor='#FFFFFF'
            />
          </View>
        </View>

        {/* Location Settings */}
        <View className='px-5 py-5 mt-4 bg-white shadow-sm'>
          <Text className='mb-5 text-lg font-bold text-gray-900'>
            {t('common.location')}
          </Text>
          <View className='flex-row justify-between items-center px-3 py-4 bg-gray-50 rounded-xl'>
            <View className='flex-row items-center'>
              <Ionicons name='location-outline' size={22} color='#3B82F6' />
              <Text className='ml-4 text-base font-semibold text-gray-900'>
                {t('common.locationservice')}
              </Text>
            </View>
            <Switch
              value={locationEnabled}
              onValueChange={setLocationEnabled}
              trackColor={{ false: '#D1D5DB', true: '#3B82F6' }}
              thumbColor='#FFFFFF'
            />
          </View>
        </View>

        {/* About */}
        <View className='px-5 py-5 mt-4 mb-6 bg-white shadow-sm'>
          <Text className='mb-5 text-lg font-bold text-gray-900'>
            {t('common.about')}
          </Text>
          <View className='px-3 py-4 border-b border-gray-100'>
            <Text className='mb-1 text-sm font-medium text-gray-600'></Text>
            <Text className='text-base font-bold text-gray-900'>1.0.0</Text>
          </View>
          <View className='px-3 py-4'>
            <Text className='mb-1 text-sm font-medium text-gray-600'>
              {t('common.buildNumber')}
            </Text>
            <Text className='text-base font-bold text-gray-900'>100</Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

export default SettingsScreen;
