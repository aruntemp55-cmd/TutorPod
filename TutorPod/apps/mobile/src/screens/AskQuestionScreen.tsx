import React, { useRef, useState } from "react";
import {
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { api } from "../api/client";
import { useAuth } from "../auth/AuthContext";
import { AskTutorComposer } from "../components/AskTutorComposer";
import {
  ErrorBanner,
  Meta,
  Screen,
  Title,
} from "../components/ui";
import type { RootStackParamList } from "../navigation/types";
import { useTheme } from "../theme/ThemeContext";
import { radius, space } from "../theme/tokens";

type Props = NativeStackScreenProps<RootStackParamList, "AskQuestion">;

type Turn = { id: string; role: "user" | "assistant"; content: string };

export function AskQuestionScreen({ navigation }: Props) {
  const { colors } = useTheme();
  const { token } = useAuth();
  const [turns, setTurns] = useState<Turn[]>([]);
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const listRef = useRef<FlatList<Turn>>(null);

  async function sendMessage(message: string) {
    const trimmed = message.trim();
    if (!trimmed || !token || sending) return;
    setSending(true);
    setError(null);
    const userTurn: Turn = {
      id: `u-${Date.now()}`,
      role: "user",
      content: trimmed,
    };
    const history = [...turns, userTurn].map((t) => ({
      role: t.role,
      content: t.content,
    }));
    setTurns((t) => [...t, userTurn]);
    setText("");
    try {
      const res = await api<{ answer: string }>("/api/v1/ask", {
        token,
        body: { message: trimmed, history: history.slice(0, -1) },
      });
      setTurns((t) => [
        ...t,
        {
          id: `a-${Date.now()}`,
          role: "assistant",
          content: res.answer,
        },
      ]);
      setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 100);
    } catch (e) {
      setText(trimmed);
      setError(e instanceof Error ? e.message : "Ask failed");
    } finally {
      setSending(false);
    }
  }

  return (
    <Screen style={{ paddingTop: space[6], flex: 1 }} testID="screen-ask">
      <Pressable onPress={() => navigation.goBack()}>
        <Text style={{ color: colors.accent, fontFamily: "DMSans_600SemiBold" }}>
          ← Back
        </Text>
      </Pressable>
      <Title style={{ fontSize: 22, marginVertical: space[3] }}>
        Ask any question
      </Title>
      <Meta>
        Type or use voice. Voice is transcribed with Whisper when OPENAI_API_KEY
        is set on the API; otherwise type your question.
      </Meta>
      {error ? <ErrorBanner message={error} /> : null}
      <FlatList
        ref={listRef}
        style={{ flex: 1, marginTop: space[3] }}
        data={turns}
        keyExtractor={(t) => t.id}
        renderItem={({ item }) => (
          <View
            style={[
              styles.bubble,
              {
                backgroundColor:
                  item.role === "user" ? colors.accent : colors.card,
                alignSelf: item.role === "user" ? "flex-end" : "flex-start",
              },
            ]}
          >
            <Text
              style={{
                color: item.role === "user" ? colors.white : colors.text,
                fontFamily: "DMSans_400Regular",
              }}
            >
              {item.content}
            </Text>
          </View>
        )}
        ListEmptyComponent={
          <Meta style={{ marginTop: space[6] }}>
            Ask about any topic — your tutor replies here.
          </Meta>
        }
      />
      <View style={styles.composerWrap}>
        <AskTutorComposer
          value={text}
          onChangeText={setText}
          onSubmit={(msg) => void sendMessage(msg)}
          token={token}
          submitting={sending}
          onError={setError}
          placeholder="Ask your tutor…"
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  bubble: {
    maxWidth: "88%",
    padding: space[3],
    borderRadius: radius.button,
    marginBottom: space[2],
  },
  composerWrap: { paddingBottom: space[4] },
});
