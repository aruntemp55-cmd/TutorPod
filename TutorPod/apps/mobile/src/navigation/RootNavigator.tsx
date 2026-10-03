import React, { useMemo } from "react";
import { Text } from "react-native";
import {
  NavigationContainer,
  DarkTheme,
  DefaultTheme,
} from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { AccountScreen } from "../screens/AccountScreen";
import { AdminScreen } from "../screens/AdminScreen";
import { HomeScreen } from "../screens/HomeScreen";
import { LoginScreen } from "../screens/LoginScreen";
import { MyPodsScreen } from "../screens/MyPodsScreen";
import { OnboardingScreen } from "../screens/OnboardingScreen";
import { OtpScreen } from "../screens/OtpScreen";
import { PlayerScreen } from "../screens/PlayerScreen";
import { SplashScreen } from "../screens/SplashScreen";
import { GeneratingScreen } from "../screens/GeneratingScreen";
import { StartPodcastScreen } from "../screens/StartPodcastScreen";
import { useTheme } from "../theme/ThemeContext";
import type { RootStackParamList } from "./types";

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator();

function MainTabs() {
  const { colors } = useTheme();
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.pill,
        },
        tabBarActiveTintColor: colors.text,
        tabBarInactiveTintColor: colors.textSecondary,
        tabBarActiveBackgroundColor: colors.pill,
        tabBarItemStyle: { borderRadius: 20, margin: 6 },
      }}
    >
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{
          tabBarIcon: ({ color }) => <Text style={{ color }}>⌂</Text>,
        }}
      />
      <Tab.Screen
        name="MyPodsTab"
        component={MyPodsScreen}
        options={{
          title: "MyPods",
          tabBarIcon: ({ color }) => <Text style={{ color }}>🎧</Text>,
        }}
      />
      <Tab.Screen
        name="Account"
        component={AccountScreen}
        options={{
          tabBarIcon: ({ color }) => <Text style={{ color }}>☺</Text>,
        }}
      />
    </Tab.Navigator>
  );
}

export function RootNavigator() {
  const { colors, scheme } = useTheme();
  const navTheme = useMemo(
    () => ({
      ...(scheme === "dark" ? DarkTheme : DefaultTheme),
      colors: {
        ...(scheme === "dark" ? DarkTheme.colors : DefaultTheme.colors),
        background: colors.canvas,
        card: colors.surface,
        text: colors.text,
        border: colors.pill,
        primary: colors.accent,
      },
    }),
    [colors, scheme],
  );

  return (
    <NavigationContainer theme={navTheme}>
      <Stack.Navigator
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.canvas },
        }}
      >
        <Stack.Screen name="Splash" component={SplashScreen} />
        <Stack.Screen name="Onboarding" component={OnboardingScreen} />
        <Stack.Screen name="Main" component={MainTabs} />
        <Stack.Screen name="Admin" component={AdminScreen} />
        <Stack.Screen name="Login" component={LoginScreen} />
        <Stack.Screen name="Otp" component={OtpScreen} />
        <Stack.Screen name="Player" component={PlayerScreen} />
        <Stack.Screen name="StartPodcast" component={StartPodcastScreen} />
        <Stack.Screen name="Generating" component={GeneratingScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
