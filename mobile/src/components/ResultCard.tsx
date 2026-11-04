import { CircleCheck, SearchX } from 'lucide-react-native';
import { View } from 'react-native';

import { Card, CardContent } from '@/components/ui/card';
import { Icon } from '@/components/ui/icon';
import { Progress } from '@/components/ui/progress';
import { Text } from '@/components/ui/text';

type Props = {
  target: string;
  isPresent: boolean;
  /** Probability (0–1) that the target is in the photo. */
  presentConfidence: number;
};

/** The outcome of a check: found (with how sure Jev is) or not found. */
export function ResultCard({ target, isPresent, presentConfidence }: Props) {
  if (isPresent) {
    const percent = Math.round(presentConfidence * 100);
    return (
      <Card className="w-full gap-3 border-success/40 py-5">
        <CardContent className="flex-row items-center gap-3">
          <Icon as={CircleCheck} size={28} className="text-success" />
          <View className="flex-1">
            <Text className="text-xl font-bold text-success">Found it!</Text>
            <Text variant="muted">{percent}% sure</Text>
          </View>
        </CardContent>
        <CardContent>
          <Progress value={percent} className="bg-success/20" indicatorClassName="bg-success" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full gap-3 border-warning/40 py-5">
      <CardContent className="flex-row items-center gap-3">
        <Icon as={SearchX} size={28} className="text-warning" />
        <View className="flex-1">
          <Text className="text-xl font-bold text-warning">Not quite</Text>
          <Text variant="muted">No {target} spotted in this photo.</Text>
          <Text variant="muted">Try another angle or a closer shot.</Text>
        </View>
      </CardContent>
    </Card>
  );
}
