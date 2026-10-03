import React, { useState } from "react";
import { StyleSheet, TextInput } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useAuth } from "../auth/AuthContext";
import { takePendingAction } from "../auth/pendingAction";
import type { RootStackParamList } from "../navigation/types";
import { ErrorBanner, Meta, PrimaryButton, Screen, Title } from "../components/ui";
import { useTheme } from "../theme/ThemeContext";
import { radius, space } from "../theme/tokens";

type Props = NativeStackScreenProps<RootStackParamList, "Otp">;

export function OtpScreen({ navigation, route }: Props) {
  const { colors } = useTheme();
  const styles = makeStyles(colors);
  const { signIn } = useAuth();
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function verify() {
    setLoading(true);
    setError(null);
    try {
      const user = await signIn(route.params.email, code.trim());
      const pending = takePendingAction();

      if (user.role === "admin") {
        navigation.reset({ index: 0, routes: [{ name: "Admin" }] });
        return;
      }

      if (pending?.type === "startPodcast") {
        if (pending.standardId && pending.sectionId) {
          navigation.replace("StartPodcast", {
            standardId: pending.standardId,
            sectionId: pending.sectionId,
            chapterId: pending.chapterId,
            chapterTitle: pending.chapterTitle,
          });
          return;
        }
      }
      if (pending?.type === "playPod") {
        navigation.replace("Player", { podId: pending.podId });
        return;
      }
      if (pending?.type === "openMyPods") {
        navigation.reset({
          index: 0,
          routes: [
            {
              name: "Main",
              state: {
                index: 1,
                routes: [
                  { name: "Home" },
                  { name: "MyPodsTab" },
                  { name: "Account" },
                ],
              },
            },
          ],
        });
        return;
      }
      // openLearningPath and default → Main (Home); Learning Path pill works when authed
      navigation.reset({ index: 0, routes: [{ name: "Main" }] });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Invalid code");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Screen style={styles.wrap}>
      <Title>Enter code</Title>
      <Meta>We sent a code to {route.params.email}. Dev stub: 000000</Meta>
      {error ? <ErrorBanner message={error} /> : null}
      <TextInput
        keyboardType="number-pad"
        maxLength={6}
        value={code}
        onChangeText={setCode}
        style={styles.input}
        accessibilityLabel="One-time code"
      />
      <PrimaryButton
        label={loading ? "Verifying…" : "Verify"}
        onPress={() => void verify()}
        disabled={loading || code.length < 4}
      />
    </Screen>
  );
}

function makeStyles(colors: import("../theme/tokens").ColorTokens) {
  return StyleSheet.create({
  wrap: { justifyContent: "center", gap: space[4] },
  input: {
    backgroundColor: colors.card,
    borderRadius: radius.button,
    padding: space[4],
    color: colors.text,
    letterSpacing: 8,
    fontSize: 22,
    textAlign: "center",
    fontFamily: "DMSans_600SemiBold",
  },
});
}
