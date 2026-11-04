import { ImagePlus } from 'lucide-react-native';
import { Image, View } from 'react-native';

import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';

/** The chosen (or annotated) photo, or a placeholder until there is one. */
export function PhotoPreview({ uri }: { uri: string | undefined }) {
  if (!uri) {
    return (
      <View className="h-56 w-full items-center justify-center gap-2 rounded-lg border-2 border-dashed border-border bg-muted/50">
        <Icon as={ImagePlus} size={32} className="text-muted-foreground" />
        <Text variant="muted">Your photo will appear here</Text>
      </View>
    );
  }

  return (
    <Image
      testID="photo"
      source={{ uri }}
      className="h-80 w-full rounded-lg bg-muted"
      resizeMode="contain"
    />
  );
}
