import {
  DMSans_400Regular,
  DMSans_600SemiBold,
  useFonts as useDmSans,
} from "@expo-google-fonts/dm-sans";
import {
  SpaceGrotesk_600SemiBold,
  useFonts as useSpaceGrotesk,
} from "@expo-google-fonts/space-grotesk";
import { StatusBar } from "expo-status-bar";
import React, { useEffect, useState } from "react";
import { ActivityIndicator, View } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { AuthProvider } from "./src/auth/AuthContext";
import { OfflineBanner } from "./src/components/ui";
import { RootNavigator } from "./src/navigation/RootNavigator";
import {
  isOffline,
  subscribeOffline,
} from "./src/offline/connectivity";
import {
  addBreadcrumb,
  captureMessage,
  initTelemetry,
} from "./src/telemetry/sentry";
import { ThemeProvider, useTheme } from "./src/theme/ThemeContext";
import { darkColors } from "./src/theme/tokens";

function AppShell() {
  const { colors, scheme } = useTheme();
  const [offline, setOfflineFlag] = useState(isOffline());

  useEffect(() => {
    initTelemetry();
    captureMessage("app.start");
    addBreadcrumb({ message: "App mounted", category: "lifecycle" });
    return subscribeOffline(setOfflineFlag);
  }, []);

  return (
    <>
      <StatusBar style={scheme === "dark" ? "light" : "dark"} />
      <View style={{ flex: 1, backgroundColor: colors.canvas }}>
        <OfflineBanner visible={offline} />
        <RootNavigator />
      </View>
    </>
  );
}

export default function App() {
  const [dmLoaded] = useDmSans({ DMSans_400Regular, DMSans_600SemiBold });
  const [sgLoaded] = useSpaceGrotesk({ SpaceGrotesk_600SemiBold });

  if (!dmLoaded || !sgLoaded) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: darkColors.canvas,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <ActivityIndicator color={darkColors.accent} />
      </View>
    );
  }

  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <AuthProvider>
          <AppShell />
        </AuthProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
