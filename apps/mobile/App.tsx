import { Component, type ErrorInfo, type ReactNode } from 'react';
import { Text, View } from 'react-native';

import { AuthProvider } from './src/auth/auth-provider';
import { AppNavigator } from './src/navigation/app-navigator';

type AppErrorBoundaryState = {
  errorMessage: string | null;
};

class AppErrorBoundary extends Component<
  { children: ReactNode },
  AppErrorBoundaryState
> {
  state: AppErrorBoundaryState = {
    errorMessage: null,
  };

  static getDerivedStateFromError(error: Error): AppErrorBoundaryState {
    return {
      errorMessage: error.message,
    };
  }

  override componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('App error boundary caught:', error, errorInfo);
  }

  override render() {
    if (this.state.errorMessage) {
      return (
        <View
          style={{
            flex: 1,
            backgroundColor: '#fef2f2',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 24,
          }}
        >
          <Text style={{ color: '#991b1b', fontSize: 16, textAlign: 'center' }}>
            {this.state.errorMessage}
          </Text>
        </View>
      );
    }

    return this.props.children;
  }
}

function AppBootstrap() {
  return (
    <View
      style={{
        flex: 1,
        backgroundColor: '#f3f7fb',
      }}
    >
      <AuthProvider>
        <AppNavigator />
      </AuthProvider>
    </View>
  );
}

export default function App() {
  return (
    <AppErrorBoundary>
      <AppBootstrap />
    </AppErrorBoundary>
  );
}
