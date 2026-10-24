import { Capacitor, registerPlugin } from "@capacitor/core";

// The bridge to the iPhone widgets (ios/App/App/WidgetBridge.swift). It keeps
// the widgets' key in the app group the widget extension reads, and asks
// iOS to redraw the widgets.
type WidgetBridgePlugin = {
  status(): Promise<{ supported: boolean; linked: boolean }>;
  link(options: { token: string; baseUrl: string }): Promise<void>;
  unlink(): Promise<void>;
  reload(): Promise<void>;
};

export const WidgetBridge = registerPlugin<WidgetBridgePlugin>("WidgetBridge");

export const widgetsAvailable = () => Capacitor.isNativePlatform() && Capacitor.isPluginAvailable("WidgetBridge");

/** After a change in the app, so the widgets show it too. Does nothing on the web. */
export function refreshWidgets() {
  if (widgetsAvailable()) WidgetBridge.reload().catch(() => {});
}
