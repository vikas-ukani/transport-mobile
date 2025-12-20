import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useState } from 'react';
import {
  Image,
  Modal,
  Pressable,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../context/AuthContext';
import i18n from '../../i18n/config';

interface LogoutProps {
  visible: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}

const LogoutModal = ({ visible, onCancel, onConfirm }: LogoutProps) => {
  return (
    <Modal
      animationType='fade'
      transparent
      visible={visible}
      onRequestClose={onCancel}
    >
      <View className='flex-1 justify-center items-center bg-black/50'>
        <View className='p-6 w-80 bg-white rounded-xl'>
          <View className='flex-row justify-center w-full text-center'>
            <Ionicons name='lock-closed' size={40} className='text-red-500' />
          </View>
          <Text className='my-4 text-xl font-bold text-center'>Logout?</Text>
          <Text className='mb-6 text-center text-gray-600'>
            Are you sure you want to logout?
          </Text>

          <View className='flex-row justify-between'>
            <Pressable
              className='bg-gray-300 px-4 py-2 rounded-md w-[45%]'
              onPress={onCancel}
            >
              <Text className='font-semibold text-center'>Cancel</Text>
            </Pressable>

            <Pressable
              className='bg-red-600 px-4 py-2 rounded-md w-[45%]'
              onPress={onConfirm}
            >
              <Text className='font-semibold text-center text-white'>
                Logout
              </Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const ProfileScreen = () => {
  const { user, logout } = useAuth();
  const [openLogoutModal, setOpenLogoutModal] = useState(false);

  const handleLogout = async () => {
    await logout();
  };

  return (
    <SafeAreaView className='flex-1 bg-gray-50'>
      <ScrollView className='flex-1' showsVerticalScrollIndicator={false}>
        {/* Profile Header */}
        <LogoutModal
          visible={openLogoutModal}
          onCancel={() => setOpenLogoutModal(false)}
          onConfirm={handleLogout}
        />
        <View className='flex-row gap-6 justify-start items-center px-5 py-4 bg-white border-b border-gray-100 shadow-sm'>
          <View className='flex-row justify-center items-center'>
            {user?.photo ? (
              <Image
                source={{ uri: user.photo }}
                className='w-32 h-32 rounded-full border-4 border-primary'
              />
            ) : (
              <View className='justify-center items-center mb-5 w-28 h-28 bg-gradient-to-br to-purple-600 rounded-full border-4 shadow-lg from-primary border-primary-100'>
                <Ionicons name='person' size={56} color='#FFFFFF' />
              </View>
            )}
          </View>
          <View className='flex-col justify-start items-start'>
            <Text className='mb-2 text-2xl font-bold text-primary'>
              {user?.name}
            </Text>
            <Text className='mb-2 text-base font-medium text-gray-600'>
              {user?.email || 'demo@gmail.com'}
            </Text>
            <Text className='mb-2 text-base font-medium text-gray-600'>
              {user?.mobile}
            </Text>
            <View className='!bg-primary/10 px-6 py-2.5 rounded-full border !border-primary/80'>
              <Text className='text-sm font-bold text-primary'>
                {i18n.t(`common.${user?.type || 'customer'}`)}
              </Text>
            </View>
          </View>
        </View>

        {/* Menu Items */}
        <View className='px-5 py-2 mt-4 bg-white'>
          <TouchableOpacity
            className='flex-row justify-between items-center py-4 border-b border-gray-100'
            onPress={() => router.push('/(apps)/settings')}
            activeOpacity={0.7}
          >
            <View className='flex-row items-center'>
              <View className='justify-center items-center mr-4 w-10 h-10 bg-primary/10 !rounded-full'>
                <Ionicons
                  name='settings-outline'
                  size={22}
                  className='!text-primary'
                />
              </View>
              <Text className='text-base font-semibold text-gray-900'>
                {i18n.t('common.settings')}
              </Text>
            </View>
            <Ionicons name='chevron-forward' size={22} color='#9CA3AF' />
          </TouchableOpacity>
          <TouchableOpacity
            className='flex-row justify-between items-center py-4 border-b border-gray-100'
            onPress={() => router.push('/(apps)/security')}
            activeOpacity={0.7}
          >
            <View className='flex-row items-center'>
              <View className='justify-center items-center mr-4 w-10 h-10 bg-primary/10 !rounded-full'>
                <MaterialIcons
                  name='security'
                  size={22}
                  className='!text-primary'
                />
              </View>
              <Text className='text-base font-semibold text-gray-900'>
                {i18n.t('common.security')}
              </Text>
            </View>
            <Ionicons name='chevron-forward' size={22} color='#9CA3AF' />
          </TouchableOpacity>

          <TouchableOpacity
            className='flex-row justify-between items-center py-4 border-b border-gray-100'
            activeOpacity={0.7}
          >
            <View className='flex-row items-center'>
              <View className='justify-center items-center mr-4 w-10 h-10 bg-purple-100 !rounded-full'>
                <Ionicons name='language-outline' size={22} color='#9333EA' />
              </View>
              <Text className='text-base font-semibold text-gray-900'>
                {i18n.t('common.language')}
              </Text>
            </View>
            <Ionicons name='chevron-forward' size={22} color='#9CA3AF' />
          </TouchableOpacity>

          <TouchableOpacity
            className='flex-row justify-between items-center py-4 border-b border-gray-100'
            activeOpacity={0.7}
            onPress={() => router.push('/(apps)/notifications')}
          >
            <View className='flex-row items-center'>
              <View className='justify-center items-center mr-4 w-10 h-10 bg-purple-100 !rounded-full'>
                <Ionicons name='notifications' size={22} color='#9333EA' />
              </View>
              <Text className='text-base font-semibold text-gray-900'>
                {i18n.t('common.notifications')}
              </Text>
            </View>
            <Ionicons name='chevron-forward' size={22} color='#9CA3AF' />
          </TouchableOpacity>

          <TouchableOpacity
            className='flex-row justify-between items-center py-4'
            // onPress={() => logout()}
            onPress={() => setOpenLogoutModal(true)}
            // onPress={() => handleLogout()}
            activeOpacity={0.7}
          >
            <View className='flex-row items-center'>
              <View className='justify-center items-center mr-4 w-10 h-10 bg-red-100 !rounded-full'>
                <Ionicons name='log-out-outline' size={22} color='#EF4444' />
              </View>
              <Text className='text-base font-semibold text-red-600'>
                {i18n.t('common.logout')}
              </Text>
            </View>
            <Ionicons name='chevron-forward' size={22} color='#9CA3AF' />
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

export default ProfileScreen;
