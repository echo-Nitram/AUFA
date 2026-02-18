import * as SecureStore from 'expo-secure-store';

const KEYS = {
  TOKEN: 'aufa_token',
  REFRESH: 'aufa_refresh',
  TENANT_ID: 'aufa_tenant_id',
} as const;

export const storage = {
  getToken: () => SecureStore.getItemAsync(KEYS.TOKEN),
  setToken: (v: string) => SecureStore.setItemAsync(KEYS.TOKEN, v),
  removeToken: () => SecureStore.deleteItemAsync(KEYS.TOKEN),

  getRefresh: () => SecureStore.getItemAsync(KEYS.REFRESH),
  setRefresh: (v: string) => SecureStore.setItemAsync(KEYS.REFRESH, v),
  removeRefresh: () => SecureStore.deleteItemAsync(KEYS.REFRESH),

  getTenantId: () => SecureStore.getItemAsync(KEYS.TENANT_ID),
  setTenantId: (v: string) => SecureStore.setItemAsync(KEYS.TENANT_ID, v),
  removeTenantId: () => SecureStore.deleteItemAsync(KEYS.TENANT_ID),

  clearAll: async () => {
    await SecureStore.deleteItemAsync(KEYS.TOKEN);
    await SecureStore.deleteItemAsync(KEYS.REFRESH);
    await SecureStore.deleteItemAsync(KEYS.TENANT_ID);
  },
};
