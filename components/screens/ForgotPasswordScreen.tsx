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
    ScrollView,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import * as yup from "yup";

import { useTranslation } from "react-i18next";
import apiService from "../../services/api.service";
import { styles } from "../../styles/common";
import CustomInput from "../common/CustomInput";

const defaultCredentials = {
  email: "vikas@gmail.com",
};

const schema = yup.object().shape({
  email: yup.string().required("Email is required"),
});

const ForgotPasswordScreen = () => {
  const { t } = useTranslation();
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
      console.log("error", error);
      toast.error("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container} className="!bg-screen">
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
            <Text className="!text-primary" style={styles.title}>
              {t("forgotPassword.pageTitle")}
            </Text>
          </View>

          {/* Form Section */}
          <View style={styles.formContainer} className="gap-4">
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
              <Text style={styles.loginButtonText}>
                {t("forgotPassword.pageTitle")}
              </Text>

              {loading ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <Ionicons
                  name="arrow-forward"
                  size={20}
                  color="#FFFFFF"
                  style={styles.buttonIcon}
                />
              )}
            </TouchableOpacity>

            {/* Sign Up Link */}
            <View style={styles.signUpContainer} className="!mb-6">
              <Text style={styles.signUpText}>{t("login.haveAccount")} </Text>
              <TouchableOpacity onPress={() => router.replace("/(auth)/login")}>
                <Text className="!text-primary" style={styles.signUpLink}>
                  {t("common.login")}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
};

export default ForgotPasswordScreen;
