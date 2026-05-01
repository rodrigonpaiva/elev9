import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { ActivityIndicator, View } from "react-native";

import { Text } from "@elev9/ui";

import { useAuth } from "../auth/auth-provider";
import { DashboardScreen } from "../screens/dashboard-screen";
import { LoginScreen } from "../screens/login-screen";

type RootStackParamList = {
  Login: undefined;
  Dashboard: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export function AppNavigator() {
  const { status } = useAuth();
  console.log("Navigator rendered");

  if (status === "loading") {
    return (
      <View
        style={{
          flex: 1,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#ffffff",
          paddingHorizontal: 24,
          minHeight: "100%",
        }}
      >
        <ActivityIndicator color="#0f766e" />
        <Text className="mt-4 text-slate">Loading Elev9...</Text>
      </View>
    );
  }

  return (
    <NavigationContainer>
      <Stack.Navigator>
        {status === "authenticated" ? (
          <Stack.Screen name="Dashboard" component={DashboardScreen} />
        ) : (
          <Stack.Screen name="Login" component={LoginScreen} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
