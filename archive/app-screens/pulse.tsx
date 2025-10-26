import { useState, useEffect } from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import * as Haptics from "expo-haptics";
import { useKeepAwake } from "expo-keep-awake";
import { SafeAreaView } from "react-native-safe-area-context";

export default function PulseScreen() {
  useKeepAwake();
  const [countdown, setCountdown] = useState<number | null>(null);

  useEffect(() => {
    if (countdown === null) return;
    if (countdown === 0) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      return;
    }
    const id = setTimeout(() => setCountdown((c) => (c ?? 0) - 1), 1000);
    return () => clearTimeout(id);
  }, [countdown]);

  return (
    <SafeAreaView style={{ flex: 1 }} edges={["top","left","right","bottom"]}>
      <View style={st.wrap}>
        <Text style={st.h1}>Pulse Check (≤ 10 sec)</Text>
        <Text style={st.p}>Adults: <Text style={st.bold}>Carotid</Text> — two fingers between trachea and neck muscle.</Text>
        <Text style={st.p}>Children/Infants: <Text style={st.bold}>Brachial</Text> — inside upper arm between shoulder and elbow.</Text>
        <Text style={st.p}>Responsive adult: <Text style={st.bold}>Radial</Text> — thumb side of wrist.</Text>

        <View style={{ height: 16 }} />
        {countdown === null ? (
          <TouchableOpacity style={st.btn} onPress={() => setCountdown(10)}>
            <Text style={st.btnTxt}>Start 10-sec Timer</Text>
          </TouchableOpacity>
        ) : (
          <View style={st.timerBox}>
            <Text style={st.timer}>{countdown}</Text>
            <TouchableOpacity onPress={() => setCountdown(null)}>
              <Text style={st.cancel}>Cancel</Text>
            </TouchableOpacity>
          </View>
        )}
        <View style={{ height: 16 }} />
        <TouchableOpacity style={[st.btn, { backgroundColor: "#16a34a" }]} onPress={() => setCountdown(null)}>
          <Text style={st.btnTxt}>Pulse Present</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[st.btn, { backgroundColor: "#dc2626" }]} onPress={() => setCountdown(null)}>
          <Text style={st.btnTxt}>No Pulse → Start CPR</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const st = StyleSheet.create({
  wrap: { flex: 1, padding: 20 },
  h1: { fontSize: 22, fontWeight: "700", marginBottom: 8 },
  p: { fontSize: 16, lineHeight: 22, marginBottom: 4 },
  bold: { fontWeight: "700" },
  btn: { backgroundColor: "#2563eb", padding: 14, borderRadius: 14, alignItems: "center" },
  btnTxt: { color: "white", fontWeight: "700" },
  timerBox: { alignItems: "center", gap: 8 },
  timer: { fontSize: 56, fontWeight: "800" },
  cancel: { color: "#64748b" },
});
