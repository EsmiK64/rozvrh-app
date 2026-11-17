import React from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSettings } from "../context/SettingsContext";
import { RADII, SPACING } from "../theme";
import { openErrorEmail, openGithubIssue } from "../utils/reporting";

export function LoadingView({ message = "Načítání..." }) {
  const { colors } = useSettings();
  return (
    <View style={[styles.centered, { backgroundColor: colors.background }]}>
      <ActivityIndicator size="large" color={colors.primary} />
      <Text style={[styles.message, { color: colors.textSecondary }]}>
        {message}
      </Text>
    </View>
  );
}

export function ErrorView({
  title = "Nepodařilo se načíst data",
  message,
  onRetry,
}) {
  const { colors } = useSettings();
  return (
    <View style={[styles.centered, { backgroundColor: colors.background }]}>
      <Text style={[styles.errorTitle, { color: colors.removedText }]}>
        {title}
      </Text>
      {message ? (
        <Text style={[styles.message, { color: colors.textSecondary }]}>
          {message}
        </Text>
      ) : null}
      {onRetry ? (
        <Pressable
          style={[styles.retryButton, { backgroundColor: colors.primary }]}
          onPress={onRetry}
        >
          <Text style={[styles.retryText, { color: colors.white }]}>
            Zkusit znovu
          </Text>
        </Pressable>
      ) : null}
      <View style={styles.reportRow}>
        <Pressable
          style={[
            styles.reportButton,
            {
              backgroundColor: colors.surface,
              borderColor: colors.border,
            },
          ]}
          onPress={() => openErrorEmail(message)}
        >
          <Text style={[styles.reportText, { color: colors.text }]}>
            Nahlásit výpadek (E-mail)
          </Text>
        </Pressable>
        <Pressable
          style={[
            styles.reportButton,
            {
              backgroundColor: colors.surface,
              borderColor: colors.border,
            },
          ]}
          onPress={() => openGithubIssue(message)}
        >
          <Text style={[styles.reportText, { color: colors.text }]}>
            GitHub Issue
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

export function EmptyView({ title, message }) {
  const { colors } = useSettings();
  return (
    <View style={[styles.centered, { backgroundColor: colors.background }]}>
      <Text style={[styles.emptyTitle, { color: colors.text }]}>{title}</Text>
      {message ? (
        <Text style={[styles.message, { color: colors.textSecondary }]}>
          {message}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: SPACING.xl,
  },
  message: {
    marginTop: SPACING.md,
    fontSize: 15,
    textAlign: "center",
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: "700",
    textAlign: "center",
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: "600",
    textAlign: "center",
  },
  retryButton: {
    marginTop: SPACING.lg,
    paddingHorizontal: SPACING.xl,
    paddingVertical: SPACING.md,
    borderRadius: RADII.md,
  },
  retryText: {
    fontWeight: "600",
    fontSize: 15,
  },
  reportRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: SPACING.sm,
    marginTop: SPACING.md,
  },
  reportButton: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm + 2,
    borderRadius: RADII.md,
    borderWidth: 1,
  },
  reportText: {
    fontSize: 13,
    fontWeight: "600",
  },
});
