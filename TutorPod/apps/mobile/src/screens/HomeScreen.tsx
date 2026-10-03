/**
 * @deprecated Student v3: not on the live navigator.
 * Learning Path is `LearningPathScreen` from Main. FilterPills stay here for
 * historical P1 studio/search UX — do not restore this as the default home.
 */
import React, { useCallback, useEffect, useMemo, useState } from "react";
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
import type {
  Chapter,
  LearningPath,
  Pod,
  Section,
  Standard,
} from "../api/types";
import { useAuth } from "../auth/AuthContext";
import { setPendingAction } from "../auth/pendingAction";
import { requireAuthForAction } from "../auth/requireAuthForAction";
import { ChapterTile } from "../components/ChapterTile";
import { Dropdown } from "../components/Dropdown";
import { FilterPills, type PillKey } from "../components/FilterPills";
import { LoginSoftPrompt } from "../components/LoginSoftPrompt";
import { PodRow } from "../components/PodRow";
import {
  EmptyState,
  ErrorBanner,
  Loading,
  Meta,
  PrimaryButton,
  Screen,
  Title,
} from "../components/ui";
import { useRootNav } from "../navigation/useRootNav";
import { useTheme } from "../theme/ThemeContext";
import { radius, space } from "../theme/tokens";

type SearchHit = {
  standards: Standard[];
  sections: Section[];
  chapters: Chapter[];
  pods: Array<{ id: string; title: string; status: string }>;
};

const STUDIO_TILES: {
  key: string;
  title: string;
  body: string;
  action: "audio" | "briefing" | "soon";
}[] = [
  {
    key: "audio",
    title: "Audio overview",
    body: "Multi-host podcast from the selected chapter",
    action: "audio",
  },
  {
    key: "briefing",
    title: "Study briefing",
    body: "Quick synopsis + raise-hand entry",
    action: "briefing",
  },
  {
    key: "flashcards",
    title: "Flashcards",
    body: "Coming soon",
    action: "soon",
  },
  {
    key: "quiz",
    title: "Quiz",
    body: "Coming soon",
    action: "soon",
  },
];

