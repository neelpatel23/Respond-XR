// app/index.tsx
import { Redirect } from "expo-router";

export default function RootIndex() {
  // Always land on the Emergency tab on app launch
  return <Redirect href="/emergency" />;
}
