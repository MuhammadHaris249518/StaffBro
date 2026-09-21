import { Stack } from "expo-router";

import { useRequireRole } from "../../src/auth/AuthProvider";

export default function WorkerLayout() {
  useRequireRole("WORKER");
  return <Stack screenOptions={{ headerShown: false }} />;
}
