import React, { useEffect, useRef } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Animated, View, Text, ActivityIndicator, StyleSheet } from 'react-native';

import Home from './screens/Home';
import MapScreen from './screens/MapScreen';
import List from './screens/List';
import SOSScreen from './screens/SOSScreen';
import Profile from './screens/Profile';
import HospitalDetail from './screens/HospitalDetail';
import StaffDashboard from './screens/StaffDashboard';
import LoadingScreen from './screens/LoadingScreen';

import { AuthProvider, useAuth } from './screens/auth/AuthProvider';
import { HospitalProvider, useHospitals } from './screens/HospitalContext';
import SignIn from './screens/auth/SignIn';
import SignUp from './screens/auth/SignUp';

import { Colors, Shadows } from './screens/ui/theme';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();
const AuthStack = createNativeStackNavigator();

function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: Colors.primary,
        tabBarInactiveTintColor: Colors.sub,
        tabBarStyle: {
          height: 64,
          paddingBottom: 8,
          paddingTop: 6,
          backgroundColor: '#fff',
          borderTopWidth: 1,
          borderTopColor: '#E8EEF2',
          ...Shadows.md,
        },
        tabBarLabelStyle: { fontSize: 10, fontWeight: '800', letterSpacing: 0.5 },
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
        name="Map"
        component={MapScreen}
        options={{
          title: 'MAP',
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="map-outline" color={color} size={size} />
          ),
        }}
      />
      <Tab.Screen
        name="List"
        component={List}
        options={{
          title: 'LIST',
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="format-list-bulleted" color={color} size={size} />
          ),
        }}
      />
      <Tab.Screen
        name="SOS"
        component={SOSScreen}
        options={{
          title: 'SOS',
          tabBarActiveTintColor: Colors.bad,
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="alert-octagon-outline" color={color} size={size} />
          ),
        }}
      />
      <Tab.Screen
        name="Profile"
        component={Profile}
        options={{
          title: 'PROFILE',
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="account-outline" color={color} size={size} />
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

class ErrorBoundary extends React.Component {
  state = { hasError: false, error: null };
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary', error, errorInfo);
  }
  render() {
    if (this.state.hasError) {
      return (
        <View style={eb.wrap}>
          <Text style={eb.title}>Something went wrong</Text>
          <Text style={eb.msg}>{this.state.error?.toString()}</Text>
        </View>
      );
    }
    return this.props.children;
  }
}

// Gates the main tab navigator behind the preload "ready" flag.
// Shows LoadingScreen with a pulse animation while data is being fetched,
// then fades the app in once ready=true — zero flicker.
function AppGate() {
  const { ready } = useHospitals();
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (ready) {
      Animated.timing(fadeAnim, {
        toValue: 1, duration: 400, useNativeDriver: true,
      }).start();
    }
  }, [ready]);

  if (!ready) return <LoadingScreen />;

  return (
    <Animated.View style={{ flex: 1, opacity: fadeAnim }}>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="MainTabs" component={MainTabs} />
        <Stack.Screen name="HospitalDetail" component={HospitalDetail} />
        <Stack.Screen name="StaffDashboard" component={StaffDashboard} />
      </Stack.Navigator>
    </Animated.View>
  );
}

function RootNavigator() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <View style={eb.wrap}>
        <ActivityIndicator color={Colors.primary} />
        <Text style={{ marginTop: 8, color: Colors.sub }}>Loading…</Text>
      </View>
    );
  }

  return (
    <HospitalProvider user={user}>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {user ? (
          <Stack.Screen name="App" component={AppGate} />
        ) : (
          <Stack.Screen name="Auth" component={AuthStackScreens} />
        )}
      </Stack.Navigator>
    </HospitalProvider>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <NavigationContainer>
          <RootNavigator />
        </NavigationContainer>
      </AuthProvider>
    </ErrorBoundary>
  );
}

const eb = StyleSheet.create({
  wrap: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.bg },
  title: { fontSize: 18, fontWeight: '800', color: Colors.bad },
  msg: { color: Colors.sub, marginTop: 8, paddingHorizontal: 24, textAlign: 'center' },
});
