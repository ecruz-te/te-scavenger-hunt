import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { File } from 'expo-file-system';
import * as ImagePicker from 'expo-image-picker';
import { Linking } from 'react-native';

import { HuntScreen } from '../src/HuntScreen';
import type { ObjectCheckResult } from '../src/hooks/api/mutations/useCheckObject';

jest.mock('expo-file-system', () => ({
  File: class {
    uri: string;
    constructor(uri: string) {
      this.uri = uri;
    }
  },
}));

jest.mock('expo-image-picker', () => ({
  requestCameraPermissionsAsync: jest.fn(),
  launchCameraAsync: jest.fn(),
  launchImageLibraryAsync: jest.fn(),
}));

const mockPicker = jest.mocked(ImagePicker);

const OBJECTS = ['mug', 'spoon', 'fork'];

const checkResult: ObjectCheckResult = {
  isPresent: true,
  presentConfidence: 0.93,
  box: { top: 0.1, bottom: 0.6, left: 0.25, right: 0.75 },
  boxConfidence: 0.8,
  model: 'jev-1.14.0',
  annotatedImage: 'data:image/jpeg;base64,AAAA',
};

const PHOTO_ASSET = { uri: 'file:///photo.jpg', mimeType: 'image/jpeg', fileName: 'photo.jpg', width: 100, height: 100 };
const picked = { canceled: false, assets: [PHOTO_ASSET] } as ImagePicker.ImagePickerResult;
const canceled = { canceled: true, assets: null } as ImagePicker.ImagePickerResult;
const permission = (granted: boolean, canAskAgain = true) =>
  ({ granted, canAskAgain, status: granted ? 'granted' : 'denied', expires: 'never' }) as ImagePicker.PermissionResponse;

const ok = (body: unknown) => ({ ok: true, status: 200, json: async () => body });
const fail = (status: number, error: string) => ({ ok: false, status, json: async () => ({ error }) });

const mockFetch = jest.fn();

/** Fake backend: answers each endpoint, overridable per test. */
function mockBackend({ objects = ok({ objects: OBJECTS }), check = ok(checkResult) } = {}) {
  mockFetch.mockImplementation(async (url: string) => (url.endsWith('/api/objects') ? objects : check));
}

const checkCalls = () => mockFetch.mock.calls.filter(([url]) => url.endsWith('/api/object-check'));

/** Renders the screen with a fresh query client. No retries, and no cache GC timers left running after the test. */
async function renderHuntScreen() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: Infinity }, mutations: { retry: false, gcTime: Infinity } },
  });
  await render(
    <QueryClientProvider client={client}>
      <HuntScreen />
    </QueryClientProvider>,
  );
}

async function renderScreen() {
  await renderHuntScreen();
  await screen.findByText('Find this:');
}

/** Renders the screen and chooses a photo from the library. */
async function renderWithPhoto() {
  mockPicker.launchImageLibraryAsync.mockResolvedValue(picked);
  await renderScreen();
  await fireEvent.press(screen.getByText('Choose photo'));
  await screen.findByTestId('photo');
}

beforeEach(() => {
  process.env.EXPO_PUBLIC_API_URL = 'http://backend.test';
  globalThis.fetch = mockFetch;
  mockFetch.mockReset();
  mockBackend();
  // Always pick the first eligible object.
  jest.spyOn(Math, 'random').mockReturnValue(0);
});

afterEach(() => {
  jest.restoreAllMocks();
  jest.clearAllMocks();
});

