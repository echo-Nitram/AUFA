import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { FixtureStackParamList } from './types';
import FixtureScreen from '../screens/fixture/FixtureScreen';
import MatchDetailScreen from '../screens/fixture/MatchDetailScreen';
import { colors } from '../theme/colors';

const Stack = createNativeStackNavigator<FixtureStackParamList>();

export default function FixtureStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: colors.primary },
        headerTintColor: colors.textOnPrimary,
        headerTitleStyle: { fontWeight: '600' },
      }}
    >
      <Stack.Screen
        name="FixtureList"
        component={FixtureScreen}
        options={{ title: 'Fixture' }}
      />
      <Stack.Screen
        name="MatchDetail"
        component={MatchDetailScreen}
        options={{ title: 'Detalle del Partido' }}
      />
    </Stack.Navigator>
  );
}
