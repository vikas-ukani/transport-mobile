import { Ionicons } from '@expo/vector-icons';
import { yupResolver } from '@hookform/resolvers/yup';
import { router } from 'expo-router';
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import * as yup from 'yup';

const changePasswordSchema = yup.object().shape({
  currentPassword: yup.string().required('Current password is required'),
  newPassword: yup
    .string()
    .required('New password is required')
    .min(6, 'Password must be at least 6 characters'),
  confirmPassword: yup
    .string()
    .required('Please confirm your password')
    .oneOf([yup.ref('newPassword')], 'Passwords do not match'),
});

const SecurityScreen = () => {
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [biometricEnabled, setBiometricEnabled] = useState(false);

  const {
    control,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm({
    resolver: yupResolver(changePasswordSchema),
  });

  const onChangePassword = async (data: any) => {
    try {
      setLoading(true);
      Alert.alert('Success', 'Password changed successfully');
      reset();
      setShowChangePassword(false);
    } catch (error) {
      Alert.alert('Error', 'Failed to change password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View className='flex-1 bg-gray-50'>
      <View className='flex-row items-center px-5 py-4 bg-white border-b border-gray-100 shadow-sm'>
        <TouchableOpacity
          onPress={() => router.back()}
          className='p-2 -ml-2'
          activeOpacity={0.7}
        >
          <Ionicons name='arrow-back' size={24} color='#1F2937' />
        </TouchableOpacity>
        <Text className='ml-3 text-xl font-bold text-gray-900'>Security</Text>
      </View>

      <ScrollView className='flex-1' showsVerticalScrollIndicator={false}>
        {/* Change Password */}
        <View className='px-5 py-5 mt-4 bg-white shadow-sm'>
          <TouchableOpacity
            className='flex-row justify-between items-center py-3'
            onPress={() => setShowChangePassword(!showChangePassword)}
            activeOpacity={0.7}
          >
            <View className='flex-row items-center'>
              <View className='justify-center items-center mr-4 w-10 h-10 rounded-xl bg-primary-100'>
                <Ionicons
                  name='lock-closed-outline'
                  size={22}
                  color='#3B82F6'
                />
              </View>
              <Text className='text-base font-bold text-gray-900'>
                Change Password
              </Text>
            </View>
            <Ionicons
              name={showChangePassword ? 'chevron-up' : 'chevron-down'}
              size={22}
              color='#9CA3AF'
            />
          </TouchableOpacity>

          {showChangePassword && (
            <View className='pt-5 mt-5 border-t border-gray-100'>
              <View className='mb-5'>
                <Text className='mb-3 text-sm font-bold text-gray-700'>
                  Current Password
                </Text>
                <Controller
                  control={control}
                  name='currentPassword'
                  render={({ field: { onChange, onBlur, value } }) => (
                    <TextInput
                      className='px-5 py-4 text-base font-medium bg-white rounded-xl border-2 border-gray-200'
                      placeholder='Enter current password'
                      value={value}
                      onChangeText={onChange}
                      onBlur={onBlur}
                      secureTextEntry
                      placeholderTextColor='#9CA3AF'
                    />
                  )}
                />
                {errors.currentPassword && (
                  <Text className='mt-2 ml-1 text-sm font-medium text-red-500'>
                    {errors.currentPassword.message}
                  </Text>
                )}
              </View>

              <View className='mb-5'>
                <Text className='mb-3 text-sm font-bold text-gray-700'>
                  New Password
                </Text>
                <Controller
                  control={control}
                  name='newPassword'
                  render={({ field: { onChange, onBlur, value } }) => (
                    <TextInput
                      className='px-5 py-4 text-base font-medium bg-white rounded-xl border-2 border-gray-200'
                      placeholder='Enter new password'
                      value={value}
                      onChangeText={onChange}
                      onBlur={onBlur}
                      secureTextEntry
                      placeholderTextColor='#9CA3AF'
                    />
                  )}
                />
                {errors.newPassword && (
                  <Text className='mt-2 ml-1 text-sm font-medium text-red-500'>
                    {errors.newPassword.message}
                  </Text>
                )}
              </View>

              <View className='mb-6'>
                <Text className='mb-3 text-sm font-bold text-gray-700'>
                  Confirm New Password
                </Text>
                <Controller
                  control={control}
                  name='confirmPassword'
                  render={({ field: { onChange, onBlur, value } }) => (
                    <TextInput
                      className='px-5 py-4 text-base font-medium bg-white rounded-xl border-2 border-gray-200'
                      placeholder='Confirm new password'
                      value={value}
                      onChangeText={onChange}
                      onBlur={onBlur}
                      secureTextEntry
                      placeholderTextColor='#9CA3AF'
                    />
                  )}
                />
                {errors.confirmPassword && (
                  <Text className='mt-2 ml-1 text-sm font-medium text-red-500'>
                    {errors.confirmPassword.message}
                  </Text>
                )}
              </View>

              <TouchableOpacity
                className='flex-row justify-center items-center py-4 rounded-xl shadow-md bg-primary'
                onPress={handleSubmit(onChangePassword)}
                disabled={loading}
                activeOpacity={0.8}
              >
                {loading ? (
                  <ActivityIndicator color='#fff' size='small' />
                ) : (
                  <>
                    <Ionicons
                      name='checkmark-circle'
                      size={20}
                      color='#FFFFFF'
                    />
                    <Text className='ml-2 font-bold text-white'>
                      Change Password
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Biometric Authentication */}
        <View className='px-5 py-5 mt-4 bg-white shadow-sm'>
          <View className='flex-row justify-between items-center py-3'>
            <View className='flex-row flex-1 items-center'>
              <View className='justify-center items-center mr-4 w-10 h-10 bg-purple-100 rounded-xl'>
                <Ionicons
                  name='finger-print-outline'
                  size={22}
                  color='#9333EA'
                />
              </View>
              <View className='flex-1'>
                <Text className='text-base font-bold text-gray-900'>
                  Biometric Authentication
                </Text>
                <Text className='mt-1 text-sm text-gray-500'>
                  Use fingerprint or face ID to login
                </Text>
              </View>
            </View>
            <Switch
              value={biometricEnabled}
              onValueChange={setBiometricEnabled}
              trackColor={{ false: '#D1D5DB', true: '#9333EA' }}
              thumbColor='#FFFFFF'
            />
          </View>
        </View>

        {/* Two-Factor Authentication */}
        <View className='px-5 py-5 mt-4 bg-white shadow-sm'>
          <TouchableOpacity
            className='flex-row justify-between items-center py-3'
            activeOpacity={0.7}
          >
            <View className='flex-row items-center'>
              <View className='justify-center items-center mr-4 w-10 h-10 bg-green-100 rounded-xl'>
                <Ionicons
                  name='shield-checkmark-outline'
                  size={22}
                  color='#10B981'
                />
              </View>
              <View>
                <Text className='text-base font-bold text-gray-900'>
                  Two-Factor Authentication
                </Text>
                <Text className='mt-1 text-sm text-gray-500'>
                  Add an extra layer of security
                </Text>
              </View>
            </View>
            <Ionicons name='chevron-forward' size={22} color='#9CA3AF' />
          </TouchableOpacity>
        </View>

        {/* Active Sessions */}
        <View className='px-5 py-5 mt-4 mb-6 bg-white shadow-sm'>
          <Text className='mb-5 text-lg font-bold text-gray-900'>
            Active Sessions
          </Text>
          <View className='px-4 py-4 mb-4 bg-gray-50 rounded-xl border border-gray-200'>
            <View className='flex-row justify-between items-center'>
              <View className='flex-1'>
                <Text className='mb-1 text-base font-bold text-gray-900'>
                  Current Device
                </Text>
                <Text className='mb-1 text-sm text-gray-500'>
                  iMobile 14 Pro • iOS 17.0
                </Text>
                <Text className='text-sm text-gray-500'>
                  Last active: Just now
                </Text>
              </View>
              <View className='bg-green-100 px-3 py-1.5 rounded-lg'>
                <Text className='text-xs font-bold text-green-700'>Active</Text>
              </View>
            </View>
          </View>
          <TouchableOpacity className='py-3' activeOpacity={0.7}>
            <Text className='text-base font-bold text-primary'>
              View All Sessions
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
};

export default SecurityScreen;
