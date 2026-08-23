import { Ionicons } from "@expo/vector-icons";
import { yupResolver } from "@hookform/resolvers/yup";
import * as ImagePicker from "expo-image-picker";
import { useGlobalSearchParams, useRouter } from "expo-router";
import { startTransition, useEffect, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import RazorpayCheckout from "react-native-razorpay";

import { toast } from "@/lib/toast";
import { useTranslation } from "react-i18next";
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  NativeModules,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { RefreshControl } from "react-native-gesture-handler";
import { SafeAreaView } from "react-native-safe-area-context";
import * as yup from "yup";
import { useAuth } from "../../../context/AuthContext";
import { apiService, getBaseUrl } from "../../../services/api.service";
import CustomInput from "../../common/CustomInput";
import MapLocationModal from "../../common/MapLocationModal";

const GARAGE_TYPES = [
  { label: "Car", value: "car" },
  { label: "Pickup", value: "pickup" },
  { label: "Truck", value: "truck" },
];

// Fix: types should be array of strings for multiple garage types
const garageSchema = yup.object().shape({
  name: yup.string().required("Garage name is required"),
  mobile: yup
    .string()
    .required("Mobile number is required")
    .matches(/^[0-9]{10,12}$/, "Mobile must be 10-15 digits"),
  latitude: yup
    .number()
    .typeError("Latitude is required")
    .required("Latitude is required"),
  longitude: yup
    .number()
    .typeError("Longitude is required")
    .required("Longitude is required"),
  address: yup.string().required("Address is required"),
  ownerAadhaar: yup.string().required("Owner Aadhaar card is required"),
  // Change type to types: array of strings, required at least one selection and must be among options
  types: yup
    .array()
    .of(yup.string().oneOf(GARAGE_TYPES.map((item) => item.value)))
    .min(1, "Select at least one garage type")
    .required("Garage type is required"),
  images: yup.array().of(yup.string()),
});

const CreateGarageScreen = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { id } = useGlobalSearchParams();
  const router = useRouter();
  const [createGarageAmount, setCreateGarageAmount] = useState(null);
  const [shoMap, setShowMap] = useState(false);
  const [images, setImages] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  const {
    control,
    handleSubmit,
    setValue,
    getValues,
    formState: { errors, isSubmitting },
    reset,
  } = useForm({
    resolver: yupResolver(garageSchema),
    defaultValues: {
      name: "",
      mobile: "",
      // latitude: 37.4219978,
      // longitude: -122.0840023,
      // address: "B Saragam",
      latitude: undefined,
      longitude: undefined,
      address: "",
      ownerAadhaar: "",
      // Change: default types to []
      types: [],
      images: [],
    },
    mode: "all",
    reValidateMode: "onChange",
  });
  const fetchGarage = async () => {
    if (!id) return;
    setLoading(true);
    try {
      const response = await apiService.getGarageById(id as string);
      if (response.success && response.data) {
        const garage: any = response.data;
        // If images are URLs or objects, adjust as needed
        setImages(garage.imageUrls || []);
        reset(garage);
        setValue("images", garage.images);
        // setValues("images", garage.images || []);
      } else {
        toast.error(response.message || "Failed to load garage details");
      }
    } catch (err: any) {
      console.log("err.message", err);
      toast.error(err.message || "Failed to load garage");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const getCreateGarageAmount = async () => {
      const res = await apiService.getCreateGarageAmount();
      if (res.success) {
        setCreateGarageAmount(res.createGarageAmount);
      }
    };

    getCreateGarageAmount();
  }, []);

  useEffect(() => {
    fetchGarage();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const onSubmit = async (data: any) => {
    try {
      toast.dismiss();
      // Upload RC Photos (handles multiple RC images)
      let uploadedImages: any[] = await Promise.all(
        images
          .filter((photo) => photo.includes("uploads") === false)
          .map(async (asset) => await apiService.uploadImage(asset, "garage")),
      );

      const upImages = getValues("images") || [];
      if (id && upImages.length) {
        uploadedImages = [...uploadedImages, upImages?.map((id) => id)];
      }

      let imageIds = uploadedImages.map((u: any) => u?.id).filter(Boolean);
      if (id) {
        imageIds = Array.from(
          new Set([
            ...(getValues("images") || []),
            ...(imageIds.length ? imageIds : []),
          ]),
        );
      }

      // IF CREATE then validate image
      if (imageIds.length === 0) {
        toast.error(t("garage.uploadAtLeast1Image"));
        setLoading(false);
        return;
      }

      const newGarage = {
        ...data,
        images: imageIds,
      };

      newGarage.id && delete newGarage.id;
      let resData = null;
      if (id) {
        resData = await apiService.updateGarage(id as string, newGarage);
        if (resData.success) {
          toast.success("Garage updated successfully");
        }
      } else {
        let orderData;
        try {
          orderData = await apiService.createGaragePayOrder();
        } catch (err: any) {
          toast.error(`Failed to get payment order. ${err.message}`);
          return;
        }
        if (!orderData || !orderData.order?.id || !orderData.payAmount) {
          toast.error("Invalid order data from server.");
          return;
        }

        const key = process.env.EXPO_PUBLIC_RAZORPAY_KEY || "";
        const name = process.env.EXPO_PUBLIC_APP_NAME || "Safar Path";

        if (!key) {
          toast.error(
            "Razorpay Key is not configured. Please contact support.",
          );
          return;
        }

        const options = {
          description: "Pay before create garage.",
          currency: "INR",
          key: key,
          amount: orderData.payAmount, // Should be in paise (integer)
          name: name,
          order_id: orderData.order.id,
          prefill: {
            email: user?.email || "email@example.com",
            contact: user?.mobile || "9999999999",
            name: user?.name || "John Doe",
          },
          theme: { color: "#045498" },
        };

        // 4. Defensive: ensure RazorpayCheckout exists and is an object/function
        if (Platform.OS !== "android" && Platform.OS !== "ios") {
          setLoading(false);
          toast.error("Razorpay is only supported on mobile devices.");
          return;
        }
        if (
          !NativeModules.RNRazorpayCheckout &&
          !(global as any).__turboModuleProxy &&
          !(global as any).TurboModuleRegistry
        ) {
          setLoading(false);
          toast.error(
            "Razorpay is not supported in Expo Go. Please open this app in your installed Development Build.",
          );
          return;
        }
        if (!RazorpayCheckout || typeof RazorpayCheckout.open !== "function") {
          setLoading(false);
          toast.error(
            "Razorpay module could not be loaded. Please reinstall the app or contact support.",
          );
          return;
        }

        try {
          toast.dismiss();
          RazorpayCheckout.open(options)
            .then(async (data: any) => {
              // 5. Send data to backend for payment verification
              try {
                const verifyData = await apiService.verifyPayment({
                  razorpay_order_id: data.razorpay_order_id,
                  razorpay_payment_id: data.razorpay_payment_id,
                  razorpay_signature: data.razorpay_signature,
                });
                if (verifyData && verifyData.success) {
                  resData = await apiService.createGarage({
                    ...newGarage,
                    paymentId: verifyData.data.razorpay_payment_id,
                  });
                  if (resData.success) {
                    toast.success("Garage created successfully");
                    reset({
                      name: "",
                      mobile: "",
                      latitude: undefined,
                      longitude: undefined,
                      address: "",
                      ownerAadhaar: "",
                      types: [],
                      images: [],
                    });
                    setImages([]);
                    router.push("/(apps)/garage/my-garages");
                  } else {
                    toast.error(resData.message);
                  }
                } else {
                  toast.error(`Verification Failed: ${verifyData.message}`);
                }
              } catch (err: any) {
                console.log(
                  `Could not verify payment: ${err?.message || "Unknown error"}`,
                );
                toast.error(
                  `Could not verify payment: ${err?.message || "Unknown error"}`,
                );
              }
            })
            .catch((error: any) => {
              if (error && error.code === 0) {
                // user-cancelled or fallback
                console.log("Payment cancelled by user.");
                toast.error("Payment cancelled by user.");
              } else {
                console.log(
                  "error?.description",
                  error?.description ||
                  error?.message ||
                  "Payment Cancelled or Failed.",
                );
                toast.error(
                  error?.description ||
                  error?.message ||
                  "Payment Cancelled or Failed.",
                );
              }
            });
        } catch (err: any) {
          // Should rarely get here if SDK initialized correctly
          toast.error(
            "Could not launch Razorpay payment. Please restart the app or contact support.",
          );
          console.log("Outer Razorpay open error:", err);
        }
      }
      if (resData.success) {
        reset({
          name: "",
          mobile: "",
          latitude: undefined,
          longitude: undefined,
          address: "",
          ownerAadhaar: "",
          types: [],
          images: [],
        });

        setImages([]);
        router.push("/(apps)/garage/my-garages");

      } else {
        toast.error(resData.message || "Garage create failed");
      }
    } catch (err: any) {
      toast.error(err.message || "Something went wrong");
    }
  };

  const selectPhoto = async () => {
    try {
      toast.dismiss();
      const permissionResult =
        await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (permissionResult.granted === false) {
        toast.error("Permission to access the media library is required.");
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: false,
        allowsMultipleSelection: true,
        aspect: [4, 4],
        quality: 1,
        selectionLimit: 4,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        setImages([...images, ...result.assets.map((asset) => asset.uri)]);
      }
    } catch (e) {
      console.log("error", e);
      toast.error("Failed to upload photo");
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-screen">
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View className="flex-row items-center px-5 py-4 bg-white border-b border-gray-100 shadow-lg">
          <TouchableOpacity
            onPress={() => {
              reset();
              router.push("/(apps)/garage/my-garages");
            }}
            className="flex-row gap-4 justify-start items-center p-2 -ml-2"
            activeOpacity={0.7}
          >
            <Ionicons name="arrow-back" size={24} color="#1F2937" />
            <Text className="text-xl font-bold text-gray-900">
              {id
                ? t("garage.updateGarage", "Update Garage")
                : t("garage.createGarage", "Create Garage")}
            </Text>
          </TouchableOpacity>
          <View style={{ width: 40 }} />
        </View>
        <ScrollView
          className="flex-1 px-4 py-4"
          contentContainerStyle={{ paddingBottom: 40 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={loading} onRefresh={fetchGarage} />
          }
        >
          <CustomInput
            label={t("garage.garageName", "Garage Name")}
            name="name"
            control={control}
            errors={errors}
            placeholder={t("garage.garageNamePlaceholder", "Enter garage name")}
          />
          <CustomInput
            label={t("garage.mobile", "Mobile Number")}
            name="mobile"
            control={control}
            errors={errors}
            placeholder={t("garage.mobilePlaceholder", "Enter mobile number")}
            keyboardType="phone-pad"
            maxLength={12}
          />

          <View className="mb-6">
            <View className="flex-row gap-2 justify-between">
              <View className="flex-row gap-1 mb-3 text-sm font-bold text-gray-700">
                <Text className="font-normal">
                  {t("garage.address", "Garage Address")}
                </Text>
                <Text className="items-start text-danger">*</Text>
                {errors.address && (
                  <Text className="ml-1 text-sm font-medium text-red-500">
                    {errors.address.message}
                  </Text>
                )}
              </View>
              <TouchableOpacity
                className="flex-row gap-1 justify-center items-center mr-2 text-center rounded"
                onPress={() => setShowMap(true)}
                activeOpacity={0.75}
              >
                <Ionicons name="location" size={18} color="#6D28D9" />
                <Text>{t("common.pickLocation")}</Text>
              </TouchableOpacity>
            </View>
            <Controller
              control={control}
              name="address"
              render={({ field: { onChange, onBlur, value } }) => (
                <TextInput
                  className="px-5 text-base font-medium border-primary bg-white rounded-xl border !min-h-[60px]"
                  placeholder={t("garage.address")}
                  textAlignVertical="top"
                  value={value}
                  onChangeText={onChange}
                  onBlur={onBlur}
                  placeholderTextColor="#9CA3AF"
                  multiline
                  readOnly
                  numberOfLines={3}
                  style={{ minHeight: 80, textAlignVertical: "top" }}
                />
              )}
            />
            {Platform.OS !== "web" && (
              <MapLocationModal
                show={shoMap}
                onHide={() => setShowMap(false)}
                onLocationSelected={({ latitude, longitude, address }: any) => {
                  startTransition(() => {
                    setValue("address", address);
                    setValue("latitude", latitude);
                    setValue("longitude", longitude);
                    setShowMap(false);
                  });
                }}
                latitude={getValues("latitude")}
                longitude={getValues("longitude")}
                formattedAddress={getValues("address")}
                isSetDefaultCurrentLocation={true}
              />
            )}
          </View>
          <CustomInput
            label={t("garage.ownerAadhaar", "Owner Aadhaar")}
            name="ownerAadhaar"
            control={control}
            errors={errors}
            placeholder={t("garage.ownerAadhaarPlaceholder", "Aadhaar Number")}
            keyboardType="numeric"
            inputMode="numeric"
            maxLength={12}
          />
          <View className="mb-4">
            <Text className="flex-row gap-1 mb-3 text-sm font-bold text-gray-700">
              {t("garage.type", "Garage Type")}{" "}
              <Text className="items-start text-danger">*</Text>
              {errors?.types && (
                <Text className="ml-1 text-sm font-medium text-red-500">
                  {errors.types.message}
                </Text>
              )}
            </Text>
            <Controller
              control={control}
              name="types"
              render={({ field: { value } }) => (
                <View className="flex-row flex-wrap gap-2">
                  {GARAGE_TYPES.map((item: any) => {
                    // value should be array of strings
                    const selectedTypes: any = value || [];
                    const isSelected =
                      Array.isArray(selectedTypes) &&
                      selectedTypes.includes(item.value);

                    return (
                      <TouchableOpacity
                        key={item.value}
                        className={`flex-1 flex-row items-center justify-center py-3 rounded-xl border-2 ${isSelected
                          ? "border-primary bg-primary/10"
                          : "bg-white border-gray-300"
                          }`}
                        activeOpacity={0.8}
                        onPress={() => {
                          let currentSelected: any = getValues("types") || [];
                          if (!Array.isArray(currentSelected)) {
                            currentSelected = [];
                          }
                          if (currentSelected.includes(item.value)) {
                            setValue(
                              "types",
                              currentSelected.filter(
                                (t: string) => t !== item.value,
                              ),
                            );
                          } else {
                            setValue("types", [...currentSelected, item.value]);
                          }
                        }}
                      >
                        <Text
                          className={`font-bold text-base ${isSelected ? "text-primary" : "text-gray-700"
                            }`}
                        >
                          {item.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              )}
            />
          </View>
          <View className="mb-4">
            <Text className="flex-row gap-2 mb-3 text-sm font-bold text-gray-700">
              {t("garage.images", "Garage Images")}{" "}
              <Text className="items-start text-danger">*</Text>
              {errors?.images && (
                <Text className="ml-2 text-sm font-medium text-red-500">
                  {errors.images.message}
                </Text>
              )}
            </Text>
            <View className="flex-row flex-wrap gap-2 mb-2">
              <TouchableOpacity
                className="flex-row gap-2 justify-center items-center p-3 w-1/2 h-20 text-center rounded-lg border-2 bg-primary/10 border-primary/50"
                onPress={selectPhoto}
              >
                <Ionicons name="image-outline" size={20} />
                <Text className="text-center text-gray-700">
                  {t("register.selectPhoto")}
                </Text>
              </TouchableOpacity>
              {images.length > 0 && (
                <View className="flex-row flex-wrap mt-4 w-full">
                  {images.map((uri, index) => (
                    <View
                      key={index}
                      className="relative mr-3 mb-3"
                      style={{
                        width: "48%",
                        marginRight: index % 2 === 0 ? "4%" : 0,
                      }}
                    >
                      <Image
                        source={{
                          uri: uri.includes("/uploads")
                            ? getBaseUrl() + uri
                            : uri,
                        }}
                        className="object-contain w-full h-32 bg-gray-100 rounded-xl"
                      />
                      <TouchableOpacity
                        className="absolute -top-2 -right-2 p-1 bg-red-500 rounded-full shadow-lg"
                        onPress={() => {
                          setImages(images.filter((_, i) => i !== index));
                          const imageIds = getValues("images") || [];
                          setValue(
                            "images",
                            imageIds.filter((_, i) => i !== index),
                          );
                        }}
                        activeOpacity={0.8}
                      >
                        <Ionicons name="close" size={18} color="#fff" />
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>
              )}
            </View>
          </View>

          <TouchableOpacity
            className={`flex-row justify-center items-center py-5 rounded-xl shadow-lg ${isSubmitting ? "bg-gray-400" : "bg-primary"
              }`}
            onPress={handleSubmit(onSubmit)}
            disabled={isSubmitting}
            activeOpacity={0.85}
          >
            {isSubmitting ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Ionicons
                  name="checkmark-circle-outline"
                  size={22}
                  color="#FFFFFF"
                />
                <Text className="ml-2 text-lg font-bold text-center text-white">
                  {id
                    ? t("garage.updateGarage", "Update Garage")
                    : t(
                      "garage.createGarage",
                      `Pay ${createGarageAmount} TO Create Garage`,
                    )}
                </Text>
              </>
            )}
          </TouchableOpacity>

          {id == null && (
            <View className="p-4 my-5 rounded-xl border-l-4 bg-primary/20 border-primary">
              <Text className="text-base text-primary">
                {t(
                  "garage.expiryNote",
                  "Garage will be expired in next 3 month. You can re-activate after expired.",
                )}
              </Text>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

export default CreateGarageScreen;
