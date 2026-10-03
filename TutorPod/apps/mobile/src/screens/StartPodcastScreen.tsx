import React, { useState } from "react";
import { StyleSheet, TextInput, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { api } from "../api/client";
import type { Pod } from "../api/types";
import { useAuth } from "../auth/AuthContext";
import {
  ErrorBanner,
  Meta,
  PrimaryButton,
  Screen,
  Title,
} from "../components/ui";
import {
  CONTEXT_TEXT_MAX,
  HOST_OPTIONS,
  clampContextText,
  validateStartPodcastInput,
} from "../domain/podLimits";
import type { RootStackParamList } from "../navigation/types";
import { useTheme } from "../theme/ThemeContext";
import { radius, space } from "../theme/tokens";

type Props = NativeStackScreenProps<RootStackParamList, "StartPodcast">;

export function StartPodcastScreen({ navigation, route }: Props) {
  const { colors } = useTheme();
  const styles = makeStyles(colors);
  const { token, isAuthenticated } = useAuth();
  const [hosts, setHosts] = useState(2);
  const [context, setContext] = useState("");
  const [showContext, setShowContext] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  if (!isAuthenticated || !token) {
    navigation.replace("Login", { reason: "Sign in to start a podcast" });
    return null;
  }

  async function start() {
    const validation = validateStartPodcastInput({
      hostCount: hosts,
      contextText: context,
    });
    if (validation) {
      setError(validation);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const pod = await api<Pod>("/api/v1/pods", {
        token,
        body: {
          standardId: route.params.standardId,
          sectionId: route.params.sectionId,
          chapterId: route.params.chapterId,
          hostCount: hosts,
          contextText: clampContextText(context).trim() || undefined,
        },
      });
      if (pod.status === "failed") {
        setError(pod.errorMessage ?? "Podcast failed");
        return;
      }
      if (pod.status === "ready" && pod.audioUrl) {
        navigation.replace("Player", { podId: pod.id });
        return;
      }
      navigation.replace("Generating", {
        podId: pod.id,
        chapterTitle: route.params.chapterTitle,
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not start podcast");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Screen style={styles.wrap} testID="screen-start-podcast">
      <Title style={{ fontSize: 22 }}>Audio Overview</Title>
      <Meta>{route.params.chapterTitle}</Meta>
      <Meta>
        Hosts + chapter are sent to the server; audio streams back for playback.
      </Meta>
      {error ? <ErrorBanner message={error} /> : null}
      <Meta>Number of hosts</Meta>
      <View style={styles.hosts} accessibilityRole="radiogroup">
        {HOST_OPTIONS.map((n) => (
          <View key={n} style={{ flex: 1 }}>
            <PrimaryButton
              label={`${n}`}
              variant={hosts === n ? "accent" : "light"}
              onPress={() => setHosts(n)}
            />
          </View>
        ))}
      </View>
      <PrimaryButton
        label={showContext ? "Hide context" : "+ Add context"}
        variant="accent"
        onPress={() => setShowContext((v) => !v)}
      />
      {showContext ? (
        <TextInput
          multiline
          value={context}
          onChangeText={setContext}
          maxLength={CONTEXT_TEXT_MAX}
          accessibilityLabel="Podcast context"
          placeholder="Focus on mechanisms…"
          placeholderTextColor={colors.textDisabled}
          style={styles.input}
        />
      ) : null}
      <PrimaryButton
        label={loading ? "Starting…" : "Start podcast"}
        onPress={() => void start()}
        disabled={loading}
      />
    </Screen>
  );
}

function makeStyles(colors: import("../theme/tokens").ColorTokens) {
  return StyleSheet.create({
  wrap: { justifyContent: "center", gap: space[4] },
  hosts: { flexDirection: "row", gap: space[2] },
  input: {
    minHeight: 100,
    backgroundColor: colors.card,
    borderRadius: radius.button,
    padding: space[4],
    color: colors.text,
    textAlignVertical: "top",
    fontFamily: "DMSans_400Regular",
  },
});
}
