import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { colors } from "../theme/tokens";

export default function RootLayout() {
  return (
    <>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: colors.void },
          headerTintColor: colors.white,
          headerTitleStyle: { fontWeight: "700" },
          contentStyle: { backgroundColor: colors.void },
        }}
      >
        <Stack.Screen name="index" options={{ title: "Autocue" }} />
        <Stack.Screen name="library" options={{ title: "Library" }} />
      </Stack>
    </>
  );
}
