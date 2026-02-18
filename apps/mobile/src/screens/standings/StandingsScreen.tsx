import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTenant } from '../../lib/tenant-context';
import { leagueApi } from '../../lib/api';
import LoadingSpinner from '../../components/LoadingSpinner';
import EmptyState from '../../components/EmptyState';
import { colors } from '../../theme/colors';

interface Standing {
  team: { name: string };
  played: number;
  won: number;
  drawn: number;
  lost: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDifference: number;
  points: number;
}

export default function StandingsScreen() {
  const { tenantId } = useTenant();
  const [standings, setStandings] = useState<Standing[]>([]);
  const [tournamentName, setTournamentName] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchStandings = async () => {
    if (!tenantId) { setLoading(false); return; }
    try {
      const tournaments = await leagueApi.listTournaments(tenantId);
      if (tournaments.length > 0) {
        setTournamentName(tournaments[0].name);
        const data = await leagueApi.getStandings(tenantId, tournaments[0].id);
        setStandings(Array.isArray(data) ? data : data.standings || []);
      }
    } catch {
      setStandings([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { fetchStandings(); }, [tenantId]);

  const onRefresh = () => { setRefreshing(true); fetchStandings(); };

  if (loading) return <LoadingSpinner />;

  if (standings.length === 0) {
    return (
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <EmptyState
          icon="trophy-outline"
          title="Sin posiciones"
          message="No hay tabla de posiciones disponible."
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
      >
        {tournamentName ? (
          <Text style={styles.tournamentName}>{tournamentName}</Text>
        ) : null}

        {/* Table Header */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View>
            <View style={[styles.row, styles.headerRow]}>
              <Text style={[styles.cell, styles.posCell, styles.headerText]}>#</Text>
              <Text style={[styles.cell, styles.teamCell, styles.headerText]}>Equipo</Text>
              <Text style={[styles.cell, styles.numCell, styles.headerText]}>PJ</Text>
              <Text style={[styles.cell, styles.numCell, styles.headerText]}>G</Text>
              <Text style={[styles.cell, styles.numCell, styles.headerText]}>E</Text>
              <Text style={[styles.cell, styles.numCell, styles.headerText]}>P</Text>
              <Text style={[styles.cell, styles.numCell, styles.headerText]}>GF</Text>
              <Text style={[styles.cell, styles.numCell, styles.headerText]}>GC</Text>
              <Text style={[styles.cell, styles.numCell, styles.headerText]}>DIF</Text>
              <Text style={[styles.cell, styles.numCell, styles.headerText, styles.ptsText]}>PTS</Text>
            </View>

            {/* Table Rows */}
            {standings.map((s, i) => (
              <View key={i} style={[styles.row, i % 2 === 0 ? styles.rowEven : styles.rowOdd]}>
                <Text style={[styles.cell, styles.posCell, styles.posText]}>{i + 1}</Text>
                <Text style={[styles.cell, styles.teamCell]} numberOfLines={1}>{s.team?.name}</Text>
                <Text style={[styles.cell, styles.numCell]}>{s.played}</Text>
                <Text style={[styles.cell, styles.numCell]}>{s.won}</Text>
                <Text style={[styles.cell, styles.numCell]}>{s.drawn}</Text>
                <Text style={[styles.cell, styles.numCell]}>{s.lost}</Text>
                <Text style={[styles.cell, styles.numCell]}>{s.goalsFor}</Text>
                <Text style={[styles.cell, styles.numCell]}>{s.goalsAgainst}</Text>
                <Text style={[styles.cell, styles.numCell, { color: s.goalDifference > 0 ? colors.success : s.goalDifference < 0 ? colors.danger : colors.text }]}>
                  {s.goalDifference > 0 ? '+' : ''}{s.goalDifference}
                </Text>
                <Text style={[styles.cell, styles.numCell, styles.ptsValue]}>{s.points}</Text>
              </View>
            ))}
          </View>
        </ScrollView>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  tournamentName: {
    fontSize: 16, fontWeight: '700', color: colors.text, padding: 16, paddingBottom: 8,
  },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, paddingHorizontal: 8 },
  headerRow: { backgroundColor: colors.primary, borderTopLeftRadius: 10, borderTopRightRadius: 10, marginHorizontal: 8 },
  rowEven: { backgroundColor: colors.surface, marginHorizontal: 8 },
  rowOdd: { backgroundColor: colors.background, marginHorizontal: 8 },
  cell: { fontSize: 13, color: colors.text },
  headerText: { color: colors.textOnPrimary, fontWeight: '700', fontSize: 12 },
  posCell: { width: 30, textAlign: 'center' },
  teamCell: { width: 130, paddingRight: 8 },
  numCell: { width: 36, textAlign: 'center' },
  posText: { fontWeight: '700' },
  ptsText: { fontWeight: '800' },
  ptsValue: { fontWeight: '800', fontSize: 15, color: colors.primary },
});
