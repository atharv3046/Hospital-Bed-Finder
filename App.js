// App.js
import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { View, Text, TouchableOpacity, ActivityIndicator, StyleSheet } from 'react-native';

import Home from './screens/Home';
import List from './screens/List';
import FutureAvailability from './screens/FutureAvailability';
import EmergencyRequest from './screens/EmergencyRequest';
import HospitalDetail from './screens/HospitalDetail';

import { AuthProvider, useAuth } from './screens/auth/AuthProvider';
import SignIn from './screens/auth/SignIn';
import SignUp from './screens/auth/SignUp';

import { Colors, Radii, Shadows } from './screens/ui/theme';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();
const AuthStack = createNativeStackNavigator();

function Tabs({ navigation: tabsNav }) {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: true,
        tabBarActiveTintColor: Colors.primary,
        tabBarInactiveTintColor: Colors.sub,
        tabBarStyle: {
          height: 64,
          paddingBottom: 8,
          paddingTop: 6,
          backgroundColor: '#fff',
          borderTopWidth: 0,
          ...Shadows.md,
        },
      }}
    >
      <Tab.Screen
        name="Home"
        component={Home}
        options={{
          title: 'Home',
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="home-outline" color={color} size={size} />
          ),
        }}
      />
      <Tab.Screen
        name="List"
        component={List}
        options={{
          title: 'Search',
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="magnify" color={color} size={size} />
          ),
        }}
      />
      <Tab.Screen
        name="FutureAvailability"
        component={FutureAvailability}
        options={{
          title: 'Request',
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="robot-outline" color={color} size={size} />
          ),
        }}
      />
      <Tab.Screen
        name="MakeRequest"
        component={EmergencyRequest}
        options={{
          title: '',
          tabBarIcon: () => null,
          tabBarButton: (props) => (
            <TouchableOpacity
              {...props}
              style={styles.makeRequestBtn}
            >
              <MaterialCommunityIcons name="message-text-outline" size={18} color="#fff" />
              <Text style={styles.makeRequestText}>Make{'\n'}Request</Text>
            </TouchableOpacity>
          ),
        }}
      />
    </Tab.Navigator>
  );
}

function AuthStackScreens() {
  return (
    <AuthStack.Navigator screenOptions={{ headerShown: false }}>
      <AuthStack.Screen name="SignIn" component={SignIn} />
      <AuthStack.Screen name="SignUp" component={SignUp} />
    </AuthStack.Navigator>
  );
}

function RootNavigator() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.bg }}>
        <ActivityIndicator color={Colors.primary} />
        <Text style={{ marginTop: 8, color: Colors.sub }}>Loading…</Text>
      </View>
    );
  }

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {user ? (
        <>
          <Stack.Screen name="MainTabs" component={Tabs} />
          <Stack.Screen
            name="HospitalDetail"
            component={HospitalDetail}
            options={{
              headerShown: true,
              title: 'Hospital Details',
              headerStyle: { backgroundColor: Colors.bg },
              headerTintColor: Colors.primary,
              headerTitleStyle: { fontWeight: '800' },
            }}
          />
        </>
      ) : (
        <Stack.Screen name="Auth" component={AuthStackScreens} />
      )}
    </Stack.Navigator>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <NavigationContainer>
        <RootNavigator />
      </NavigationContainer>
    </AuthProvider>
  );
}

const styles = StyleSheet.create({
  makeRequestBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary,
    marginVertical: 8,
    marginRight: 10,
    borderRadius: Radii.md,
    paddingHorizontal: 10,
    gap: 6,
    ...Shadows.sm,
  },
  makeRequestText: {
    color: '#fff',
    fontWeight: '800',
    fontSize: 12,
    lineHeight: 15,
  },
});