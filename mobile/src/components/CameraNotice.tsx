import { CameraOff, Settings } from 'lucide-react-native';

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import type { CameraPermissionProblem } from '../hooks/usePhotoPicker';

type Props = { problem: CameraPermissionProblem; onOpenSettings: () => void };

/** Explains why the camera didn't open, with a way to fix it from Settings when that's the only option. */
export function CameraNotice({ problem, onOpenSettings }: Props) {
  if (!problem) return null;

  return (
    <Alert icon={CameraOff} variant="destructive">
      <AlertTitle>Camera access needed</AlertTitle>
      {problem === 'denied' ? (
        <AlertDescription>Camera access is needed to take a photo. Tap "Take photo" to allow it.</AlertDescription>
      ) : (
        <>
          <AlertDescription>Camera access is turned off for this app. You can turn it on in Settings.</AlertDescription>
          <Button variant="outline" size="sm" className="mb-2 ml-6 self-start" onPress={onOpenSettings}>
            <Icon as={Settings} size={16} />
            <Text>Open Settings</Text>
          </Button>
        </>
      )}
    </Alert>
  );
}
