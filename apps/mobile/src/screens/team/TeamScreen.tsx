import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, FlatList, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../lib/auth-context';
import { useTenant } from '../../lib/tenant-context';
import { leagueApi } from '../../lib/api';
import LoadingSpinner from '../../components/LoadingSpinner';
import EmptyState from '../../components/EmptyState';
import { colors } from '../../theme/colors';

interface TeamData {
  id: string;
  name: string;
  logoUrl?: string;
  players?: { id: string; player: { fullName: string; aufaId?: string; ci?: string } }[];
}

export default function TeamScreen() {
  const { user } = useAuth();
  const { tenantId } = useTenant();
  const [team, setTeam] = useState<TeamData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchTeam = async () => {
    if (!tenantId) { setLoading(false); return; }
    try {
      const teams = await leagueApi.listTeams(tenantId);
      // Find user's team by matching player
      const myTeam = teams.find((t: any) =>
        t.players?.some((p: any) => p.player?.ci === user?.ci || p.playerId === user?.playerId)
      );
      if (myTeam) {
        const detail = await leagueApi.getTeam(tenantId, myTeam.id);
        setTeam(detail);
      }
    } catch {
      setTeam(null);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { fetchTeam(); }, [tenantId, user]);

  const onRefresh = () => { setRefreshing(true); fetchTeam(); };

  if (loading) return <LoadingSpinner />;

  if (!team) {
    return (
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <EmptyState
          icon="people-outline"
          title="Sin equipo"
          message="No estas en ningun equipo de esta liga. Pedi al capitan que te invite."
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <FlatList
        data={team.players || []}
        keyExtractor={(item) => item.id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
        ListHeaderComponent={
          <View style={styles.teamHeader}>
            <View style={styles.teamIcon}>
              <Ionicons name="shield" size={40} color={colors.primary} />
            </View>
            <Text style={styles.teamName}>{team.name}</Text>
            <Text style={styles.playerCount}>
              {team.players?.length || 0} jugadores
            </Text>
          </View>
        }
        renderItem={({ item, index }) => (
          <View style={[styles.playerRow, index % 2 === 0 ? styles.rowEven : styles.rowOdd]}>
            <View style={styles.playerAvatar}>
              <Text style={styles.playerInitial}>
                {item.player?.fullName?.charAt(0)?.toUpperCase() || '?'}
              </Text>
            </View>
            <View style={styles.playerInfo}>
              <Text style={styles.playerName}>{item.player?.fullName || 'Jugador'}</Text>
              {item.player?.aufaId && (
                <Text style={styles.playerAufaId}>AUFA ID: {item.player.aufaId}</Text>
              )}
            </View>
            {item.player?.ci === user?.ci && (
              <View style={styles.youBadge}>
                <Text style={styles.youText}>Tu</Text>
              </View>
            )}
          </View>
        )}
        ListEmptyComponent={
          <View style={styles.emptyList}>
            <Text style={styles.emptyText}>Sin jugadores registrados</Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  teamHeader: { alignItems: 'center', padding: 24, paddingBottom: 16 },
  teamIcon: {
    width: 72, height: 72, borderRadius: 36,
    backgroundColor: `${colors.primary}15`, justifyContent: 'center', alignItems: 'center',
    marginBottom: 12,
  },
  teamName: { fontSize: 22, fontWeight: '700', color: colors.text },
  playerCount: { fontSize: 14, color: colors.textSecondary, marginTop: 4 },
  playerRow: {
    flexDirection: 'row', alignItems: 'center', padding: 14, marginHorizontal: 16,
    borderRadius: 10,
  },
  rowEven: { backgroundColor: colors.surface },
  rowOdd: { backgroundColor: colors.background },
  playerAvatar: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: colors.primaryLight, justifyContent: 'center', alignItems: 'center',
  },
  playerInitial: { color: colors.textOnPrimary, fontSize: 16, fontWeight: '700' },
  playerInfo: { flex: 1, marginLeft: 12 },
  playerName: { fontSize: 15, fontWeight: '600', color: colors.text },
  playerAufaId: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
  youBadge: {
    backgroundColor: `${colors.primary}15`, paddingHorizontal: 8, paddingVertical: 3,
    borderRadius: 6,
  },
  youText: { fontSize: 11, fontWeight: '700', color: colors.primary },
  emptyList: { padding: 32, alignItems: 'center' },
  emptyText: { fontSize: 14, color: colors.textSecondary },
});
