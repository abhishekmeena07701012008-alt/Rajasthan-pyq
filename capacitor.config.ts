import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {

    // Android Application ID
    appId: "in.rajasthanpyq.master",

    // Application Name
    appName: "Rajasthan PYQ Master",

    // Production Build Folder
    webDir: "dist",

    // Capacitor Settings
    bundledWebRuntime: false,

    // Android Plugins Configuration
    plugins: {

        SplashScreen: {
            launchShowDuration: 2000,
            launchAutoHide: true,
            backgroundColor: "#10243a",
            showSpinner: true,
            androidSpinnerStyle: "large"
        }

    },

    // Android Configuration
    android: {
        backgroundColor: "#10243a",
        allowMixedContent: false
    }

};

export default config;
