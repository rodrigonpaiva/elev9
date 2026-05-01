import "./global.css";

import { AuthProvider } from "./src/auth/auth-provider";
import { AppNavigator } from "./src/navigation/app-navigator";

export default function App() {
  return (
    <AuthProvider>
      <AppNavigator />
    </AuthProvider>
  );
}
