import { Platform, View } from "react-native";
import CreateBookingScreen from "../../components/screens/CreateBookingScreen";

export default function BookVehicle() {
  return Platform.OS !== "web" ? <CreateBookingScreen /> : <View />;
}
