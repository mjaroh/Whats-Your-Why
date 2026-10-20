import type { CapacitorConfig } from "@capacitor/cli";

// The iPhone app: a native shell around whatsyourwhy.app, so updates merged
// to the site reach the app without an App Store resubmission.
const config: CapacitorConfig = {
  appId: "app.whatsyourwhy.askesis",
  appName: "Askesis",
  webDir: "native-shell",
  server: {
    url: "https://whatsyourwhy.app",
    errorPath: "index.html",
    // Pages on these hosts stay inside the app. Anything else (Stripe checkout
    // and billing included) opens in Safari, as Apple expects for outside payments.
    allowNavigation: ["whatsyourwhy.app", "*.whatsyourwhy.app", "*.clerk.accounts.dev"],
  },
  backgroundColor: "#0b0b0a",
  ios: {
    contentInset: "never",
    backgroundColor: "#0b0b0a",
    scheme: "Askesis",
  },
  plugins: {
    LocalNotifications: {
      iconColor: "#0b0b0a",
    },
  },
};

export default config;
