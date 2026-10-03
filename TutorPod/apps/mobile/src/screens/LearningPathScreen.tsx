import React, { useCallback, useEffect, useState } from "react";
import { FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { api } from "../api/client";
import type { Chapter, LearningPath, Section } from "../api/types";
import { useAuth } from "../auth/AuthContext";
import { ChapterTile } from "../components/ChapterTile";
import {
  EmptyState,
  ErrorBanner,
  Loading,
  Meta,
  Screen,
  Title,
} from "../components/ui";
import { useRootNav } from "../navigation/useRootNav";
import { useTheme } from "../theme/ThemeContext";
import { radius, space } from "../theme/tokens";

export function LearningPathScreen() {
  const nav = useRootNav();
  const { colors } = useTheme();
  const { token, user, isAuthenticated } = useAuth();
  const [sections, setSections] = useState<Section[]>([]);
  const [sectionId, setSectionId] = useState<string | null>(null);
  const [paths, setPaths] = useState<LearningPath[]>([]);
  const [selectedPathId, setSelectedPathId] = useState<string | null>(null);
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      if (!isAuthenticated) {
        nav.reset({ index: 0, routes: [{ name: "Login" }] });
      }
    }, [isAuthenticated, nav]),
  );

  const loadSections = useCallback(async () => {
    if (!user?.standardId) {
      setSections([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const res = await api<{ items: Section[] }>(
        `/api/v1/catalog/standards/${user.standardId}/sections`,
      );
      setSections(res.items);
      setSectionId((prev) => prev ?? res.items[0]?.id ?? null);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load subjects");
    } finally {
      setLoading(false);
    }
  }, [user?.standardId]);

  useEffect(() => {
    void loadSections();
  }, [loadSections]);

  const loadPaths = useCallback(async (secId: string) => {
    if (!token) return;
    try {
      const res = await api<{ items: LearningPath[] }>(
        `/api/v1/catalog/sections/${secId}/learning-paths`,
        { token },
      );
      setPaths(res.items);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load paths");
    }
  }, [token]);

  useEffect(() => {
    if (sectionId) void loadPaths(sectionId);
  }, [sectionId, loadPaths]);

  async function selectPath(pathId: string) {
    if (!token || !sectionId) return;
    setError(null);
    try {
      await api(`/api/v1/me/learning-paths/${sectionId}`, {
        method: "PUT",
        token,
        body: { learningPathId: pathId },
      });
      setSelectedPathId(pathId);
      const chRes = await api<{ items: Chapter[] }>(
        `/api/v1/catalog/sections/${sectionId}/chapters?pathId=${pathId}`,
        { token },
      );
      setChapters(chRes.items);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not select path");
    }
  }

  function startChapter(chapter: Chapter) {
    if (!user?.standardId || !sectionId) return;
    nav.navigate("StartPodcast", {
      standardId: user.standardId,
      sectionId,
      chapterId: chapter.id,
      chapterTitle: chapter.title,
    });
  }

  if (loading && !sections.length) return <Loading />;

  return (
    <Screen style={{ paddingTop: space[6] }} testID="screen-learning-path">
      <Pressable onPress={() => nav.goBack()} accessibilityLabel="Back">
        <Text style={{ color: colors.accent, fontFamily: "DMSans_600SemiBold" }}>
          ← Back
        </Text>
      </Pressable>
      <Title style={{ fontSize: 22, marginTop: space[3] }}>Learning Path</Title>
      <Meta style={{ marginBottom: space[3] }}>
        Choose a path for a subject, then start a topic podcast.
      </Meta>
      {error ? (
        <ErrorBanner message={error} onRetry={() => void loadSections()} />
      ) : null}

      <View style={styles.row}>
        {sections.map((s) => {
          const on = s.id === sectionId;
          return (
            <Pressable
              key={s.id}
              accessibilityRole="button"
              accessibilityState={{ selected: on }}
              accessibilityLabel={`Subject ${s.name}`}
              testID={`lp-section-${s.slug}`}
              onPress={() => {
                setSectionId(s.id);
                setSelectedPathId(null);
                setChapters([]);
              }}
              style={[
                styles.chip,
                { backgroundColor: on ? colors.accent : colors.card },
              ]}
            >
              <Text style={{ color: on ? colors.white : colors.text }}>
                {s.name}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <FlatList
        data={paths}
        keyExtractor={(p) => p.id}
        renderItem={({ item }) => (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Select learning path ${item.name}`}
            testID={`lp-path-${item.id}`}
            style={[
              styles.pathCard,
              { backgroundColor: colors.card },
              selectedPathId === item.id && [
                styles.pathOn,
                { borderColor: colors.accent },
              ],
            ]}
            onPress={() => void selectPath(item.id)}
          >
            <Text style={[styles.pathTitle, { color: colors.text }]}>
              {item.name}
            </Text>
            <Meta>{item.description}</Meta>
          </Pressable>
        )}
        ListEmptyComponent={
          <EmptyState
            title="No learning paths"
            body="Ask an admin to seed paths for this subject."
          />
        }
        ListFooterComponent={
          selectedPathId && chapters.length ? (
            <View style={{ marginTop: space[3] }}>
              <Meta style={{ marginBottom: space[2] }}>Path topics</Meta>
              {chapters.map((c) => (
                <ChapterTile
                  key={c.id}
                  chapter={c}
                  onPlay={() => startChapter(c)}
                />
              ))}
            </View>
          ) : null
        }
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", flexWrap: "wrap", gap: space[2], marginBottom: space[3] },
  chip: {
    paddingHorizontal: space[3],
    paddingVertical: space[2],
    borderRadius: radius.pill,
  },
  pathCard: {
    borderRadius: radius.card,
    padding: space[4],
    marginBottom: space[3],
  },
  pathOn: { borderWidth: 1 },
  pathTitle: {
    fontSize: 17,
    fontFamily: "DMSans_600SemiBold",
    marginBottom: space[1],
  },
});
