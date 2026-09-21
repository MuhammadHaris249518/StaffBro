import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";

import "../src/i18n";
import { AuthProvider } from "../src/auth/AuthProvider";
import { useStaffbroFonts } from "../src/theme/fonts";
import { colors } from "../src/theme/tokens";

export default function RootLayout() {
  const fontsReady = useStaffbroFonts();
  if (!fontsReady) {
    return <View style={{ flex: 1, backgroundColor: colors.background }} />;
  }
  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: colors.background }}>
      <AuthProvider>
        <StatusBar style="dark" />
        <Stack screenOptions={{ headerShown: false }} />
      </AuthProvider>
    </GestureHandlerRootView>
  );
}
