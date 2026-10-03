import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import {
  RecordingPresets,
  requestRecordingPermissionsAsync,
  useAudioRecorder,
  useAudioRecorderState,
} from "expo-audio";
import { useTheme } from "../theme/ThemeContext";
import { radius, space } from "../theme/tokens";
import { transcribeRecording } from "../ask/transcribe";

type Props = {
  value: string;
  onChangeText: (text: string) => void;
  onSubmit: (text: string) => void | Promise<void>;
  token: string | null;
  placeholder?: string;
  /** Parent is submitting an answer (thinking). */
  submitting?: boolean;
  disabled?: boolean;
  onError?: (message: string) => void;
  testID?: string;
};

/** Compact animated bars for the recording capsule (ChatGPT-style). */
function LiveBars({ active }: { active: boolean }) {
  const { colors } = useTheme();
  const bars = useMemo(
    () => Array.from({ length: 28 }, () => new Animated.Value(0.25)),
    [],
  );
  const loopRef = useRef<Animated.CompositeAnimation | null>(null);

  useEffect(() => {
    loopRef.current?.stop();
    if (!active) {
      bars.forEach((b) => b.setValue(0.25));
      return;
    }
    const anims = bars.map((b, i) =>
      Animated.loop(
        Animated.sequence([
          Animated.timing(b, {
            toValue: 0.25 + ((i * 19) % 75) / 100,
            duration: 220 + (i % 6) * 40,
            useNativeDriver: true,
          }),
          Animated.timing(b, {
            toValue: 0.2 + ((i * 11) % 45) / 100,
            duration: 200 + (i % 5) * 35,
            useNativeDriver: true,
          }),
        ]),
      ),
    );
    loopRef.current = Animated.parallel(anims);
    loopRef.current.start();
    return () => loopRef.current?.stop();
  }, [active, bars]);

  return (
    <View
      accessible={false}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={styles.liveBars}
      accessibilityLabel="Recording waveform"
    >
      {bars.map((b, i) => (
        <Animated.View
          key={i}
          style={[
            styles.liveBar,
            {
              backgroundColor: colors.textSecondary,
              transform: [{ scaleY: b }],
            },
          ]}
        />
      ))}
    </View>
  );
}

/**
 * ChatGPT-style ask composer:
 * idle — text + mic + circular voice/send
 * recording — X | waveform | stop | send
 */
