import { toast } from "@backpackapp-io/react-native-toast";
import {
  FontAwesome5,
  Ionicons,
  MaterialCommunityIcons,
} from "@expo/vector-icons";
import { yupResolver } from "@hookform/resolvers/yup";
import { Picker } from "@react-native-picker/picker";
import { Camera } from "expo-camera";
import * as ImagePicker from "expo-image-picker";
import { router, useGlobalSearchParams } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import {
  ActivityIndicator,
  Alert,
  Image,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-aware-scroll-view";
import { SafeAreaView } from "react-native-safe-area-context";
import * as yup from "yup";
import { VEHICLE_RC_PATTERN_VALIDATION } from "../../constants/vehicle";
import { useAuth } from "../../context/AuthContext";

import apiService, { getBaseUrl } from "../../services/api.service";

const schema = yup.object().shape({
  driverName: yup.string().required("Driver Name is required"),
  mobileNumber: yup.string().required("Driver mobile is required"),
  rcNumber: yup
    .string()
    .required("RC Book number is required")
    .matches(
      VEHICLE_RC_PATTERN_VALIDATION,
      "Invalid RC number format. Example: MH12AB1234",
    ),
  truckType: yup.string().required("Truck type is required"),
  bodyType: yup.string().required("Body type is required"),
  truckLength: yup.string().required("Truck length is required"),
  loadCapacity: yup.string().required("Load capacity is required"),
  truckHeight: yup.string().required("Truck height is required"),
});

const VehicleRegistrationScreen = () => {
  const { id } = useGlobalSearchParams();
  const { t } = useTranslation();

  const { user, updateUser } = useAuth();
  const [rcPhotos, setRcPhotos] = useState<string[]>([]);
  const [truckPhoto, setTruckPhoto] = useState<string[]>([]);
  const [truckRCIds, setTruckRCIds] = useState<string[]>([]);
  const [truckPhotoIds, setTruckPhotoIds] = useState<string[]>([]);
  const [referralCodeVisible, setReferralCodeVisible] = useState(false);
  const [referralCode, setReferralCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [registrationFeeCents, setRegistrationFeeCents] = useState<
    number | null
  >(null);
  const [paymentCurrency, setPaymentCurrency] = useState("inr");

  // Ref for accessing KeyboardAwareScrollView and ScrollView for scrollTo
  const keyboardAwareScrollRef = useRef<any>(null);
  const formScrollRef = useRef<any>(null);

  const {
    control,
    handleSubmit,
    reset,
    getValues,
    setValue,
    formState: { errors },
    trigger,
  } = useForm({
    resolver: yupResolver(schema),
    shouldFocusError: true,
    shouldUseNativeValidation: true,
    defaultValues: {
      driverName: user?.name || "",
      mobileNumber: user?.mobile || "",
      rcNumber: "",
      truckType: "pickup",
      bodyType: "open",
      truckLength: "7",
      loadCapacity: "10",
      truckHeight: "10",
    },
  });

  useEffect(() => {
    if (id) {
      getVehicle(id as string);
    }
  }, [id]);

  useEffect(() => {
    if (id) return;
    let alive = true;
    apiService.getStripeConfig().then((c: any) => {
      if (!alive || !c?.success) return;
      setRegistrationFeeCents(c.vehicleRegistrationFeeCents ?? null);
      setPaymentCurrency(c.currency || "inr");
    });
    return () => {
      alive = false;
    };
  }, [id]);

  const getVehicle = async (id: string) => {
    try {
      setLoading(true);
      // Replace this URL with your actual API endpoint
      const res = await apiService.getVehicle(id);
      if (res?.success === false) {
        toast.error(res.message || "Failed to fetch vehicle data");
        return;
      }
      const vehicleData = res.data;
      // Set form values with data from fetched vehicle
      reset({
        driverName: vehicleData.driverName || user?.name,
        mobileNumber: vehicleData.mobileNumber || user?.mobile,
        rcNumber: vehicleData.rcNumber || "",
        truckType: vehicleData.truckType || "pickup",
        bodyType: vehicleData.bodyType || "open",
        truckLength: vehicleData.truckLength || "7",
        loadCapacity: vehicleData.loadCapacity || "10",
        truckHeight: vehicleData.truckHeight || "10",
      });

      // Set rcPhotos and truckPhoto if available
      if (vehicleData.rcPhotos && vehicleData.rcPhotos.length > 0) {
        setRcPhotos(
          vehicleData.rcPhotos.map((img: any) => getBaseUrl() + img.url),
        );
        setTruckRCIds(vehicleData.rcPhotos.map((rcPh: any) => rcPh.id) || []);
      }

      // Truck Photos
      if (vehicleData.images && vehicleData.images.length > 0) {
        setTruckPhoto(
          vehicleData.images.map((img: any) => getBaseUrl() + img.url),
        );
        setTruckPhotoIds(vehicleData.imageIds || []);
      }
    } catch (error) {
      console.error("Error fetching vehicle:", error);
    } finally {
      setLoading(false);
    }
  };

  const requestCameraPermission = async () => {
    const { status } = await Camera.requestCameraPermissionsAsync();
    return status === "granted";
  };

  const takeTruckPhoto = async (type = "truck") => {
    const hasPermission = await requestCameraPermission();
    if (!hasPermission) {
      toast.error(
        "Permission Denied, Camera permission is required to take photos.",
      );
      return;
    }

    try {
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        aspect: [4, 3],
        quality: 1,
        selectionLimit: type === "rc" ? 2 : 4,
      });

      if (!result.canceled && result.assets[0]) {
        if (type === "truck") {
          setTruckPhoto([
            ...truckPhoto,
            ...result.assets.map((asset) => asset.uri),
          ]);
        } else if (type === "rc") {
          setRcPhotos([
            ...rcPhotos,
            ...result.assets.map((asset) => asset.uri),
          ]);
        }
      }
    } catch (e: any) {
      toast.error("Failed to take photo: " + e.message);
    }
  };

  const selectPhoto = async (type: "truck" | "rc" = "truck") => {
    try {
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
        aspect: [4, 3],
        quality: 1,
        selectionLimit: type === "rc" ? 2 : 4,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        if (type === "truck") {
          setTruckPhoto([
            ...truckPhoto,
            ...result.assets.map((asset) => asset.uri),
          ]);
        } else if (type === "rc") {
          setRcPhotos([
            ...rcPhotos,
            ...result.assets.map((asset) => asset.uri),
          ]);
        }
      }
    } catch (e) {
      console.log("error", e);
      toast.error("Failed to upload photo");
    }
  };

  const generateLengthOptions = () => {
    const options = [];
    for (let i = 5; i <= 300; i += 1) {
      options.push({ label: `${i} feet`, value: i.toString() });
    }
    return options;
  };

  const generateCapacityOptions = () => {
    const options = [];
    for (let i = 0.5; i <= 100; i += 0.5) {
      options.push({
        label: `${i} tons (${i * 1000} kg)`,
        value: i.toString(),
      });
    }
    return options;
  };

  const removeTruckPhotos = (index: number, type: "truck" | "rc" = "truck") => {
    if (type === "truck") {
      setTruckPhoto(truckPhoto.filter((_, i) => i !== index));
      if (truckPhotoIds && truckPhotoIds[index]) {
        setTruckPhotoIds(truckPhotoIds.filter((_, i) => i !== index));
      }
    } else if (type === "rc") {
      setRcPhotos(rcPhotos.filter((_, i) => i !== index));
      if (truckRCIds && truckRCIds[index]) {
        setTruckRCIds(truckRCIds.filter((_, i) => i !== index));
      }
    }
  };

  const generateHeightOptions = () => {
    const options = [];
    for (let i = 4; i <= 100; i += 1) {
      options.push({ label: `${i} feet`, value: i.toString() });
    }
    return options;
  };

  const onValidSubmit = async (data: any) => {
    try {
      setLoading(true);

      // Upload RC Photos (handles multiple RC images)
      let uploadedRCPhotos: any[] = await Promise.all(
        rcPhotos
          .filter((photo) => photo.includes("uploads") === false)
          .map(async (asset) => await apiService.uploadImage(asset, "vehicle")),
      );
      if (id && uploadedRCPhotos.length === 0) {
        uploadedRCPhotos = truckRCIds.map((id) => id);
      }
      let rcImageIds = uploadedRCPhotos.map((u: any) => u?.id).filter(Boolean);
      if (id) {
        rcImageIds = Array.from(
          new Set([...rcImageIds, ...(truckRCIds || [])]),
        );
      }

      if (rcImageIds.length === 0) {
        toast.error(t("vehicles.pleaseUploadAtLeastOneRCBookPhoto"));
        setLoading(false);
        return;
      }

      // Upload Vehicle Photos
      const uploadVehiclePhotos = await Promise.all(
        truckPhoto
          .filter((photo) => photo.includes("uploads") === false)
          .map(async (asset) => await apiService.uploadImage(asset, "vehicle")),
      );
      let imageIds = uploadVehiclePhotos.map((u: any) => u?.id).filter(Boolean);
      if (id) {
        imageIds = Array.from(new Set([...imageIds, ...(truckPhotoIds || [])]));
      }
      if (imageIds.length === 0) {
        toast.error(t("vehicles.pleaseUploadAtLeastOneTruckPhoto"));
        setLoading(false);
        return;
      }

      if (!id && registrationFeeCents != null && registrationFeeCents > 0) {
        const wb = await apiService.getWalletBalance();
        if (!wb?.success) {
          toast.error(wb?.message || t("payment.walletRefreshFailed"));
          setLoading(false);
          return;
        }
        if ((wb.walletBalanceCents ?? 0) < registrationFeeCents) {
          setLoading(false);
          // Alert.alert(
          //   t("payment.insufficientWalletTitle"),
          //   t("payment.insufficientWalletVehicleMessage", {
          //     amount: formatMinorCurrency(
          //       registrationFeeCents,
          //       paymentCurrency,
          //     ),
          //   }),
          //   [
          //     { text: t("common.cancel"), style: "cancel" },
          //     {
          //       text: t("payment.addFundsFromMenu"),
          //       style: "default",
          //       onPress: () => router.back(),
          //     },
          //   ],
          // );
          return;
        }
      }

      const newVehicle = {
        ...data,
        referralCode,
        rcPhotos: rcImageIds,
        imageIds: imageIds,
      };
      let resData = null;
      if (id) {
        resData = await apiService.updateRegisterVehicle(
          newVehicle,
          id as string,
        );
        if (resData.success) {
          toast.success(resData.message || t("vehicles.registrationSubmitted"));
          reset();
          setRcPhotos([]);
          setTruckPhoto([]);
          router.push("/(apps)/(tabs)/vehicles");
          toast.success(resData.message || t("vehicles.registrationSubmitted"));
          return;
        }
      } else {
        resData = await apiService.registerVehicle(newVehicle);
      }
      if (resData.success) {
        // Create if not id
        if (!id) {
          const vehicleId = resData.vehicle?.id;
          if (vehicleId) {
            // const pay = await payVehicleRegistration(vehicleId);
            // if (pay.ok) {
            try {
              const w = await apiService.getWalletBalance();
              if (w?.success) {
                await updateUser({
                  walletBalanceCents: w.walletBalanceCents,
                });
              }
            } catch {
              /* ignore */
            }
            reset();
            setRcPhotos([]);
            setTruckPhoto([]);
            router.push("/(apps)/(tabs)/vehicles");
            toast.success(
              resData.message || t("vehicles.registrationSubmitted"),
            );
            return;
          }
          // // If Payment canceld then delete it
          // if (pay.canceled) {
          //   toast.error(t("payment.canceledUnpaidVehicle"));
          //   await apiService.deleteVehicle(vehicleId);
          // } else if (pay.code === "INSUFFICIENT_WALLET") {
          //   Alert.alert(
          //     t("payment.insufficientWalletTitle"),
          //     t("payment.insufficientWalletVehicleMessage", {
          //       amount: 0,
          //       // amount: formatMinorCurrency(
          //       //   registrationFeeCents ?? 0,
          //       //   paymentCurrency,
          //       // ),
          //     }),
          //     [
          //       { text: t("common.cancel"), style: "cancel" },
          //       {
          //         text: t("payment.addFundsFromMenu"),
          //         onPress: () => router.back(),
          //       },
          //     ],
          //   );
          //   await apiService.deleteVehicle(vehicleId);
          // } else {
          //   toast.error(pay.message || t("payment.registrationPayFailed"));
          //   await apiService.deleteVehicle(vehicleId);
          // }
          // }
        }
      } else {
        toast.error(resData.message || "Vehicle registration failed");
      }
    } catch (error: any) {
      console.log("Catch Error", error.message);
      toast.error(error.message || "Vehicle registration failed");
    } finally {
      setLoading(false);
    }
  };

  // We'll use a function that handles validation + scroll on error
  const handleVehicleSubmit = async () => {
    // Only scroll if form is invalid
    const isValid = await trigger();
    if (!isValid) {
      if (
        keyboardAwareScrollRef.current &&
        keyboardAwareScrollRef.current.scrollToPosition
      ) {
        keyboardAwareScrollRef.current.scrollToPosition(0, 0, true);
      }
      if (formScrollRef.current && formScrollRef.current.scrollTo) {
        formScrollRef.current.scrollTo({ x: 0, y: 0, animated: true });
      }
    }
    // If valid, call original submit
    handleSubmit(onValidSubmit)();
  };

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      <KeyboardAwareScrollView
        className="flex-1 bg-white"
        contentContainerStyle={{ flexGrow: 1 }}
        enableOnAndroid
        extraScrollHeight={20}
        keyboardShouldPersistTaps="handled"
        ref={keyboardAwareScrollRef}
      >
        <View
          ref={formScrollRef}
          className="flex-row items-center px-5 py-4 bg-white border-b border-gray-100 shadow-sm"
        >
          <TouchableOpacity
            onPress={() => router.back()}
            className="flex-row gap-4 justify-start items-center p-2 -ml-2"
            activeOpacity={0.7}
          >
            <Ionicons name="arrow-back" size={24} color="#1F2937" />
            <Text className="text-xl font-bold text-gray-900">
              {id ? t("vehicles.updateVehicle") : t("vehicles.addVehicle")}
            </Text>
          </TouchableOpacity>
          <View style={{ width: 40 }} />
        </View>
        <View className="flex-1 bg-gray-50">
          <ScrollView
            className="flex-1 px-5 py-6"
            showsVerticalScrollIndicator={false}
          >
            {/* Driver Info Cards */}
            <View className="mb-6">
              <View className="flex-row gap-2 items-start">
                <Text className="mb-3 text-sm font-bold text-gray-700">
                  {t("vehicles.driverName")}
                  <Text className="text-danger">*</Text>
                </Text>
                {errors.driverName && (
                  <Text className="text-sm font-medium text-danger">
                    {errors.driverName.message}
                  </Text>
                )}
              </View>
              <Controller
                control={control}
                name="driverName"
                render={({ field: { onChange, onBlur, value } }) => (
                  <TextInput
                    className="px-5 py-4 text-base font-medium bg-white rounded-xl border-2 border-gray-200"
                    placeholder={t("vehicles.driverName")}
                    value={value}
                    onChangeText={onChange}
                    onBlur={onBlur}
                    placeholderTextColor="#9CA3AF"
                  />
                )}
              />
            </View>

            <View className="mb-6">
              <View className="flex-row gap-2 items-start">
                <Text className="mb-3 text-sm font-bold text-gray-700">
                  {t("vehicles.mobileNumber")}
                  <Text className="text-danger">*</Text>
                </Text>
                {errors.mobileNumber && (
                  <Text className="text-sm font-medium text-danger">
                    {errors.mobileNumber.message}
                  </Text>
                )}
              </View>
              <Controller
                control={control}
                name="mobileNumber"
                render={({ field: { onChange, onBlur, value } }) => (
                  <TextInput
                    keyboardType="phone-pad"
                    className="px-5 py-4 text-base font-medium bg-white rounded-xl border-2 border-gray-200"
                    placeholder={t("vehicles.mobileNumber")}
                    value={value}
                    onChangeText={onChange}
                    onBlur={onBlur}
                    placeholderTextColor="#9CA3AF"
                  />
                )}
              />
            </View>

            {/* RC Book */}
            <View className="mb-6">
              <View className="flex-row gap-2 items-start">
                <Text className="mb-3 text-sm font-bold text-gray-700">
                  {t("vehicles.rcNumber")}
                  <Text className="text-danger">*</Text>
                </Text>
                {errors.rcNumber && (
                  <Text className="text-sm font-medium text-danger">
                    {errors.rcNumber.type === "matches"
                      ? "Invalid RC number format. Example: MH12AB1234"
                      : errors.rcNumber.message}
                  </Text>
                )}
              </View>
              <Controller
                control={control}
                name="rcNumber"
                render={({ field: { onChange, onBlur, value } }) => (
                  <TextInput
                    className="px-5 py-4 text-base font-medium bg-white rounded-xl border-2 border-gray-200"
                    placeholder="MH12AB1234"
                    value={value}
                    onChangeText={(text) => onChange(text.toUpperCase())}
                    onBlur={onBlur}
                    placeholderTextColor="#9CA3AF"
                    autoCapitalize="characters"
                    keyboardType="ascii-capable"
                    autoCorrect={false}
                    maxLength={13}
                  />
                )}
              />
            </View>

            {/* RC Photo */}
            <View className="mb-6">
              <View className="flex-row gap-2 items-start">
                <Text className="mb-3 text-sm font-bold text-gray-700">
                  {t("vehicles.rcNumberPhoto")}
                  <Text className="text-danger">*</Text>
                </Text>
              </View>
              <View className="flex-row gap-2 justify-evenly w-12/12">
                <TouchableOpacity
                  className="flex-row gap-2 justify-center items-center p-3 w-1/2 text-center rounded-lg border-2 bg-primary/10 border-primary/50"
                  onPress={() => takeTruckPhoto("rc")}
                >
                  <Ionicons name="camera-outline" size={20} />
                  <Text className="text-center text-gray-700">
                    {t("register.takePhoto")}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  className="flex-row gap-2 justify-center items-center p-3 w-1/2 text-center rounded-lg border-2 bg-primary/10 border-primary/50"
                  onPress={() => selectPhoto("rc")}
                >
                  <Ionicons name="image-outline" size={20} />
                  <Text className="text-center text-gray-700">
                    {t("register.selectPhoto")}
                  </Text>
                </TouchableOpacity>
              </View>

              {rcPhotos.length > 0 && (
                <View className="flex-row flex-wrap mt-4">
                  {rcPhotos.map((uri, index) => (
                    <View key={index} className="relative mr-3 mb-3">
                      <Image
                        source={{ uri }}
                        className="w-28 h-28 rounded-xl"
                      />
                      <TouchableOpacity
                        className="absolute -top-2 -right-2 p-1 bg-red-500 rounded-full shadow-lg"
                        onPress={() => {
                          setRcPhotos(rcPhotos.filter((_, i) => i !== index));
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

            {/* Truck Photos */}
            <View className="mb-6">
              <View className="flex-row gap-2 items-start">
                <Text className="mb-3 text-sm font-bold text-gray-700">
                  {t("vehicles.truckPhotos")}
                  <Text className="text-danger">*</Text>
                </Text>
              </View>

              <View className="flex-row gap-2 justify-evenly w-12/12">
                <TouchableOpacity
                  className="flex-row gap-2 justify-center items-center p-3 w-1/2 text-center rounded-lg border-2 bg-primary/10 border-primary/50"
                  onPress={() => takeTruckPhoto("truck")}
                >
                  <Ionicons name="camera-outline" size={20} />
                  <Text className="text-center text-gray-700">
                    {t("register.takePhoto")}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  className="flex-row gap-2 justify-center items-center p-3 w-1/2 text-center rounded-lg border-2 bg-primary/10 border-primary/50"
                  onPress={() => selectPhoto("truck")}
                >
                  <Ionicons name="image-outline" size={20} />
                  <Text className="text-center text-gray-700">
                    {t("register.selectPhoto")}
                  </Text>
                </TouchableOpacity>
              </View>

              {truckPhoto.length > 0 && (
                <View className="flex-row flex-wrap mt-4">
                  {truckPhoto.map((uri, index) => (
                    <View key={index} className="relative mr-3 mb-3">
                      <Image
                        source={{ uri }}
                        className="w-28 h-28 rounded-xl"
                      />
                      <TouchableOpacity
                        className="absolute -top-2 -right-2 p-1 bg-red-500 rounded-full shadow-lg"
                        onPress={() => removeTruckPhotos(index)}
                        activeOpacity={0.8}
                      >
                        <Ionicons name="close" size={18} color="#fff" />
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>
              )}
            </View>

            {/* Truck Type */}
            <View className="mb-6">
              <Text className="mb-2 text-lg font-bold text-gray-800">
                {t("booking.truckType")}
              </Text>
              <Controller
                control={control}
                name="truckType"
                render={({ field: { onChange, value } }) => (
                  <View className="flex-row gap-3">
                    <TouchableOpacity
                      className={`flex-1 flex-row items-center px-4 py-4 rounded-lg border ${
                        getValues("truckType") === "pickup"
                          ? "border-primary bg-primary/10"
                          : "border-gray-200 bg-white"
                      }`}
                      onPress={() => setValue("truckType", "pickup")}
                    >
                      <FontAwesome5
                        name="truck-pickup"
                        size={20}
                        color={
                          getValues("truckType") === "pickup"
                            ? "#7C3AED"
                            : "#1F2937"
                        }
                      />
                      <Text
                        className={`ml-2 text-base font-semibold ${
                          getValues("truckType") === "pickup"
                            ? "text-primary"
                            : "text-gray-900"
                        }`}
                      >
                        {t("vehicles.pickupSmall")}
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      className={`flex-1 flex-row items-center px-4 py-4 rounded-lg border ${
                        getValues("truckType") === "truck"
                          ? "border-primary bg-primary/10"
                          : "border-gray-200 bg-white"
                      }`}
                      onPress={() => setValue("truckType", "truck")}
                    >
                      <FontAwesome5
                        name="truck-moving"
                        size={22}
                        color={
                          getValues("truckType") === "truck"
                            ? "#7C3AED"
                            : "#1F2937"
                        }
                      />
                      <Text
                        className={`ml-2 text-base font-semibold ${
                          getValues("truckType") === "truck"
                            ? "text-primary"
                            : "text-gray-900"
                        }`}
                      >
                        {t("vehicles.truck")}
                      </Text>
                    </TouchableOpacity>
                  </View>
                )}
              />
              {errors.truckType && (
                <Text className="mt-2 ml-1 text-sm font-medium text-red-500">
                  {errors.truckType.message}
                </Text>
              )}
            </View>
            {/* Body Type */}
            <View className="mb-6">
              <Text className="mb-3 text-sm font-bold text-gray-700">
                {t("vehicles.bodyType")}
              </Text>
              <Controller
                control={control}
                name="bodyType"
                render={({ field: { onChange, value } }) => (
                  <View className="flex-row gap-3">
                    <TouchableOpacity
                      className={`flex-1 flex-row items-center px-4 py-3 gap-2 rounded-lg border ${
                        getValues("bodyType") === "open"
                          ? "border-primary bg-primary/10"
                          : "border-gray-200 bg-white"
                      }`}
                      onPress={() => setValue("bodyType", "open")}
                    >
                      <MaterialCommunityIcons
                        name="truck-flatbed"
                        size={28}
                        className={
                          getValues("bodyType") === "open"
                            ? "!text-primary"
                            : "text-black"
                        }
                      />
                      <Text
                        className={`duration-300 text-center text-sm font-medium ${
                          getValues("bodyType") === "open"
                            ? "!text-primary"
                            : "text-black"
                        }`}
                      >
                        {t("vehicles.open")}
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      className={`flex-1 flex-row items-center gap-2 px-4 py-3 rounded-lg border ${
                        getValues("bodyType") === "container"
                          ? "border-primary bg-primary/10"
                          : "border-gray-200 bg-white"
                      }`}
                      onPress={() => setValue("bodyType", "container")}
                    >
                      <MaterialCommunityIcons
                        name="truck-cargo-container"
                        size={28}
                        className={
                          getValues("bodyType") === "container"
                            ? "!text-primary"
                            : "text-black"
                        }
                      />
                      <Text
                        className={`duration-300 text-center text-sm font-medium ${
                          getValues("bodyType") === "container"
                            ? "!text-primary"
                            : "text-black"
                        }`}
                      >
                        {t("vehicles.container")}
                      </Text>
                    </TouchableOpacity>
                  </View>
                )}
              />

              {errors.bodyType && (
                <Text className="mt-2 ml-1 text-sm font-medium text-red">
                  {errors.bodyType.message}
                </Text>
              )}
            </View>

            {/* Truck Length */}
            <View className="mb-6">
              <Text className="mb-3 text-sm font-bold text-gray-700">
                {t("vehicles.truckLength")}
              </Text>
              <Controller
                control={control}
                name="truckLength"
                render={({ field: { onChange, value } }) => (
                  <View className="overflow-hidden bg-white rounded-xl border-2 border-gray-200">
                    <Picker
                      selectedValue={value}
                      onValueChange={onChange}
                      style={{ height: 50 }}
                    >
                      {generateLengthOptions().map((opt) => (
                        <Picker.Item
                          key={opt.value}
                          label={opt.label}
                          value={opt.value}
                        />
                      ))}
                    </Picker>
                  </View>
                )}
              />
              {errors.truckLength && (
                <Text className="mt-2 ml-1 text-sm font-medium text-red-500">
                  {errors.truckLength.message}
                </Text>
              )}
            </View>

            {/* Load Capacity */}
            <View className="mb-6">
              <Text className="mb-3 text-sm font-bold text-gray-700">
                {t("vehicles.loadCapacity")}
              </Text>
              <Controller
                control={control}
                name="loadCapacity"
                render={({ field: { onChange, value } }) => (
                  <View className="overflow-hidden bg-white rounded-xl border-2 border-gray-200">
                    <Picker
                      selectedValue={value}
                      onValueChange={onChange}
                      style={{ height: 50 }}
                    >
                      {generateCapacityOptions().map((opt) => (
                        <Picker.Item
                          key={opt.value}
                          label={opt.label}
                          value={opt.value}
                        />
                      ))}
                    </Picker>
                  </View>
                )}
              />
              {errors.loadCapacity && (
                <Text className="mt-2 ml-1 text-sm font-medium text-red-500">
                  {errors.loadCapacity.message}
                </Text>
              )}
            </View>

            {/* Truck Height */}
            <View className="mb-6">
              <Text className="mb-3 text-sm font-bold text-gray-700">
                {t("vehicles.truckHeight")}
              </Text>
              <Controller
                control={control}
                name="truckHeight"
                render={({ field: { onChange, value } }) => (
                  <View className="overflow-hidden bg-white rounded-xl border-2 border-gray-200">
                    <Picker
                      selectedValue={value}
                      onValueChange={onChange}
                      style={{ height: 50 }}
                    >
                      {generateHeightOptions().map((opt) => (
                        <Picker.Item
                          key={opt.value}
                          label={opt.label}
                          value={opt.value}
                        />
                      ))}
                    </Picker>
                  </View>
                )}
              />
              {errors.truckHeight && (
                <Text className="mt-2 ml-1 text-sm font-medium text-red-500">
                  {errors.truckHeight.message}
                </Text>
              )}
            </View>

            {/* Referral Code */}
            <View className="mb-4">
              <TouchableOpacity
                className="flex-row items-center"
                onPress={() => setReferralCodeVisible(!referralCodeVisible)}
                activeOpacity={0.7}
              >
                <View
                  className={`w-6 h-6 border-2 rounded mr-3 items-center justify-center ${
                    referralCodeVisible
                      ? "bg-primary border-primary"
                      : "border-gray-300"
                  }`}
                >
                  {referralCodeVisible && (
                    <Ionicons name="checkmark" size={16} color="#fff" />
                  )}
                </View>
                <Text className="text-base font-semibold text-gray-700">
                  {t("vehicles.haveReferralCode")}
                </Text>
              </TouchableOpacity>
              {referralCodeVisible && (
                <TextInput
                  className="px-5 py-4 mt-3 text-base font-medium bg-white rounded-xl border-2 border-gray-200"
                  placeholder={t("vehicles.referralCode")}
                  value={referralCode}
                  onChangeText={setReferralCode}
                  placeholderTextColor="#9CA3AF"
                />
              )}
            </View>

            {!id && (
              <View className="p-4 mb-4 bg-white rounded-xl border-2 border-gray-200">
                <Text className="mb-1 text-lg font-bold text-gray-800">
                  {t("payment.registrationFee")}
                </Text>
                <Text className="mb-2 text-base text-gray-600">
                  {registrationFeeCents != null ? 0 : "—"}
                </Text>
                <Text className="text-sm leading-5 text-gray-700">
                  {t("payment.walletOnlyRegistration")}
                </Text>
              </View>
            )}

            <TouchableOpacity
              className="flex-row justify-center items-center py-6 mb-4 rounded-xl shadow-lg bg-primary"
              onPress={handleVehicleSubmit}
              disabled={loading}
              activeOpacity={0.8}
            >
              {loading ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <>
                  <Ionicons name="card-outline" size={22} color="#FFFFFF" />
                  <Text className="ml-2 text-lg font-bold text-center text-white">
                    {t("vehicles.submitAndPay")}
                  </Text>
                </>
              )}
            </TouchableOpacity>

            <View className="p-4 mb-6 bg-yellow-50 rounded-xl border border-yellow-200">
              <View className="flex-row items-start">
                <Ionicons
                  name="information-circle-outline"
                  size={20}
                  color="#F59E0B"
                />
                <Text className="ml-2 text-sm font-medium leading-5 text-yellow-800">
                  {t("vehicles.verificationNote")}
                </Text>
              </View>
            </View>
          </ScrollView>
        </View>
      </KeyboardAwareScrollView>
    </SafeAreaView>
  );
};

export default VehicleRegistrationScreen;
