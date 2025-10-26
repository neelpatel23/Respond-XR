import { ScrollView, Text, StyleSheet } from "react-native";
import { useKeepAwake } from "expo-keep-awake";
import { SafeAreaView } from "react-native-safe-area-context";

export default function AirwayScreen() {
  useKeepAwake();
  return (
    <SafeAreaView style={{ flex: 1 }} edges={["top","left","right","bottom"]}>
      <ScrollView contentContainerStyle={s.wrap}>
        <Text style={s.h1}>Airway – Quick Check</Text>
        <Text style={s.p}>1) Tap & shout. If unresponsive, call 9-1-1 / use SOS.</Text>
        <Text style={s.p}>2) Look in the mouth. Remove visible obstructions only.</Text>
        <Text style={s.p}>3) Head-tilt/chin-lift (no trauma) or jaw-thrust (suspected trauma).</Text>
        <Text style={s.p}>4) Check breathing: look, listen, feel (≤ 10 sec).</Text>
        <Text style={s.note}>If not breathing or only gasping, start CPR.</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  wrap: { padding: 20, gap: 10 },
  h1: { fontSize: 22, fontWeight: "700", marginBottom: 6 },
  p: { fontSize: 16, lineHeight: 22 },
  note: { fontSize: 16, fontStyle: "italic" },
});
