// app/(tabs)/_layout.tsx
import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { View, Image, StyleSheet, TouchableOpacity, Text } from "react-native";

export default function TabsLayout() {
  const CustomTabBar = ({ state, descriptors, navigation }: any) => {
    const elements: JSX.Element[] = [];
    
    // First tab (Emergency)
    const firstRoute = state.routes[0];
    const firstOptions = descriptors[firstRoute.key].options;
    const firstLabel = firstOptions.tabBarLabel !== undefined ? firstOptions.tabBarLabel : firstOptions.title !== undefined ? firstOptions.title : firstRoute.name;
    const firstIsFocused = state.index === 0;
    
    const firstOnPress = () => {
      const event = navigation.emit({
        type: 'tabPress',
        target: firstRoute.key,
      });
      
      if (!firstIsFocused && !event.defaultPrevented) {
        navigation.navigate(firstRoute.name);
      }
    };

    elements.push(
      <TouchableOpacity
        key={firstRoute.key}
        onPress={firstOnPress}
        style={styles.tabButton}
      >
        {firstOptions.tabBarIcon && firstOptions.tabBarIcon({ 
          color: firstIsFocused ? "#2563eb" : "#64748b", 
          size: 24 
        })}
        <Text style={[styles.tabLabel, { color: firstIsFocused ? "#2563eb" : "#64748b" }]}>
          {firstLabel}
        </Text>
      </TouchableOpacity>
    );

    // Logo in center
    elements.push(
      <View key="logo" style={styles.logoContainer}>
        <Image 
          source={require('../../assets/images/respondxr-logo.png')} 
          style={styles.logo}
          resizeMode="contain"
        />
      </View>
    );

    // Second tab (Information)
    const secondRoute = state.routes[1];
    const secondOptions = descriptors[secondRoute.key].options;
    const secondLabel = secondOptions.tabBarLabel !== undefined ? secondOptions.tabBarLabel : secondOptions.title !== undefined ? secondOptions.title : secondRoute.name;
    const secondIsFocused = state.index === 1;
    
    const secondOnPress = () => {
      const event = navigation.emit({
        type: 'tabPress',
        target: secondRoute.key,
      });
      
      if (!secondIsFocused && !event.defaultPrevented) {
        navigation.navigate(secondRoute.name);
      }
    };

    elements.push(
      <TouchableOpacity
        key={secondRoute.key}
        onPress={secondOnPress}
        style={styles.tabButton}
      >
        {secondOptions.tabBarIcon && secondOptions.tabBarIcon({ 
          color: secondIsFocused ? "#2563eb" : "#64748b", 
          size: 24 
        })}
        <Text style={[styles.tabLabel, { color: secondIsFocused ? "#2563eb" : "#64748b" }]}>
          {secondLabel}
        </Text>
      </TouchableOpacity>
    );

    return (
      <View style={styles.tabContainer}>
        {elements}
      </View>
    );
  };

  return (
    <Tabs
      initialRouteName="emergency"   // open on Emergency
      tabBar={(props) => <CustomTabBar {...props} />}
      screenOptions={{
        headerShown: false,          // no headers from Tabs level
        tabBarActiveTintColor: "#2563eb",
      }}
    >
      {/* Tab points to the SEGMENT folder "emergency" */}
      <Tabs.Screen
        name="emergency"
        options={{
          title: "Emergency",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="medical-outline" size={size} color={color} />
          ),
        }}
      />
      {/* Tab points to the SEGMENT folder "history" */}
      <Tabs.Screen
        name="history"
        options={{
          title: "Information",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="information-circle-outline" size={size} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#0b1220',
    paddingBottom: 34, // For safe area
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#1e293b',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  tabButton: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    minWidth: 80,
    flex: 1,
  },
  tabLabel: {
    fontSize: 12,
    marginTop: 4,
    textAlign: 'center',
  },
  logoContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
  },
  logo: {
    width: 80,
    height: 30,
    opacity: 0.7,
  },
});
