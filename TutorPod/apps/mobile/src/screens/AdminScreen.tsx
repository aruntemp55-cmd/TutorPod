import React, { useCallback, useState } from "react";
import {
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import * as DocumentPicker from "expo-document-picker";
import { api } from "../api/client";
import type { Chapter, Section, Standard } from "../api/types";
import { useAuth } from "../auth/AuthContext";
import { Dropdown } from "../components/Dropdown";
import {
  ErrorBanner,
  Meta,
  PrimaryButton,
  Screen,
  Title,
} from "../components/ui";
import { useRootNav } from "../navigation/useRootNav";
import { API_BASE } from "../api/config";
import { useTheme } from "../theme/ThemeContext";
import { radius, space } from "../theme/tokens";

export function AdminScreen() {
  const { colors } = useTheme();
  const { token, user, signOut } = useAuth();
  const nav = useRootNav();
  const [standards, setStandards] = useState<Standard[]>([]);
  const [sections, setSections] = useState<Section[]>([]);
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [standardId, setStandardId] = useState<string | null>(null);
  const [sectionId, setSectionId] = useState<string | null>(null);
  const [newStd, setNewStd] = useState({ code: "", name: "" });
  const [newSec, setNewSec] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [lastPdfId, setLastPdfId] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!token) return;
    const s = await api<{ items: Standard[] }>("/api/v1/admin/standards", {
      token,
    });
    setStandards(s.items);
    const sid = standardId ?? s.items[0]?.id ?? null;
    setStandardId(sid);
    if (sid) {
      const sec = await api<{ items: Section[] }>(
        `/api/v1/admin/standards/${sid}/sections`,
        { token },
      );
      setSections(sec.items);
      const secId = sectionId ?? sec.items[0]?.id ?? null;
      setSectionId(secId);
      if (secId) {
        const ch = await api<{ items: Chapter[] }>(
          `/api/v1/admin/sections/${secId}/chapters`,
          { token },
        );
        setChapters(ch.items);
      }
    }
  }, [token, standardId, sectionId]);

  useFocusEffect(
    useCallback(() => {
      if (user?.role !== "admin") {
        nav.reset({ index: 0, routes: [{ name: "Main" }] });
        return;
      }
      void refresh().catch((e) =>
        setError(e instanceof Error ? e.message : "Load failed"),
      );
    }, [user?.role, refresh, nav]),
  );

  async function createStandard() {
    if (!token) return;
    setBusy(true);
    try {
      await api("/api/v1/admin/standards", {
        token,
        body: { code: newStd.code, name: newStd.name, board: "CBSE" },
      });
      setNewStd({ code: "", name: "" });
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Create failed");
    } finally {
      setBusy(false);
    }
  }

  async function createSection() {
    if (!token || !standardId || !newSec.trim()) return;
    setBusy(true);
    try {
      await api(`/api/v1/admin/standards/${standardId}/sections`, {
        token,
        body: { name: newSec.trim() },
      });
      setNewSec("");
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Create section failed");
    } finally {
      setBusy(false);
    }
  }

  async function uploadPdf() {
    if (!token || !sectionId) return;
    const pick = await DocumentPicker.getDocumentAsync({
      type: "application/pdf",
      copyToCacheDirectory: true,
    });
    if (pick.canceled || !pick.assets?.[0]) return;
    const asset = pick.assets[0];
    setBusy(true);
    setError(null);
    try {
      const form = new FormData();
      form.append("file", {
        uri: asset.uri,
        name: asset.name ?? "upload.pdf",
        type: "application/pdf",
      } as unknown as Blob);
      const res = await fetch(
        `${API_BASE}/api/v1/admin/sections/${sectionId}/pdf`,
        {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
          body: form,
        },
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error?.message ?? "Upload failed");
      setLastPdfId(data.id);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setBusy(false);
    }
  }

  async function generate() {
    if (!token || !sectionId || !lastPdfId) {
      setError("Upload a PDF first");
      return;
    }
    setBusy(true);
    try {
      await api(`/api/v1/admin/sections/${sectionId}/generate-chapters`, {
        token,
        body: { pdfId: lastPdfId },
      });
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Generate failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Screen style={{ paddingTop: space[6] }}>
      <Title style={{ fontSize: 24 }}>Admin</Title>
      <Meta>Catalog · PDF · chapter generation</Meta>
      {error ? <ErrorBanner message={error} /> : null}

      <Dropdown
        label="Standard"
        value={standardId}
        options={standards.map((s) => ({
          id: s.id,
          label: `${s.name} (${s.code})`,
        }))}
        onChange={(id) => {
          setStandardId(id);
          setSectionId(null);
          void api<{ items: Section[] }>(
            `/api/v1/admin/standards/${id}/sections`,
            { token: token! },
          ).then((r) => {
            setSections(r.items);
            setSectionId(r.items[0]?.id ?? null);
          });
        }}
      />
      <Dropdown
        label="Section"
        value={sectionId}
        options={sections.map((s) => ({ id: s.id, label: s.name }))}
        onChange={(id) => {
          setSectionId(id);
          void api<{ items: Chapter[] }>(
            `/api/v1/admin/sections/${id}/chapters`,
            { token: token! },
          ).then((r) => setChapters(r.items));
        }}
      />

      <Text style={[styles.h, { color: colors.text }]}>Add Standard</Text>
      <TextInput
        placeholder="Code e.g. CBSE-10"
        placeholderTextColor={colors.textDisabled}
        value={newStd.code}
        onChangeText={(code) => setNewStd((s) => ({ ...s, code }))}
        style={[styles.input, { backgroundColor: colors.card, color: colors.text }]}
      />
      <TextInput
        placeholder="Name"
        placeholderTextColor={colors.textDisabled}
        value={newStd.name}
        onChangeText={(name) => setNewStd((s) => ({ ...s, name }))}
        style={[styles.input, { backgroundColor: colors.card, color: colors.text }]}
      />
      <PrimaryButton
        label="Create Standard"
        onPress={() => void createStandard()}
        disabled={busy}
      />

      <Text style={[styles.h, { color: colors.text }]}>Add Section</Text>
      <TextInput
        placeholder="Section name e.g. Physics"
        placeholderTextColor={colors.textDisabled}
        value={newSec}
        onChangeText={setNewSec}
        style={[styles.input, { backgroundColor: colors.card, color: colors.text }]}
      />
      <PrimaryButton
        label="Create Section"
        onPress={() => void createSection()}
        disabled={busy}
      />

      <PrimaryButton
        label={busy ? "Working…" : "Upload PDF"}
        variant="accent"
        onPress={() => void uploadPdf()}
        disabled={busy || !sectionId}
      />
      <PrimaryButton
        label="Generate chapters from last PDF"
        onPress={() => void generate()}
        disabled={busy || !lastPdfId}
      />
      {lastPdfId ? <Meta>Last PDF: {lastPdfId.slice(0, 8)}…</Meta> : null}

      <Text style={[styles.h, { color: colors.text }]}>Chapters</Text>
      <FlatList
        data={chapters}
        keyExtractor={(c) => c.id}
        style={{ flexGrow: 0, maxHeight: 220 }}
        renderItem={({ item }) => (
          <View style={[styles.row, { borderBottomColor: colors.pill }]}>
            <Text style={[styles.rowTitle, { color: colors.text }]} numberOfLines={1}>
              {item.title}
            </Text>
            <Pressable
              onPress={async () => {
                if (!token) return;
                await api(`/api/v1/admin/chapters/${item.id}`, {
                  method: "DELETE",
                  token,
                });
                await refresh();
              }}
            >
              <Text style={[styles.del, { color: colors.error }]}>Delete</Text>
            </Pressable>
          </View>
        )}
      />

      <PrimaryButton
        label="Open student app"
        variant="accent"
        onPress={() => nav.reset({ index: 0, routes: [{ name: "Main" }] })}
      />
      <PrimaryButton label="Log out" onPress={() => void signOut().then(() => nav.reset({ index: 0, routes: [{ name: "Login" }] }))} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  h: {
    marginTop: space[3],
    fontFamily: "DMSans_600SemiBold",
  },
  input: {
    borderRadius: radius.button,
    padding: space[3],
    marginBottom: space[2],
    fontFamily: "DMSans_400Regular",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: space[2],
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  rowTitle: { flex: 1, fontFamily: "DMSans_400Regular" },
  del: { fontFamily: "DMSans_600SemiBold" },
});
