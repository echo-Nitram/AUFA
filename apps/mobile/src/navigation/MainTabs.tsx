import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { MainTabParamList } from './types';
import HomeScreen from '../screens/home/HomeScreen';
import FixtureStack from './FixtureStack';
import StandingsScreen from '../screens/standings/StandingsScreen';
import PassportScreen from '../screens/passport/PassportScreen';
import TeamScreen from '../screens/team/TeamScreen';
import { colors } from '../theme/colors';

const Tab = createBottomTabNavigator<MainTabParamList>();

export default function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textSecondary,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
          paddingBottom: 4,
          height: 56,
        },
        headerStyle: { backgroundColor: colors.primary },
        headerTintColor: colors.textOnPrimary,
        headerTitleStyle: { fontWeight: '600' },
      }}
    >
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{
          title: 'Inicio',
          tabBarIcon: ({ color, size }) => <Ionicons name="home" size={size} color={color} />,
        }}
      />
      <Tab.Screen
        name="Fixture"
        component={FixtureStack}
        options={{
          title: 'Fixture',
          headerShown: false,
          tabBarIcon: ({ color, size }) => <Ionicons name="calendar" size={size} color={color} />,
        }}
      />
      <Tab.Screen
        name="Standings"
        component={StandingsScreen}
        options={{
          title: 'Posiciones',
          tabBarIcon: ({ color, size }) => <Ionicons name="trophy" size={size} color={color} />,
        }}
      />
      <Tab.Screen
        name="Passport"
        component={PassportScreen}
        options={{
          title: 'AUFA ID',
          tabBarIcon: ({ color, size }) => <Ionicons name="id-card" size={size} color={color} />,
        }}
      />
      <Tab.Screen
        name="Team"
        component={TeamScreen}
        options={{
          title: 'Equipo',
          tabBarIcon: ({ color, size }) => <Ionicons name="people" size={size} color={color} />,
        }}
      />
    </Tab.Navigator>
  );
}
