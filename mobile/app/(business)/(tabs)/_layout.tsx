import { Tabs } from "expo-router";
import { useTranslation } from "react-i18next";

import { TabBar } from "../../../src/components/TabBar";

export default function BusinessTabs() {
  const { t } = useTranslation();
  return (
    <Tabs tabBar={(props) => <TabBar {...props} />} screenOptions={{ headerShown: false }}>
      <Tabs.Screen name="jobs" options={{ title: t("jobs") }} />
      <Tabs.Screen name="applications" options={{ title: t("applications") }} />
      <Tabs.Screen name="profile" options={{ title: t("profile") }} />
    </Tabs>
  );
}
