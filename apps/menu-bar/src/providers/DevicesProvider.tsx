import { CliCommands } from 'common-types';
import React, { useCallback, useEffect, useRef, useState } from 'react';

import { listDevicesAsync } from '../commands/listDevicesAsync';
import { getUserPreferences } from '../modules/Storage';
import { DevicesPerPlatform, getDeviceId, getSectionsFromDeviceList } from '../utils/device';

type ListDevicesContext = {
  devicesPerPlatform: DevicesPerPlatform;
  sections: ReturnType<typeof getSectionsFromDeviceList>;
  numberOfDevices: number;
  hasInitialized: boolean;
  error?: Error;
  refetch: () => Promise<void>;
};

const defaultValues: ListDevicesContext = {
  devicesPerPlatform: {
    android: { devices: new Map() },
    ios: { devices: new Map() },
    tvos: { devices: new Map() },
    watchos: { devices: new Map() },
  },
  sections: [],
  numberOfDevices: 0,
  hasInitialized: false,
  refetch: async () => {},
};

const DevicesContext = React.createContext<ListDevicesContext>(defaultValues);
export const useListDevices = () => React.useContext(DevicesContext);

export function DevicesProvider({ children }: { children: React.ReactNode }) {
  const [devicesPerPlatform, setDevicesPerPlatform] = useState<DevicesPerPlatform>({
    android: { devices: new Map() },
    ios: { devices: new Map() },
    tvos: { devices: new Map() },
    watchos: { devices: new Map() },
  });
  const [hasInitialized, setHasInitialized] = useState(false);
  const [error, setError] = useState<Error>();

  const { showAndroidEmulators } = getUserPreferences();
  const sections = getSectionsFromDeviceList(devicesPerPlatform, {
    alwaysShowAndroid: showAndroidEmulators,
  });

  const fetchDevicesList = useCallback(async () => {
    const {
      showIosSimulators: showIos,
      showTvosSimulators: showTvos,
      showWatchosSimulators: showWatchos,
      showAndroidEmulators: showAndroid,
    } = getUserPreferences();

    const iosDevices = new Map<string, CliCommands.ListDevices.Device<CliCommands.Platform.Ios>>();
    const tvosDevices = new Map<
      string,
      CliCommands.ListDevices.Device<CliCommands.Platform.Tvos>
    >();
    const watchosDevices = new Map<
      string,
      CliCommands.ListDevices.Device<CliCommands.Platform.Watchos>
    >();
    const androidDevices = new Map<
      string,
      CliCommands.ListDevices.Device<CliCommands.Platform.Android>
    >();

    if (!showIos && !showTvos && !showWatchos && !showAndroid) {
      setDevicesPerPlatform({
        android: { error: undefined, devices: androidDevices },
        ios: { error: undefined, devices: iosDevices },
        tvos: { error: undefined, devices: tvosDevices },
        watchos: { error: undefined, devices: watchosDevices },
      });
    }

    const showApple = showIos || showTvos || showWatchos;
    const platform = showAndroid && showApple ? 'all' : showAndroid ? 'android' : 'ios';
    try {
      const devicesList = await listDevicesAsync({ platform });

      if (showIos) {
        devicesList.ios.devices.forEach((device) => {
          iosDevices.set(getDeviceId(device), device);
        });
      }

      if (showTvos) {
        devicesList.tvos.devices.forEach((device) => {
          tvosDevices.set(getDeviceId(device), device);
        });
      }

      if (showWatchos) {
        devicesList.watchos.devices.forEach((device) => {
          watchosDevices.set(getDeviceId(device), device);
        });
      }

      if (showAndroid) {
        devicesList.android.devices.forEach((device) => {
          androidDevices.set(getDeviceId(device), device);
        });
      }

      setDevicesPerPlatform({
        android: {
          error: devicesList.android.error,
          devices: androidDevices,
        },
        ios: {
          error: devicesList.ios.error,
          devices: iosDevices,
        },
        tvos: {
          error: devicesList.tvos.error,
          devices: tvosDevices,
        },
        watchos: {
          error: devicesList.watchos.error,
          devices: watchosDevices,
        },
      });
    } catch (err) {
      setError(err as Error);
    }
  }, []);

  // Refetches are triggered from several places (popover focus, after booting a device, ...).
  // Running them concurrently spawns several adb clients at once, which race to start the adb
  // server and fail, so run them one at a time. A refetch requested while one is in flight is
  // queued (at most one) so that it still reflects changes made after the first one started.
  const inFlightRequest = useRef<Promise<void> | null>(null);
  const queuedRequest = useRef<Promise<void> | null>(null);
  const updateDevicesList = useCallback((): Promise<void> => {
    if (!inFlightRequest.current) {
      inFlightRequest.current = fetchDevicesList().finally(() => {
        inFlightRequest.current = null;
      });
      return inFlightRequest.current;
    }
    if (!queuedRequest.current) {
      queuedRequest.current = inFlightRequest.current.then(() => {
        queuedRequest.current = null;
        return updateDevicesList();
      });
    }
    return queuedRequest.current;
  }, [fetchDevicesList]);

  useEffect(() => {
    updateDevicesList().finally(() => setHasInitialized(true));
  }, [updateDevicesList]);

  return (
    <DevicesContext
      value={{
        devicesPerPlatform,
        sections,
        numberOfDevices:
          devicesPerPlatform.android.devices.size +
          devicesPerPlatform.ios.devices.size +
          devicesPerPlatform.tvos.devices.size +
          devicesPerPlatform.watchos.devices.size,
        hasInitialized,
        error,
        refetch: updateDevicesList,
      }}>
      {children}
    </DevicesContext>
  );
}
