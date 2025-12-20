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
import { useAuth } from '../../context/AuthContext';
import i18n from '../../i18n/config';
import { getApiUrl } from '../../services/api.service';
import { styles } from '../../styles/common';

const defaultCredentials = {
  email: 'vikas@gmail.com',
  password: 'password',
};

const schema = yup.object().shape({
  email: yup.string().required('Email is required'),
  password: yup
    .string()
    .required('Password is required')
    .min(6, 'Password must be at least 6 characters'),
});

const LoginScreen = () => {
  const { login } = useAuth();
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: yupResolver(schema),
  });

  const onSubmit = async (data: { email: string; password: string }) => {
    try {
      setLoading(true);
      await login(data.email, data.password);
    } catch (error) {
      console.log('error', error);
      toast.error('Login failed. Please try again.');
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
              <Text style={styles.title}>{i18n.t('login.title')}</Text>
              <Text style={styles.subtitle}>{i18n.t('login.subtitle')}</Text>
              <Text style={styles.subtitle}>{getApiUrl()}</Text>
            </View>

            {/* Form Section */}
            <View style={styles.formContainer}>
              {/* Email/Mobile Input */}
              <View style={styles.inputContainer}>
                <Text style={styles.label}>{i18n.t('login.email')}</Text>
                <Controller
                  control={control}
                  name='email'
                  defaultValue={defaultCredentials.email}
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
                        placeholder={i18n.t('login.email')}
                        placeholderTextColor='#9CA3AF'
                        value={value}
                        onChangeText={onChange}
                        onBlur={onBlur}
                        keyboardType='email-address'
                        autoCapitalize='none'
                        autoCorrect={false}
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

              {/* Password Input */}
              <View style={styles.inputContainer}>
                <Text style={styles.label}>{i18n.t('common.password')}</Text>
                <Controller
                  control={control}
                  name='password'
                  defaultValue={defaultCredentials.password}
                  render={({ field: { onChange, onBlur, value } }) => (
                    <View
                      style={[
                        styles.inputWrapper,
                        errors.password && styles.inputError,
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
                        placeholder={i18n.t('common.password')}
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
                {errors.password && (
                  <View style={styles.errorContainer}>
                    <Ionicons name='alert-circle' size={14} color='#EF4444' />
                    <Text style={styles.errorText}>
                      {errors.password.message}
                    </Text>
                  </View>
                )}
              </View>

              {/* Forgot Password */}
              <TouchableOpacity
                style={styles.forgotPasswordContainer}
                onPress={() => router.push('/forgot-password')}
              >
                <Text style={styles.forgotPasswordText}>
                  {i18n.t('login.forgotPassword')}
                </Text>
              </TouchableOpacity>

              {/* Login Button */}
              <TouchableOpacity
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
                      {i18n.t('common.login')}
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

              {/* Divider */}
              <View style={styles.dividerContainer}>
                <View style={styles.dividerLine} />
                <Text style={styles.dividerText}>{i18n.t('common.or')}</Text>
                <View style={styles.dividerLine} />
              </View>

              {/* Sign Up Link */}
              <View style={styles.signUpContainer}>
                <Text style={styles.signUpText}>
                  {i18n.t('login.dontHaveAccount')}{' '}
                </Text>
                <TouchableOpacity
                  onPress={() => router.replace('/(auth)/register')}
                  // onPress={() => router.push('register')}
                >
                  <Text style={styles.signUpLink}>
                    {i18n.t('login.signUp')}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </LinearGradient>
    </View>
  );
};

export default LoginScreen;
