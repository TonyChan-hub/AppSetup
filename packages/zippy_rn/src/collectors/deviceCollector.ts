import { Platform } from 'react-native';

export type AppInfo = {
  name?: string;
  packageName?: string;
  version?: string;
  buildNumber?: string;
};

export class DeviceCollector {
  private appInfo: AppInfo = {};

  configure(appInfo: AppInfo): void {
    this.appInfo = { ...this.appInfo, ...appInfo };
  }

  async collect(): Promise<Record<string, unknown>> {
    const platform: Record<string, unknown> = {
      debugMode: typeof __DEV__ !== 'undefined' ? __DEV__ : false,
      os: Platform.OS,
      version: String(Platform.Version),
      isTV: Platform.isTV,
    };

    if (Platform.OS === 'android') {
      platform.brand = 'android';
      const constants = Platform.constants as
        | { Brand?: string; Model?: string; Release?: string }
        | undefined;
      if (constants) {
        platform.brand = constants.Brand ?? 'android';
        platform.model = constants.Model;
        platform.release = constants.Release;
      }
    } else if (Platform.OS === 'ios') {
      const constants = Platform.constants as
        | { systemName?: string; osVersion?: string }
        | undefined;
      platform.systemName = constants?.systemName ?? 'iOS';
      platform.systemVersion = constants?.osVersion ?? String(Platform.Version);
    }

    return {
      app: {
        name: this.appInfo.name ?? 'React Native App',
        packageName: this.appInfo.packageName ?? '',
        version: this.appInfo.version ?? '0.0.0',
        buildNumber: this.appInfo.buildNumber ?? '0',
      },
      platform,
    };
  }
}
