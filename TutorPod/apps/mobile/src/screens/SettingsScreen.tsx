import React, { useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { api } from "../api/client";
import type { Standard } from "../api/types";
import { useAuth } from "../auth/AuthContext";
import { isProfileComplete } from "../auth/profileComplete";
import {
  ErrorBanner,
  Meta,
  PrimaryButton,
  Screen,
  Title,
} from "../components/ui";
import type { RootStackParamList } from "../navigation/types";
import { useTheme } from "../theme/ThemeContext";
import { THEME_OPTIONS, type ThemePreference } from "../theme/preference";
import { radius, space } from "../theme/tokens";

type Props = NativeStackScreenProps<RootStackParamList, "Settings">;

export function SettingsScreen({ navigation, route }: Props) {
  const { colors, preference, setPreference } = useTheme();
  const { user, updateName, updateStandard, refreshProfile, signOut, token } =
    useAuth();
  const mandatory = route.params?.mandatory !== false && !isProfileComplete(user);
  const [standards, setStandards] = useState<Standard[]>([]);
  const [name, setName] = useState(user?.name ?? "");
  const [standardId, setStandardId] = useState<string | null>(
    user?.standardId ?? null,
  );
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    void api<{ items: Standard[] }>("/api/v1/catalog/standards").then((r) =>
      setStandards(r.items),
    );
    if (token) void refreshProfile();
  }, [token, refreshProfile]);

  useEffect(() => {
    setName(user?.name ?? "");
    setStandardId(user?.standardId ?? null);
  }, [user?.name, user?.standardId]);

  async function onContinue() {
    const trimmed = name.trim();
    if (!trimmed) {
      setError("Student name is required");
      return;
    }
    if (!standardId) {
      setError("Please select your Standard");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await updateName(trimmed);
      await updateStandard(standardId);
      await refreshProfile();
      navigation.reset({ index: 0, routes: [{ name: "Main" }] });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save settings");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Screen style={{ paddingTop: space[8], gap: space[4] }} testID="screen-settings">
      <Title style={{ fontSize: 24 }}>
        {mandatory ? "Complete your settings" : "Settings"}
      </Title>
      <Meta>
        {mandatory
          ? "Add your name and Standard to continue."
          : "Update your profile and appearance."}
      </Meta>
      {error ? <ErrorBanner message={error} /> : null}
      <Meta>Student name</Meta>
      <TextInput
        testID="input-student-name"
        accessibilityLabel="Student name"
        value={name}
        onChangeText={setName}
        placeholder="Your name"
        placeholderTextColor={colors.textDisabled}
        style={[
          styles.input,
          { backgroundColor: colors.card, color: colors.text },
        ]}
      />
      <Meta>Standard</Meta>
      <View style={styles.row}>
        {standards.map((s) => {
          const on = standardId === s.id;
          return (
            <Pressable
              key={s.id}
              accessibilityRole="button"
              accessibilityState={{ selected: on }}
              testID={`standard-${s.code}`}
              onPress={() => setStandardId(s.id)}
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
      <Meta>Appearance</Meta>
      <View style={styles.row}>
        {THEME_OPTIONS.map((opt) => {
          const on = preference === opt.key;
          return (
            <Pressable
              key={opt.key}
              testID={`theme-${opt.key}`}
              onPress={() => setPreference(opt.key as ThemePreference)}
              style={[
                styles.chip,
                { backgroundColor: on ? colors.accent : colors.card },
              ]}
            >
              <Text style={{ color: on ? colors.white : colors.text }}>
                {opt.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
      <PrimaryButton
        label={saving ? "Saving…" : mandatory ? "Continue" : "Save"}
        onPress={() => void onContinue()}
        disabled={saving}
      />
      {!mandatory ? (
        <PrimaryButton
          label="Back to Main"
          variant="accent"
          onPress={() => navigation.navigate("Main")}
        />
      ) : (
        <PrimaryButton
          label="Log out"
          variant="accent"
          onPress={() =>
            void signOut().then(() =>
              navigation.reset({ index: 0, routes: [{ name: "Login" }] }),
            )
          }
        />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  input: {
    borderRadius: radius.button,
    padding: space[4],
    fontFamily: "DMSans_400Regular",
  },
  row: { flexDirection: "row", flexWrap: "wrap", gap: space[2] },
  chip: {
    paddingHorizontal: space[3],
    paddingVertical: space[2],
    borderRadius: radius.pill,
  },
});
