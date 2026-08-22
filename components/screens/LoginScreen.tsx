import { toast } from "@/lib/toast";
import { Ionicons } from "@expo/vector-icons";
import { yupResolver } from "@hookform/resolvers/yup";
import { router } from "expo-router";
import { useState } from "react";
import { useForm } from "react-hook-form";
import {
    ActivityIndicator,
    Image,
    KeyboardAvoidingView,
    Platform,
    Pressable,
    ScrollView,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import * as yup from "yup";
import { useAuth } from "../../context/AuthContext";

import { getApiUrl } from "@/services/api.service";
import { styles } from "@/styles/common";
import { useTranslation } from "react-i18next";
import CustomInput from "../common/CustomInput";

const schema = yup.object().shape({
  email: yup.string().required("Email is required"),
  password: yup
    .string()
    .required("Password is required")
    .min(6, "Password must be at least 6 characters"),
});

const LoginScreen = () => {
  const { t } = useTranslation();
  const { login } = useAuth();
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const {
    control,
    handleSubmit,
    formState: { errors },
    setValues,
  } = useForm({
    resolver: yupResolver(schema),
  });

  const onSubmit = async (data: { email: string; password: string }) => {
    try {
      setLoading(true);
      await login(data.email, data.password);
    } catch (error) {
      console.log("error", error);
      toast.error("Login failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container} className="bg-screen">
      {/* <LinearGradient
        colors={["#FFFFFF", "#F3F4F6", "#E5E7EB"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={styles.gradient}
      > */}
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.keyboardView}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Header Section */}
          <View style={styles.header}>
            <View className="flex-row items-center mt-6">
              <Image
                source={require("@/assets/logo.png")}
                style={{ width: 130, height: 130 }}
                resizeMode="contain"
              />
            </View>
            {/* <LinearGradient
                colors={["#9333EA", "#7C3AED"]}
                style={styles.logoCircle}
              >
                <Ionicons name="car-sport" size={40} color="#FFFFFF" />
              </LinearGradient> */}
            <Text className="!text-primary" style={styles.title}>
              {t("login.title")}
            </Text>
            <Text style={styles.subtitle}>{t("login.subtitle")}</Text>
            <Text style={styles.subtitle}>{getApiUrl()}</Text>
            {/* {__DEV__ && <Text style={styles.subtitle}>{getApiUrl()}</Text>} */}
          </View>

          {/* Form Section */}
          <View style={styles.formContainer}>
            {__DEV__ && (
              <View className="grid grid-cols-2 grid-flow-row gap-2 mb-4 w-full">
                <Pressable
                  className="p-2 border"
                  onPress={() =>
                    setValues({
                      email: "customer@gmail.com",
                      password: "customer",
                    })
                  }
                >
                  <Text>Customer: customer@gmail.com</Text>
                  <Text>Password: customer</Text>
                </Pressable>
                <Pressable
                  className="p-2 border"
                  onPress={() =>
                    setValues({
                      email: "vikas@gmail.com",
                      password: "password",
                    })
                  }
                >
                  <Text>Driver: vikas@gmail.com</Text>
                  <Text>Password: password</Text>
                </Pressable>
              </View>
            )}

            {/* Email/Mobile Input */}

            <CustomInput
              label={t("login.email")}
              name="email"
              control={control}
              errors={errors}
              placeholder={t("login.email")}
              autoCapitalize="none"
              frontIcon="mail-outline"
            />

            <CustomInput
              label={t("common.password")}
              name="password"
              control={control}
              errors={errors}
              placeholder={t("common.password")}
              maxLength={10}
              frontIcon="lock-closed-outline"
              backIcon={showPassword ? "eye-outline" : "eye-off-outline"}
              onBackIconPress={() => setShowPassword(!showPassword)}
              secureTextEntry={!showPassword}
            />

            {/* Forgot Password */}
            <TouchableOpacity
              style={styles.forgotPasswordContainer}
              onPress={() => router.push("/forgot-password")}
            >
              <Text style={styles.forgotPasswordText} className="text-primary">
                {t("login.forgotPassword")}
              </Text>
            </TouchableOpacity>

            {/* Login Button */}
            <TouchableOpacity
              style={[
                // styles.loginButton,
                loading && styles.loginButtonDisabled,
              ]}
              className="flex flex-row justify-center items-center w-full h-16 text-white bg-gradient-to-r rounded-xl bg-primary"
              onPress={handleSubmit(onSubmit)}
              disabled={loading}
              activeOpacity={0.8}
            >
              <Text style={styles.loginButtonText}>{t("common.login")}</Text>
              {loading ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <Ionicons
                  name="finger-print-sharp"
                  size={22}
                  color="#FFFFFF"
                  style={styles.buttonIcon}
                />
              )}
            </TouchableOpacity>

            {/* Divider */}
            <View style={styles.dividerContainer}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>{t("common.or")}</Text>
              <View style={styles.dividerLine} />
            </View>

            {/* Sign Up Link */}
            <View style={styles.signUpContainer} className="gap-2">
              <Text style={styles.signUpText}>
                {t("login.dontHaveAccount")}
              </Text>
              <TouchableOpacity
                onPress={() => router.replace("/(auth)/register")}
                // onPress={() => router.push('register')}
              >
                <Text className="text-primary" style={styles.signUpLink}>
                  {t("login.signUp")}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
      {/* </LinearGradient> */}
    </View>
  );
};

export default LoginScreen;
