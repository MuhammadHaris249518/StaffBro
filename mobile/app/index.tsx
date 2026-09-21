import { useState } from "react";
import { Redirect, useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { Pressable, ScrollView, Text, View, StyleSheet } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useAuth } from "../src/auth/AuthProvider";
import { setAppLanguage } from "../src/i18n";
import { Button } from "../src/components/Button";
import { Icon } from "../src/components/Icon";
import { colors, radius, space, type } from "../src/theme/tokens";

export default function WelcomeScreen() {
  const { t, i18n } = useTranslation();
  const { ready, user } = useAuth();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [role, setRole] = useState<"WORKER" | "BUSINESS">("WORKER");

  if (!ready) return <View style={styles.screen} />;
  if (user?.role === "WORKER") return <Redirect href="/(worker)/(tabs)/jobs" />;
  if (user?.role === "BUSINESS") return <Redirect href="/(business)/(tabs)/jobs" />;

  return (
    <ScrollView style={styles.screen} contentContainerStyle={[styles.content, { paddingTop: insets.top + 12, paddingBottom: insets.bottom + 24 }]}>
      <View style={styles.top}>
        <View style={styles.pilot}>
          <View style={styles.dot} />
          <Text style={styles.pilotText}>{t("pilot")}</Text>
        </View>
        <Pressable onPress={() => void setAppLanguage(i18n.language === "ur" ? "en" : "ur")} style={styles.lang}>
          <Text style={styles.langText}>{i18n.language === "ur" ? "اردو / English" : "English / اردو"}</Text>
        </Pressable>
      </View>
      <View style={styles.brandRow}>
        <View style={styles.logo}>
          <Icon name="work" size={22} color={colors.onPrimary} />
        </View>
        <Text style={styles.brand}>{t("appName")}</Text>
      </View>
      <View style={styles.trust}>
        <Icon name="verified" size={18} />
        <Text style={styles.trustText}>{t("freeForever")}</Text>
      </View>
      <Text style={styles.hero}>Rozgar aur Karobaar ka Saath</Text>
      <Text style={styles.heroBody}>
        Direct hiring over Phone & WhatsApp for Waiters, Chefs, Riders, Cashiers, Cleaners, and Local Businesses in Islamabad & Rawalpindi.
      </Text>
      <Text style={styles.section}>{t("selectRole")}</Text>
      <Pressable onPress={() => setRole("WORKER")} style={[styles.role, role === "WORKER" && styles.roleActive]}>
        <View style={styles.roleIcon}>
          <Icon name="person-search" size={22} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.roleChip}>{t("jobs")} • ملازمت کی تلاش</Text>
          <Text style={styles.roleTitle}>{t("seekerTitle")}</Text>
          <Text style={styles.roleSub}>{t("seekerSubtitle")}</Text>
        </View>
        <View style={[styles.radio, role === "WORKER" && styles.radioOn]} />
      </Pressable>
      <Pressable onPress={() => setRole("BUSINESS")} style={[styles.role, role === "BUSINESS" && styles.roleActive]}>
        <View style={[styles.roleIcon, { backgroundColor: colors.secondaryContainer }]}>
          <Icon name="storefront" size={22} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.roleChip}>{t("companyManager")}</Text>
          <Text style={styles.roleTitle}>{t("managerTitle")}</Text>
          <Text style={styles.roleSub}>{t("managerSubtitle")}</Text>
        </View>
        <View style={[styles.radio, role === "BUSINESS" && styles.radioOn]} />
      </Pressable>
      <Button
        labelKey={role === "WORKER" ? "continueSeeker" : "continueManager"}
        icon="arrow-forward"
        onPress={() => router.push(`/(auth)/register?role=${role}`)}
      />
      <Pressable onPress={() => router.push("/(auth)/login")} style={styles.loginRow}>
        <Text style={styles.already}>{t("alreadyAccount")} </Text>
        <Text style={styles.loginLink}>{t("login")}</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { paddingHorizontal: space.margin, gap: 14 },
  top: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  pilot: { flexDirection: "row", alignItems: "center", gap: 6 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.primary },
  pilotText: { ...type.labelSm, color: colors.primary },
  lang: { borderWidth: 1, borderColor: colors.outlineVariant, borderRadius: radius.full, paddingHorizontal: 10, paddingVertical: 6, backgroundColor: colors.surfaceContainerLowest },
  langText: { ...type.labelSm, color: colors.onSurface },
  brandRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  logo: { width: 40, height: 40, borderRadius: 10, backgroundColor: colors.primary, alignItems: "center", justifyContent: "center" },
  brand: { ...type.headlineLgMobile, color: colors.primary },
  trust: {
    flexDirection: "row",
    gap: 8,
    backgroundColor: colors.trustMint,
    borderWidth: 1,
    borderColor: colors.trustMintBorder,
    borderRadius: radius.xl,
    padding: 12,
    alignItems: "flex-start",
  },
  trustText: { ...type.bodySm, color: colors.primary, flex: 1 },
  hero: { ...type.headlineLgMobile, color: colors.onSurface },
  heroBody: { ...type.bodySm, color: colors.secondary },
  section: { ...type.labelLg, color: colors.onSurface },
  role: {
    flexDirection: "row",
    gap: 12,
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: radius.xl,
    padding: 14,
  },
  roleActive: { borderColor: colors.primary, borderWidth: 2 },
  roleIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: colors.primaryFixed,
    alignItems: "center",
    justifyContent: "center",
  },
  roleChip: { ...type.labelSm, color: colors.primary },
  roleTitle: { ...type.headlineMd, color: colors.onSurface, fontWeight: "700" },
  roleSub: { ...type.bodySm, color: colors.secondary },
  radio: { width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: colors.outlineVariant },
  radioOn: { borderColor: colors.primary, backgroundColor: colors.primary },
  loginRow: { flexDirection: "row", justifyContent: "center", minHeight: 48, alignItems: "center" },
  already: { ...type.bodyMd, color: colors.secondary },
  loginLink: { ...type.labelLg, color: colors.primary, fontWeight: "700" },
});
