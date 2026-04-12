import { Ionicons } from "@expo/vector-icons";
import { DrawerActions, useNavigation } from "@react-navigation/native";
import { TouchableOpacity } from "react-native";

export default function DrawerMenuButton() {
  const navigation = useNavigation();
  return (
    <TouchableOpacity
      onPress={() => navigation.dispatch(DrawerActions.openDrawer())}
      className="p-1"
      activeOpacity={0.7}
      accessibilityRole="button"
      accessibilityLabel="Open menu"
      
    >
      <Ionicons name="menu" size={28} color="#1F2937" />
    </TouchableOpacity>
  );
}
