/** Picks a random object, avoiding `current` when there's another choice, so "New object" always changes it. */
export function pickRandomObject(objects: readonly string[], current?: string | null): string {
  const choices = objects.length > 1 ? objects.filter((object) => object !== current) : objects;
  return choices[Math.floor(Math.random() * choices.length)];
}
