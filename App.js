// App.js
import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { View, Text, ActivityIndicator } from 'react-native';

import Home from './screens/Home';
import List from './screens/List';
import Favorites from './screens/Favorites';
import HospitalDetail from './screens/HospitalDetail';
import FutureAvailability from './screens/FutureAvailability';
import EmergencyRequest from './screens/EmergencyRequest'; // Renamed
import BookingForm from './screens/BookingForm';
import MyBookings from './screens/MyBookings';
import StaffDashboard from './screens/StaffDashboard'; // New
import Profile from './screens/Profile';
import AddHospital from './screens/AddHospital';
import GeneralHospitals from './screens/GeneralHospitals';

import { AuthProvider, useAuth } from './screens/auth/AuthProvider';
import SignIn from './screens/auth/SignIn';
import SignUp from './screens/auth/SignUp';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();
const AuthStack = createNativeStackNavigator();

function Tabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: true,
        tabBarActiveTintColor: '#0B4D73',
        tabBarInactiveTintColor: '#7aa3ba',
        tabBarStyle: {
          height: 64,
          paddingBottom: 10,
          paddingTop: 6,
          borderTopLeftRadius: 16,
          borderTopRightRadius: 16,
          position: 'absolute',
        },
      }}
    >
      <Tab.Screen
        name="Home"
        component={Home}
        options={{
          title: 'Dashboard',
          tabBarIcon: ({ color, size }) => <MaterialCommunityIcons name="view-dashboard" color={color} size={size} />,
        }}
      />
      <Tab.Screen
        name="List"
        component={List}
        options={{
          title: 'Hospitals',
          tabBarIcon: ({ color, size }) => <MaterialCommunityIcons name="hospital-building" color={color} size={size} />,
        }}
      />
      <Tab.Screen
        name="My Bookings"
        component={MyBookings}
        options={{
          title: 'Requests',
          tabBarIcon: ({ color, size }) => <MaterialCommunityIcons name="clipboard-text-clock" color={color} size={size} />,
        }}
      />
      <Tab.Screen
        name="Profile"
        component={Profile}
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, size }) => <MaterialCommunityIcons name="account-circle" color={color} size={size} />,
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

/**
 * RootNavigator must be a component (not top-level hook) so useAuth()
 * is always called while inside AuthProvider.
 */
function RootNavigator() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F4FBFF' }}>
        <ActivityIndicator />
        <Text style={{ marginTop: 8 }}>Loading…</Text>
      </View>
    );
  }

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {user ? (
        // Signed in -> show main app
        <>
          <Stack.Screen name="MainTabs" component={Tabs} />
          <Stack.Screen name="HospitalDetail" component={HospitalDetail} options={{ headerShown: true, title: 'Details' }} />
          <Stack.Screen name="FutureAvailability" component={FutureAvailability} options={{ headerShown: true, title: 'Future Availability' }} />
          <Stack.Screen name="EmergencyRequest" component={EmergencyRequest} options={{ headerShown: true, title: 'Emergency Request' }} />
          <Stack.Screen name="BookingForm" component={BookingForm} options={{ headerShown: true, title: 'Book Bed' }} />
          <Stack.Screen name="StaffDashboard" component={StaffDashboard} options={{ headerShown: true, title: 'Staff Portal' }} />
          <Stack.Screen name="AddHospital" component={AddHospital} options={{ headerShown: true, title: 'Register Hospital' }} />
          <Stack.Screen name="GeneralHospitals" component={GeneralHospitals} options={{ headerShown: true, title: 'Hospital Registry' }} />
        </>
      ) : (
        // Not signed in -> show auth flow
        <Stack.Screen name="Auth" component={AuthStackScreens} />
      )}
    </Stack.Navigator>
  );
}

export default function App() {
  // AuthProvider wraps the whole app so useAuth() has a context inside RootNavigator
  return (
    <AuthProvider>
      <NavigationContainer>
        <RootNavigator />
      </NavigationContainer>
    </AuthProvider>
  );
}

