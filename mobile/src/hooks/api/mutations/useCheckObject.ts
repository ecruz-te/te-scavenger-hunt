import { useMutation } from '@tanstack/react-query';
import { File } from 'expo-file-system';

import type { Photo } from '../../usePhotoPicker';
import { request } from '../../../lib/request';

export type ObjectCheckResult = {
  isPresent: boolean;
  /** Probability (0–1) that the object is in the photo. */
  presentConfidence: number;
  /** Object edges as fractions of the image's height (top, bottom) and width (left, right). */
  box: { top: number; bottom: number; left: number; right: number };
  boxConfidence: number | null;
  model: string;
  /** The photo as a JPEG data URL, with the box drawn on it when the object is present. */
  annotatedImage: string;
};

export type CheckObjectInput = { object: string; photo: Photo };

function checkObject({ object, photo }: CheckObjectInput): Promise<ObjectCheckResult> {
  const body = new FormData();
  body.append('object', object);
  // Expo's fetch only uploads Blob-like parts, not React Native's `{ uri, name, type }` objects.
  // expo-file-system's File implements Blob, with the file's name and MIME type.
  body.append('photo', new File(photo.uri));

  // No Content-Type header: fetch sets multipart/form-data with the boundary itself.
  return request('/api/object-check', { method: 'POST', body });
}

/** Uploads the photo and asks the backend whether `object` is in it, and where. */
export function useCheckObject() {
  const { reset, data, isPending, isError, error, mutate } = useMutation({ mutationFn: checkObject });
  return {
    reset,
    data,
    isPending,
    isError,
    error,
    checkObject: mutate,
  }
}
