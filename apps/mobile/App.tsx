import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider } from './src/lib/auth-context';
import { TenantProvider } from './src/lib/tenant-context';
import RootNavigator from './src/navigation/RootNavigator';

export default function App() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <TenantProvider>
          <RootNavigator />
          <StatusBar style="light" />
        </TenantProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}
