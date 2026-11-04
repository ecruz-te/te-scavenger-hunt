import { Card, CardContent } from '@/components/ui/card';
import { Text } from '@/components/ui/text';

/** The object the player has to find. */
export function TargetCard({ target }: { target: string }) {
  return (
    <Card className="w-full gap-3 border-primary/30 bg-accent py-5">
      <CardContent className="items-center gap-1">
        <Text className="text-xs font-semibold uppercase tracking-widest text-accent-foreground">Find this:</Text>
        <Text className="text-4xl font-extrabold capitalize text-foreground">{target}</Text>
      </CardContent>
    </Card>
  );
}
