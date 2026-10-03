import React, { useCallback, useState } from "react";
import { FlatList, Pressable, Text } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useFocusEffect } from "@react-navigation/native";
import { api } from "../api/client";
import type { Chapter } from "../api/types";
import { ChapterTile } from "../components/ChapterTile";
import {
  EmptyState,
  ErrorBanner,
  Loading,
  Meta,
  Screen,
  Title,
} from "../components/ui";
import type { RootStackParamList } from "../navigation/types";
import { useTheme } from "../theme/ThemeContext";
import { space } from "../theme/tokens";

type Props = NativeStackScreenProps<RootStackParamList, "SubjectTopics">;

export function SubjectTopicsScreen({ navigation, route }: Props) {
  const { colors } = useTheme();
  const { standardId, sectionId, sectionName } = route.params;
  const [topics, setTopics] = useState<Chapter[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api<{ items: Chapter[] }>(
        `/api/v1/catalog/sections/${sectionId}/chapters`,
      );
      setTopics(res.items);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load topics");
    } finally {
      setLoading(false);
    }
  }, [sectionId]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  if (loading) return <Loading />;

  return (
    <Screen style={{ paddingTop: space[6] }} testID="screen-topics">
      <Pressable onPress={() => navigation.goBack()}>
        <Text style={{ color: colors.accent, fontFamily: "DMSans_600SemiBold" }}>
          ← Back
        </Text>
      </Pressable>
      <Title style={{ fontSize: 22, marginTop: space[3] }}>{sectionName}</Title>
      <Meta style={{ marginBottom: space[4] }}>Topics — start a podcast (2 hosts by default)</Meta>
      {error ? <ErrorBanner message={error} onRetry={() => void load()} /> : null}
      <FlatList
        data={topics}
        keyExtractor={(c) => c.id}
        renderItem={({ item }) => (
          <ChapterTile
            chapter={item}
            onPlay={() =>
              navigation.navigate("StartPodcast", {
                standardId,
                sectionId,
                chapterId: item.id,
                chapterTitle: item.title,
              })
            }
          />
        )}
        ListEmptyComponent={
          <EmptyState title="No topics" body="Ask an admin to generate chapters." />
        }
      />
    </Screen>
  );
}
