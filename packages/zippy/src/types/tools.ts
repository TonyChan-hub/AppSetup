export type ToolsDevice = {
  id: string;
  name: string;
  platform: 'android' | 'ios-sim' | string;
  state: string;
};

export type ScreenshotResult = {
  mime: string;
  base64: string;
};
