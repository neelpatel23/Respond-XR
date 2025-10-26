import { useEffect, useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { useKeepAwake } from "expo-keep-awake";
import { SafeAreaView } from "react-native-safe-area-context";

export default function SeizureScreen() {
  useKeepAwake();
  const [sec, setSec] = useState(0);
  const [running, setRunning] = useState(false);

  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => setSec((s) => s + 1), 1000);
    return () => clearInterval(id);
  }, [running]);

  return (
    <SafeAreaView style={{ flex: 1 }} edges={["top","left","right","bottom"]}>
      <View style={st.wrap}>
        <Text style={st.h1}>Seizure Assist</Text>
        <Text style={st.p}>• Protect from injury. Clear area; cushion head.</Text>
        <Text style={st.p}>• Do not restrain or put anything in mouth.</Text>
        <Text style={st.p}>• After convulsions stop, roll to side to keep airway clear.</Text>
        <Text style={st.p}>• Time the seizure. Call 9-1-1 if &gt; 5 min, repeated seizures, injury, pregnancy, diabetes, or first seizure.</Text>

        <View style={{ height: 12 }} />
        <Text style={st.timer}>{fmt(sec)}</Text>
        {running ? (
          <TouchableOpacity style={[st.btn, { backgroundColor: "#dc2626" }]} onPress={() => setRunning(false)}>
            <Text style={st.btnTxt}>Pause</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity style={st.btn} onPress={() => setRunning(true)}>
            <Text style={st.btnTxt}>Start</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity style={[st.btn, { backgroundColor: "#64748b", marginTop: 8 }]} onPress={() => setSec(0)}>
          <Text style={st.btnTxt}>Reset</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const fmt = (s: number) => `${String(Math.floor(s / 60)).padStart(2,"0")}:${String(s % 60).padStart(2,"0")}`;

const st = StyleSheet.create({
  wrap: { flex: 1, padding: 20 },
  h1: { fontSize: 22, fontWeight: "800", marginBottom: 8 },
  p: { fontSize: 16, marginBottom: 4, lineHeight: 22 },
  timer: { fontSize: 48, fontWeight: "800", textAlign: "center", marginVertical: 12 },
  btn: { backgroundColor: "#2563eb", padding: 14, borderRadius: 14, alignItems: "center" },
  btnTxt: { color: "white", fontWeight: "700" },
});
