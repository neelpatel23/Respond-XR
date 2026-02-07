import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from "react-native";
import Slider from "@react-native-community/slider";
import * as Haptics from "expo-haptics";
import * as Speech from "expo-speech";
import { useAudioPlayer, setAudioModeAsync } from "expo-audio";
import { activateKeepAwakeAsync, deactivateKeepAwake } from "expo-keep-awake";
import { colors, spacing, borderRadius, typography } from "../constants/theme";

const DEFAULT_BPM = 110;

const KEEP_AWAKE_TAG = "cpr-metronome";

interface CPRMetronomeCardProps {
  compact?: boolean;
}

export function CPRMetronomeCard({ compact }: CPRMetronomeCardProps) {
  const [bpm, setBpm] = useState(DEFAULT_BPM);
  const [running, setRunning] = useState(false);
  const [displayBeat, setDisplayBeat] = useState(0);
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const beatCount = useRef(0);
  const player = useAudioPlayer(require("../assets/sounds/tick.mp3"));

  useEffect(() => {
    setAudioModeAsync({ playsInSilentMode: true }).catch(() => {});
    return () => {
      if (tickRef.current) clearInterval(tickRef.current);
      Speech.stop();
    };
  }, []);

  const tickOnce = useCallback(() => {
    beatCount.current += 1;
    setDisplayBeat(beatCount.current);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    try {
      player.seekTo(0);
      player.play();
    } catch {}
    if (beatCount.current % 2 === 0) {
      Speech.speak("push", { rate: 1.0, pitch: 1.0 });
    }
  }, [player]);

  const start = useCallback(async (forceRestart?: boolean) => {
    if (running && !forceRestart) return;
    await activateKeepAwakeAsync(KEEP_AWAKE_TAG).catch(() => {});
    setRunning(true);
    beatCount.current = 0;
    setDisplayBeat(0);
    const rate = Math.max(100, Math.min(120, bpm));
    const ms = 60000 / rate;
    tickOnce();
    tickRef.current = setInterval(tickOnce, ms);
  }, [running, bpm, tickOnce]);

  const stop = useCallback(() => {
    if (tickRef.current) {
      clearInterval(tickRef.current);
      tickRef.current = null;
    }
    setRunning(false);
    setDisplayBeat(0);
    Speech.stop();
    deactivateKeepAwake(KEEP_AWAKE_TAG).catch(() => {});
  }, []);

  const runningRef = useRef(running);
  runningRef.current = running;

  useEffect(() => {
    if (runningRef.current) {
      stop();
      start(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only restart when BPM changes
  }, [bpm]);

  return (
    <View style={[s.card, compact && s.cardCompact]}>
      <View style={s.header}>
        <Text style={[s.title, compact && s.titleCompact]}>Perform CPR</Text>
        {!compact && (
          <Text style={s.subtitle}>
            Haptic + audio beat (100–120 compressions/min)
          </Text>
        )}
      </View>

      <View style={s.sliderRow}>
        <Slider
        style={[s.slider, compact && s.sliderCompact]}
        minimumValue={100}
        maximumValue={120}
        step={1}
        value={bpm}
        onValueChange={(v) => setBpm(Math.round(v))}
        minimumTrackTintColor={colors.primary}
        maximumTrackTintColor={colors.border}
        thumbTintColor={colors.primary}
        />
        <Text style={[s.bpmLabel, compact && s.bpmLabelCompact]}>{bpm} BPM</Text>
      </View>

      {running && (
        <Text style={s.beatCount}>{displayBeat} beats</Text>
      )}

      {!running ? (
        <TouchableOpacity style={[s.btnStart, compact && s.btnCompact]} onPress={start} activeOpacity={0.9}>
          <Text style={[s.btnTxt, compact && s.btnTxtCompact]}>Start Beat</Text>
        </TouchableOpacity>
      ) : (
        <TouchableOpacity style={[s.btnStop, compact && s.btnCompact]} onPress={stop} activeOpacity={0.9}>
          <Text style={[s.btnTxt, compact && s.btnTxtCompact]}>Stop</Text>
        </TouchableOpacity>
      )}

      {!compact && (
        <Text style={s.tip}>
          Center of chest, lower half of sternum. Push hard ~2 inches, allow full recoil.
        </Text>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  card: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardCompact: {
    flex: 0,
    padding: spacing.sm,
  },
  header: {
    marginBottom: spacing.xs,
  },
  title: {
    ...typography.titleSmall,
    color: colors.text,
    fontSize: 16,
  },
  titleCompact: {
    fontSize: 14,
  },
  subtitle: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    marginTop: 2,
    fontSize: 12,
  },
  sliderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    marginBottom: spacing.sm,
  },
  slider: {
    flex: 1,
    height: 32,
  },
  sliderCompact: {
    height: 28,
  },
  bpmLabel: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.primary,
    minWidth: 56,
    textAlign: "right",
  },
  bpmLabelCompact: {
    fontSize: 14,
    minWidth: 48,
  },
  beatCount: {
    fontSize: 24,
    fontWeight: "700",
    color: colors.primary,
    textAlign: "center",
    marginBottom: spacing.sm,
  },
  btnStart: {
    backgroundColor: colors.success,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.xl,
    minHeight: 56,
    borderRadius: borderRadius.md,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: colors.success,
  },
  btnStop: {
    backgroundColor: colors.danger,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.xl,
    minHeight: 56,
    borderRadius: borderRadius.md,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: colors.danger,
  },
  btnCompact: {
    paddingVertical: spacing.md,
    minHeight: 52,
  },
  btnTxt: {
    ...typography.label,
    color: colors.text,
    fontSize: 18,
  },
  btnTxtCompact: {
    fontSize: 16,
  },
  tip: {
    ...typography.caption,
    color: colors.textMuted,
    marginTop: spacing.sm,
    lineHeight: 16,
    fontSize: 10,
  },
});
