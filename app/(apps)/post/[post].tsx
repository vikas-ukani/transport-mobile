import { useGlobalSearchParams } from 'expo-router';
import { Text, View } from 'react-native';

export default function SinglePostDetail() {
  const { post } = useGlobalSearchParams();

  return (
    <View>
      <Text>Data: {post}</Text>
    </View>
  );
}
