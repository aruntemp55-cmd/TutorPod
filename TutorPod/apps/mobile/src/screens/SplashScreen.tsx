import React, { useEffect } from "react";
import { StyleSheet, Text, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useAuth } from "../auth/AuthContext";
import { studentHomeRoute } from "../auth/profileComplete";
import type { RootStackParamList } from "../navigation/types";
import { useTheme } from "../theme/ThemeContext";

type Props = NativeStackScreenProps<RootStackParamList, "Splash">;

/** Brief boot gate — students land on Login unless already authenticated. */
export function SplashScreen({ navigation }: Props) {
  const { colors } = useTheme();
  const { ready, user, isAuthenticated } = useAuth();

  useEffect(() => {
    if (!ready) return;
    if (!isAuthenticated || !user) {
      navigation.replace("Login");
      return;
    }
    if (user.role === "admin") {
      navigation.replace("Admin");
      return;
    }
    const dest = studentHomeRoute(user);
    if (dest === "Settings") {
      navigation.replace("Settings", { mandatory: true });
    } else {
      navigation.replace("Main");
    }
  }, [ready, user, isAuthenticated, navigation]);

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
