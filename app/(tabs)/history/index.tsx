import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Linking,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { colors, spacing, borderRadius, typography } from "../../../constants/theme";

export default function Information() {
  const openLink = (url: string) => Linking.openURL(url);

  const CPR_STEPS = [
    "Call 911 immediately",
    "Place person on firm, flat surface",
    "Tilt head back, lift chin up",
    "Place heel of hand on center of chest",
    "Push hard and fast 2 inches deep",
    "Give 30 compressions at 100-120 BPM",
    "Give 2 rescue breaths",
    "Continue cycles until help arrives",
  ];

  const RESOURCES = [
    {
      title: "American Heart Association",
      description: "Official CPR guidelines and training",
      url: "https://www.heart.org/en/health-topics/consumer-healthcare/what-is-cardiovascular-disease/cardiopulmonary-resuscitation-cpr",
      icon: "heart-outline",
    },
    {
      title: "Red Cross CPR Training",
      description: "Find local CPR certification classes",
      url: "https://www.redcross.org/take-a-class/cpr",
      icon: "school-outline",
    },
    {
      title: "Emergency Services",
      description: "Call 911 in any real emergency",
      url: "tel:911",
      icon: "call-outline",
    },
    {
      title: "AED Locator",
      description: "Find nearby automated defibrillators",
      url: "https://www.aedmap.org/",
      icon: "location-outline",
    },
  ];

  return (
    <SafeAreaView style={s.root} edges={["top", "left", "right", "bottom"]}>
      <ScrollView
        contentContainerStyle={s.container}
        showsVerticalScrollIndicator={false}
      >
        <View style={s.header}>
          <Text style={s.title}>CPR Information</Text>
          <Text style={s.subtitle}>Essential knowledge that saves lives</Text>
        </View>

        <View style={s.warningCard}>
          <View style={s.warningIcon}>
            <Ionicons name="warning" size={20} color={colors.warning} />
          </View>
          <View style={s.warningContent}>
            <Text style={s.warningTitle}>Real Emergency?</Text>
            <Text style={s.warningText}>
              Call 911 immediately. This app is for education and assistance only.
            </Text>
          </View>
        </View>

        <View style={s.section}>
          <View style={s.sectionHeader}>
            <View style={s.sectionIcon}>
              <Ionicons name="medkit" size={18} color={colors.primary} />
            </View>
            <Text style={s.sectionTitle}>CPR Steps</Text>
          </View>
          {CPR_STEPS.map((step, index) => (
            <View key={index} style={s.stepCard}>
              <View style={s.stepNumber}>
                <Text style={s.stepNumberText}>{index + 1}</Text>
              </View>
              <Text style={s.stepText}>{step}</Text>
            </View>
          ))}
        </View>

        <View style={s.section}>
          <View style={s.sectionHeader}>
            <View style={s.sectionIcon}>
              <Ionicons name="bulb" size={18} color={colors.accent} />
            </View>
            <Text style={s.sectionTitle}>Key Points</Text>
          </View>
          <View style={s.infoCard}>
            <InfoRow label="Compression Rate" value="100-120 per minute" />
            <InfoRow label="Compression Depth" value="At least 2 inches" />
            <InfoRow label="Ratio" value="30 compressions : 2 breaths" />
            <InfoRow label="Hand Position" value="Center of chest, between nipples" />
          </View>
        </View>

        <View style={s.section}>
          <View style={s.sectionHeader}>
            <View style={s.sectionIcon}>
              <Ionicons name="link" size={18} color={colors.success} />
            </View>
            <Text style={s.sectionTitle}>Resources</Text>
          </View>
          {RESOURCES.map((resource, index) => (
            <TouchableOpacity
              key={index}
              style={s.resourceCard}
              onPress={() => openLink(resource.url)}
              activeOpacity={0.7}
            >
              <View style={s.resourceIcon}>
                <Ionicons
                  name={resource.icon as any}
                  size={22}
                  color={colors.accent}
                />
              </View>
              <View style={s.resourceContent}>
                <Text style={s.resourceTitle}>{resource.title}</Text>
                <Text style={s.resourceDescription}>{resource.description}</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
            </TouchableOpacity>
          ))}
        </View>

        <View style={s.footer}>
          <Text style={s.footerText}>
            For educational purposes. Get certified through official training programs.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={s.infoRow}>
      <Text style={s.infoLabel}>{label}</Text>
      <Text style={s.infoValue}>{value}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  container: { padding: spacing.lg, gap: spacing.lg, paddingBottom: spacing.xxl },

  header: { alignItems: "center", marginBottom: spacing.sm },
  title: {
    ...typography.title,
    color: colors.text,
    fontSize: 28,
  },
  subtitle: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    textAlign: "center",
    marginTop: spacing.xs,
  },

  warningCard: {
    backgroundColor: colors.warningMuted,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.md,
    borderWidth: 1,
    borderColor: "rgba(234, 179, 8, 0.25)",
  },
  warningIcon: {
    width: 36,
    height: 36,
    borderRadius: borderRadius.sm,
    backgroundColor: "rgba(234, 179, 8, 0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  warningContent: { flex: 1 },
  warningTitle: {
    ...typography.label,
    color: colors.warning,
  },
  warningText: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    marginTop: 4,
  },

  section: { gap: spacing.md },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  sectionIcon: {
    width: 32,
    height: 32,
    borderRadius: borderRadius.sm,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  sectionTitle: {
    ...typography.titleSmall,
    color: colors.text,
  },

  stepCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    gap: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  stepNumber: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  stepNumberText: {
    ...typography.label,
    color: colors.text,
    fontSize: 14,
  },
  stepText: {
    ...typography.body,
    color: colors.text,
    flex: 1,
  },

  infoCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    gap: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  infoLabel: {
    ...typography.bodySmall,
    color: colors.textSecondary,
  },
  infoValue: {
    ...typography.bodySmall,
    color: colors.text,
    fontWeight: "700",
  },

  resourceCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  resourceIcon: {
    width: 44,
    height: 44,
    borderRadius: borderRadius.md,
    backgroundColor: colors.accentMuted,
    alignItems: "center",
    justifyContent: "center",
  },
  resourceContent: { flex: 1 },
  resourceTitle: {
    ...typography.label,
    color: colors.text,
  },
  resourceDescription: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    marginTop: 2,
  },

  footer: {
    marginTop: spacing.md,
    padding: spacing.lg,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  footerText: {
    ...typography.caption,
    color: colors.textMuted,
    textAlign: "center",
    lineHeight: 18,
  },
});
