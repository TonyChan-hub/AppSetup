import { memo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { COLORS } from '@/constants/theme';

type TemplateCardProps = {
  title: string;
  description: string;
};

export const TemplateCard = memo(function TemplateCard({ title, description }: TemplateCardProps) {
  return (
    <View style={styles.card}>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.description}>{description}</Text>
    </View>
  );
});

const styles = StyleSheet.create({
  card: {
    width: '100%',
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    padding: 16,
    backgroundColor: COLORS.surface,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text,
  },
  description: {
    marginTop: 6,
    fontSize: 13,
    color: COLORS.subtext,
  },
});
