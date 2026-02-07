// emergency/index.tsx
import { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
  Modal,
  Pressable,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { SimpleCPRVoiceButton } from "../../../components/SimpleCPRVoiceButton";
import { CPRMetronomeCard } from "../../../components/CPRMetronomeCard";
import { colors, spacing, borderRadius } from "../../../constants/theme";

export default function EmergencyHome() {
  const [cprModalVisible, setCprModalVisible] = useState(false);
  const insets = useSafeAreaInsets();

  return (
    <SafeAreaView style={s.root} edges={["top", "left", "right", "bottom"]}>
      <View style={s.wrap}>
        {/* Hero - compact */}
        <View style={s.hero}>
          <View style={s.heroRow}>
            <View style={s.logoMark}>
              <Ionicons name="medical" size={28} color={colors.primary} />
            </View>
            <View>
              <Text style={s.title}>Aidra</Text>
              <Text style={s.tagline}>AI emergency guidance • Camera • Voice</Text>
            </View>
          </View>
        </View>

        {/* Three separate buttons */}
        <View style={s.buttons}>
          <TouchableOpacity
            style={[s.btn, s.btnPrimary]}
            onPress={() => router.push("/emergency/run")}
            activeOpacity={0.9}
          >
            <View style={s.btnPrimaryContent}>
              <View style={s.btnPrimaryRow}>
                <Ionicons name="camera" size={20} color={colors.background} />
                <Text style={s.btnTxtPrimary}>Start Emergency Guidance</Text>
                <Ionicons name="chevron-forward" size={16} color={colors.background} style={{ opacity: 0.8 }} />
              </View>
              <Text style={s.btnSubtext}>AR camera • AI overlays • CPR & pulse guides</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={[s.btn, s.btnSecondary]}
            onPress={() => setCprModalVisible(true)}
            activeOpacity={0.9}
          >
            <Ionicons name="heart" size={20} color={colors.primary} />
            <Text style={s.btnTxt}>Perform CPR</Text>
            <Ionicons name="chevron-forward" size={16} color={colors.textSecondary} style={{ opacity: 0.8 }} />
          </TouchableOpacity>

          <View style={s.voiceBtnWrap}>
            <SimpleCPRVoiceButton compact inline />
          </View>
        </View>

        {/* Footer */}
        <View style={s.footer}>
          <Ionicons name="call" size={12} color={colors.warning} style={{ marginRight: 4 }} />
          <Text style={s.footerText}>Call 911 first in a real emergency</Text>
        </View>
      </View>

      <Modal
        visible={cprModalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setCprModalVisible(false)}
      >
        <Pressable style={s.modalOverlay} onPress={() => setCprModalVisible(false)}>
          <Pressable style={[s.modalContent, { paddingBottom: Math.max(spacing.xl + 24, insets.bottom + spacing.lg) }]} onPress={(e) => e.stopPropagation()}>
            <View style={s.modalHeader}>
              <Text style={s.modalTitle}>CPR Metronome</Text>
              <TouchableOpacity onPress={() => setCprModalVisible(false)} hitSlop={12}>
                <Ionicons name="close" size={24} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>
            <CPRMetronomeCard compact />
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.background,
  },
  wrap: {
    flex: 1,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    paddingBottom: spacing.sm,
  },
  hero: {
    marginBottom: spacing.sm,
  },
  heroRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  logoMark: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: colors.primaryMuted,
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    fontSize: 26,
    fontWeight: "800",
    color: colors.text,
  },
  tagline: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 2,
  },
  buttons: {
    flex: 1,
    gap: spacing.md,
    minHeight: 0,
    alignSelf: "stretch",
    alignItems: "center",
    justifyContent: "center",
  },
  btn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.xl,
    borderRadius: borderRadius.md,
    minHeight: 52,
    width: "100%",
    maxWidth: 320,
  },
  btnPrimary: {
    backgroundColor: colors.primary,
    ...Platform.select({
      ios: {
        shadowColor: colors.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
      },
      android: { elevation: 8 },
    }),
  },
  btnSecondary: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  btnPrimaryContent: {
    alignItems: "center",
    gap: 4,
  },
  btnPrimaryRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  btnTxtPrimary: {
    color: colors.background,
    fontSize: 15,
    fontWeight: "700",
  },
  btnSubtext: {
    color: "rgba(255,255,255,0.85)",
    fontSize: 11,
    fontWeight: "500",
    textAlign: "center",
  },
  btnTxt: {
    color: colors.text,
    fontSize: 15,
    fontWeight: "600",
  },
  voiceBtnWrap: {
    flexShrink: 0,
    width: "100%",
    maxWidth: 320,
    alignItems: "center",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: colors.background,
    borderTopLeftRadius: borderRadius.lg,
    borderTopRightRadius: borderRadius.lg,
    padding: spacing.lg,
    paddingBottom: spacing.xl + 24,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: spacing.md,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: colors.text,
  },
  footer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingTop: spacing.sm,
  },
  footerText: {
    fontSize: 10,
    color: colors.textMuted,
  },
});
