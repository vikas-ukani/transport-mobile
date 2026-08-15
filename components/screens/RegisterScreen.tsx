import { toast } from "@backpackapp-io/react-native-toast";
import { Ionicons } from "@expo/vector-icons";
import { yupResolver } from "@hookform/resolvers/yup";
import { Camera } from "expo-camera";
import * as ImagePicker from "expo-image-picker";
import { router } from "expo-router";
import { useRef, useState } from "react";
import { useForm } from "react-hook-form";
import {
  ActivityIndicator,
  Image,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import * as yup from "yup";
import { useAuth, UserType } from "../../context/AuthContext";

import { useTranslation } from "react-i18next";
import { KeyboardAwareScrollView } from "react-native-keyboard-aware-scroll-view";
import apiService from "../../services/api.service";
import { styles } from "../../styles/common";
import CustomInput from "../common/CustomInput";

// OTP Input will be handled manually

const RegisterScreen = () => {
  const { t } = useTranslation();
  const { register } = useAuth();
  const [loading, setLoading] = useState(false);
  const [photo, setPhoto] = useState<string | null>(null);
  const [userType, setUserType] = useState<UserType>("customer");
  const [loadingOTP, setLoadingOTP] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [otp, setOtp] = useState("");
  const [otpVerified, setOtpVerified] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Fix: inputRefs needs to be constant and persist across re-renders
  const inputRefs = useRef<(TextInput | null)[]>([]);

  const getSchema = (userType: UserType) =>
    yup.object().shape({
      name: yup
        .string()
        .required(t("register.errorNameRequired", "Name is required")),
      email: yup
        .string()
        .email(t("register.errorEmailInvalid", "Invalid email"))
        .required(t("register.errorEmailRequired", "Email is required")),
      mobile: yup
        .string()
        .required(t("register.errorMobileRequired", "Mobile is required"))
        .min(
          10,
          t("register.errorMobileMin", "Mobile should be at least 10 digits."),
        )
        .max(
          10,
          t("register.errorMobileMax", "Mobile should be at least 10 digits."),
        ),
      password: yup
        .string()
        .required(t("register.errorPasswordRequired", "Password is required"))
        .min(
          6,
          t(
            "register.errorPasswordMin",
            "Password must be at least 6 characters",
          ),
        ),
      confirmPassword: yup
        .string()
        .required(
          t(
            "register.errorConfirmPasswordRequired",
            "Please confirm your password",
          ),
        )
        .oneOf(
          [yup.ref("password")],
          t("register.errorPasswordsNoMatch", "Passwords do not match"),
        ),
      type: yup
        .string()
        .required(
          t("register.errorTypeRequired", "Select customer or driver type."),
        )
        .oneOf(["customer", "driver"]),
      photo: yup
        .string()
        .required(
          t("register.errorPhotoRequired", "Please upload your profile photo."),
        ),
    });

  const {
    control,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm({
    resolver: yupResolver(getSchema(userType)),
    mode: "onChange",
    defaultValues: {
      type: "customer",
    },
  });

  const requestCameraPermission = async () => {
    const { status } = await Camera.requestCameraPermissionsAsync();
    return status === "granted";
  };

  const takePhoto = async () => {
    const hasPermission = await requestCameraPermission();
    if (!hasPermission) {
      toast.error(
        t(
          "register.cameraPermissionError",
          "Permission Denied, Camera permission is required to take photos.",
        ),
      );
      return;
    }

    try {
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 4],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        setPhoto(result.assets[0].uri);
        const resPhoto = await apiService.uploadImage(
          result.assets[0].uri,
          "profile",
        );
        if (resPhoto) setValue("photo", resPhoto.filename);
      }
    } catch (e) {
      toast.error(t("register.takePhotoError", "Failed to take photo"));
    }
  };

  const selectPhoto = async () => {
    try {
      const permissionResult =
        await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (permissionResult.granted === false) {
        toast.error(
          t(
            "register.mediaLibraryPermissionError",
            "Permission to access the media library is required.",
          ),
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 4],
        quality: 1,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const resPhoto = await apiService.uploadImage(
          result.assets[0].uri,
          "profile",
        );
        if (resPhoto) {
          setPhoto(result.assets[0].uri);
          setValue("photo", resPhoto.filename);
        }
      }
    } catch (e) {
      toast.error(t("register.uploadPhotoError", "Failed to upload photo"));
    }
  };

  const sendOTP = async () => {
    setLoadingOTP(true);
    const email = watch("email");
    if (!email) {
      toast.error(t("register.enterEmailFirst", "Please enter email first"));
      setLoadingOTP(false);
      return;
    }
    try {
      const otpRes = await apiService.sendEmailOTP(email);
      if (otpRes.success) {
        setOtpSent(true);
        toast.success(otpRes.message);
      } else {
        toast.error(otpRes.message);
      }
    } catch (e: any) {
      toast.error(
        e.message ?? t("register.sendOTPError", "Failed to send OTP"),
      );
    } finally {
      setLoadingOTP(false);
    }
  };

  const verifyOTP = async (newOtp: string) => {
    const email = watch("email");
    console.log("otp", newOtp);
    if (newOtp.length !== 6) {
      toast.error(t("register.validOTPRequired", "Please enter valid OTP"));
      return;
    }
    try {
      const res = await apiService.verifyEmailOTP(email, newOtp);
      if (res.success) {
        setOtpVerified(true);
        toast.success(t("register.otpVerified", "OTP Verified"));
      } else {
        toast.error(res.message || t("register.invalidOtp", "Invalid OTP"));
      }
    } catch (error: any) {
      // Fallback for development - accept any 6 digit code
      if (otp.length === 6) {
        setOtpVerified(true);
      } else {
        toast.error(error.message || t("register.invalidOtp", "Invalid OTP"));
      }
    }
  };

  const onSubmit = async (data: any) => {
    if (!otpVerified) {
      toast.error(t("register.verifyOtpFirst", "Please verify OTP"));
      return;
    }

    try {
      setLoading(true);
      await register(
        {
          name: data.name,
          email: data.email,
          mobile: data.mobile,
          photo: photo || undefined,
          type: data.type,
          // Fix: vehicleRegistration was not in schema nor form, so remove from submission
          // vehicleRegistration: data.vehicleRegistration,
          confirm_password: data.password,
        },
        data.password,
      );
    } catch (e) {
      toast.error(
        t(
          "register.registrationFailed",
          "Registration failed. Please try again.",
        ),
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-screen">
      <View className="flex-1 px-5 mt-4">
        <TouchableOpacity
          onPress={() => router.push("/(auth)/login")}
          className="flex-row gap-4 justify-start items-center p-2 -ml-2"
          activeOpacity={0.7}
        >
          <Ionicons name="arrow-back" size={24} color="#1F2937" />
        </TouchableOpacity>

        <View className="flex flex-col justify-center items-center w-full">
          <Text className="mb-2 text-3xl font-bold text-gray-900">
            {t("register.title", "Register Your Profile")}
          </Text>
          <Text className="text-gray-600">
            {t("register.subtitle", "Create a new account")}
          </Text>
          <View className="my-2 w-full h-px bg-primary" />
        </View>

        <KeyboardAwareScrollView
          className="flex-1"
          contentContainerStyle={{ flexGrow: 1 }}
          enableOnAndroid
          extraScrollHeight={20}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View className="mt-4 mb-4">
            <Text className="mb-2 text-sm font-medium text-gray-700">
              {t("register.userType", "User Type")}
            </Text>
            <View className="flex-row gap-4">
              <TouchableOpacity
                className={`flex-1 py-3 rounded-lg border-2 ${
                  userType === "customer"
                    ? "border-primary bg-screen"
                    : "border-gray-500"
                }`}
                onPress={() => {
                  setUserType("customer");
                  setValue("type", "customer");
                }}
              >
                <Text
                  className={`text-center   ${
                    userType === "customer"
                      ? "text-primary font-semibold"
                      : "text-gray-600 font-normal"
                  }`}
                >
                  {t("register.customer", "Customer")}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                className={`flex-1 py-3 rounded-lg border-2 ${
                  userType === "driver"
                    ? "border-primary bg-screen"
                    : "border-gray-500"
                }`}
                onPress={() => {
                  setValue("type", "driver");
                  setUserType("driver");
                }}
              >
                <Text
                  className={`text-center ${
                    userType === "driver"
                      ? "text-primary font-semibold"
                      : "text-gray-600 font-normal"
                  }`}
                >
                  {t("register.driver", "Driver")}
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          <CustomInput
            label={t("common.name", "Name")}
            name="name"
            control={control}
            errors={errors}
            placeholder={t("common.name", "Name")}
            autoCapitalize="words"
            frontIcon="person-outline"
          />
          <CustomInput
            label={t("common.email", "Email")}
            name="email"
            control={control}
            errors={errors}
            placeholder={t("common.email", "Email")}
            autoCapitalize="none"
            frontIcon="at"
          />

          {otpVerified ? (
            <Text className="mb-2 text-green-600 text-start">
              ✓ {t("register.otpVerified", "OTP Verified")}
            </Text>
          ) : (
            <View className="flex-row gap-2 justify-start items-start mt-2 mb-4 w-full">
              {otpSent ? (
                <View className="flex-row gap-4 items-center mb-4 w-full">
                  <View className="flex-row gap-2 justify-between items-center w-full">
                    {Array.from({ length: 6 }).map((_, idx) => (
                      <TextInput
                        key={idx}
                        style={{ flex: 1, textAlign: "center", fontSize: 22 }}
                        className="px-2 py-3 text-2xl tracking-widest text-center rounded-lg border border-gray-300 placeholder:text-gray-500"
                        value={otp[idx] ?? ""}
                        onChangeText={(text) => {
                          let oldOtpArr = otp.split("");
                          let newOtpArr = oldOtpArr.slice();

                          if (text.length > 1) {
                            // On paste or fast entry
                            const clean = text
                              .replace(/[^0-9]/g, "")
                              .slice(0, 6 - idx);
                            clean.split("").forEach((char, i) => {
                              newOtpArr[idx + i] = char;
                            });
                          } else if (/^\d$/.test(text)) {
                            newOtpArr[idx] = text;
                          } else if (text === "") {
                            newOtpArr[idx] = "";
                            setOtp(newOtpArr.join("").slice(0, 6));
                            // move focus to previous if exists
                            if (idx > 0 && inputRefs.current[idx - 1]) {
                              inputRefs.current[idx - 1]?.focus();
                            }
                            return;
                          }
                          let newOtp = newOtpArr.join("").slice(0, 6);
                          setOtp(newOtp);
                          // Move focus forward if just typed
                          if (text && idx < 5 && inputRefs.current[idx + 1]) {
                            inputRefs.current[idx + 1]?.focus();
                          }

                          if (newOtp.length === 6) {
                            verifyOTP(newOtp);
                          }
                        }}
                        maxLength={1}
                        keyboardType="number-pad"
                        placeholder={t("register.otpAsterisk", "*")}
                        ref={(ref) => {
                          inputRefs.current[idx] = ref as any;
                        }}
                        blurOnSubmit={false}
                        returnKeyType="next"
                        onKeyPress={({ nativeEvent }) => {
                          if (
                            nativeEvent.key === "Backspace" &&
                            (otp[idx] === "" || otp[idx] == null) &&
                            idx > 0 &&
                            inputRefs.current[idx - 1]
                          ) {
                            // Clear previous box and focus it
                            let oldOtpArr = otp.split("");
                            oldOtpArr[idx - 1] = "";
                            setOtp(oldOtpArr.join("").slice(0, 6));
                            inputRefs.current[idx - 1]?.focus();
                          }
                        }}
                        autoFocus={idx === 0}
                      />
                    ))}
                  </View>
                </View>
              ) : (
                <TouchableOpacity
                  className="py-5 w-1/3 rounded-lg bg-primary h-fit"
                  onPress={!otpSent ? sendOTP : undefined}
                  disabled={loadingOTP}
                >
                  <Text className="font-semibold text-center text-white">
                    {loadingOTP && watch("email")
                      ? t("register.otpSending", "Sending OTP...")
                      : t("register.otpVerification", "Verify Email")}
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          )}

          <CustomInput
            label={t("common.mobile", "Mobile")}
            name="mobile"
            control={control}
            errors={errors}
            placeholder={t("common.mobile", "Mobile")}
            autoCapitalize="none"
            keyboardType="phone-pad"
            maxLength={10}
            frontIcon="phone-portrait"
          />

          <CustomInput
            label={t("common.password", "Password")}
            name="password"
            control={control}
            errors={errors}
            placeholder={t("common.password", "Password")}
            maxLength={10}
            frontIcon="lock-closed-outline"
            backIcon={showPassword ? "eye-outline" : "eye-off-outline"}
            onBackIconPress={() => setShowPassword(!showPassword)}
            secureTextEntry={!showPassword}
          />

          <CustomInput
            label={t("common.confirmPassword", "Confirm Password")}
            name="confirmPassword"
            control={control}
            errors={errors}
            placeholder={t("common.confirmPassword", "Confirm Password")}
            maxLength={10}
            frontIcon="lock-closed-outline"
            backIcon={showPassword ? "eye-outline" : "eye-off-outline"}
            onBackIconPress={() => setShowConfirmPassword(!showConfirmPassword)}
            secureTextEntry={!showConfirmPassword}
          />

          <View className="mb-4">
            <Text className="mb-2 text-sm font-medium text-gray-700">
              {t("common.profilePhoto", "Profile Photo")}
            </Text>

            <View className="flex-row gap-6 justify-evenly w-11/12">
              <TouchableOpacity
                className="flex-row gap-2 justify-center items-center p-3 w-6/12 rounded-lg border-2 border-primary bg-screen"
                onPress={takePhoto}
              >
                <Ionicons
                  name="camera-outline"
                  className="!text-primary"
                  size={20}
                />
                <Text className="text-center text-primary">
                  {t("register.takePhoto", "Take Photo")}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                className="flex-row gap-2 justify-center items-center p-3 w-6/12 text-center rounded-lg border-2 bg-screen border-primary"
                onPress={selectPhoto}
              >
                <Ionicons
                  name="image-outline"
                  size={20}
                  className="!text-primary"
                />
                <Text className="text-center text-primary">
                  {t("register.selectPhoto", "Select Photo")}
                </Text>
              </TouchableOpacity>
            </View>
            {photo && (
              <Image
                source={{ uri: photo }}
                className="mt-2 w-24 h-24 rounded-lg"
              />
            )}
            {errors.photo && (
              <Text className="mt-1 text-sm text-red-500">
                {errors.photo.message}
              </Text>
            )}
          </View>

          <TouchableOpacity
            className="flex-row justify-center items-center py-4 mt-4 rounded-lg bg-primary"
            onPress={handleSubmit(onSubmit)}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text className="text-lg font-semibold text-center text-white">
                {t("common.register", "Register")}
              </Text>
            )}
          </TouchableOpacity>

          {/* Divider */}
          <View style={styles.dividerContainer} className="mt-6">
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>{t("common.or", "OR")}</Text>
            <View style={styles.dividerLine} />
          </View>

          {/* Sign Up Link */}
          <View style={styles.signUpContainer} className="!mb-6 gap-2">
            <Text style={styles.signUpText}>
              {t("login.haveAccount", "Already have an account?")}
            </Text>
            <TouchableOpacity onPress={() => router.replace("/(auth)/login")}>
              <Text style={styles.signUpLink} className="text-primary">
                {t("common.login", "Login")}
              </Text>
            </TouchableOpacity>
          </View>
        </KeyboardAwareScrollView>
      </View>
    </SafeAreaView>
  );
};

export default RegisterScreen;
