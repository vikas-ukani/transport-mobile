import { useGlobalSearchParams } from 'expo-router';
import PostDetailScreen from '../../../components/screens/PostDetailScreen';

export default function SinglePostDetail() {
  const { post } = useGlobalSearchParams();

  return <PostDetailScreen />;
}
