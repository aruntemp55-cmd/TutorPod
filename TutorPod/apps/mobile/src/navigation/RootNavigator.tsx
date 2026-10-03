import React, { useMemo } from "react";
import {
  NavigationContainer,
  DarkTheme,
  DefaultTheme,
} from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { AdminScreen } from "../screens/AdminScreen";
import { AskQuestionScreen } from "../screens/AskQuestionScreen";
import { GeneratingScreen } from "../screens/GeneratingScreen";
import { LearningPathScreen } from "../screens/LearningPathScreen";
import { LoginScreen } from "../screens/LoginScreen";
import { MyPodsScreen } from "../screens/MyPodsScreen";
import { OtpScreen } from "../screens/OtpScreen";
import { PlayerScreen } from "../screens/PlayerScreen";
import { SettingsScreen } from "../screens/SettingsScreen";
import { SplashScreen } from "../screens/SplashScreen";
import { StartPodcastScreen } from "../screens/StartPodcastScreen";
import { StudentMainScreen } from "../screens/StudentMainScreen";
import { SubjectTopicsScreen } from "../screens/SubjectTopicsScreen";
import { useTheme } from "../theme/ThemeContext";
import type { RootStackParamList } from "./types";

const Stack = createNativeStackNavigator<RootStackParamList>();

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
        initialRouteName="Login"
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.canvas },
        }}
      >
        <Stack.Screen name="Login" component={LoginScreen} />
        <Stack.Screen name="Otp" component={OtpScreen} />
        <Stack.Screen name="Settings" component={SettingsScreen} />
        <Stack.Screen name="Main" component={StudentMainScreen} />
        <Stack.Screen name="AskQuestion" component={AskQuestionScreen} />
        <Stack.Screen name="SubjectTopics" component={SubjectTopicsScreen} />
        <Stack.Screen name="MyPods" component={MyPodsScreen} />
        <Stack.Screen name="LearningPath" component={LearningPathScreen} />
        <Stack.Screen name="Admin" component={AdminScreen} />
        <Stack.Screen name="Splash" component={SplashScreen} />
        <Stack.Screen name="Player" component={PlayerScreen} />
        <Stack.Screen name="StartPodcast" component={StartPodcastScreen} />
        <Stack.Screen name="Generating" component={GeneratingScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
