import { box, image, noul, type TypeSafeClient } from '@typesafe-ai/sdk';

import { annotateImage, prepareImage, type Box } from './image.js';

/** Only draw the box when Jev thinks the object is more likely there than not. */
const PRESENT_THRESHOLD = 0.5;

export type ObjectCheckResult = {
  isPresent: boolean;
  /** Probability (0–1) that the object is in the photo. */
  presentConfidence: number;
  /** Object edges as fractions of the image's height (top, bottom) and width (left, right). */
  box: Box;
  boxConfidence: number | null;
  model: string;
  /** The photo as a JPEG data URL, with the box drawn on it when the object is present. */
  annotatedImage: string;
};

export async function checkObject(
  client: TypeSafeClient,
  photo: Buffer,
  object: string,
): Promise<ObjectCheckResult> {
  // The same normalized bytes go to Jev and get drawn on, so the box lines up.
  const bytes = await prepareImage(photo);

  const response = await client.systemOne({
    state: image(bytes),
    questions: {
      present: noul(`Is there a ${object} in this photo?`),
      location: box(`The ${object}`),
    },
    // jev-ai.pro: only jev-1.14.0 answers `box` questions.
    model: 'jev-1.14.0',
  });

  const presentConfidence = response.answers.present.noul;
  const isPresent = presentConfidence >= PRESENT_THRESHOLD;

  const { top, bottom, left, right } = response.answers.location.box;
  const location = { top, bottom, left, right };
  const annotated = await annotateImage(bytes, isPresent ? location : null, object);

  console.log(`${object} is present: ${isPresent} with ${presentConfidence}`);

  return {
    isPresent,
    presentConfidence,
    box: location,
    boxConfidence: response.answers.location.confidence,
    model: response.model,
    annotatedImage: `data:image/jpeg;base64,${annotated.toString('base64')}`,
  };
}
