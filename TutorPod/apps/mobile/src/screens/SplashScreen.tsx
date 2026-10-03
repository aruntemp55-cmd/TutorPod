import React, { useEffect } from "react";
import { StyleSheet, Text, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import onboardingFlag from "../auth/onboardingFlag";
import { useAuth } from "../auth/AuthContext";
import type { RootStackParamList } from "../navigation/types";
import { useTheme } from "../theme/ThemeContext";

type Props = NativeStackScreenProps<RootStackParamList, "Splash">;

export function SplashScreen({ navigation }: Props) {
  const { colors } = useTheme();
  const { ready, user } = useAuth();

  useEffect(() => {
    let cancelled = false;

    async function go() {
      try {
        if (user?.role === "admin") {
          if (!cancelled) navigation.replace("Admin");
          return;
        }
        const done = await Promise.race([
          onboardingFlag.isOnboardingDone(),
          new Promise<boolean>((resolve) => setTimeout(() => resolve(false), 800)),
        ]);
        if (!cancelled) navigation.replace(done ? "Main" : "Onboarding");
      } catch {
        if (!cancelled) navigation.replace("Onboarding");
      }
    }

    if (ready) {
      void go();
      return () => {
        cancelled = true;
      };
    }

    // Never stay on splash forever (e.g. auth boot hang on web)
    const t = setTimeout(() => {
      void go();
    }, 2000);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [ready, user, navigation]);

  return (
    <View
      style={[styles.wrap, { backgroundColor: colors.canvas }]}
      accessibilityLabel="Tutor Pod loading"
    >
      <Text style={[styles.mark, { color: colors.text }]}>Tutor Pod</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  mark: {
    fontSize: 34,
    fontFamily: "SpaceGrotesk_600SemiBold",
  },
});
