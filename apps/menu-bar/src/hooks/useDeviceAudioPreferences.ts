import { useEffect, useState } from 'react';

import { getUserPreferences, storage, userPreferencesStorageKey } from '../modules/Storage';

export const useDeviceAudioPreferences = () => {
  const [isEmulatorWithoutAudio, setEmulatorWithoutAudio] = useState<boolean>(
    getUserPreferences().emulatorWithoutAudio
  );
  const [isEmulatorColdBoot, setEmulatorColdBoot] = useState<boolean>(
    getUserPreferences().emulatorColdBoot
  );

  useEffect(() => {
    const listener = storage.addOnValueChangedListener((key) => {
      if (key === userPreferencesStorageKey) {
        const preferences = getUserPreferences();
        setEmulatorWithoutAudio(preferences.emulatorWithoutAudio);
        setEmulatorColdBoot(preferences.emulatorColdBoot);
      }
    });

    return () => {
      listener.remove();
    };
  }, []);

  return {
    emulatorWithoutAudio: isEmulatorWithoutAudio,
    emulatorColdBoot: isEmulatorColdBoot,
  };
};
