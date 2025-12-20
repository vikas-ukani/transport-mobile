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
import i18n from '../../i18n/config';
import apiService from '../../services/api.service';
import { styles } from '../../styles/common';

const defaultCredentials = {
  email: 'vikas@gmail.com',
};

const schema = yup.object().shape({
  email: yup.string().required('Email is required'),
});

const ForgotPasswordScreen = () => {
  const [loading, setLoading] = useState(false);

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: yupResolver(schema),
  });

  const onSubmit = async (data: { email: string }) => {
    try {
      setLoading(true);
      const res = await apiService.forgotPassword(data.email);
      if (res.success) {
        toast.success(res.message, {
          duration: 15000,
        });
        // router.replace('/reset-password');
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
              <Text style={styles.title}>{i18n.t('forgotPassword.pageTitle')}</Text>
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
                      {i18n.t('forgotPassword.pageTitle')}
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
              <View style={styles.signUpContainer} className='!mb-6'>
                <Text style={styles.signUpText}>{i18n.t('login.haveAccount')} </Text>
                <TouchableOpacity
                  onPress={() => router.replace('/(auth)/login')}
                >
                  <Text style={styles.signUpLink}>{i18n.t('common.login')}</Text>
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </LinearGradient>
    </View>
  );
};

export default ForgotPasswordScreen;
