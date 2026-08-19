import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { TemplateCard } from '@/components/common';
import { COLORS } from '@/constants/theme';
import { listTemplateItems } from '@/repositories/templateRepo';
import { getOrCreateDeviceId } from '@/native/DeviceIdentity';
import { Logger } from '@/services/logger';
import { useTemplateCounter } from '@/hooks/useTemplateCounter';
import { formatDate } from '@/utils/formatDate';
import type { TemplateItem } from '@/types/template';

export function HomeScreen() {
  const { t } = useTranslation();
  const [items, setItems] = useState<TemplateItem[]>([]);
  const { count, increment } = useTemplateCounter();

  useEffect(() => {
    listTemplateItems()
      .then((result) => {
        setItems(result);
        Logger.info({
          category: 'template',
          event: 'home_loaded',
          payload: { deviceId: getOrCreateDeviceId(), itemCount: result.length },
        });
      })
      .catch((error: unknown) => {
        Logger.appError(error, 'load template items');
      });
  }, []);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{t('home.title')}</Text>
      <Text style={styles.subtitle}>{t('home.subtitle')}</Text>
      <Text style={styles.counter}>Counter: {count}</Text>
      <Pressable style={styles.button} onPress={increment}>
        <Text style={styles.buttonText}>Increment</Text>
      </Pressable>
      {items.map((item) => (
        <View key={item.id} style={styles.cardWrap}>
          <TemplateCard
            title={item.title}
            description={`${item.description} (${formatDate(item.createdAt)})`}
          />
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-start',
    padding: 24,
    backgroundColor: COLORS.background,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.text,
  },
  subtitle: {
    marginTop: 8,
    fontSize: 14,
    color: COLORS.subtext,
  },
  counter: {
    marginTop: 16,
    fontSize: 16,
    color: COLORS.text,
  },
  button: {
    marginTop: 10,
    backgroundColor: COLORS.primary,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
  },
  buttonText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  cardWrap: {
    marginTop: 16,
    width: '100%',
  },
});
