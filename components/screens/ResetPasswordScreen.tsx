import { toast } from '@backpackapp-io/react-native-toast';
import { Ionicons } from '@expo/vector-icons';
import { yupResolver } from '@hookform/resolvers/yup';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import {
    ActivityIndicator,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import * as yup from 'yup';

import { useTranslation } from 'react-i18next';
import apiService from '../../services/api.service';
import { styles } from '../../styles/common';

const ResetPasswordScreen = () => {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const schema = yup.object().shape({
    email: yup.string().required(t('common.emailRequired')),
    new_password: yup
      .string()
      .required(t('common.passwordRequired'))
      .min(6, 'Password must be at least 6 characters'),
    confirmPassword: yup
      .string()
      .required(t('common.confirmPasswordRequired'))
      .oneOf([yup.ref('new_password')], 'Passwords do not match'),
  });

  const {
    control,
    setValue,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: yupResolver(schema),
  });

  // Get the token from the URL and store it to state
  const [token, setToken] = useState<string | null>(null);

  // Extract token from query params once when component mounts
  useState(() => {
    // On Expo Router, params can be accessed via the router or useSearchParams (if available)
    // For simplicity, we'll use globalThis.location if in web, or expo-router's useSearchParams if available
    let tokenValue: string | null = null;
    let emailValue: string = '';
    try {
      // Try using web location
      if (typeof window !== 'undefined') {
        const params = new URLSearchParams(window.location.search);
        tokenValue = params.get('token');
        emailValue = params.get('email') || '';
        console.log('tokenValue', { tokenValue, emailValue });
        setToken(token);
        setValue('email', emailValue);
      }
    } catch (e) {
      // fallback for native, if you add useSearchParams or similar
    }
    setToken(tokenValue);
  });

  const onSubmit = async (data: { email: string; new_password: string }) => {
    try {
      setLoading(true);
      const res = await apiService.resetPassword(
        data.new_password,
        token || ''
      );
      console.log('res', res);
      if (res.success) {
        toast.success(res.message, {
          duration: 15000,
        });
        router.replace('/login');
      } else {
        toast.error(res.message);
      }
    } catch (error) {
      console.log('error', error);
      toast.error('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#FFFFFF', '#F3F4F6', '#E5E7EB']}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={styles.gradient}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.keyboardView}
        >
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps='handled'
          >
            {/* Header Section */}
            <View style={styles.header}>
              <View style={styles.logoContainer}>
                <LinearGradient
                  colors={['#9333EA', '#7C3AED']}
                  style={styles.logoCircle}
                >
                  <Ionicons name='car-sport' size={40} color='#FFFFFF' />
                </LinearGradient>
              </View>
              <Text style={styles.title}>{t('common.resetPassword')}</Text>
              <Text style={styles.subtitle}>
                {t('common.updateYourPassword')}
              </Text>
            </View>

            {/* Form Section */}
            <View style={styles.formContainer}>
              {/* Email/Mobile Input */}
              <View style={styles.inputContainer}>
                <Text style={styles.label}>{t('login.email')}</Text>
                <Controller
                  control={control}
                  name='email'
                  defaultValue=''
                  render={({ field: { onChange, onBlur, value } }) => (
                    <View
                      style={[
                        styles.inputWrapper,
                        errors.email && styles.inputError,
                      ]}
                    >
                      <Ionicons
                        name='mail-outline'
                        size={20}
                        color='#6B7280'
                        style={styles.inputIcon}
                      />
                      <TextInput
                        style={styles.input}
                        placeholder={t('login.email')}
                        placeholderTextColor='#9CA3AF'
                        value={value}
                        onChangeText={onChange}
                        onBlur={onBlur}
                        keyboardType='email-address'
                        autoCapitalize='none'
                        autoCorrect={false}
                        readOnly
                      />
                    </View>
                  )}
                />
                {errors.email && (
                  <View style={styles.errorContainer}>
                    <Ionicons name='alert-circle' size={14} color='#EF4444' />
                    <Text style={styles.errorText}>{errors.email.message}</Text>
                  </View>
                )}
              </View>

              <View style={styles.inputContainer}>
                <View className='flex-row gap-1 items-start'>
                  <Text style={styles.label}>{t('common.password')}</Text>{' '}
                  <Text className='text-red-500'>*</Text>
                  {errors.new_password && (
                    <Text style={styles.errorText}>
                      {errors.new_password.message}
                    </Text>
                  )}
                </View>{' '}
                <Controller
                  control={control}
                  name='new_password'
                  // defaultValue={defaultCredentials.new_password}
                  render={({ field: { onChange, onBlur, value } }) => (
                    <View
                      style={[
                        styles.inputWrapper,
                        errors.new_password && styles.inputError,
                      ]}
                    >
                      <Ionicons
                        name='lock-closed-outline'
                        size={20}
                        color='#6B7280'
                        style={styles.inputIcon}
                      />
                      <TextInput
                        style={styles.input}
                        placeholder={t('common.password')}
                        placeholderTextColor='#9CA3AF'
                        value={value}
                        onChangeText={onChange}
                        onBlur={onBlur}
                        secureTextEntry={!showPassword}
                        autoCapitalize='none'
                        autoCorrect={false}
                      />
                      <TouchableOpacity
                        onPress={() => setShowPassword(!showPassword)}
                        style={styles.eyeIcon}
                        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                      >
                        <Ionicons
                          name={
                            showPassword ? 'eye-outline' : 'eye-off-outline'
                          }
                          size={20}
                          color='#6B7280'
                        />
                      </TouchableOpacity>
                    </View>
                  )}
                />
                {errors.new_password && (
                  <View style={styles.errorContainer}>
                    <Ionicons name='alert-circle' size={14} color='#EF4444' />
                    <Text style={styles.errorText}>
                      {errors.new_password.message}
                    </Text>
                  </View>
                )}
              </View>

              <View style={styles.inputContainer}>
                <View className='flex-row gap-1 items-start'>
                  <Text style={styles.label}>
                    {t('common.confirmPassword')}
                  </Text>{' '}
                  <Text className='text-red-500'>*</Text>
                  {errors.confirmPassword && (
                    <Text style={styles.errorText}>
                      {errors.confirmPassword.message}
                    </Text>
                  )}
                </View>
                <Controller
                  control={control}
                  name='confirmPassword'
                  // defaultValue={defaultCredentials.password}
                  render={({ field: { onChange, onBlur, value } }) => (
                    <View
                      style={[
                        styles.inputWrapper,
                        errors.confirmPassword && styles.inputError,
                      ]}
                    >
                      <Ionicons
                        name='lock-closed-outline'
                        size={20}
                        color='#6B7280'
                        style={styles.inputIcon}
                      />
                      <TextInput
                        style={styles.input}
                        placeholder={t('common.confirmPassword')}
                        placeholderTextColor='#9CA3AF'
                        value={value}
                        onChangeText={onChange}
                        onBlur={onBlur}
                        secureTextEntry={!showPassword}
                        autoCapitalize='none'
                        autoCorrect={false}
                      />
                    </View>
                  )}
                />
                {errors.confirmPassword && (
                  <View style={styles.errorContainer}>
                    <Ionicons name='alert-circle' size={14} color='#EF4444' />
                    <Text style={styles.errorText}>
                      {errors.confirmPassword.message}
                    </Text>
                  </View>
                )}
              </View>

              {/* Login Button */}
              <TouchableOpacity
                className='mt-4'
                style={[
                  styles.loginButton,
                  loading && styles.loginButtonDisabled,
                ]}
                onPress={handleSubmit(onSubmit)}
                disabled={loading}
                activeOpacity={0.8}
              >
                <LinearGradient
                  colors={
                    loading ? ['#9CA3AF', '#6B7280'] : ['#9333EA', '#7C3AED']
                  }
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.buttonGradient}
                >
                  <>
                    <Text style={styles.loginButtonText}>
                      {t('common.updatePassword')}
                    </Text>

                    {loading ? (
                      <ActivityIndicator color='#FFFFFF' size='small' />
                    ) : (
                      <Ionicons
                        name='arrow-forward'
                        size={20}
                        color='#FFFFFF'
                        style={styles.buttonIcon}
                      />
                    )}
                  </>
                </LinearGradient>
              </TouchableOpacity>

              {/* Sign Up Link */}
              <View style={styles.signUpContainer} className='!mb-6 space-x-1'>
                <TouchableOpacity
                  onPress={() => router.replace('/(auth)/login')}
                  className='flex-row gap-1 items-center'
                >
                  <Ionicons
                    name='arrow-back'
                    size={20}
                    className='text-primary'
                  />
                  <Text style={styles.signUpLink}>{t('common.backTO')}</Text>
                  <Text style={styles.signUpLink}>{t('common.login')}</Text>
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </LinearGradient>
    </View>
  );
};

export default ResetPasswordScreen;
