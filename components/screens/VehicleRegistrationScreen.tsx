import { toast } from "@/lib/toast";
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

import { RefreshControl } from "react-native-gesture-handler";
import apiService, { getBaseUrl } from "../../services/api.service";
import CustomInput from "../common/CustomInput";

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

const CreateUpdateVehicleScreen = () => {
  const { id } = useGlobalSearchParams();
  const { t } = useTranslation();

  const { user } = useAuth();
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
      getVehicle();
    }
  }, [id]);

  const getVehicle = async () => {
    if (!id) return;
    try {
      setLoading(true);
      // Replace this URL with your actual API endpoint
      const res = await apiService.getVehicle(id as string);
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
        aspect: [4, 4],
        quality: 1,
        selectionLimit: type === "rc" ? 1 : 4,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        if (type === "truck") {
          setTruckPhoto([
            ...truckPhoto,
            ...result.assets.map((asset: any) => asset.uri),
          ]);
        } else if (type === "rc") {
          setRcPhotos([
            ...rcPhotos,
            ...result.assets.map((asset: any) => asset.uri),
          ]);
        }
      }
    } catch (e: any) {
      toast.error("Failed to take photo: " + e.message);
    }
  };

  const selectPhoto = async (type: "truck" | "rc" = "truck", index = 0) => {
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
        aspect: [4, 4],
        quality: 1,
        selectionLimit: type === "rc" ? 1 : 4,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        if (type === "truck") {
          setTruckPhoto([
            ...truckPhoto,
            ...result.assets.map((asset: any) => asset.uri),
          ]);
        } else if (type === "rc") {
          const newImgIndex = JSON.parse(JSON.stringify(rcPhotos));
          newImgIndex[index] = result.assets.map((asset: any) => asset.uri)[0];
          setRcPhotos(newImgIndex);
          // const rcImag = [
          //   ...rcPhotos,
          //   ...result.assets.map((asset: any) => asset.uri),
          // ];
          // setRcPhotos();
        }
      }
    } catch (e) {
      console.log("error", e);
      toast.error("Failed to upload photo");
    }
  };

  const generateLengthOptions = () => {
    const options = [];
    for (let i = 5; i <= 40; i += 1) {
      options.push({ label: `${i} feet`, value: i.toString() });
    }
    return options;
  };

  const generateCapacityOptions = () => {
    const options = [];
    for (let i = 0.5; i <= 50; i += 0.5) {
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
    for (let i = 4; i <= 20; i += 1) {
      options.push({ label: `${i} feet`, value: i.toString() });
    }
    return options;
  };

  const onValidSubmit = async (data: any) => {
    toast.remove();
    try {
      setLoading(true);

      // Optimized upload and rcImageIds generation for RC Photos
      let rcImageIds = ["", ""];
      for (let i = 0; i < 2; i++) {
        const rcPhoto = rcPhotos[i];
        // Only upload if not already uploaded
        if (rcPhoto && !rcPhoto.includes("uploads")) {
          const uploadResult = await apiService.uploadImage(rcPhoto, "vehicle");
          rcImageIds[i] = uploadResult?.id || "";
        } else if (rcPhoto) {
          // Use existing id if photo exists
          rcImageIds[i] = truckRCIds[i] || "";
        } else if (id && truckRCIds && truckRCIds[i]) {
          // For existing vehicles fallback to previously saved image ids
          rcImageIds[i] = truckRCIds[i];
        }
      }
      if (!rcImageIds[0] || !rcImageIds[1]) {
        toast.error(
          t(
            "vehicles.pleaseUploadBothRCBookPhotos",
            "Please upload both RC Book photos",
          ),
        );
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
        if (imageIds.length) {
          imageIds = Array.from(new Set([...imageIds]));
        } else {
          imageIds = Array.from(new Set([...(truckPhotoIds || [])]));
        }
      }
      if (imageIds.length === 0) {
        toast.error(t("vehicles.pleaseUploadAtLeastOneTruckPhoto"));
        setLoading(false);
        return;
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

            reset();
            setRcPhotos([]);
            setTruckPhoto([]);
            router.push("/(apps)/(tabs)/vehicles");
            toast.success(
              resData.message || t("vehicles.registrationSubmitted"),
            );
            return;
          }
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
    <SafeAreaView className="flex-1 !bg-screen">
      {/* Fixed Header at the Top */}
      <View
        ref={formScrollRef}
        className="flex-row justify-between items-center px-5 py-4 border-b border-gray-100 shadow-sm"      >
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
      {/* Scroll View below the fixed header */}
      <KeyboardAwareScrollView
          className="flex-1 px-4 py-4"
          contentContainerStyle={{ flexGrow: 1 }}
        enableOnAndroid
        keyboardShouldPersistTaps="handled"
        ref={keyboardAwareScrollRef}
      >
        <ScrollView
          className="flex-1 px-4"
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={loading} onRefresh={getVehicle} />
          }
        >
          {/* Driver Info Cards */}
          <CustomInput
            label={t("vehicles.driverName")}
            name="driverName"
            control={control}
            errors={errors}
            placeholder={t("vehicles.driverName")}
            autoCapitalize="none"
            frontIcon="person-outline"
          />
          <CustomInput
            label={t("vehicles.mobileNumber")}
            name="mobileNumber"
            control={control}
            errors={errors}
            placeholder={t("vehicles.mobileNumber")}
            autoCapitalize="none"
            frontIcon="phone-portrait"
          />

          {/* RC Book */}
          <View className="mb-6">
            <View className="flex-row gap-2 items-start">
              <Text className="mb-3 text-sm font-bold text-gray-700">
                {t("vehicles.rcNumber")}
                <Text className="text-danger">*</Text>
              </Text>
              <Text className="text-xs font-semibold text-gray-600">
                {t("vehicles.exampleRcNumber", "(MH12AB1234)")}
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

            <View className="flex-row flex-wrap mt-2 w-full">
              <View
                style={{
                  width: "48%",
                  marginRight: "4%",
                }}
                className="relative"
              >
                {rcPhotos.length && rcPhotos[0] ? (
                  <View>
                    <Image
                      source={{ uri: rcPhotos[0] }}
                      className="w-full h-28 rounded-xl"
                    />
                    <TouchableOpacity
                      className="absolute -top-2 -right-2 p-1 bg-red-500 rounded-full shadow-lg"
                      onPress={() => {
                        const updatedRcPhotos = [...rcPhotos];
                        const updatedRcIds = [...truckRCIds];
                        updatedRcPhotos[0] = "";
                        updatedRcIds[0] = "";
                        setRcPhotos(updatedRcPhotos);
                        setTruckRCIds(updatedRcIds);
                        // setRcPhotos(rcPhotos.filter((_, i) => i !== 0));
                      }}
                      activeOpacity={0.8}
                    >
                      <Ionicons name="close" size={18} color="#fff" />
                    </TouchableOpacity>
                  </View>
                ) : (
                  <TouchableOpacity
                    className="justify-center items-center w-full h-28 rounded border border-dashed"
                    onPress={() => selectPhoto("rc", 0)}
                  >
                    <Text className="mt-2 text-xs text-center text-gray-500">
                      {t("register.frontImage", "Front Image")}
                    </Text>
                  </TouchableOpacity>
                )}
              </View>

              <View
                style={{
                  width: "48%",
                  marginRight: 0,
                }}
                className="relative"
              >
                {rcPhotos.length && rcPhotos[1] ? (
                  <View>
                    <Image
                      source={{ uri: rcPhotos[1] }}
                      className="w-full h-28 rounded-xl"
                    />
                    <TouchableOpacity
                      className="absolute -top-2 -right-2 p-1 bg-red-500 rounded-full shadow-lg"
                      onPress={() => {
                        const updatedRcPhotos = [...rcPhotos];
                        const updatedRcIds = [...truckRCIds];
                        updatedRcPhotos[1] = "";
                        updatedRcIds[1] = "";
                        setRcPhotos(updatedRcPhotos);
                        setTruckRCIds(updatedRcIds);
                        // setRcPhotos(rcPhotos.filter((_, i) => i !== 1));
                      }}
                      activeOpacity={0.8}
                    >
                      <Ionicons name="close" size={18} color="#fff" />
                    </TouchableOpacity>
                  </View>
                ) : (
                  <TouchableOpacity
                    className="justify-center items-center w-full h-28 rounded border border-dashed"
                    onPress={() => selectPhoto("rc", 1)}
                  >
                    <Text className="mt-2 text-xs text-center text-gray-500">
                      {t("register.otherSide", "Other Side Image")}
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>

            {/* {rcPhotos.length > 0 && (
              <View className="flex-row flex-wrap mt-4 w-full">
                {rcPhotos.map((uri, index) => (
                  <View key={index} className="relative mr-3 mb-3">
                    <Image source={{ uri }} className="w-28 h-28 rounded-xl" />
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
            ) } */}
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
                className="flex-row gap-2 justify-center items-center p-3 w-1/2 text-center rounded-lg border-2 border-primary/50 bg-primary/10"
                onPress={() => takeTruckPhoto("truck")}
              >
                <Ionicons name="camera-outline" size={20} />
                <Text className="text-center text-gray-700">
                  {t("register.takePhoto")}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                className="flex-row gap-2 justify-center items-center p-3 w-1/2 text-center rounded-lg border-2 border-primary/50 bg-primary/10"
                onPress={() => selectPhoto("truck")}
              >
                <Ionicons name="image-outline" size={20} />
                <Text className="text-center text-gray-700">
                  {t("register.selectPhoto")}
                </Text>
              </TouchableOpacity>
            </View>

            <View className="flex-row flex-wrap gap-y-2 mt-4 w-full">
              {truckPhoto.length > 0 &&
                truckPhoto.map((uri, index) => (
                  <View
                    style={{
                      width: "48%",
                      marginRight: index % 2 === 0 ? "4%" : 0,
                    }}
                    className="relative space-y-2"
                    key={index}
                  >
                    <Image
                      source={{ uri }}
                      className="w-full h-28 rounded-xl"
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
                    className={`flex-1 flex-row items-center rounded-lg border px-4 py-4 ${
                      getValues("truckType") === "pickup"
                        ? "border-primary bg-primary/10"
                        : "border-gray-200 bg-white"
                    }`}
                    onPress={() => setValue("truckType", "pickup")}
                  >
                    <FontAwesome5
                      name="truck-pickup"
                      size={20}
                      className={
                        getValues("truckType") === "pickup"
                          ? "!text-primary"
                          : "text-black"
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
                    className={`flex-1 flex-row items-center rounded-lg border px-4 py-4 ${
                      getValues("truckType") === "truck"
                        ? "border-primary bg-primary/10"
                        : "border-gray-200 bg-white"
                    }`}
                    onPress={() => setValue("truckType", "truck")}
                  >
                    <FontAwesome5
                      name="truck-moving"
                      size={22}
                      className={
                        getValues("truckType") === "truck"
                          ? "!text-primary"
                          : "text-black"
                      }
                    />
                    <Text
                      className={`ml-2 text-base font-semibold ${
                        getValues("truckType") === "truck"
                          ? "!text-primary"
                          : "text-black"
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
                    className={`flex-1 flex-row items-center gap-2 rounded-lg border px-4 py-3 ${
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
                      className={`text-center text-sm font-medium duration-300 ${
                        getValues("bodyType") === "open"
                          ? "!text-primary"
                          : "text-black"
                      }`}
                    >
                      {t("vehicles.open")}
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    className={`flex-1 flex-row items-center gap-2 rounded-lg border px-4 py-3 ${
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
                      className={`text-center text-sm font-medium duration-300 ${
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
                <View className="overflow-hidden text-black bg-white rounded-xl border-2 border-gray-200 text-dark">
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
                <View className="overflow-hidden text-black bg-white rounded-xl border-2 border-gray-200 text-dark">
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
                <View className="overflow-hidden text-black bg-white rounded-xl border-2 border-gray-200">
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
                className={`mr-3 h-6 w-6 items-center justify-center rounded border-2 ${
                  referralCodeVisible
                    ? "border-primary bg-primary"
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

          {/* {!id && (
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
          )} */}

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
      </KeyboardAwareScrollView>
    </SafeAreaView>
  );
};

export default CreateUpdateVehicleScreen;
