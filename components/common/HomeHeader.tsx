import { toast } from "@backpackapp-io/react-native-toast";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Image, Text, TouchableOpacity, View } from "react-native";
import { useAuth } from "../../context/AuthContext";
import DrawerMenuButton from "./DrawerMenuButton";
import { getStoreBy, LOCALE_KEY, setStoreBy } from "../../lib/session";

const HomeHeader = () => {
  const { t, i18n } = useTranslation();
  const { logout, user } = useAuth();
  const [languageMenuVisible, setLanguageMenuVisible] = useState(false);

  useEffect(() => {
    const setLanguageFromStorage = async () => {
      // Give priority to SecureStore, then fallback to user (if present)
      try {
        const storedLang = await getStoreBy(LOCALE_KEY);
        if (storedLang) {
          i18n.changeLanguage(storedLang);
        } else if (user && user.changeLanguage) {
          i18n.changeLanguage(user.changeLanguage);
        }
      } catch (e) {
        if (user && user.changeLanguage) {
          i18n.changeLanguage(user.changeLanguage);
        }
      }
    };
    setLanguageFromStorage();
  }, [user]);

  const changeLanguage = async (lang: string) => {
    if (!lang) {
      toast.error("Unable to change the language.");
      return;
    }
    i18n.changeLanguage(lang);
    await setStoreBy(LOCALE_KEY, lang);
    setLanguageMenuVisible(false);
  };

  return (
    <>
      <View className="flex-row justify-between items-center px-2 py-1 border-b border-gray-300 shadow bg-screen">
        <DrawerMenuButton />
        <View className="flex-row items-center -ml-28">
          <Image
            source={require("../../assets/logo.png")}
            style={{ width: 40, height: 40 }}
            resizeMode="contain"
          />
          <Text className="text-lg font-bold text-primary">Safar</Text>
          <Text className="text-lg font-bold text-yellow">Path</Text>
        </View>

        <View className="flex-row gap-2 items-center">
          {__DEV__ && (
            <TouchableOpacity
              onPress={() => logout()}
              className=""
              activeOpacity={0.8}
            >
              <View className="flex-row gap-1 items-center">
                <Ionicons name="lock-closed" size={20} color="red" />
              </View>
            </TouchableOpacity>
          )}
          <TouchableOpacity
            onPress={() => router.push("/(apps)/post/create")}
            className=""
            activeOpacity={0.8}
          >
            <View className="flex-row gap-1 items-center">
              <Ionicons name="add-circle-outline" size={20} color="black" />
              <Text className="text-base font-bold text-black">
                {t("home.post")}
              </Text>
            </View>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => router.replace("/(apps)/notifications")}
            className="relative p-2"
            activeOpacity={0.7}
          >
            <Ionicons name="notifications-outline" size={20} color="#1F2937" />
            <View className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setLanguageMenuVisible(!languageMenuVisible)}
            className="p-2"
            activeOpacity={0.7}
          >
            <Ionicons name="language" size={20} className="!text-primary" />
          </TouchableOpacity>
        </View>
      </View>
      {languageMenuVisible && (
        <View className="overflow-hidden absolute right-8 top-24 z-50 bg-white rounded-xl border border-gray-200 shadow-2xl">
          {[
            { code: "gu", label: t("common.gujarati") },
            { code: "hi", label: t("common.hindi") },
            { code: "en", label: t("common.english") },
          ].map((lang, idx, arr) => (
            <TouchableOpacity
              key={lang.code}
              className={`px-8 py-3.5 ${idx < arr.length - 1 ? "border-b border-gray-100" : ""} active:bg-gray-50 ${i18n.language === lang.code ? " bg-primary !text-white" : "text-black"}`}
              onPress={() => changeLanguage(lang.code)}
              activeOpacity={0.7}
            >
              <Text
                className={`font-medium ${i18n.language === lang.code ? "text-white" : " "}`}
              >
                {lang.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </>
  );
};

export default HomeHeader;