export function HomeScreen() {
  const nav = useRootNav();
  const { colors } = useTheme();
  const { isAuthenticated, token, user } = useAuth();
  const [pill, setPill] = useState<PillKey>("all");
  const [standards, setStandards] = useState<Standard[]>([]);
  const [sections, setSections] = useState<Section[]>([]);
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [pods, setPods] = useState<Pod[]>([]);
  const [paths, setPaths] = useState<LearningPath[]>([]);
  const [standardId, setStandardId] = useState<string | null>(null);
  const [sectionId, setSectionId] = useState<string | null>(null);
  const [chapterId, setChapterId] = useState<string | null>(null);
  const [selectedPathId, setSelectedPathId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [prompt, setPrompt] = useState<{ title: string; body: string } | null>(
    null,
  );
  const [searchQ, setSearchQ] = useState("");
  const [searchHits, setSearchHits] = useState<SearchHit | null>(null);
  const [searching, setSearching] = useState(false);
  const [briefingOpen, setBriefingOpen] = useState(false);

  const loadStandards = useCallback(async () => {
    setError(null);
    try {
      const stdRes = await api<{ items: Standard[] }>("/api/v1/catalog/standards");
      setStandards(stdRes.items);
      const preferred =
        user?.standardId &&
        stdRes.items.find((s) => s.id === user.standardId)?.id;
      const sid =
        preferred ??
        stdRes.items.find((s) => s.code === "CBSE-12")?.id ??
        stdRes.items[0]?.id ??
        null;
      setStandardId(sid);
      if (sid) await loadSections(sid);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load catalog");
    } finally {
      setLoading(false);
    }
  }, [user?.standardId]);

  async function loadSections(sid: string) {
    const res = await api<{ items: Section[] }>(
      `/api/v1/catalog/standards/${sid}/sections`,
    );
    setSections(res.items);
    const sec = res.items[0]?.id ?? null;
    setSectionId(sec);
    if (sec) await loadChapters(sec);
    else {
      setChapters([]);
      setChapterId(null);
    }
  }

  async function loadChapters(secId: string) {
    const res = await api<{ items: Chapter[] }>(
      `/api/v1/catalog/sections/${secId}/chapters`,
    );
    setChapters(res.items);
    setChapterId(res.items[0]?.id ?? null);
  }

  async function loadPaths(secId: string) {
    const res = await api<{ items: LearningPath[] }>(
      `/api/v1/catalog/sections/${secId}/learning-paths`,
      isAuthenticated && token ? { token } : undefined,
    );
    setPaths(res.items);
  }

  useEffect(() => {
    void loadStandards();
  }, [loadStandards]);

  useFocusEffect(
    useCallback(() => {
      if (pill === "mypods" && isAuthenticated && token) {
        void api<{ items: Pod[] }>("/api/v1/pods", { token }).then((r) =>
          setPods(r.items),
        );
      }
      if (pill === "learning" && sectionId) {
        void loadPaths(sectionId);
      }
    }, [pill, isAuthenticated, token, sectionId]),
  );

  useEffect(() => {
    if (pill !== "search") return;
    const q = searchQ.trim();
    if (q.length < 1) {
      setSearchHits(null);
      return;
    }
    const t = setTimeout(() => {
      setSearching(true);
      void api<SearchHit>(
        `/api/v1/search?q=${encodeURIComponent(q)}`,
        token ? { token } : undefined,
      )
        .then(setSearchHits)
        .catch(() => setSearchHits(null))
        .finally(() => setSearching(false));
    }, 250);
    return () => clearTimeout(t);
  }, [searchQ, pill, token]);

  const selectedChapter = useMemo(
    () => chapters.find((c) => c.id === chapterId) ?? null,
    [chapters, chapterId],
  );

  function startFor(chapter: Chapter) {
    if (!standardId || !sectionId) return;
    requireAuthForAction(
      isAuthenticated,
      () => {
        setPendingAction({
          type: "startPodcast",
          standardId,
          sectionId,
          chapterId: chapter.id,
          chapterTitle: chapter.title,
        });
        setPrompt({
          title: "Sign in to listen",
          body: "Start a streamed podcast after a quick sign-in.",
        });
      },
      () => {
        nav.navigate("StartPodcast", {
          standardId,
          sectionId,
          chapterId: chapter.id,
          chapterTitle: chapter.title,
        });
      },
    );
  }

  function onPill(next: PillKey) {
    if (next === "mypods") {
      requireAuthForAction(
        isAuthenticated,
        () => {
          setPendingAction({ type: "openMyPods" });
          setPrompt({
            title: "Sign in to play your pods",
            body: "MyPods requires login to listen.",
          });
        },
        () => setPill(next),
      );
      return;
    }
    // T075 — Learning Path pill open for guests (teaser); select soft-prompts
    setPill(next);
  }

  async function selectPath(pathId: string) {
    requireAuthForAction(
      isAuthenticated,
      () => {
        setPendingAction({ type: "openLearningPath" });
        setPrompt({
          title: "Sign in to choose a learning path",
          body: "Browse path names as a guest — select after a quick sign-in.",
        });
      },
      async () => {
        if (!token || !sectionId) return;
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
        setChapterId(chRes.items[0]?.id ?? null);
        setPill("all");
      },
    );
  }

  function onStudioTile(action: "audio" | "briefing" | "soon") {
    if (action === "soon") return;
    if (action === "briefing") {
      setBriefingOpen(true);
      return;
    }
    if (selectedChapter) startFor(selectedChapter);
  }

  if (loading) return <Loading />;

  return (
    <Screen style={{ paddingTop: space[6] }} testID="screen-home">
      <View style={styles.header}>
        <Title style={{ fontSize: 24 }}>Tutor Pod</Title>
        <View style={[styles.avatar, { backgroundColor: colors.avatar }]}>
          <Text style={[styles.avatarText, { color: colors.white }]}>
            {(user?.name ?? "G").slice(0, 1).toUpperCase()}
          </Text>
        </View>
      </View>

      <FilterPills value={pill} onChange={onPill} />
      {error ? (
        <ErrorBanner message={error} onRetry={() => void loadStandards()} />
      ) : null}

      {pill === "all" ? (
        <>
          <Dropdown
            label="Standard"
            value={standardId}
            options={standards.map((s) => ({ id: s.id, label: s.name }))}
            onChange={(id) => {
              setStandardId(id);
              void loadSections(id);
            }}
          />
          <Dropdown
            label="Section"
            value={sectionId}
            options={sections.map((s) => ({ id: s.id, label: s.name }))}
            onChange={(id) => {
              setSectionId(id);
              void loadChapters(id);
            }}
          />
          <Dropdown
            label="Chapter"
            value={chapterId}
            options={chapters.map((c) => ({ id: c.id, label: c.title }))}
            onChange={setChapterId}
          />
          <Meta style={{ marginBottom: space[3] }}>
            NotebookLM-style listen · pick hosts on next step
          </Meta>
          <FlatList
            data={
              selectedChapter
                ? chapters.filter((c) => c.id === selectedChapter.id)
                : chapters
            }
            keyExtractor={(c) => c.id}
            renderItem={({ item }) => (
              <ChapterTile chapter={item} onPlay={() => startFor(item)} />
            )}
            ListEmptyComponent={
              <EmptyState title="No chapters" body="Pick another section." />
            }
            contentContainerStyle={{ paddingBottom: 120 }}
          />
          <View style={styles.fab}>
            <PrimaryButton
              label="Start podcast"
              onPress={() => {
                if (selectedChapter) startFor(selectedChapter);
              }}
            />
          </View>
        </>
      ) : null}

      {pill === "search" ? (
        <View style={{ flex: 1 }}>
          <TextInput
            testID="search-input"
            value={searchQ}
            onChangeText={setSearchQ}
            placeholder="Search standards, sections, chapters…"
            placeholderTextColor={colors.textDisabled}
            style={[styles.searchInput, { backgroundColor: colors.card, color: colors.text }]}
            autoCapitalize="none"
            autoCorrect={false}
            accessibilityLabel="Search catalog"
          />
          {searching ? <Meta>Searching…</Meta> : null}
          {!searchQ.trim() ? (
            <EmptyState
              title="Search Tutor Pod"
              body="Find standards, sections, and chapters. Signed-in users also search MyPods."
            />
          ) : null}
          {searchHits ? (
            <FlatList
              data={[
                ...searchHits.chapters.map((c) => ({
                  kind: "chapter" as const,
                  id: c.id,
                  title: c.title,
                  meta: "Chapter",
                  chapter: c,
                })),
                ...searchHits.sections.map((s) => ({
                  kind: "section" as const,
                  id: s.id,
                  title: s.name,
                  meta: "Section",
                })),
                ...searchHits.standards.map((s) => ({
                  kind: "standard" as const,
                  id: s.id,
                  title: s.name,
                  meta: s.code,
                })),
                ...searchHits.pods.map((p) => ({
                  kind: "pod" as const,
                  id: p.id,
                  title: p.title,
                  meta: `Pod · ${p.status}`,
                })),
              ]}
              keyExtractor={(item) => `${item.kind}-${item.id}`}
              renderItem={({ item }) => (
                <Pressable
                  style={[styles.searchRow, { borderBottomColor: colors.pill }]}
                  onPress={() => {
                    if (item.kind === "chapter" && item.chapter) {
                      startFor(item.chapter);
                    } else if (item.kind === "pod") {
                      requireAuthForAction(
                        isAuthenticated,
                        () => {
                          setPendingAction({ type: "openMyPods" });
                          setPrompt({
                            title: "Sign in to play",
                            body: "Open this pod after sign-in.",
                          });
                        },
                        () => nav.navigate("Player", { podId: item.id }),
                      );
                    }
                  }}
                >
                  <Text style={[styles.pathTitle, { color: colors.text }]}>{item.title}</Text>
                  <Meta>{item.meta}</Meta>
                </Pressable>
              )}
              ListEmptyComponent={
                <EmptyState title="No matches" body="Try another query." />
              }
            />
          ) : null}
        </View>
      ) : null}

      {pill === "studio" ? (
        <View>
          <Meta style={{ marginBottom: space[3] }}>
            Studio formats · chapter: {selectedChapter?.title ?? "pick on All"}
          </Meta>
          <View style={styles.studioGrid}>
            {STUDIO_TILES.map((tile) => (
              <Pressable
                key={tile.key}
                accessibilityRole="button"
                accessibilityLabel={tile.title}
                style={[
                  styles.studioTile,
                  { backgroundColor: colors.card },
                  tile.action === "soon" && styles.studioSoon,
                ]}
                onPress={() => onStudioTile(tile.action)}
              >
                <Text style={[styles.pathTitle, { color: colors.text }]}>{tile.title}</Text>
                <Meta>{tile.body}</Meta>
              </Pressable>
            ))}
          </View>
          {briefingOpen && selectedChapter ? (
            <View style={[styles.briefing, { backgroundColor: colors.surface }]}>
              <Text style={[styles.pathTitle, { color: colors.text }]}>Study briefing</Text>
              <Meta>{selectedChapter.synopsis ?? "No synopsis yet."}</Meta>
              <PrimaryButton
                label="Ask a question (raise hand)"
                onPress={() => {
                  setBriefingOpen(false);
                  requireAuthForAction(
                    isAuthenticated,
                    () => {
                      setPendingAction({
                        type: "startPodcast",
                        standardId: standardId!,
                        sectionId: sectionId!,
                        chapterId: selectedChapter.id,
                        chapterTitle: selectedChapter.title,
                      });
                      setPrompt({
                        title: "Sign in to ask",
                        body: "Raise-hand needs an account.",
                      });
                    },
                    () => startFor(selectedChapter),
                  );
                }}
              />
              <PrimaryButton
                label="Close"
                variant="accent"
                onPress={() => setBriefingOpen(false)}
              />
            </View>
          ) : null}
        </View>
      ) : null}

      {pill === "mypods" ? (
        <FlatList
          data={pods}
          keyExtractor={(p) => p.id}
          renderItem={({ item }) => (
            <PodRow
              pod={item}
              onPlay={() => nav.navigate("Player", { podId: item.id })}
              onRaiseHand={() => nav.navigate("Player", { podId: item.id })}
            />
          )}
          ListEmptyComponent={
            <EmptyState
              title="No pods yet"
              body="Start a podcast from All."
              cta="Browse"
              onPress={() => setPill("all")}
            />
          }
        />
      ) : null}

      {pill === "learning" ? (
        <FlatList
          data={paths}
          keyExtractor={(p) => p.id}
          ListHeaderComponent={
            !isAuthenticated ? (
              <Meta style={{ marginBottom: space[3] }}>
                Guest teaser — path names visible; select after sign-in.
              </Meta>
            ) : null
          }
          renderItem={({ item }) => (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Select learning path ${item.name}`}
              style={[
                styles.pathCard,
                { backgroundColor: colors.card },
                selectedPathId === item.id && [styles.pathOn, { borderColor: colors.accent }],
              ]}
              onPress={() => void selectPath(item.id)}
            >
              <Text style={[styles.pathTitle, { color: colors.text }]}>{item.name}</Text>
              <Meta>{item.description}</Meta>
            </Pressable>
          )}
          ListEmptyComponent={
            <EmptyState
              title="No learning paths"
              body="Paths for this section will appear here once seeded."
              cta="Back to All"
              onPress={() => setPill("all")}
            />
          }
        />
      ) : null}

      <LoginSoftPrompt
        visible={!!prompt}
        title={prompt?.title ?? ""}
        body={prompt?.body ?? ""}
        onCancel={() => {
          setPendingAction(null);
          setPrompt(null);
        }}
        onSignIn={() => {
          setPrompt(null);
          nav.navigate("Login", { reason: prompt?.title });
        }}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: space[2],
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: { fontFamily: "DMSans_600SemiBold" },
  fab: {
    position: "absolute",
    left: space[4],
    right: space[4],
    bottom: space[4],
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
  searchInput: {
    borderRadius: radius.button,
    padding: space[3],
    fontFamily: "DMSans_400Regular",
    marginBottom: space[3],
  },
  searchRow: {
    paddingVertical: space[3],
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  studioGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: space[3],
  },
  studioTile: {
    width: "47%",
    borderRadius: radius.card,
    padding: space[4],
    minHeight: 110,
  },
  studioSoon: { opacity: 0.55 },
  briefing: {
    marginTop: space[4],
    borderRadius: radius.card,
    padding: space[4],
    gap: space[3],
  },
});
