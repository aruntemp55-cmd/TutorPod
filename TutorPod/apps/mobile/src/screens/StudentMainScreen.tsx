import React, { useCallback, useEffect, useState } from "react";
import {
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { api } from "../api/client";
import type { Chapter, Section, Standard } from "../api/types";
import { useAuth } from "../auth/AuthContext";
import { isProfileComplete } from "../auth/profileComplete";
import {
  EmptyState,
  ErrorBanner,
  Loading,
  Meta,
  Screen,
  Title,
} from "../components/ui";
import { searchHitDestination } from "../navigation/searchHits";
import { useRootNav } from "../navigation/useRootNav";
import { useTheme } from "../theme/ThemeContext";
import { radius, space } from "../theme/tokens";

type SearchHit = {
  chapters: Chapter[];
  sections: Section[];
  standards: Standard[];
  pods?: Array<{ id: string; title: string; status: string }>;
};

type MainTile =
  | { key: string; title: string; body: string; section?: undefined }
  | { key: string; title: string; body: string; section: Section };

export function StudentMainScreen() {
  const nav = useRootNav();
  const { colors } = useTheme();
  const { user, token, isAuthenticated, refreshProfile } = useAuth();
  const [subjects, setSubjects] = useState<Section[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchQ, setSearchQ] = useState("");
  const [hits, setHits] = useState<SearchHit | null>(null);

  useFocusEffect(
    useCallback(() => {
      if (!isAuthenticated) {
        nav.reset({ index: 0, routes: [{ name: "Login" }] });
        return;
      }
      void refreshProfile().then(() => undefined);
    }, [isAuthenticated, nav, refreshProfile]),
  );

  useEffect(() => {
    if (user && !isProfileComplete(user)) {
      nav.reset({
        index: 0,
        routes: [{ name: "Settings", params: { mandatory: true } }],
      });
    }
  }, [user, nav]);

  const loadSubjects = useCallback(async () => {
    if (!user?.standardId) {
      setSubjects([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const res = await api<{ items: Section[] }>(
        `/api/v1/catalog/standards/${user.standardId}/sections`,
      );
      setSubjects(res.items);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load subjects");
    } finally {
      setLoading(false);
    }
  }, [user?.standardId]);

  useEffect(() => {
    void loadSubjects();
  }, [loadSubjects]);

  useEffect(() => {
    const q = searchQ.trim();
    if (q.length < 1) {
      setHits(null);
      return;
    }
    const t = setTimeout(() => {
      void api<SearchHit>(
        `/api/v1/search?q=${encodeURIComponent(q)}`,
        token ? { token } : undefined,
      )
        .then(setHits)
        .catch(() => setHits(null));
    }, 250);
    return () => clearTimeout(t);
  }, [searchQ, token]);

  if (loading && !subjects.length) return <Loading />;

  return (
    <Screen style={{ paddingTop: space[6] }} testID="screen-main">
      <View style={styles.header}>
        <View>
          <Title style={{ fontSize: 24 }}>Tutor Pod</Title>
          <Meta>
            Hi {user?.name?.trim() || "student"}
            {user?.standard?.name ? ` · ${user.standard.name}` : ""}
          </Meta>
        </View>
        <Pressable
          accessibilityLabel="Settings"
          onPress={() => nav.navigate("Settings", { mandatory: false })}
          style={[styles.avatar, { backgroundColor: colors.avatar }]}
        >
          <Text style={{ color: colors.white, fontFamily: "DMSans_600SemiBold" }}>
            {(user?.name ?? "?").slice(0, 1).toUpperCase()}
          </Text>
        </Pressable>
      </View>

      <TextInput
        testID="main-search"
        value={searchQ}
        onChangeText={setSearchQ}
        placeholder="Search topics, subjects…"
        placeholderTextColor={colors.textDisabled}
        style={[
          styles.search,
          { backgroundColor: colors.card, color: colors.text },
        ]}
      />

      {error ? (
        <ErrorBanner message={error} onRetry={() => void loadSubjects()} />
      ) : null}

      {hits ? (
        <FlatList
          data={[
            ...hits.chapters.map((c) => ({
              id: c.id,
              title: c.title,
              kind: "topic" as const,
              chapter: c,
            })),
            ...hits.sections.map((s) => ({
              id: s.id,
              title: s.name,
              kind: "subject" as const,
              section: s,
            })),
            ...(hits.pods ?? []).map((p) => ({
              id: p.id,
              title: p.title,
              kind: "pod" as const,
            })),
          ]}
          keyExtractor={(i) => `${i.kind}-${i.id}`}
          renderItem={({ item }) => (
            <Pressable
              style={[styles.row, { borderBottomColor: colors.pill }]}
              onPress={() => {
                const dest = searchHitDestination(
                  item.kind === "topic" && item.chapter
                    ? {
                        kind: "topic",
                        id: item.id,
                        title: item.title,
                        chapter: item.chapter,
                      }
                    : item.kind === "subject" && item.section
                      ? {
                          kind: "subject",
                          id: item.id,
                          title: item.title,
                          section: item.section,
                        }
                      : { kind: "pod", id: item.id, title: item.title },
                  user?.standardId ?? null,
                );
                if (!dest) return;
                if (dest.name === "StartPodcast") {
                  nav.navigate("StartPodcast", dest.params);
                } else if (dest.name === "SubjectTopics") {
                  nav.navigate("SubjectTopics", dest.params);
                } else {
                  nav.navigate("Player", dest.params);
                }
              }}
            >
              <Text style={[styles.tileTitle, { color: colors.text }]}>
                {item.title}
              </Text>
              <Meta>
                {item.kind === "topic"
                  ? "Topic"
                  : item.kind === "subject"
                    ? "Subject"
                    : "Pod"}
              </Meta>
            </Pressable>
          )}
          ListEmptyComponent={
            <EmptyState title="No matches" body="Try another search." />
          }
        />
      ) : (
        <FlatList
          data={
            [
              {
                key: "ask",
                title: "Ask any question",
                body: "Chat or voice with your tutor",
              },
              {
                key: "mypods",
                title: "My Pods",
                body: "Your podcast library",
              },
              {
                key: "learning",
                title: "Learning Path",
                body: "Pick a path, then start topics",
              },
              ...subjects.map((s) => ({
                key: `sub-${s.id}`,
                title: s.name,
                body: "Open topics",
                section: s,
              })),
            ] satisfies MainTile[]
          }
          keyExtractor={(i) => i.key}
          numColumns={2}
          columnWrapperStyle={{ gap: space[3] }}
          contentContainerStyle={{ gap: space[3], paddingBottom: 40 }}
          renderItem={({ item }: { item: MainTile }) => (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={item.title}
              testID={`tile-${item.key}`}
              style={[styles.tile, { backgroundColor: colors.card }]}
              onPress={() => {
                if (item.key === "ask") nav.navigate("AskQuestion");
                else if (item.key === "mypods") nav.navigate("MyPods");
                else if (item.key === "learning") nav.navigate("LearningPath");
                else if (item.section && user?.standardId) {
                  nav.navigate("SubjectTopics", {
                    standardId: user.standardId,
                    sectionId: item.section.id,
                    sectionName: item.section.name,
                  });
                }
              }}
            >
              <Text style={[styles.tileTitle, { color: colors.text }]}>
                {item.title}
              </Text>
              <Meta>{item.body}</Meta>
            </Pressable>
          )}
          ListEmptyComponent={
            <EmptyState
              title="No subjects"
              body="Pick a Standard in Settings."
              cta="Settings"
              onPress={() => nav.navigate("Settings", { mandatory: false })}
            />
          }
        />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: space[3],
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  search: {
    borderRadius: radius.button,
    padding: space[3],
    marginBottom: space[4],
    fontFamily: "DMSans_400Regular",
  },
  tile: {
    flex: 1,
    minHeight: 110,
    borderRadius: radius.card,
    padding: space[4],
    marginBottom: space[1],
  },
  tileTitle: {
    fontSize: 16,
    fontFamily: "DMSans_600SemiBold",
    marginBottom: space[1],
  },
  row: {
    paddingVertical: space[3],
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
});
