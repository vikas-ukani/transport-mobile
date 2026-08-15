import { toast } from "@backpackapp-io/react-native-toast";
import { Ionicons } from "@expo/vector-icons";
import { yupResolver } from "@hookform/resolvers/yup";
import * as ImagePicker from "expo-image-picker";
import { router, useGlobalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import {
  ActivityIndicator,
  Image,
  Platform,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import * as yup from "yup";

import { useTranslation } from "react-i18next";
import { KeyboardAwareScrollView } from "react-native-keyboard-aware-scroll-view";
import RazorpayCheckout from "react-native-razorpay";
import { useAuth } from "../../context/AuthContext";
import apiService, { getBaseUrl } from "../../services/api.service";
import CustomInput from "../common/CustomInput";

const CreatePostScreen = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { id } = useGlobalSearchParams();

  const [images, setImages] = useState<string[]>([]);
  const [imageIds, setImageIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  const schema = yup.object().shape({
    title: yup.string().required(t("common.titleRequired")),
    content: yup.string().required(t("common.contentRequired")),
  });

  const {
    control,
    handleSubmit,
    formState: { errors, isDirty, isValid, isSubmitted },
    reset,
    setValue,
    getValues,
  } = useForm({
    resolver: yupResolver(schema),
  });

  // NOTE: To ensure reset() and setImages([]) work properly on unmount, we need to avoid referencing stale closures
  // and always work with the latest values from useForm and useState. We'll refactor this so that the cleanup
  // properly resets the form and clears images.

  useEffect(() => {
    return () => {
      // Force reset all fields deeply (if needed, depending on RHF version)
      reset({
        title: "",
        content: "",
      });
      setImages([]);
    };
  }, [reset, setImages]);

  useEffect(() => {
    function fetchPost() {
      if (id) {
        getPost(id as string);
      }
    }
    fetchPost();
  }, [id]);

  const getPost = async (postId: string) => {
    try {
      setLoading(true);
      const res = await apiService.getPostById(postId);
      if (res.success) {
        const post = res.data;
        reset({
          title: post.title,
          content: post.content,
        });

        if (post.images && post.images.length > 0) {
          // Assuming images are URLs, directly set them
          setImages(post.images.map((img: any) => getBaseUrl() + img.url));
          setImageIds(post.images.map((img: any) => img.id) || []);
        }
      } else {
        toast.error(res.message);
      }
    } catch (error: any) {
      toast.error(error.message || "Failed to load post");
    } finally {
      setLoading(false);
    }
  };

  const selectPhoto = async () => {
    try {
      const permissionResult =
        await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (permissionResult.granted === false) {
        toast.error("Permission to access the media library is required.");
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsMultipleSelection: true,
        // allowsMultipleSelection: true,
        allowsEditing: true,
        aspect: [4, 4],
        quality: 1,
        selectionLimit: 4,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        setImages([
          // ...images,
          ...result.assets.map((asset) => asset.uri),
        ]);
      }
    } catch (err: any) {
      toast.error(`Failed to select images ${err.message}`);
    }
  };

  const removeImage = (index: number) => {
    setImages(images.filter((_, i) => i !== index));
    setImageIds(imageIds?.filter((_, i) => i !== index));
  };

  const onSubmit = async (data: any) => {
    try {
      setLoading(true);
      toast.dismiss();

      const uploadResults = await Promise.all(
        images
          .filter((photo) => photo.includes("uploads") === false)
          .map(async (asset) => await apiService.uploadImage(asset, "post")),
      );

      let newImageIds = uploadResults.map((u: any) => u?.id).filter(Boolean);
      if (id) {
        if (newImageIds.length) {
          newImageIds = Array.from(
            new Set([...(newImageIds.length ? newImageIds : [])]),
          );
        } else {
          newImageIds = Array.from(new Set([...(newImageIds || [])]));
        }
      }

      const postData = {
        title: data.title,
        content: data.content,
        imageIds: newImageIds,
      };

      let res = null;
      if (id) {
        res = await apiService.updatePost(postData, id as string);
      } else {
        // Fetch Order from backend for CREATE NEW POST
        let orderData;
        try {
          orderData = await apiService.createPostPayOrder();
        } catch (err: any) {
          console.log(`Failed to get payment order. ${err.message}`);
          toast.error(`Failed to get payment order. ${err.message}`);
          return;
        }
        if (!orderData || !orderData.order?.id || !orderData.payAmount) {
          console.log("Invalid order data from server.");
          toast.error("Invalid order data from server.");
          return;
        }
        // 2. Construct options (defensively, e.g. ensure all required fields)
        const key = process.env.EXPO_PUBLIC_RAZORPAY_KEY || "";
        const name = process.env.EXPO_PUBLIC_APP_NAME || "Safar Path";

        if (!key) {
          console.log(
            "Razorpay Key is not configured. Please contact support.",
          );
          toast.error(
            "Razorpay Key is not configured. Please contact support.",
          );
          return;
        }

        const options = {
          description: "Pay before create post.",
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
          toast.error("Razorpay is only supported on real devices.");
          return;
        }
        if (!RazorpayCheckout || typeof RazorpayCheckout.open !== "function") {
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
                if (verifyData.success) {
                  res = await apiService.createPost({
                    ...postData,
                    razorpay_payment_id: verifyData.data.razorpay_payment_id,
                  });
                  if (res.success) {
                    toast.success("Post created successfully");
                    router.push("/(apps)/(tabs)");
                  } else {
                    toast.error(res.message);
                  }
                } else {
                  console.log(`Verification Failed: ${verifyData.message}`);
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
      console.log("findal res.success", res.success);
      if (res.success) {
        toast.success(
          id ? "Post updated successfully" : "Post created successfully",
        );
        console.log("redirecting to main screen");
        router.push("/(apps)/(tabs)");
      } else {
        toast.error(res.message);
      }
      reset();
      setImages([]);
    } catch (error: any) {
      toast.error(error.message || "Failed to save post");
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-screen">
      <KeyboardAwareScrollView
        className="flex-1 bg-screen"
        contentContainerStyle={{ flexGrow: 1 }}
        enableOnAndroid
        keyboardShouldPersistTaps="handled"
      >
        <View className="flex-row items-center px-5 py-4 border-b border-gray-100 shadow-sm bg-screen">
          <TouchableOpacity
            onPress={() => router.back()}
            className="flex-row gap-4 justify-start items-center p-2 -ml-2"
            activeOpacity={0.7}
          >
            <Ionicons name="arrow-back" size={24} color="#1F2937" />
            <Text className="text-xl font-bold text-gray-900">
              {id ? t("post.editPageTitle") : t("post.createPageTitle")}
            </Text>
          </TouchableOpacity>

          <View style={{ width: 40 }} />
        </View>

        <ScrollView
          className="flex-1 px-5 py-6"
          showsVerticalScrollIndicator={false}
        >
          {/* title */}
          <CustomInput
            label={t("post.title")}
            name="title"
            control={control}
            errors={errors}
            placeholder={t("post.title")}
          />

          <CustomInput
            label={t("post.description")}
            name="content"
            control={control}
            errors={errors}
            placeholder={t("post.description")}
            numberOfLines={10}
            multiline
          />

          {/* Images */}
          <View className="mb-6">
            <View className="flex-row gap-1 mb-3 text-sm font-bold text-gray-700">
              <Text> {t("post.addImages")} </Text>
              <Text className="items-start text-danger">*</Text>
              <Text className="ml-2 text-xs text-gray-500">
                {t("post.validation.maxImages", "Max 4 images")}
              </Text>

              {isSubmitted && images.length === 0 ? (
                <Text className="ml-1 text-sm font-medium text-red-500">
                  {t("post.validation.imageRequired")}
                </Text>
              ) : null}
            </View>
            {/* HIDE upload image button when there is id */}
            {!id && (
              <TouchableOpacity
                className="items-center py-8 bg-gray-50 rounded-xl border-2 border-dashed !border-primary"
                onPress={selectPhoto}
              >
                <Ionicons name="image-outline" size={40} color="#9CA3AF" />
                <Text className="mt-3 text-base font-semibold text-gray-600">
                  {t("post.addImages")}
                </Text>
                <Text className="mt-1 text-sm text-gray-400">
                  {t("post.tapToSelectImages")}
                </Text>
              </TouchableOpacity>
            )}
            {images.length > 0 && (
              <View className="flex-row flex-wrap mt-4 w-full">
                {images.map((uri, index) => (
                  <View
                    key={index}
                    className="relative mb-3"
                    style={{
                      width: "48%",
                      marginRight: index % 2 === 0 ? "4%" : 0,
                    }}
                  >
                    <Image
                      source={{ uri }}
                      className="w-full h-36 rounded-xl"
                    />
                    {!id && (
                      <TouchableOpacity
                        className="absolute -top-2 -right-2 bg-red-500 rounded-full p-1.5 shadow-lg"
                        onPress={() => removeImage(index)}
                        activeOpacity={0.8}
                      >
                        <Ionicons name="close" size={18} color="#fff" />
                      </TouchableOpacity>
                    )}
                  </View>
                ))}
              </View>
            )}
          </View>

          <View className="flex-row items-start px-4 py-3 my-4 !bg-primary/20 rounded-lg border border-l-4 border-primary">
            <Ionicons
              name="alert-circle-outline"
              size={22}
              className="!text-primary"
              style={{ marginTop: 2, marginRight: 10 }}
            />
            <View className="flex-1">
              <Text className="mb-1 font-bold text-primary">
                {t("post.noteToUser", "Warning")}
              </Text>
              <Text className="text-sm font-medium text-primary">
                {t(
                  "post.autoDisableNotice",
                  "This post will expire in 30 days and will disappear after the expiry time. You can reactivate it by paying again for the next 30 days.",
                )}
              </Text>
            </View>
          </View>

          <View className="">
            <TouchableOpacity
              className="py-4 rounded-xl shadow-md bg-primary disabled:bg-primaryLight disabled:cursor-not-allowed"
              onPress={handleSubmit(onSubmit)}
              activeOpacity={0.8}
              disabled={loading}
            >
              <View className="flex-row justify-center items-center">
                <Ionicons name="card" size={22} className="!text-white" />
                {/* <Ionicons name="add-circle-outline" size={22} color="#FFFFFF" /> */}
                <View className="ml-2 flex-row items-center gap-2 text-lg font-bold text-center !text-white">
                  <Text className="text-white">
                    {t("post.createPost", "Pay 100 and POST")}
                  </Text>
                  {loading && <ActivityIndicator color="#fff" size="small" />}
                </View>
              </View>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAwareScrollView>
    </SafeAreaView>
  );
};

export default CreatePostScreen;
