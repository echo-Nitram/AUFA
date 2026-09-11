import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../lib/auth-context';
import { aufaIdApi } from '../../lib/api';
import LoadingSpinner from '../../components/LoadingSpinner';
import EmptyState from '../../components/EmptyState';
import { colors } from '../../theme/colors';

interface PassportData {
  player: {
    fullName: string;
    aufaId?: string;
    ci?: string;
    dateOfBirth?: string;
    photoUrl?: string;
  };
  career: {
    totalMatches: number;
    totalGoals: number;
    totalAssists: number;
    totalYellowCards: number;
    totalRedCards: number;
    leagues: number;
    tournaments: number;
  };
}

export default function PassportScreen() {
  const { user, token } = useAuth();
  const [passport, setPassport] = useState<PassportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchPassport = async () => {
    if (!user?.playerId || !token) { setLoading(false); return; }
    try {
      const data = await aufaIdApi.getPassport(user.playerId, token);
      setPassport(data);
    } catch {
      setPassport(null);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { fetchPassport(); }, [user?.playerId]);

  const onRefresh = () => { setRefreshing(true); fetchPassport(); };

  if (loading) return <LoadingSpinner />;

  if (!user?.playerId) {
    return (
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <EmptyState
          icon="id-card-outline"
          title="Sin AUFA ID"
          message="Tu cuenta no tiene un perfil de jugador asociado."
        />
      </SafeAreaView>
    );
  }

  const career = passport?.career;

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
      >
        {/* Passport Card */}
        <View style={styles.passportCard}>
          <View style={styles.passportHeader}>
            <Ionicons name="shield-checkmark" size={20} color="rgba(255,255,255,0.9)" />
            <Text style={styles.passportBrand}>AUFA - PASAPORTE DEPORTIVO</Text>
          </View>

          <View style={styles.playerInfo}>
            <View style={styles.playerAvatar}>
              <Text style={styles.playerInitial}>
                {user?.fullName?.charAt(0)?.toUpperCase() || 'J'}
              </Text>
            </View>
            <View style={styles.playerDetails}>
              <Text style={styles.playerName}>{passport?.player?.fullName || user.fullName}</Text>
              {passport?.player?.aufaId && (
                <Text style={styles.aufaIdLabel}>ID: {passport.player.aufaId}</Text>
              )}
              {user.ci && (
                <Text style={styles.ciLabel}>CI: {user.ci}</Text>
              )}
            </View>
          </View>

          <View style={styles.divider} />

          <View style={styles.passportFooter}>
            <Text style={styles.footerText}>Nube de Ligas</Text>
            <Ionicons name="football" size={16} color="rgba(255,255,255,0.6)" />
          </View>
        </View>

        {/* Career Stats */}
        <Text style={styles.sectionTitle}>Estadisticas de Carrera</Text>
        <View style={styles.statsGrid}>
          <CareerStat icon="football" label="Partidos" value={career?.totalMatches ?? 0} color={colors.primary} />
          <CareerStat icon="flash" label="Goles" value={career?.totalGoals ?? 0} color={colors.success} />
          <CareerStat icon="hand-left" label="Asistencias" value={career?.totalAssists ?? 0} color={colors.accent} />
          <CareerStat icon="square" label="Amarillas" value={career?.totalYellowCards ?? 0} color={colors.yellow} />
          <CareerStat icon="square" label="Rojas" value={career?.totalRedCards ?? 0} color={colors.red} />
          <CareerStat icon="trophy" label="Torneos" value={career?.tournaments ?? 0} color={colors.secondary} />
        </View>

        {career && career.leagues > 0 && (
          <View style={styles.leaguesCard}>
            <Ionicons name="globe-outline" size={20} color={colors.primary} />
            <Text style={styles.leaguesText}>
              Ha participado en {career.leagues} liga{career.leagues !== 1 ? 's' : ''} diferentes
            </Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function CareerStat({ icon, label, value, color }: { icon: any; label: string; value: number; color: string }) {
  return (
    <View style={styles.careerStatCard}>
      <Ionicons name={icon} size={20} color={color} />
      <Text style={styles.careerStatValue}>{value}</Text>
      <Text style={styles.careerStatLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  scroll: { padding: 16 },
  passportCard: {
    backgroundColor: colors.primary, borderRadius: 20, padding: 20,
    marginBottom: 24, shadowColor: '#000', shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2, shadowRadius: 16, elevation: 10,
  },
  passportHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  passportBrand: {
    color: 'rgba(255,255,255,0.9)', fontSize: 12, fontWeight: '700',
    letterSpacing: 1, marginLeft: 8,
  },
  playerInfo: { flexDirection: 'row', alignItems: 'center' },
  playerAvatar: {
    width: 64, height: 64, borderRadius: 32,
    backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center',
  },
  playerInitial: { color: '#fff', fontSize: 28, fontWeight: '800' },
  playerDetails: { flex: 1, marginLeft: 16 },
  playerName: { color: '#fff', fontSize: 20, fontWeight: '700' },
  aufaIdLabel: { color: 'rgba(255,255,255,0.8)', fontSize: 14, marginTop: 2 },
  ciLabel: { color: 'rgba(255,255,255,0.6)', fontSize: 13, marginTop: 2 },
  divider: {
    height: 1, backgroundColor: 'rgba(255,255,255,0.2)', marginVertical: 16,
  },
  passportFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  footerText: { color: 'rgba(255,255,255,0.6)', fontSize: 12 },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: colors.text, marginBottom: 12 },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 16 },
  careerStatCard: {
    width: '31%', backgroundColor: colors.surface, borderRadius: 12, padding: 14,
    alignItems: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04, shadowRadius: 4, elevation: 2,
  },
  careerStatValue: { fontSize: 22, fontWeight: '800', color: colors.text, marginTop: 6 },
  careerStatLabel: { fontSize: 11, color: colors.textSecondary, marginTop: 2 },
  leaguesCard: {
    flexDirection: 'row', backgroundColor: `${colors.primary}10`,
    borderRadius: 12, padding: 16, alignItems: 'center', gap: 10, marginTop: 8,
  },
  leaguesText: { flex: 1, fontSize: 14, color: colors.text },
});
