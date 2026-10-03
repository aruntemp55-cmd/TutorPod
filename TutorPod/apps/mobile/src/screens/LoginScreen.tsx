import React, { useState } from "react";
import { StyleSheet, Text, TextInput, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useAuth } from "../auth/AuthContext";
import type { RootStackParamList } from "../navigation/types";
import { ErrorBanner, PrimaryButton, Screen, Title } from "../components/ui";
import { useTheme } from "../theme/ThemeContext";
import { radius, space } from "../theme/tokens";

type Props = NativeStackScreenProps<RootStackParamList, "Login">;

export function LoginScreen({ navigation, route }: Props) {
  const { colors } = useTheme();
  const { requestOtp } = useAuth();
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const reason = route.params?.reason;

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
    <Screen style={styles.wrap}>
      <Title>Sign in</Title>
      {reason ? <Text style={[styles.reason, { color: colors.textSecondary }]}>{reason}</Text> : null}
      {error ? <ErrorBanner message={error} /> : null}
      <TextInput
        autoCapitalize="none"
        keyboardType="email-address"
        placeholder="you@school.edu"
        placeholderTextColor={colors.textDisabled}
        value={email}
        onChangeText={setEmail}
        style={[styles.input, { backgroundColor: colors.card, color: colors.text }]}
        accessibilityLabel="Email"
      />
      <PrimaryButton
        label={loading ? "Sending…" : "Continue"}
        onPress={() => void onContinue()}
        disabled={loading || !email.includes("@")}
      />
      <PrimaryButton
        label="Browse without signing in"
        variant="accent"
        onPress={() => navigation.navigate("Main")}
      />
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