describe('HuntScreen', () => {
  describe('objects', () => {
    it('prompts the player with a random object from the backend list', async () => {
      await renderScreen();

      expect(screen.getByText('mug')).toBeTruthy();
      expect(mockFetch).toHaveBeenCalledWith('http://backend.test/api/objects', undefined);
    });

    it('offers "New object" only after the object is found', async () => {
      await renderWithPhoto();
      expect(screen.queryByText('New object')).toBeNull();

      await fireEvent.press(screen.getByText('Submit'));
      await screen.findByText('Found it!');
      await fireEvent.press(screen.getByText('New object'));

      expect(await screen.findByText('spoon')).toBeTruthy();
      expect(screen.queryByTestId('photo')).toBeNull();
      expect(screen.queryByText('Found it!')).toBeNull();
      expect(screen.queryByText('New object')).toBeNull();
    });

    it('shows a retry option when the object list fails to load', async () => {
      mockBackend({ objects: fail(500, 'Backend down') });
      await renderHuntScreen();

      expect(await screen.findByText("Couldn't load objects: Backend down")).toBeTruthy();

      mockBackend();
      await fireEvent.press(screen.getByText('Retry'));

      expect(await screen.findByText('mug')).toBeTruthy();
    });
  });

  describe('photos', () => {
    it('shows a preview of a photo chosen from the library', async () => {
      await renderWithPhoto();

      expect(screen.getByTestId('photo').props.source).toEqual({ uri: PHOTO_ASSET.uri });
      // The library picker needs no permission prompt.
      expect(mockPicker.requestCameraPermissionsAsync).not.toHaveBeenCalled();
    });

    it('asks for camera permission before taking a photo', async () => {
      mockPicker.requestCameraPermissionsAsync.mockResolvedValue(permission(true));
      mockPicker.launchCameraAsync.mockResolvedValue(picked);
      await renderScreen();

      await fireEvent.press(screen.getByText('Take photo'));

      expect(await screen.findByTestId('photo')).toBeTruthy();
      expect(mockPicker.requestCameraPermissionsAsync).toHaveBeenCalled();
      expect(mockPicker.launchCameraAsync).toHaveBeenCalled();
    });

    it("doesn't open the camera when permission is denied", async () => {
      mockPicker.requestCameraPermissionsAsync.mockResolvedValue(permission(false, true));
      await renderScreen();

      await fireEvent.press(screen.getByText('Take photo'));

      expect(await screen.findByText(/Camera access is needed/)).toBeTruthy();
      expect(mockPicker.launchCameraAsync).not.toHaveBeenCalled();
    });

    it('offers Settings when camera permission is blocked', async () => {
      mockPicker.requestCameraPermissionsAsync.mockResolvedValue(permission(false, false));
      const openSettings = jest.spyOn(Linking, 'openSettings').mockResolvedValue();
      await renderScreen();

      await fireEvent.press(screen.getByText('Take photo'));
      await fireEvent.press(await screen.findByText('Open Settings'));

      expect(openSettings).toHaveBeenCalled();
    });

    it('keeps no photo when the picker is canceled', async () => {
      mockPicker.launchImageLibraryAsync.mockResolvedValue(canceled);
      await renderScreen();

      await fireEvent.press(screen.getByText('Choose photo'));

      await screen.findByText('Choose photo');
      expect(screen.queryByTestId('photo')).toBeNull();
    });
  });

  describe('checking', () => {
    it("can't check until there is a photo", async () => {
      await renderScreen();

      await fireEvent.press(screen.getByText('Submit'));

      expect(checkCalls()).toHaveLength(0);
    });

    it('uploads the photo with the target object and shows the annotated result', async () => {
      // Jest's FormData isn't Expo's, so record what gets appended instead of encoding it.
      const append = jest.spyOn(FormData.prototype, 'append').mockImplementation(() => {});
      await renderWithPhoto();

      await fireEvent.press(screen.getByText('Submit'));

      expect(await screen.findByText('Found it!')).toBeTruthy();
      expect(screen.getByText('93% sure')).toBeTruthy();
      expect(screen.getByTestId('photo').props.source).toEqual({ uri: checkResult.annotatedImage });

      const [[url, init]] = checkCalls();
      expect(url).toBe('http://backend.test/api/object-check');
      expect(init.method).toBe('POST');
      expect(init.body).toBeInstanceOf(FormData);
      expect(append.mock.calls).toEqual([
        ['object', 'mug'],
        ['photo', expect.objectContaining({ uri: PHOTO_ASSET.uri })],
      ]);
      // Expo's fetch rejects plain `{ uri, name, type }` parts ("Unsupported FormDataPart
      // implementation"); the photo must be an expo-file-system File, which implements Blob.
      expect(append.mock.calls[1][1]).toBeInstanceOf(File);
    });

    it('shows the error from a failed check', async () => {
      mockBackend({ check: fail(502, 'Jev unavailable') });
      await renderWithPhoto();

      await fireEvent.press(screen.getByText('Submit'));

      expect(await screen.findByText('Jev unavailable')).toBeTruthy();
      expect(screen.getByText('Check failed')).toBeTruthy();
      expect(screen.queryByText('Not quite')).toBeNull();
      expect(screen.queryByText('New object')).toBeNull();
    });

    it('shows "not found" as a result, not an error, when the object is not in the photo', async () => {
      mockBackend({ check: ok({ ...checkResult, isPresent: false, presentConfidence: 0.12 }) });
      await renderWithPhoto();

      await fireEvent.press(screen.getByText('Submit'));

      expect(await screen.findByText('Not quite')).toBeTruthy();
      expect(screen.getByText('No mug spotted in this photo.')).toBeTruthy();
      expect(screen.queryByText('Check failed')).toBeNull();
      expect(screen.queryByText('Found it!')).toBeNull();
      expect(screen.queryByText('New object')).toBeNull();
    });
  });
});
