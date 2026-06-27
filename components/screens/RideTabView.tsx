import { useState } from "react";
import { useTranslation } from "react-i18next";
import { ScrollView, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import MyActiveRideScreen from "./MyActiveRides";
import RidesScreen from "./RidesScreen";
import MyFinishedRidesScreen from "./MyFinishedRidesScreen";

const FinishedRidesScreen = () => (
  <View className="flex-1 justify-center items-center">
    <Text>Finished Rides (Coming soon)</Text>
  </View>
);

const RideTabView = () => {
  const { t } = useTranslation();
  const [index, setIndex] = useState(0);

  const tabs = [
    { key: "active", title: t("booking.activeTab", "Active") },
    { key: "my", title: t("booking.myTab", "My") },
    { key: "finished", title: t("booking.finishedTab", "Finished") },
  ];

  const renderScene = () => {
    switch (tabs[index].key) {
      case "active":
        return <RidesScreen />;
      case "my":
        return <MyActiveRideScreen />;
      case "finished":
        return <MyFinishedRidesScreen />;
      default:
        return null;
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-screen">
      <View className="flex-row justify-between items-center px-5 py-4 bg-white border-b border-gray-100 shadow-sm">
        <Text className="text-xl font-bold text-gray-900">
          {t("booking.rides", "Rides")}
        </Text>
      </View>
      {/* Top (horizontal) tab bar */}
      <View className="flex-row w-full border-b border-gray-200">
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ flexGrow: 1 }}
        >
          {tabs.map((route, i) => (
            <TouchableOpacity
              key={route.key}
              className={[
                "flex-1 py-4 px-1 items-center justify-center",
                index === i
                  ? "text-primary border-b-4 border-primary bg-screen"
                  : "",
              ].join(" ")}
              style={{
                minWidth: `${100 / tabs.length}%`,
                flex: 1,
              }}
              onPress={() => setIndex(i)}
              activeOpacity={0.8}
            >
              <Text
                className={[
                  "font-bold text-base",
                  index === i ? "text-primary" : "text-gray-500",
                ].join(" ")}
              >
                {route.title}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
      {/* Content */}
      <View className="flex-1">{renderScene()}</View>
    </SafeAreaView>
  );
};

export default RideTabView;