export function AskTutorComposer({
  value,
  onChangeText,
  onSubmit,
  token,
  placeholder = "What are you stuck on?",
  submitting = false,
  disabled = false,
  onError,
  testID = "ask-tutor-composer",
}: Props) {
  const { colors } = useTheme();
  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const recState = useAudioRecorderState(recorder);
  const [transcribing, setTranscribing] = useState(false);
  const busy = disabled || submitting || transcribing;

  function reportError(message: string) {
    onError?.(message);
  }

  async function startRecording() {
    if (busy || recState.isRecording) return;
    try {
      if (Platform.OS === "web") {
        // expo-audio may still work via getUserMedia; fail soft if not.
      }
      const perm = await requestRecordingPermissionsAsync();
      if (!perm.granted) {
        reportError(
          Platform.OS === "web"
            ? "Microphone unavailable in this browser. Type your question instead."
            : "Microphone permission is required for voice questions.",
        );
        return;
      }
      await recorder.prepareToRecordAsync();
      recorder.record();
    } catch (e) {
      reportError(
        e instanceof Error
          ? e.message
          : Platform.OS === "web"
            ? "Voice input is unavailable here. Type your question instead."
            : "Recording failed",
      );
    }
  }

  async function cancelRecording() {
    try {
      if (recState.isRecording) {
        await recorder.stop();
      }
    } catch {
      /* ignore */
    }
  }

  async function stopAndTranscribe(submit: boolean) {
    if (!token) {
      reportError("Sign in to ask a question.");
      return;
    }
    try {
      if (recState.isRecording) {
        await recorder.stop();
      }
      const uri = recorder.uri;
      if (!uri) {
        reportError("Recording failed — no audio file. Type your question.");
        return;
      }
      setTranscribing(true);
      const transcript = await transcribeRecording(token, uri);
      if (!transcript) {
        reportError("Could not hear a question. Try again or type it.");
        return;
      }
      onChangeText(transcript);
      if (submit) {
        await onSubmit(transcript);
      }
    } catch (e) {
      reportError(
        e instanceof Error
          ? e.message
          : "Could not transcribe audio. Type your question instead.",
      );
    } finally {
      setTranscribing(false);
    }
  }

  async function handleSendText() {
    const trimmed = value.trim();
    if (!trimmed || busy) return;
    await onSubmit(trimmed);
  }

  const hasText = value.trim().length > 0;
  const recording = recState.isRecording;

  if (recording || transcribing) {
    return (
      <View
        style={[styles.capsule, { backgroundColor: colors.card }]}
        testID={testID}
        accessibilityLabel={
          transcribing ? "Transcribing your question" : "Recording your question"
        }
      >
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Cancel recording"
          testID="ask-cancel-recording"
          disabled={transcribing}
          onPress={() => void cancelRecording()}
          style={({ pressed }) => [
            styles.iconBtn,
            pressed && { opacity: 0.7 },
            transcribing && { opacity: 0.4 },
          ]}
        >
          <Text style={[styles.iconGlyph, { color: colors.textSecondary }]}>✕</Text>
        </Pressable>

        {transcribing ? (
          <View style={styles.transcribingRow}>
            <ActivityIndicator color={colors.accent} />
            <Text style={[styles.hint, { color: colors.textSecondary }]}>
              Transcribing…
            </Text>
          </View>
        ) : (
          <LiveBars active={recording} />
        )}

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Stop recording"
          testID="ask-stop-recording"
          disabled={transcribing}
          hitSlop={12}
          onPress={() => void stopAndTranscribe(false)}
          style={({ pressed }) => [
            styles.stopBtn,
            { backgroundColor: colors.text },
            pressed && { opacity: 0.85 },
            transcribing && { opacity: 0.4 },
          ]}
        />

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Send question"
          testID="ask-send"
          disabled={transcribing}
          onPress={() => void stopAndTranscribe(true)}
          style={({ pressed }) => [
            styles.primaryCircle,
            { backgroundColor: colors.accent },
            pressed && { opacity: 0.85 },
            transcribing && { opacity: 0.4 },
          ]}
        >
          <Text style={[styles.sendArrow, { color: colors.white }]}>↑</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View
      style={[styles.capsule, { backgroundColor: colors.card }]}
      testID={testID}
    >
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.textDisabled}
        multiline
        editable={!busy}
        style={[styles.input, { color: colors.text }]}
        testID="ask-text-input"
        accessibilityLabel="Question"
      />
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Dictate"
        testID="ask-mic"
        disabled={busy}
        onPress={() => void startRecording()}
        style={({ pressed }) => [
          styles.iconBtn,
          pressed && { opacity: 0.7 },
          busy && { opacity: 0.4 },
        ]}
      >
        <Text style={[styles.iconGlyph, { color: colors.text }]}>🎤</Text>
      </Pressable>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={hasText ? "Send question" : "Start voice input"}
        testID={hasText ? "ask-send" : "ask-voice"}
        disabled={busy || (hasText && !value.trim())}
        onPress={() => {
          if (hasText) void handleSendText();
          else void startRecording();
        }}
        style={({ pressed }) => [
          styles.primaryCircle,
          { backgroundColor: colors.accent },
          pressed && { opacity: 0.85 },
          busy && { opacity: 0.5 },
        ]}
      >
        {submitting ? (
          <ActivityIndicator color={colors.white} />
        ) : hasText ? (
          <Text style={[styles.sendArrow, { color: colors.white }]}>↑</Text>
        ) : (
          <View style={styles.voiceGlyph} accessible={false}>
            {[10, 16, 12, 18].map((h, i) => (
              <View
                key={i}
                style={[
                  styles.voiceBar,
                  { height: h, backgroundColor: colors.white },
                ]}
              />
            ))}
          </View>
        )}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  capsule: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: radius.pill,
    paddingVertical: space[2],
    paddingLeft: space[4],
    paddingRight: space[2],
    gap: space[2],
    minHeight: 56,
  },
  input: {
    flex: 1,
    maxHeight: 120,
    paddingVertical: space[2],
    fontFamily: "DMSans_400Regular",
    fontSize: 16,
  },
  iconBtn: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  iconGlyph: {
    fontSize: 20,
  },
  primaryCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  sendArrow: {
    fontSize: 22,
    fontFamily: "DMSans_600SemiBold",
    marginTop: -2,
  },
  voiceGlyph: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
    height: 20,
  },
  voiceBar: {
    width: 2.5,
    borderRadius: 1,
  },
  liveBars: {
    flex: 1,
    height: 36,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 2,
    overflow: "hidden",
  },
  liveBar: {
    width: 3,
    height: 28,
    borderRadius: 1.5,
  },
  stopBtn: {
    width: 28,
    height: 28,
    borderRadius: 6,
  },
  transcribingRow: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: space[2],
    paddingHorizontal: space[2],
  },
  hint: {
    fontFamily: "DMSans_400Regular",
    fontSize: 14,
  },
});
