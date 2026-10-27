import MenuBarModule from '../modules/MenuBarModule';
import { DevicePlatform } from '../utils/device';

type BootDeviceAsyncOptions = {
  platform: DevicePlatform;
  id: string;
  audio?: boolean;
  coldBoot?: boolean;
};

export const bootDeviceAsync = async ({
  platform,
  id,
  audio,
  coldBoot,
}: BootDeviceAsyncOptions) => {
  /**
   * Maps a DevicePlatform to the CLI boot-device platform parameter.
   * The CLI only supports 'ios' and 'android' for now — tvOS and watchOS simulators boot via the 'ios' path.
   */
  const bootPlatform = platform === 'android' ? 'android' : 'ios';

  const args = ['-p', bootPlatform, '--id', id];
  if (!audio) {
    args.push('--no-audio');
  }
  if (coldBoot) {
    args.push('--cold-boot');
  }
  await MenuBarModule.runCli('boot-device', args, console.log);
};
