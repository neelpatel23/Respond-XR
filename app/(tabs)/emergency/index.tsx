// emergency/index.tsx
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { SimpleCPRVoiceButton } from "../../../components/SimpleCPRVoiceButton";

export default function EmergencyHome() {
  return (
    <SafeAreaView style={s.root} edges={["top", "left", "right", "bottom"]}>
      <ScrollView contentContainerStyle={s.wrap}>
        <View style={s.titleContainer}>
          <Text style={s.title}>RESPOND</Text>
          <Text style={s.titleRed}>XR</Text>
        </View>
        <Text style={s.sub}> "911 like" guidance for emergencies with live camera overlays and voice assistant!</Text> 

        {/* Voice Dispatch Assistant */}
        <View style={s.voiceSection}>
          <SimpleCPRVoiceButton />
        </View>

        {/* Navigate to run screen within the emergency stack */}
        <TouchableOpacity
          style={s.cta}
          onPress={() => router.push("/emergency/run")}
        >
          <Text style={s.ctaTxt} numberOfLines={1} adjustsFontSizeToFit>📹 Start Camera Guidance</Text>
          <Text style={s.ctaSubtext}>Live emergency instructions</Text>
        </TouchableOpacity>


        <Text style={s.warning}>⚠️ In a real emergency, call 911 first</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  root: { 
    flex: 1, 
    backgroundColor: "#0b1220",
  },
  wrap: {
    alignItems: "center",
    justifyContent: "space-between",
    padding: 24,
    paddingTop: 40,
    paddingBottom: 40,
    gap: 20,
    flexGrow: 1,
  },
  titleContainer: { flexDirection: "row", alignItems: "center", marginTop: 20 },
  title: { 
    color: "#ef4444", 
    fontSize: 42, 
    fontWeight: "900",
    textShadowColor: "rgba(239, 68, 68, 0.8)",
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 15,
  }, // Red for RESPOND with glow
  titleRed: { 
    color: "#3b82f6", 
    fontSize: 42, 
    fontWeight: "900",
    textShadowColor: "rgba(59, 130, 246, 0.8)",
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 15,
  }, // Blue for XR with glow
  sub: { 
    color: "#cbd5e1", 
    fontSize: 16, 
    textAlign: "center",
    textShadowColor: "rgba(203, 213, 225, 0.3)",
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 8,
  },
  voiceSection: {
    width: "100%",
    alignItems: "center",
    marginVertical: 40,
  },
  sectionTitle: {
    color: "#fff",
    fontSize: 20,
    fontWeight: "900",
  },
  cta: {
    backgroundColor: "#ef4444",
    paddingVertical: 28,
    paddingHorizontal: 50,
    borderRadius: 26,
    alignItems: "center",
    minWidth: 320,
    shadowColor: "#ef4444",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 20,
    elevation: 15,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.2)",
  },
  ctaTxt: { color: "white", fontWeight: "900", fontSize: 22 },
  ctaSubtext: { 
    color: "rgba(255, 255, 255, 0.8)", 
    fontSize: 12, 
    fontWeight: "600",
    marginTop: 2,
  },
  warning: {
    color: "#fbbf24",
    fontSize: 12,
    fontWeight: "700",
    textAlign: "center",
    marginTop: 12,
    textShadowColor: "rgba(251, 191, 36, 0.5)",
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 10,
  },
});
