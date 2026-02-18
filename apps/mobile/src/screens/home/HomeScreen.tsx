import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, RefreshControl, TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../lib/auth-context';
import { useTenant } from '../../lib/tenant-context';
import { statsApi } from '../../lib/api';
import LoadingSpinner from '../../components/LoadingSpinner';
import { colors } from '../../theme/colors';

interface DashboardData {
  tournaments: number;
  teams: number;
  players: number;
  nextMatchday?: string;
}

export default function HomeScreen() {
  const { user, logout } = useAuth();
  const { tenant, tenantId } = useTenant();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = async () => {
    if (!tenantId) { setLoading(false); return; }
    try {
      const result = await statsApi.dashboard(tenantId);
      setData(result);
    } catch {
      // Dashboard may not have data yet
      setData({ tournaments: 0, teams: 0, players: 0 });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { fetchData(); }, [tenantId]);

  const onRefresh = () => { setRefreshing(true); fetchData(); };

  if (loading) return <LoadingSpinner />;

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
      >
        {/* Welcome */}
        <View style={styles.welcomeCard}>
          <View style={styles.welcomeRow}>
            <View style={styles.avatarCircle}>
              <Text style={styles.avatarText}>
                {user?.fullName?.charAt(0)?.toUpperCase() || 'U'}
              </Text>
            </View>
            <View style={styles.welcomeInfo}>
              <Text style={styles.greeting}>Hola, {user?.fullName?.split(' ')[0] || 'Usuario'}!</Text>
              <Text style={styles.tenantName}>{tenant?.name || 'AUFA'}</Text>
            </View>
            <TouchableOpacity onPress={logout} style={styles.logoutBtn}>
              <Ionicons name="log-out-outline" size={22} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>
          {user?.aufaId && (
            <View style={styles.aufaIdBadge}>
              <Ionicons name="shield-checkmark" size={14} color={colors.primary} />
              <Text style={styles.aufaIdText}>AUFA ID: {user.aufaId}</Text>
            </View>
          )}
        </View>

        {/* Stats cards */}
        <View style={styles.statsRow}>
          <StatCard icon="trophy" label="Torneos" value={data?.tournaments ?? 0} color={colors.accent} />
          <StatCard icon="people" label="Equipos" value={data?.teams ?? 0} color={colors.primary} />
          <StatCard icon="person" label="Jugadores" value={data?.players ?? 0} color={colors.success} />
        </View>

        {/* Quick actions */}
        <Text style={styles.sectionTitle}>Acceso Rapido</Text>
        <View style={styles.actionsGrid}>
          <QuickAction icon="calendar" label="Fixture" color={colors.primary} />
          <QuickAction icon="trophy" label="Posiciones" color={colors.accent} />
          <QuickAction icon="id-card" label="AUFA ID" color={colors.secondary} />
          <QuickAction icon="people" label="Mi Equipo" color={colors.success} />
        </View>

        {/* Info card */}
        {!tenantId && (
          <View style={styles.infoCard}>
            <Ionicons name="information-circle" size={24} color={colors.primary} />
            <Text style={styles.infoText}>
              No estas asociado a ninguna liga todavia. Contacta al organizador de tu liga para que te agregue.
            </Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function StatCard({ icon, label, value, color }: { icon: any; label: string; value: number; color: string }) {
  return (
    <View style={styles.statCard}>
      <Ionicons name={icon} size={24} color={color} />
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function QuickAction({ icon, label, color }: { icon: any; label: string; color: string }) {
  return (
    <TouchableOpacity style={styles.actionCard}>
      <View style={[styles.actionIcon, { backgroundColor: `${color}15` }]}>
        <Ionicons name={icon} size={24} color={color} />
      </View>
      <Text style={styles.actionLabel}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  scroll: { padding: 16 },
  welcomeCard: {
    backgroundColor: colors.surface, borderRadius: 16, padding: 16,
    marginBottom: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06, shadowRadius: 8, elevation: 3,
  },
  welcomeRow: { flexDirection: 'row', alignItems: 'center' },
  avatarCircle: {
    width: 48, height: 48, borderRadius: 24,
    backgroundColor: colors.primary, justifyContent: 'center', alignItems: 'center',
  },
  avatarText: { color: colors.textOnPrimary, fontSize: 20, fontWeight: '700' },
  welcomeInfo: { flex: 1, marginLeft: 12 },
  greeting: { fontSize: 18, fontWeight: '700', color: colors.text },
  tenantName: { fontSize: 14, color: colors.textSecondary, marginTop: 2 },
  logoutBtn: { padding: 8 },
  aufaIdBadge: {
    flexDirection: 'row', alignItems: 'center',
    marginTop: 12, backgroundColor: `${colors.primary}10`,
    paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, alignSelf: 'flex-start',
  },
  aufaIdText: { fontSize: 12, fontWeight: '600', color: colors.primary, marginLeft: 4 },
  statsRow: { flexDirection: 'row', gap: 10, marginBottom: 24 },
  statCard: {
    flex: 1, backgroundColor: colors.surface, borderRadius: 12, padding: 16,
    alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04, shadowRadius: 4, elevation: 2,
  },
  statValue: { fontSize: 24, fontWeight: '800', color: colors.text, marginTop: 8 },
  statLabel: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: colors.text, marginBottom: 12 },
  actionsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 24 },
  actionCard: {
    width: '48%', backgroundColor: colors.surface, borderRadius: 12,
    padding: 16, alignItems: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04, shadowRadius: 4, elevation: 2,
  },
  actionIcon: { width: 48, height: 48, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  actionLabel: { fontSize: 14, fontWeight: '600', color: colors.text, marginTop: 8 },
  infoCard: {
    flexDirection: 'row', backgroundColor: `${colors.primary}10`,
    borderRadius: 12, padding: 16, alignItems: 'center', gap: 12,
  },
  infoText: { flex: 1, fontSize: 14, color: colors.textSecondary },
});
