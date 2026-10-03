import React, { useEffect, useState } from "react";
import {
  FlatList,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { api } from "../api/client";
import type { Question } from "../api/types";
import { useAuth } from "../auth/AuthContext";
import {
  ErrorBanner,
  Meta,
  PrimaryButton,
  Screen,
  Title,
} from "../components/ui";
import type { RootStackParamList } from "../navigation/types";
import { useTheme } from "../theme/ThemeContext";
import { radius, space } from "../theme/tokens";

type Props = NativeStackScreenProps<RootStackParamList, "RaiseHand">;

export function RaiseHandScreen({ navigation, route }: Props) {
  const { colors } = useTheme();
  const styles = makeStyles(colors);
  const { token, isAuthenticated } = useAuth();
  const [question, setQuestion] = useState("");
  const [items, setItems] = useState<Question[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isAuthenticated || !token) {
      navigation.replace("Login", { reason: "Sign in to ask a question" });
      return;
    }
    void api<{ items: Question[] }>(
      `/api/v1/pods/${route.params.podId}/questions`,
      { token },
    ).then((r) => setItems(r.items));
  }, [isAuthenticated, token, route.params.podId, navigation]);

  async function submit() {
    if (!token || !question.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const q = await api<Question>(
        `/api/v1/pods/${route.params.podId}/questions`,
        { token, body: { questionText: question.trim() } },
      );
      setItems((prev) => [q, ...prev]);
      setQuestion("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not ask");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Screen style={styles.wrap}>
      <Title style={{ fontSize: 22 }}>Ask your tutor</Title>
      <Meta>What are you stuck on?</Meta>
      {error ? <ErrorBanner message={error} /> : null}
      <TextInput
        multiline
        value={question}
        onChangeText={setQuestion}
        placeholder="Why does nucleophilic addition…"
        placeholderTextColor={colors.textDisabled}
        style={styles.input}
      />
      <PrimaryButton
        label={loading ? "Thinking…" : "Submit"}
        onPress={() => void submit()}
        disabled={loading || !question.trim()}
      />
      <FlatList
        data={items}
        keyExtractor={(q) => q.id}
        style={{ marginTop: space[4] }}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <Text style={styles.q}>{item.questionText}</Text>
            <Text style={styles.a}>{item.answerText ?? "…"}</Text>
          </View>
        )}
      />
    </Screen>
  );
}

function makeStyles(colors: import("../theme/tokens").ColorTokens) {
  return StyleSheet.create({
  wrap: { paddingTop: space[8], gap: space[3] },
  input: {
    minHeight: 100,
    backgroundColor: colors.card,
    borderRadius: radius.button,
    padding: space[4],
    color: colors.text,
    textAlignVertical: "top",
    fontFamily: "DMSans_400Regular",
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.card,
    padding: space[4],
    marginBottom: space[3],
    gap: space[2],
  },
  q: { color: colors.text, fontFamily: "DMSans_600SemiBold" },
  a: {
    color: colors.textSecondary,
    fontFamily: "DMSans_400Regular",
    lineHeight: 20,
  },
});
}
