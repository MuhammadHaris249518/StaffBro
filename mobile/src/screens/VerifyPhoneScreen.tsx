import { useState } from "react";
import { Text, View, StyleSheet } from "react-native";
import { useTranslation } from "react-i18next";

import { api } from "../api/client";
import { useAuth } from "../auth/AuthProvider";
import { AppHeader } from "../components/AppHeader";
import { Button } from "../components/Button";
import { Field } from "../components/Field";
import { colors, radius, space, type } from "../theme/tokens";

export function VerifyPhoneScreen() {
  const { t } = useTranslation();
  const { user, refreshUser } = useAuth();
  const [code, setCode] = useState("");
  const [debug, setDebug] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function start() {
    setLoading(true);
    setMessage("");
    try {
      const res = await api.startPhoneVerification();
      setDebug(res.debug_code);
      setMessage(t("codeSent"));
    } catch (e) {
      setMessage(e instanceof Error ? e.message : t("errorTitle"));
    } finally {
      setLoading(false);
    }
  }

  async function confirm() {
    setLoading(true);
    setMessage("");
    try {
      await api.confirmPhoneVerification(code);
      await refreshUser();
      setMessage(t("phoneVerified"));
    } catch (e) {
      setMessage(e instanceof Error ? e.message : t("errorTitle"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={styles.screen}>
      <AppHeader title={t("verifyPhone")} subtitle={t("verifyPhoneUr")} showBack />
      <View style={styles.content}>
        {user?.phone_verified ? (
          <View style={styles.ok}><Text style={styles.okText}>{t("phoneVerified")}</Text></View>
        ) : (
          <>
            <Text style={styles.body}>{t("verifyPhoneBody")}</Text>
            <Button labelKey="sendCode" onPress={() => void start()} loading={loading} />
            {debug ? <Text style={styles.debug}>Dev code: {debug}</Text> : null}
            <Field labelKey="otpCode" keyboardType="number-pad" value={code} onChangeText={setCode} placeholder="123456" />
            <Button labelKey="confirmCode" onPress={() => void confirm()} loading={loading} />
          </>
        )}
        {message ? <Text style={styles.msg}>{message}</Text> : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { padding: space.margin, gap: space.md },
  body: { ...type.bodyMd, color: colors.secondary },
  debug: { ...type.labelMd, color: colors.primary },
  msg: { ...type.bodySm, color: colors.onSurface },
  ok: { backgroundColor: colors.trustMint, borderRadius: radius.xl, padding: 16 },
  okText: { ...type.labelLg, color: colors.primary },
});
