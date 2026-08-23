import { toast } from "@/lib/toast";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { Image, Text, TouchableOpacity, View } from "react-native";
import Swiper from "react-native-swiper";
import { useAuth } from "../../context/AuthContext";

import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import apiService, { getBaseUrl } from "../../services/api.service";
import { Post } from "../screens/HomeScreen";
import ConfirmPopup from "./ConfirmPopup";

const PostItems = ({
  item,
  refetch,
  accessEdit = false,
  accessDelete = false,
}: {
  item: Post;
  refetch: () => void;
  accessEdit: boolean;
  accessDelete: boolean;
}) => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [showConfirmDelete, setShowConfirmDelete] = useState<string | null>(
    null,
  );
  const [post, setPost] = useState<Post>(item);

  useEffect(() => {
    setPost(item);
  }, [item]);

  useEffect(() => {
    return () => {
      setLoading(false);
    };
  }, []);

  const handleDelete = async (postId: string) => {
    try {
      toast.dismiss();
      const res = await apiService.deletePost(postId);
      if (res && res?.success) {
        // Optionally show a success message or update the UI
        toast.success(res.message || "Post deleted successfully");
        refetch?.();
      }
    } catch (error) {
      console.error("Failed to delete post:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleLikePost = async (postId: string) => {
    try {
      const res = await apiService.likePost(postId);
      if (res.success) {
        toast.success(res.message || "Post liked successfully");
        setPost((prevPost) => {
          if (!user) return prevPost;
          const liked = prevPost.likes.includes(user.id);
          return {
            ...prevPost,
            likes: liked
              ? prevPost.likes.filter((id) => id !== user.id) // unlike
              : [...prevPost.likes, user.id], // like
          };
        });
      }
    } catch (error) {
      console.error("Failed to like post:", error);
    }
  };

  // Handler for renew post, call prop or refetch or API as needed
  const handleRenew = async () => {
    try {
      router.push(`/(apps)/post/edit/${post.id}/renew`);
    } catch (e) {
      // Optionally handle error or show toast
    }
  };

  const expiredPostContent = (post: Post) => {
    if (!post?.expiredAt) return null;
    const now = new Date();
    const expiredAt = new Date(post?.expiredAt);
    const isExpired = expiredAt.getTime() < now.getTime();

    // Formatter for duration string and label
    const getDurationString = () => {
      let expiryDateString =
        expiredAt.toLocaleDateString(undefined, {
          year: "numeric",
          month: "short",
          day: "numeric",
        }) +
        " " +
        expiredAt.toLocaleTimeString(undefined, {
          hour: "2-digit",
          minute: "2-digit",
        });

      if (isExpired)
        expiryDateString = `${expiryDateString} • ${t("common.expired", "Expired")}`;

      const diff = expiredAt.getTime() - now.getTime();
      const days = Math.floor(diff / (1000 * 60 * 60 * 24));

      if (days > 0)
        expiryDateString = `${expiryDateString} • ${t("common.expiresInDays", { count: days })}`;
      if (diff <= 10 * 24 * 60 * 60 * 1000) {
        // 10 days in ms
        expiryDateString = `${expiryDateString} • ${t("common.expiredSoon", "Expiring soon")}`;
      }

      return (
        <Text
          className="mt-1 text-sm text-gray-600"
          style={{ fontWeight: "normal" }}
        >
          {expiryDateString}
        </Text>
      );
    };

    return (
      <View className="flex-row gap-4 items-center p-4 mx-4 mb-4 bg-white rounded-xl border-2 shadow-sm border-primary/80">
        <View className="flex-row flex-1 items-center">
          <View
            className={`h-[46px] w-[46px] items-center justify-center rounded-full ${isExpired ? "bg-red-100" : "bg-blue-100"}`}
          >
            <Ionicons
              name={isExpired ? "alert-circle-outline" : "calendar-outline"}
              size={26}
              color={isExpired ? "#DC2626" : "#2563EB"}
            />
          </View>
          <View className="flex-1 ml-4">
            <Text
              className={`text-base font-semibold ${
                isExpired ? "text-red-700" : "text-sky-700"
              }`}
            >
              {isExpired
                ? t("common.expired", "This post has expired.")
                : t("common.expiryNotice", "Expires soon")}
            </Text>
            {getDurationString()}
          </View>
          {isExpired && (
            <TouchableOpacity
              onPress={handleRenew}
              className="px-4 py-2 ml-3 rounded-full shadow-lg bg-primary"
              activeOpacity={0.88}
              style={{
                elevation: 2,
              }}
            >
              <Text className="text-sm font-bold tracking-wide text-white">
                {t("common.renew", "Renew Now")}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  };

  return (
    <View
      key={post.id}
      className="!relative mb-4 overflow-hidden rounded-xl border-2 border-gray-100 bg-white shadow"
    >
      <ConfirmPopup
        loading={loading}
        show={showConfirmDelete !== null}
        onCancel={() => {
          setShowConfirmDelete(null);
          setLoading(false);
        }}
        onConfirm={() => handleDelete(showConfirmDelete!)}
        title="Delete?"
        subTitle="Are you sure you want to delete?"
      />

      <View className="absolute top-2 right-2 z-10 flex-col gap-4">
        {accessEdit && (
          <TouchableOpacity
            className="rounded-full border bg-purple-50 p-1.5"
            onPress={() => {
              router.push(`/(apps)/post/edit/${post.id}`);
            }}
            activeOpacity={0.8}
            accessibilityLabel="Edit vehicle"
          >
            <Ionicons
              name="create-outline"
              size={18}
              className="text-primary"
            />
          </TouchableOpacity>
        )}
        {accessDelete && (
          <TouchableOpacity
            className=" rounded-full bg-red-500 p-1.5 shadow-lg "
            onPress={() => {
              setLoading(false);
              setShowConfirmDelete(post.id);
            }}
            activeOpacity={0.8}
          >
            <Ionicons name="close" size={18} color="#fff" />
          </TouchableOpacity>
        )}
      </View>
      <View>
        <Swiper
          showsButtons={false}
          className="!h-96 !w-full"
          horizontal
          loop={post?.images && post?.images.length > 1}
          dotStyle={{
            backgroundColor: "#E5E7EB",
            width: 8,
            height: 8,
            borderRadius: 4,
            margin: 2,
          }}
          activeDotStyle={{
            backgroundColor: "#9333EA",
            width: 10,
            height: 10,
            borderRadius: 5,
            margin: 2,
          }}
          screenReaderFocusable
        >
          {item?.images &&
            item?.images.map((img: any, idx: number) => (
              <View
                key={idx}
                className="!h-full !w-full flex-row items-center bg-gray-100 !object-cover "
              >
                <Image
                  source={{ uri: `${getBaseUrl()}${img.url}` }}
                  className="!h-full !w-full"
                  resizeMode="stretch"
                />
              </View>
            ))}
        </Swiper>
      </View>
      <View className="p-4">
        <View className="flex-row justify-between items-center">
          <View className="flex-row gap-2 justify-between items-center w-full">
            <TouchableOpacity
              onPress={() =>
                router.push({
                  pathname: `/(apps)/post/[post]`,
                  params: { post: post.id },
                })
              }
              activeOpacity={0.8}
            >
              <Text className="mb-2 text-lg font-bold leading-6 text-gray-900">
                {post.title}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              className="flex-row gap-1 items-center ml-2"
              onPress={() => handleLikePost(post.id)} // Optional: add onPress for liking post
              activeOpacity={0.7}
            >
              <Text className="mr-1">{t("common.like")}</Text>
              {post.likes.includes(user?.id || "") ? (
                <Ionicons name="heart-sharp" size={22} color="#EF4444" />
              ) : (
                <Ionicons name="heart-outline" size={22} color="#EF4444" />
              )}
              <Text className="ml-1 text-sm font-medium text-gray-600">
                {post.likes.length}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
        <View className="flex-row justify-between items-center">
          <View className="flex-row items-center">
            <Ionicons name="person-circle-outline" size={20} color="#6B7280" />
            <Text className="ml-1 text-sm font-medium text-gray-600">
              {post.user?.name ?? "Admin"}
            </Text>
          </View>
          <View className="flex-row items-center">
            <Ionicons name="time-outline" size={14} color="#9CA3AF" />
            <Text className="ml-1 text-sm text-gray-500">
              {`${new Date(post.createdAt).toLocaleDateString(undefined, {
                year: "numeric",
                month: "short",
                day: "numeric",
              })} ${new Date(post.createdAt).toLocaleTimeString(undefined, {
                hour: "2-digit",
                minute: "2-digit",
              })}`}
            </Text>
          </View>
        </View>
      </View>
      {post.userId === user?.id && expiredPostContent(post)}
    </View>
  );
};

export default PostItems;
