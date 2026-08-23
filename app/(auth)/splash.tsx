import SplashScreen from "@/components/screens/SplashScreen"; // adjust import as needed
import { useRouter } from "expo-router";
export default function SplashRouteScreen() {
  const router = useRouter();
  return <SplashScreen onFinish={() => router.replace("/(auth)/login")} />;
}
