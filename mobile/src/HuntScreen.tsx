import { CircleAlert, Camera, Images, RefreshCw, ScanSearch, Shuffle } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Linking, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CameraNotice } from '@/components/CameraNotice';
import { PhotoPreview } from '@/components/PhotoPreview';
import { ResultCard } from '@/components/ResultCard';
import { TargetCard } from '@/components/TargetCard';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { useCheckObject } from './hooks/api/mutations/useCheckObject';
import { useObjects } from './hooks/api/queries/useObjects';
import { pickRandomObject } from './pickRandomObject';
import { usePhotoPicker } from './hooks/usePhotoPicker';

export function HuntScreen() {
  const {
    error: getObjectsError,
    isLoading: isLoadingObjects,
    data: objectData,
    isError: isObjectError,
    refetch: refetchObjects,
  } = useObjects();
  const {
    checkObject,
    reset: resetCheckObject,
    data: checkData,
    error: checkError,
    isPending: isCheckPending,
    isError: isCheckError,
  } = useCheckObject();
  const picker = usePhotoPicker();
  const [target, setTarget] = useState<string | null>(null);

  useEffect(() => {
    if (objectData && !target) {
      setTarget(pickRandomObject(objectData));
    }
  }, [objectData, target]);

  function handleNewObject() {
    if (!objectData) return;
    setTarget(pickRandomObject(objectData, target));
    picker.clearPhoto();
    resetCheckObject();
  }

  async function handleTakePhoto() {
    resetCheckObject();
    await picker.takePhoto();
  }

  async function handleChoosePhoto() {
    resetCheckObject();
    await picker.choosePhoto();
  }

  if (isLoadingObjects) {
    return (
      <SafeAreaView className="flex-1 bg-background">
        <ScrollView contentContainerClassName="grow items-center gap-4 p-6">
          <ActivityIndicator className="text-primary" size="large" />
        </ScrollView>
      </SafeAreaView>
    )
  }

  // Show the annotated result once there is one, otherwise a preview of the chosen photo.
  const displayedImage = checkData?.annotatedImage ?? picker.photo?.uri;

  return (
    <SafeAreaView className="flex-1 bg-background">
      <ScrollView contentContainerClassName="grow items-center gap-4 p-6">
        <View className="items-center gap-1 pb-2">
          <Text variant="h1">Scavenger Hunt</Text>
        </View>

        {isObjectError ? (
          <Alert icon={CircleAlert} variant="destructive">
            <AlertTitle>Something went wrong</AlertTitle>
            <AlertDescription>Couldn't load objects: {getObjectsError?.message}</AlertDescription>
            <Button variant="outline" size="sm" className="mb-2 ml-6 self-start" onPress={() => refetchObjects()}>
              <Icon as={RefreshCw} size={16} />
              <Text>Retry</Text>
            </Button>
          </Alert>
        ) : !target ? (
          <ActivityIndicator className="mt-8 text-primary" size="large" />
        ) : (
          <>
            <TargetCard target={target} />

            {!checkData?.isPresent &&
              <View className="w-full flex-row gap-3">
                <Button variant="outline" className="flex-1" onPress={handleTakePhoto} disabled={isCheckPending}>
                  <Icon as={Camera} size={18} />
                  <Text>Take photo</Text>
                </Button>
                <Button variant="outline" className="flex-1" onPress={handleChoosePhoto} disabled={isCheckPending}>
                  <Icon as={Images} size={18} />
                  <Text>Choose photo</Text>
                </Button>
              </View>
            }

            <CameraNotice problem={picker.cameraProblem} onOpenSettings={() => Linking.openSettings()} />

            <PhotoPreview uri={displayedImage} />

            {!checkData?.isPresent &&
              <Button
                size="lg"
                className="w-full"
                onPress={() => picker.photo && checkObject({ object: target, photo: picker.photo })}
                disabled={!picker.photo || isCheckPending}
              >
                {isCheckPending ? (
                  <>
                    <ActivityIndicator className="text-primary-foreground" />
                    <Text className="text-base">Checking…</Text>
                  </>
                ) : (
                  <>
                    <Icon as={ScanSearch} size={18} />
                    <Text className="text-base">Submit</Text>
                  </>
                )}
              </Button>
            }
            {checkData && (
              <ResultCard
                target={target}
                isPresent={checkData.isPresent}
                presentConfidence={checkData.presentConfidence}
              />
            )}
            {checkData?.isPresent && (
              <Button size="lg" className="w-full" onPress={handleNewObject}>
                <Icon as={Shuffle} size={18} />
                <Text className="text-base">New object</Text>
              </Button>
            )}
            {isCheckError && (
              <Alert icon={CircleAlert} variant="destructive">
                <AlertTitle>Check failed</AlertTitle>
                <AlertDescription>{checkError?.message}</AlertDescription>
              </Alert>
            )}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
