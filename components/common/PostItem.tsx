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
      if (typeof post.renew === "function") {
        await post.renew();
        if (typeof refetch === "function") refetch();
      } else if (typeof refetch === "function") {
        // You may call an API here or show a modal etc.
        // For now, just do refetch
        refetch();
      }
    } catch (e) {
      // Optionally handle error or show toast
    }
  };

  return (
    <View
      key={post.id}
      className="overflow-hidden !relative mb-4 bg-white rounded-xl border-2 border-gray-100 shadow"
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
            className="p-1.5 bg-purple-50 rounded-full border"
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
            className=" bg-red-500 rounded-full p-1.5 shadow-lg "
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
          className="!w-full !h-96"
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
                className="!object-cover flex-row items-center !w-full !h-full bg-gray-100 "
              >
                <Image
                  source={{ uri: `${getBaseUrl()}${img.url}` }}
                  className="!w-full !h-full"
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
      {post.userId === user?.id && (
        <View className="flex-row items-center px-2 py-1 mt-2 bg-red-100 rounded">
          <Ionicons name="alert-circle-outline" size={16} color="#DC2626" />
          <Text className="ml-2 text-xs font-semibold text-red-700">
            {t("common.expired")}
          </Text>

          {(() => {
            if (!post?.expiredAt) return null;
            const now = new Date();
            const expiredAt = new Date(post?.expiredAt);
            const isExpired = expiredAt.getTime() < now.getTime();

            // Helper to format a duration until expiry
            const getDurationString = () => {
              if (isExpired) return t("common.expired");
              const diff = expiredAt.getTime() - now.getTime();
              // Convert ms to days/hours/mins
              const days = Math.floor(diff / (1000 * 60 * 60 * 24));
              const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
              const mins = Math.floor((diff / (1000 * 60)) % 60);
              if (days > 0) return t("common.expiresInDays", { count: days }); // e.g. "Expires in 3 days"
              if (hours > 0)
                return t("common.expiresInHours", { count: hours });
              if (mins > 0)
                return t("common.expiresInMinutes", { count: mins });
              return t("common.expiredSoon");
            };

            return (
              <>
                <Ionicons
                  name={isExpired ? "alert-circle-outline" : "calendar-outline"}
                  size={16}
                  color={isExpired ? "#DC2626" : "#64748B"}
                />
                <Text
                  className={`ml-2 text-xs font-semibold ${isExpired ? "text-red-700" : "text-sky-700"}`}
                >
                  {getDurationString()}
                </Text>
                {isExpired && (
                  <TouchableOpacity
                    onPress={handleRenew}
                    style={{
                      marginLeft: 12,
                      backgroundColor: "#2563EB",
                      paddingVertical: 2,
                      paddingHorizontal: 12,
                      borderRadius: 6,
                    }}
                    activeOpacity={0.8}
                  >
                    <Text
                      style={{
                        color: "#fff",
                        fontWeight: "bold",
                        fontSize: 12,
                      }}
                    >
                      {t("common.renew")}
                    </Text>
                  </TouchableOpacity>
                )}
              </>
            );
          })()}
        </View>
      )}
    </View>
  );
};

export default PostItems;
