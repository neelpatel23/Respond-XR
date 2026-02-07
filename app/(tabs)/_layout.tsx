// app/(tabs)/_layout.tsx
import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { View, StyleSheet, TouchableOpacity, Text } from "react-native";
import { colors, spacing, borderRadius } from "../../constants/theme";

export default function TabsLayout() {
  const CustomTabBar = ({ state, descriptors, navigation }: any) => {
    const elements: JSX.Element[] = [];

    const firstRoute = state.routes[0];
    const firstOptions = descriptors[firstRoute.key].options;
    const firstLabel = firstOptions.tabBarLabel ?? firstOptions.title ?? firstRoute.name;
    const firstIsFocused = state.index === 0;

    elements.push(
      <TouchableOpacity
        key={firstRoute.key}
        onPress={() => {
          if (!firstIsFocused) navigation.navigate(firstRoute.name);
        }}
        style={[styles.tabButton, firstIsFocused && styles.tabButtonActive]}
      >
        <Ionicons
          name="medical-outline"
          size={24}
          color={firstIsFocused ? colors.primary : colors.textMuted}
        />
        <Text
          style={[
            styles.tabLabel,
            { color: firstIsFocused ? colors.primary : colors.textMuted },
          ]}
        >
          {firstLabel}
        </Text>
      </TouchableOpacity>
    );

    // Divider / spacer
    elements.push(
      <View key="spacer" style={styles.spacer}>
        <View style={styles.logoMark} />
      </View>
    );

    const secondRoute = state.routes[1];
    const secondOptions = descriptors[secondRoute.key].options;
    const secondLabel = secondOptions.tabBarLabel ?? secondOptions.title ?? secondRoute.name;
    const secondIsFocused = state.index === 1;

    elements.push(
      <TouchableOpacity
        key={secondRoute.key}
        onPress={() => {
          if (!secondIsFocused) navigation.navigate(secondRoute.name);
        }}
        style={[styles.tabButton, secondIsFocused && styles.tabButtonActive]}
      >
        <Ionicons
          name="document-text-outline"
          size={24}
          color={secondIsFocused ? colors.accent : colors.textMuted}
        />
        <Text
          style={[
            styles.tabLabel,
            { color: secondIsFocused ? colors.accent : colors.textMuted },
          ]}
        >
          {secondLabel}
        </Text>
      </TouchableOpacity>
    );

    return <View style={styles.tabContainer}>{elements}</View>;
  };

  return (
    <Tabs
      initialRouteName="emergency"
      tabBar={(props) => <CustomTabBar {...props} />}
      screenOptions={{ headerShown: false }}
    >
      <Tabs.Screen
        name="emergency"
        options={{
          title: "Emergency",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="medical-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="history"
        options={{
          title: "Info",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="document-text-outline" size={size} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabContainer: {
    flexDirection: "row",
    backgroundColor: colors.surface,
    paddingBottom: spacing.xl + 10,
    paddingTop: spacing.md,
    paddingHorizontal: spacing.md,
    alignItems: "center",
    justifyContent: "space-between",
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  tabButton: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
    borderRadius: borderRadius.md,
  },
  tabButtonActive: {
    backgroundColor: colors.surfaceElevated,
  },
  tabLabel: {
    fontSize: 12,
    fontWeight: "600",
    marginTop: 4,
  },
  spacer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  logoMark: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: colors.primaryMuted,
    borderWidth: 1,
    borderColor: colors.border,
  },
});
