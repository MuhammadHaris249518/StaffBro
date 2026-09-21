import { Text, TextInput, View, StyleSheet, type TextInputProps } from "react-native";
import { useTranslation } from "react-i18next";

import { colors, radius, space, type } from "../theme/tokens";

type Props = TextInputProps & {
  labelKey?: string;
  label?: string;
  hint?: string;
  prefix?: string;
};

export function Field({ labelKey, label, hint, prefix, style, ...rest }: Props) {
  const { t } = useTranslation();
  return (
    <View style={styles.wrap}>
      {label || labelKey ? <Text style={styles.label}>{label ?? (labelKey ? t(labelKey) : "")}</Text> : null}
      <View style={styles.inputRow}>
        {prefix ? (
          <View style={styles.prefix}>
            <Text style={styles.prefixText}>{prefix}</Text>
          </View>
        ) : null}
        <TextInput
          placeholderTextColor={colors.secondary}
          style={[styles.input, prefix ? styles.inputFlush : null, rest.multiline ? styles.multiline : null, style]}
          {...rest}
        />
      </View>
      {hint ? <Text style={styles.hint}>{hint}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 6 },
  label: { ...type.labelLg, color: colors.onSurface },
  inputRow: {
    flexDirection: "row",
    borderWidth: 1.5,
    borderColor: "rgba(190,201,193,0.8)",
    borderRadius: radius.lg,
    overflow: "hidden",
    backgroundColor: colors.surfaceContainerLowest,
  },
  prefix: {
    minHeight: 52,
    paddingHorizontal: 12,
    backgroundColor: colors.surfaceContainer,
    borderRightWidth: 1,
    borderRightColor: "rgba(190,201,193,0.6)",
    justifyContent: "center",
  },
  prefixText: { ...type.labelLg, color: colors.onSurface, fontWeight: "700" },
  input: {
    flex: 1,
    minHeight: 52,
    paddingHorizontal: 14,
    color: colors.onSurface,
    ...type.bodyLg,
  },
  inputFlush: { borderWidth: 0 },
  multiline: { minHeight: 96, paddingTop: 12, textAlignVertical: "top" },
  hint: { ...type.bodySm, color: colors.secondary },
});
