import React, { useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import onboardingFlag from "../auth/onboardingFlag";
import type { RootStackParamList } from "../navigation/types";
import { PrimaryButton, Screen } from "../components/ui";
import { useTheme } from "../theme/ThemeContext";
import { space } from "../theme/tokens";

type Props = NativeStackScreenProps<RootStackParamList, "Onboarding">;

const PAGES = [
  {
    title: "Listen like a class",
    body: "Multi-host podcasts for each chapter — revise on the go.",
  },
  {
    title: "Raise your hand",
    body: "Pause anytime and ask a question. Your tutor answers in context.",
  },
  {
    title: "Follow a path",
    body: "Pick a learning path per subject and stay on track.",
  },
];

export function OnboardingScreen({ navigation }: Props) {
  const { colors } = useTheme();
  const [i, setI] = useState(0);
  const page = PAGES[i];

  async function finish(goLogin: boolean) {
    await onboardingFlag.setOnboardingDone();
    if (goLogin) navigation.replace("Login", { reason: "Welcome to Tutor Pod" });
    else navigation.replace("Main");
  }

  return (
    <Screen style={styles.wrap}>
      <Text style={[styles.brand, { color: colors.text }]}>Tutor Pod</Text>
      <View style={styles.card}>
        <Text style={[styles.title, { color: colors.text }]}>{page.title}</Text>
        <Text style={[styles.body, { color: colors.textSecondary }]}>{page.body}</Text>
      </View>
      <View style={styles.dots}>
        {PAGES.map((_, idx) => (
          <View key={idx} style={[styles.dot, { backgroundColor: colors.pill }, idx === i && { backgroundColor: colors.accent }]} />
        ))}
      </View>
      <PrimaryButton
        label={i < PAGES.length - 1 ? "Next" : "Get started"}
        onPress={() => {
          if (i < PAGES.length - 1) setI(i + 1);
          else void finish(false);
        }}
      />
      <PrimaryButton
        label="Sign in"
        variant="accent"
        onPress={() => void finish(true)}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  wrap: { justifyContent: "center", gap: space[4], paddingBottom: space[8] },
  brand: {
    fontSize: 18,
    fontFamily: "SpaceGrotesk_600SemiBold",
  },
  card: { marginVertical: space[8] },
  title: {
    fontSize: 28,
    fontFamily: "SpaceGrotesk_600SemiBold",
    marginBottom: space[3],
  },
  body: {
    fontSize: 16,
    lineHeight: 24,
    fontFamily: "DMSans_400Regular",
  },
  dots: { flexDirection: "row", gap: 8, marginBottom: space[4] },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
});
