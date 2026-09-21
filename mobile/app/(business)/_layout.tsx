import { Stack } from "expo-router";

import { useRequireRole } from "../../src/auth/AuthProvider";

export default function BusinessLayout() {
  useRequireRole("BUSINESS");
  return <Stack screenOptions={{ headerShown: false }} />;
}
