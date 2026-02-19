import { Stack } from "expo-router";
import App from "../App.js";

export default function Index() {
  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <App />
    </>
  );
}
