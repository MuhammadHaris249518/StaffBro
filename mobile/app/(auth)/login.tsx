import { useState } from "react";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { Pressable, ScrollView, Text, View, StyleSheet } from "react-native";

import { api } from "../../src/api/client";
import { useAuth } from "../../src/auth/AuthProvider";
import { AppHeader } from "../../src/components/AppHeader";
import { Button } from "../../src/components/Button";
import { Field } from "../../src/components/Field";
import { Icon } from "../../src/components/Icon";
import { colors, radius, space, type } from "../../src/theme/tokens";

export default function LoginScreen() {
  const { t } = useTranslation();
  const { signIn } = useAuth();
  const router = useRouter();
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit() {
    setError("");
    setLoading(true);
    try {
      const res = await api.login({ phone, password });
      if (res.user.role === "ADMIN") {
        setError(t("adminUseWeb"));
        return;
      }
      await signIn(res.access_token, res.user);
      router.replace(res.user.role === "BUSINESS" ? "/(business)/(tabs)/jobs" : "/(worker)/(tabs)/jobs");
    } catch (e) {
      setError(e instanceof Error ? e.message : t("errorTitle"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={styles.screen}>
      <AppHeader title={t("logInCta")} subtitle={t("registry")} showBack />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.trust}>
          <View style={styles.trustIcon}>
            <Icon name="verified" size={20} color={colors.onPrimary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.trustTitle}>{t("trustSeeker")}</Text>
            <Text style={styles.trustBody}>{t("trustSeekerBody")}</Text>
          </View>
        </View>
        <Field labelKey="phone" prefix="🇵🇰 +92" placeholder="0300 1234567" keyboardType="phone-pad" value={phone} onChangeText={setPhone} hint={t("phoneHint")} />
        <Field labelKey="password" placeholder="Kam az kam 8 characters" secureTextEntry value={password} onChangeText={setPassword} />
        {error ? <Text style={styles.error}>{error}</Text> : null}
        <Button labelKey="logInCta" icon="login" onPress={() => void onSubmit()} loading={loading} />
        <Pressable onPress={() => router.push("/(auth)/register")} style={styles.footer}>
          <Text style={styles.muted}>{t("alreadyRegistered")} </Text>
          <Text style={styles.link}>{t("createMyAccount")}</Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { padding: space.margin, gap: space.md, paddingBottom: 40 },
  trust: {
    flexDirection: "row",
    gap: 12,
    backgroundColor: colors.trustMint,
    borderWidth: 1,
    borderColor: colors.trustMintBorder,
    borderRadius: radius.xl,
    padding: 12,
  },
  trustIcon: { width: 32, height: 32, borderRadius: 16, backgroundColor: colors.primary, alignItems: "center", justifyContent: "center" },
  trustTitle: { ...type.labelLg, color: colors.primary },
  trustBody: { ...type.bodySm, color: colors.onSurfaceVariant },
  error: { ...type.bodySm, color: colors.error },
  footer: { flexDirection: "row", justifyContent: "center", minHeight: 48, alignItems: "center" },
  muted: { ...type.bodyMd, color: colors.secondary },
  link: { ...type.labelLg, color: colors.primary },
});
