import React, { useEffect, useState } from "react";
import { StyleSheet, Text, TextInput } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useAuth } from "../auth/AuthContext";
import { studentHomeRoute } from "../auth/profileComplete";
import type { RootStackParamList } from "../navigation/types";
import { ErrorBanner, Meta, PrimaryButton, Screen, Title } from "../components/ui";
import { useTheme } from "../theme/ThemeContext";
import { radius, space } from "../theme/tokens";

type Props = NativeStackScreenProps<RootStackParamList, "Login">;

export function LoginScreen({ navigation, route }: Props) {
  const { colors } = useTheme();
  const { requestOtp, ready, isAuthenticated, user } = useAuth();
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const reason = route.params?.reason;

  useEffect(() => {
    if (!ready || !isAuthenticated || !user) return;
    if (user.role === "admin") {
      navigation.replace("Admin");
      return;
    }
    if (studentHomeRoute(user) === "Settings") {
      navigation.replace("Settings", { mandatory: true });
    } else {
      navigation.replace("Main");
    }
  }, [ready, isAuthenticated, user, navigation]);

  async function onContinue() {
    setError(null);
    setLoading(true);
    try {
      await requestOtp(email.trim());
      navigation.navigate("Otp", { email: email.trim(), reason });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not send code");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Screen style={styles.wrap} testID="screen-login">
      <Title>Tutor Pod</Title>
      <Meta>Sign in to continue</Meta>
      {reason ? (
        <Text style={[styles.reason, { color: colors.textSecondary }]}>
          {reason}
        </Text>
      ) : null}
      {error ? <ErrorBanner message={error} /> : null}
      <TextInput
        autoCapitalize="none"
        keyboardType="email-address"
        placeholder="you@school.edu"
        placeholderTextColor={colors.textDisabled}
        value={email}
        onChangeText={setEmail}
        style={[
          styles.input,
          { backgroundColor: colors.card, color: colors.text },
        ]}
        accessibilityLabel="Email"
        testID="input-email"
      />
      <PrimaryButton
        label={loading ? "Sending…" : "Continue"}
        onPress={() => void onContinue()}
        disabled={loading || !email.includes("@")}
      />
      <Meta style={{ marginTop: space[2] }}>Dev OTP stub: 000000</Meta>
    </Screen>
  );
}

const styles = StyleSheet.create({
  wrap: { justifyContent: "center", gap: space[4] },
  reason: {
    fontFamily: "DMSans_400Regular",
    marginTop: -space[2],
  },
  input: {
    borderRadius: radius.button,
    padding: space[4],
    fontFamily: "DMSans_400Regular",
  },
});
