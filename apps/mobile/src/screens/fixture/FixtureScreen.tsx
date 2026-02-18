import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useNavigation } from '@react-navigation/native';
import { FixtureStackParamList } from '../../navigation/types';
import { useTenant } from '../../lib/tenant-context';
import { leagueApi, matchApi } from '../../lib/api';
import LoadingSpinner from '../../components/LoadingSpinner';
import EmptyState from '../../components/EmptyState';
import { colors } from '../../theme/colors';

type Nav = NativeStackNavigationProp<FixtureStackParamList, 'FixtureList'>;

interface Match {
  id: string;
  matchday: number;
  homeTeam: { name: string };
  awayTeam: { name: string };
  homeScore: number | null;
  awayScore: number | null;
  status: string;
  scheduledAt: string | null;
  venue?: { name: string } | null;
}

export default function FixtureScreen() {
  const navigation = useNavigation<Nav>();
  const { tenantId } = useTenant();
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchFixture = async () => {
    if (!tenantId) { setLoading(false); return; }
    try {
      const tournaments = await leagueApi.listTournaments(tenantId);
      if (tournaments.length > 0) {
        const data = await matchApi.listByTournament(tenantId, tournaments[0].id);
        setMatches(Array.isArray(data) ? data : data.matches || []);
      }
    } catch {
      setMatches([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { fetchFixture(); }, [tenantId]);

  const onRefresh = () => { setRefreshing(true); fetchFixture(); };

  if (loading) return <LoadingSpinner />;

  if (matches.length === 0) {
    return (
      <EmptyState
        icon="calendar-outline"
        title="Sin fixture"
        message="No hay partidos programados todavia."
      />
    );
  }

  // Group by matchday
  const grouped: Record<number, Match[]> = {};
  matches.forEach((m) => {
    const day = m.matchday || 0;
    if (!grouped[day]) grouped[day] = [];
    grouped[day].push(m);
  });

  const sections = Object.entries(grouped)
    .sort(([a], [b]) => Number(a) - Number(b))
    .map(([day, items]) => ({ day: Number(day), data: items }));

  return (
    <FlatList
      style={styles.list}
      data={sections}
      keyExtractor={(item) => `day-${item.day}`}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
      renderItem={({ item: section }) => (
        <View style={styles.section}>
          <Text style={styles.dayHeader}>Fecha {section.day}</Text>
          {section.data.map((match) => (
            <TouchableOpacity
              key={match.id}
              style={styles.matchCard}
              onPress={() => navigation.navigate('MatchDetail', { matchId: match.id })}
            >
              <View style={styles.matchRow}>
                <Text style={styles.teamName} numberOfLines={1}>{match.homeTeam?.name || 'Local'}</Text>
                <View style={styles.scoreBox}>
                  {match.status === 'COMPLETED' || match.homeScore !== null ? (
                    <Text style={styles.score}>{match.homeScore ?? 0} - {match.awayScore ?? 0}</Text>
                  ) : (
                    <Text style={styles.vs}>vs</Text>
                  )}
                </View>
                <Text style={[styles.teamName, styles.teamAway]} numberOfLines={1}>{match.awayTeam?.name || 'Visitante'}</Text>
              </View>
              {match.scheduledAt && (
                <View style={styles.matchMeta}>
                  <Ionicons name="time-outline" size={12} color={colors.textLight} />
                  <Text style={styles.matchMetaText}>
                    {new Date(match.scheduledAt).toLocaleDateString('es-UY', {
                      weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
                    })}
                  </Text>
                  {match.venue && (
                    <>
                      <Ionicons name="location-outline" size={12} color={colors.textLight} style={{ marginLeft: 8 }} />
                      <Text style={styles.matchMetaText}>{match.venue.name}</Text>
                    </>
                  )}
                </View>
              )}
              {match.status === 'COMPLETED' && (
                <View style={styles.statusBadge}>
                  <Text style={styles.statusText}>Finalizado</Text>
                </View>
              )}
            </TouchableOpacity>
          ))}
        </View>
      )}
    />
  );
}

const styles = StyleSheet.create({
  list: { flex: 1, backgroundColor: colors.background },
  section: { padding: 16, paddingBottom: 0 },
  dayHeader: { fontSize: 16, fontWeight: '700', color: colors.text, marginBottom: 10 },
  matchCard: {
    backgroundColor: colors.surface, borderRadius: 12, padding: 14, marginBottom: 10,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04, shadowRadius: 4, elevation: 2,
  },
  matchRow: { flexDirection: 'row', alignItems: 'center' },
  teamName: { flex: 1, fontSize: 14, fontWeight: '600', color: colors.text },
  teamAway: { textAlign: 'right' },
  scoreBox: {
    paddingHorizontal: 12, paddingVertical: 4, borderRadius: 8,
    backgroundColor: colors.background, marginHorizontal: 8,
  },
  score: { fontSize: 16, fontWeight: '800', color: colors.text },
  vs: { fontSize: 14, fontWeight: '600', color: colors.textLight },
  matchMeta: { flexDirection: 'row', alignItems: 'center', marginTop: 8 },
  matchMetaText: { fontSize: 12, color: colors.textLight, marginLeft: 4 },
  statusBadge: {
    alignSelf: 'flex-start', backgroundColor: `${colors.success}15`,
    paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, marginTop: 8,
  },
  statusText: { fontSize: 11, fontWeight: '600', color: colors.success },
});
