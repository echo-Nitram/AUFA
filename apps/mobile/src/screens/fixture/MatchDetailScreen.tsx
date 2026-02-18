import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { FixtureStackParamList } from '../../navigation/types';
import { useTenant } from '../../lib/tenant-context';
import { matchApi } from '../../lib/api';
import LoadingSpinner from '../../components/LoadingSpinner';
import { colors } from '../../theme/colors';

type Props = NativeStackScreenProps<FixtureStackParamList, 'MatchDetail'>;

interface MatchDetail {
  id: string;
  matchday: number;
  homeTeam: { name: string };
  awayTeam: { name: string };
  homeScore: number | null;
  awayScore: number | null;
  status: string;
  scheduledAt: string | null;
  venue?: { name: string } | null;
  referee?: { user: { email: string } } | null;
  goals?: { minute: number; scorer: { fullName: string }; assister?: { fullName: string } | null; team: 'HOME' | 'AWAY' }[];
  cards?: { minute: number; player: { fullName: string }; type: 'YELLOW' | 'RED'; team: 'HOME' | 'AWAY' }[];
  homeFairPlay?: number | null;
  awayFairPlay?: number | null;
}

export default function MatchDetailScreen({ route }: Props) {
  const { matchId } = route.params;
  const { tenantId } = useTenant();
  const [match, setMatch] = useState<MatchDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchMatch = async () => {
    if (!tenantId) { setLoading(false); return; }
    try {
      const data = await matchApi.getMatch(tenantId, matchId);
      setMatch(data);
    } catch {
      setMatch(null);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { fetchMatch(); }, [matchId, tenantId]);

  const onRefresh = () => { setRefreshing(true); fetchMatch(); };

  if (loading) return <LoadingSpinner />;
  if (!match) return <View style={styles.container}><Text>Partido no encontrado</Text></View>;

  const isCompleted = match.status === 'COMPLETED';

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.scroll}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
    >
      {/* Score Header */}
      <View style={styles.scoreCard}>
        <Text style={styles.matchday}>Fecha {match.matchday}</Text>
        <View style={styles.teamsRow}>
          <View style={styles.teamCol}>
            <Text style={styles.teamNameBig}>{match.homeTeam?.name}</Text>
          </View>
          <View style={styles.centerScore}>
            {isCompleted || match.homeScore !== null ? (
              <Text style={styles.bigScore}>{match.homeScore ?? 0} - {match.awayScore ?? 0}</Text>
            ) : (
              <Text style={styles.bigVs}>vs</Text>
            )}
            {isCompleted && <Text style={styles.finalLabel}>FINAL</Text>}
          </View>
          <View style={[styles.teamCol, styles.teamRight]}>
            <Text style={styles.teamNameBig}>{match.awayTeam?.name}</Text>
          </View>
        </View>
      </View>

      {/* Match Info */}
      <View style={styles.infoSection}>
        {match.scheduledAt && (
          <InfoRow icon="calendar" text={
            new Date(match.scheduledAt).toLocaleDateString('es-UY', {
              weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
              hour: '2-digit', minute: '2-digit',
            })
          } />
        )}
        {match.venue && <InfoRow icon="location" text={match.venue.name} />}
        {match.referee && <InfoRow icon="person" text={`Arbitro: ${match.referee.user?.email || 'Asignado'}`} />}
      </View>

      {/* Goals */}
      {match.goals && match.goals.length > 0 && (
        <View style={styles.eventsSection}>
          <Text style={styles.eventsTitle}>Goles</Text>
          {match.goals.map((g, i) => (
            <View key={i} style={styles.eventRow}>
              <Ionicons name="football" size={16} color={colors.success} />
              <Text style={styles.eventMinute}>{g.minute}'</Text>
              <Text style={styles.eventText}>
                {g.scorer?.fullName}{g.assister ? ` (Asist: ${g.assister.fullName})` : ''}
              </Text>
            </View>
          ))}
        </View>
      )}

      {/* Cards */}
      {match.cards && match.cards.length > 0 && (
        <View style={styles.eventsSection}>
          <Text style={styles.eventsTitle}>Tarjetas</Text>
          {match.cards.map((c, i) => (
            <View key={i} style={styles.eventRow}>
              <View style={[styles.cardIcon, c.type === 'RED' ? styles.redCard : styles.yellowCard]} />
              <Text style={styles.eventMinute}>{c.minute}'</Text>
              <Text style={styles.eventText}>{c.player?.fullName}</Text>
            </View>
          ))}
        </View>
      )}
    </ScrollView>
  );
}

function InfoRow({ icon, text }: { icon: any; text: string }) {
  return (
    <View style={styles.infoRow}>
      <Ionicons name={icon} size={18} color={colors.textSecondary} />
      <Text style={styles.infoText}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  scroll: { padding: 16 },
  scoreCard: {
    backgroundColor: colors.primary, borderRadius: 20, padding: 24,
    marginBottom: 16, alignItems: 'center',
  },
  matchday: { color: 'rgba(255,255,255,0.7)', fontSize: 14, fontWeight: '600', marginBottom: 12 },
  teamsRow: { flexDirection: 'row', alignItems: 'center', width: '100%' },
  teamCol: { flex: 1 },
  teamRight: { alignItems: 'flex-end' },
  teamNameBig: { color: '#fff', fontSize: 16, fontWeight: '700', textAlign: 'center' },
  centerScore: { paddingHorizontal: 16, alignItems: 'center' },
  bigScore: { color: '#fff', fontSize: 32, fontWeight: '900' },
  bigVs: { color: 'rgba(255,255,255,0.6)', fontSize: 20, fontWeight: '600' },
  finalLabel: {
    color: 'rgba(255,255,255,0.7)', fontSize: 11, fontWeight: '700',
    letterSpacing: 2, marginTop: 4,
  },
  infoSection: {
    backgroundColor: colors.surface, borderRadius: 12, padding: 16, marginBottom: 16,
  },
  infoRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 6 },
  infoText: { fontSize: 14, color: colors.text, marginLeft: 10 },
  eventsSection: {
    backgroundColor: colors.surface, borderRadius: 12, padding: 16, marginBottom: 16,
  },
  eventsTitle: { fontSize: 16, fontWeight: '700', color: colors.text, marginBottom: 12 },
  eventRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 6 },
  eventMinute: { fontSize: 13, fontWeight: '700', color: colors.textSecondary, marginLeft: 8, width: 30 },
  eventText: { fontSize: 14, color: colors.text, flex: 1, marginLeft: 4 },
  cardIcon: { width: 14, height: 18, borderRadius: 2 },
  yellowCard: { backgroundColor: colors.yellow },
  redCard: { backgroundColor: colors.red },
});
