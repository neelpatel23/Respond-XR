import { useEffect, useRef, useState } from "react";
import { View, StyleSheet, Text, TouchableOpacity } from "react-native";
import { CameraView, useCameraPermissions } from "expo-camera";
import { useKeepAwake } from "expo-keep-awake";
import { SafeAreaView } from "react-native-safe-area-context";

export default function CameraScreen() {
  useKeepAwake();
  const [permission, requestPermission] = useCameraPermissions();
  const [ready, setReady] = useState(false);
  const camRef = useRef<CameraView | null>(null);

  useEffect(() => {
    if (!permission) requestPermission();
  }, [permission]);

  if (!permission) return <View />;
  if (!permission.granted) {
    return (
      <View style={styles.center}>
        <Text>We need camera access to assist you.</Text>
        <TouchableOpacity onPress={requestPermission} style={styles.btn}>
          <Text style={styles.btnTxt}>Grant Permission</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "black" }} edges={["top","left","right","bottom"]}>
      <CameraView
        ref={(r) => (camRef.current = r)}
        style={{ flex: 1 }}
        facing="back"
        onCameraReady={() => setReady(true)}
      />
      <View pointerEvents="none" style={styles.overlay}>
        <Text style={styles.overlayText}>Align neck/upper chest inside the frame</Text>
        <View style={styles.guideBox} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24 },
  btn: { backgroundColor: "#0ea5e9", paddingHorizontal: 16, paddingVertical: 10, borderRadius: 10, marginTop: 12 },
  btnTxt: { color: "white", fontWeight: "600" },
  overlay: { position: "absolute", left: 0, right: 0, bottom: 24, alignItems: "center" },
  overlayText: { color: "white", fontSize: 16, marginBottom: 8, opacity: 0.9 },
  guideBox: { width: "70%", height: 140, borderWidth: 2, borderColor: "white", borderRadius: 16, opacity: 0.7 },
});
