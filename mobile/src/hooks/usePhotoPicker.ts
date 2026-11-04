import * as ImagePicker from 'expo-image-picker';
import { useState } from 'react';

/** A local photo file, e.g. `file:///…/ImagePicker/abc.jpg`. */
export type Photo = { uri: string };

/** `denied`: the user said no but can be asked again. `blocked`: only Settings can change it. */
export type CameraPermissionProblem = 'denied' | 'blocked' | null;

const PICKER_OPTIONS: ImagePicker.ImagePickerOptions = {
  mediaTypes: ['images'],
  // Phone photos are large; the backend shrinks them further, so trade a little quality for upload speed.
  quality: 0.7,
};

function toPhoto(result: ImagePicker.ImagePickerResult): Photo | null {
  if (result.canceled || !result.assets?.[0]) return null;
  return { uri: result.assets[0].uri };
}

/** Lets the player take a photo (asking for camera permission first) or choose one from their library. */
export function usePhotoPicker() {
  const [photo, setPhoto] = useState<Photo | null>(null);
  const [cameraProblem, setCameraProblem] = useState<CameraPermissionProblem>(null);

  async function takePhoto() {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      setCameraProblem(permission.canAskAgain ? 'denied' : 'blocked');
      return;
    }
    setCameraProblem(null);
    const picked = toPhoto(await ImagePicker.launchCameraAsync(PICKER_OPTIONS));
    if (picked) {
      setPhoto(picked);
    }
  }

  async function choosePhoto() {
    // The system photo picker needs no permission for images.
    const picked = toPhoto(await ImagePicker.launchImageLibraryAsync(PICKER_OPTIONS));
    if (picked) {
      setPhoto(picked);
    }
  }

  function clearPhoto() {
    setPhoto(null);
    setCameraProblem(null);
  }

  return { photo, cameraProblem, takePhoto, choosePhoto, clearPhoto };
}
