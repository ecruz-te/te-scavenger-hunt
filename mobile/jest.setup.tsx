// Progress animates with Reanimated, which needs native code (and its shipped Jest mock doesn't load
// under jest-expo 58). Tests don't check the bar itself, so render nothing in its place.
jest.mock('@/components/ui/progress', () => ({ Progress: () => null }));

// React Query batches re-renders on a setTimeout(0). In tests that timer can fire after the test
// has finished (outside act), so notify synchronously instead.
require('@tanstack/react-query').notifyManager.setScheduler((callback: () => void) => callback());
