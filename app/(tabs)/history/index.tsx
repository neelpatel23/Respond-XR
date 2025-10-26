import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Linking } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";

export default function Information() {
  const openLink = (url: string) => {
    Linking.openURL(url);
  };

  const CPR_STEPS = [
    "Call 911 immediately",
    "Place person on firm, flat surface",
    "Tilt head back, lift chin up",
    "Place heel of hand on center of chest",
    "Push hard and fast 2 inches deep",
    "Give 30 compressions at 100-120 BPM",
    "Give 2 rescue breaths",
    "Continue cycles until help arrives"
  ];

  const RESOURCES = [
    {
      title: "American Heart Association",
      description: "Official CPR guidelines and training",
      url: "https://www.heart.org/en/health-topics/consumer-healthcare/what-is-cardiovascular-disease/cardiopulmonary-resuscitation-cpr",
      icon: "heart-outline"
    },
    {
      title: "Red Cross CPR Training",
      description: "Find local CPR certification classes",
      url: "https://www.redcross.org/take-a-class/cpr",
      icon: "school-outline"
    },
    {
      title: "Emergency Services",
      description: "Call 911 in any real emergency",
      url: "tel:911",
      icon: "call-outline"
    },
    {
      title: "AED Locator",
      description: "Find nearby automated defibrillators",
      url: "https://www.aedmap.org/",
      icon: "location-outline"
    }
  ];

  return (
    <SafeAreaView style={s.root} edges={["top","left","right","bottom"]}>
      <ScrollView contentContainerStyle={s.container} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={s.header}>
          <Text style={s.title}>CPR Information</Text>
          <Text style={s.subtitle}>Essential knowledge that saves lives</Text>
        </View>

        {/* Emergency Warning */}
        <View style={s.warningCard}>
          <Ionicons name="warning" size={24} color="#fbbf24" />
          <View style={s.warningContent}>
            <Text style={s.warningTitle}>Real Emergency?</Text>
            <Text style={s.warningText}>Call 911 immediately. This app is for education and assistance only.</Text>
          </View>
        </View>

        {/* CPR Steps */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>
            <Ionicons name="medical" size={18} color="#ef4444" /> CPR Steps
          </Text>
          {CPR_STEPS.map((step, index) => (
            <View key={index} style={s.stepCard}>
              <View style={s.stepNumber}>
                <Text style={s.stepNumberText}>{index + 1}</Text>
              </View>
              <Text style={s.stepText}>{step}</Text>
            </View>
          ))}
        </View>

        {/* Key Points */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>
            <Ionicons name="bulb" size={18} color="#3b82f6" /> Key Points
          </Text>
          <View style={s.infoCard}>
            <View style={s.infoRow}>
              <Text style={s.infoLabel}>Compression Rate:</Text>
              <Text style={s.infoValue}>100-120 per minute</Text>
            </View>
            <View style={s.infoRow}>
              <Text style={s.infoLabel}>Compression Depth:</Text>
              <Text style={s.infoValue}>At least 2 inches</Text>
            </View>
            <View style={s.infoRow}>
              <Text style={s.infoLabel}>Ratio:</Text>
              <Text style={s.infoValue}>30 compressions : 2 breaths</Text>
            </View>
            <View style={s.infoRow}>
              <Text style={s.infoLabel}>Hand Position:</Text>
              <Text style={s.infoValue}>Center of chest, between nipples</Text>
            </View>
          </View>
        </View>

        {/* Resources */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>
            <Ionicons name="library" size={18} color="#22c55e" /> Resources & Links
          </Text>
          {RESOURCES.map((resource, index) => (
            <TouchableOpacity key={index} style={s.resourceCard} onPress={() => openLink(resource.url)}>
              <View style={s.resourceIcon}>
                <Ionicons name={resource.icon as any} size={24} color="#3b82f6" />
              </View>
              <View style={s.resourceContent}>
                <Text style={s.resourceTitle}>{resource.title}</Text>
                <Text style={s.resourceDescription}>{resource.description}</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#94a3b8" />
            </TouchableOpacity>
          ))}
        </View>

        {/* Footer Note */}
        <View style={s.footer}>
          <Text style={s.footerText}>
            This information is for educational purposes. Get certified through official training programs.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#0b1220" },
  container: { padding: 20, gap: 24 },
  
  // Header
  header: { alignItems: "center", marginBottom: 8 },
  title: { 
    color: "#ffffff", 
    fontSize: 32, 
    fontWeight: "900",
    textShadowColor: "rgba(255, 255, 255, 0.3)",
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 10,
  },
  subtitle: { 
    color: "#cbd5e1", 
    fontSize: 16, 
    textAlign: "center",
    marginTop: 4,
  },

  // Warning Card
  warningCard: {
    backgroundColor: "rgba(251, 191, 36, 0.1)",
    borderRadius: 16,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderWidth: 1,
    borderColor: "rgba(251, 191, 36, 0.3)",
  },
  warningContent: { flex: 1 },
  warningTitle: { color: "#fbbf24", fontSize: 16, fontWeight: "700" },
  warningText: { color: "#cbd5e1", fontSize: 14, marginTop: 2 },

  // Sections
  section: { gap: 16 },
  sectionTitle: { 
    color: "#ffffff", 
    fontSize: 20, 
    fontWeight: "800",
    textShadowColor: "rgba(255, 255, 255, 0.2)",
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 8,
  },

  // CPR Steps
  stepCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(15, 23, 42, 0.6)",
    borderRadius: 12,
    padding: 16,
    gap: 16,
    borderWidth: 1,
    borderColor: "rgba(239, 68, 68, 0.2)",
  },
  stepNumber: {
    backgroundColor: "#ef4444",
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#ef4444",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 8,
  },
  stepNumberText: { color: "#ffffff", fontSize: 16, fontWeight: "900" },
  stepText: { color: "#e2e8f0", fontSize: 16, flex: 1, lineHeight: 22 },

  // Info Card
  infoCard: {
    backgroundColor: "rgba(15, 23, 42, 0.6)",
    borderRadius: 16,
    padding: 20,
    gap: 12,
    borderWidth: 1,
    borderColor: "rgba(59, 130, 246, 0.2)",
  },
  infoRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  infoLabel: { color: "#94a3b8", fontSize: 14, fontWeight: "600" },
  infoValue: { color: "#ffffff", fontSize: 14, fontWeight: "700" },

  // Resource Cards
  resourceCard: {
    backgroundColor: "rgba(15, 23, 42, 0.6)",
    borderRadius: 16,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    borderWidth: 1,
    borderColor: "rgba(34, 197, 94, 0.2)",
    shadowColor: "rgba(34, 197, 94, 0.1)",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  resourceIcon: {
    width: 48,
    height: 48,
    backgroundColor: "rgba(59, 130, 246, 0.1)",
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  resourceContent: { flex: 1 },
  resourceTitle: { color: "#ffffff", fontSize: 16, fontWeight: "700" },
  resourceDescription: { color: "#94a3b8", fontSize: 14, marginTop: 2 },

  // Footer
  footer: { 
    marginTop: 20, 
    padding: 16, 
    backgroundColor: "rgba(15, 23, 42, 0.4)",
    borderRadius: 12,
  },
  footerText: { 
    color: "#94a3b8", 
    fontSize: 12, 
    textAlign: "center",
    lineHeight: 18,
  },
});
