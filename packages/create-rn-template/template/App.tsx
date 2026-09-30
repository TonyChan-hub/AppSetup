import React, { useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar, StyleSheet } from 'react-native';
import { ZippyProbe } from '@bear1210/zippy-rn';

import '@/i18n';
import { RootNavigator } from '@/navigation/RootNavigator';
import { initDatabase } from '@/services/database';
import { Logger } from '@/services/logger';
import { readMmkvSnapshot } from '@/services/mmkvStorage';

function App(): React.JSX.Element {
  useEffect(() => {
    initDatabase().catch((error: unknown) => {
      Logger.appError(error, 'database init');
    });
  }, []);

  useEffect(() => {
    if (!__DEV__) {
      return;
    }

    ZippyProbe.registerMmkvStore('default', () => readMmkvSnapshot('default'));
    ZippyProbe.registerSqliteDatabase('app.db', 'app.db');

    void ZippyProbe.start({
      appInfo: {
        name: 'rn-template-app',
        version: '0.0.1',
      },
    });

    return () => {
      void ZippyProbe.stop();
    };
  }, []);

  return (
    <GestureHandlerRootView style={styles.root}>
      <SafeAreaProvider style={styles.root}>
        <StatusBar barStyle="dark-content" />
        <NavigationContainer>
          <RootNavigator />
        </NavigationContainer>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
});

export default App;
