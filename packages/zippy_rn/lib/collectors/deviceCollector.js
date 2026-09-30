"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DeviceCollector = void 0;
const react_native_1 = require("react-native");
class DeviceCollector {
    constructor() {
        this.appInfo = {};
    }
    configure(appInfo) {
        this.appInfo = { ...this.appInfo, ...appInfo };
    }
    async collect() {
        const platform = {
            debugMode: typeof __DEV__ !== 'undefined' ? __DEV__ : false,
            os: react_native_1.Platform.OS,
            version: String(react_native_1.Platform.Version),
            isTV: react_native_1.Platform.isTV,
        };
        if (react_native_1.Platform.OS === 'android') {
            platform.brand = 'android';
            const constants = react_native_1.Platform.constants;
            if (constants) {
                platform.brand = constants.Brand ?? 'android';
                platform.model = constants.Model;
                platform.release = constants.Release;
            }
        }
        else if (react_native_1.Platform.OS === 'ios') {
            const constants = react_native_1.Platform.constants;
            platform.systemName = constants?.systemName ?? 'iOS';
            platform.systemVersion = constants?.osVersion ?? String(react_native_1.Platform.Version);
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
exports.DeviceCollector = DeviceCollector;
