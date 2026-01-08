import { useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { PaperProvider } from 'react-native-paper';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useColorScheme, View, StyleSheet } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Button, Text, Surface } from 'react-native-paper';

import { lightTheme, darkTheme } from './src/theme';
import { AuthProvider, useAuth } from './src/contexts/AuthContext';
import { DoctorAuthProvider, useDoctorAuth } from './src/contexts/DoctorAuthContext';

// Owner Screens
import AuthScreen from './src/screens/AuthScreen';
import HomeScreen from './src/screens/HomeScreen';
import PetsScreen from './src/screens/PetsScreen';
import PetDetailScreen from './src/screens/PetDetailScreen';
import BookingScreen from './src/screens/BookingScreen';

// Doctor Screens
import DoctorAuthScreen from './src/screens/DoctorAuthScreen';
import DoctorHomeScreen from './src/screens/DoctorHomeScreen';
import DoctorQueueScreen from './src/screens/DoctorQueueScreen';
import PatientExamScreen from './src/screens/PatientExamScreen';

const Stack = createNativeStackNavigator();
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

type AppMode = 'select' | 'owner' | 'doctor';

function ModeSelector({ onSelectMode }: { onSelectMode: (mode: AppMode) => void }) {
  return (
    <View style={styles.modeSelector}>
      <Surface style={styles.modeCard} elevation={2}>
        <Text variant="headlineMedium" style={styles.modeTitle}>VetSystem</Text>
        <Text variant="bodyLarge" style={styles.modeSubtitle}>Выберите режим входа</Text>
        
        <View style={styles.modeButtons}>
          <Button
            mode="contained"
            onPress={() => onSelectMode('owner')}
            style={styles.modeButton}
            contentStyle={styles.modeButtonContent}
            icon="paw"
          >
            Владелец животного
          </Button>
          
          <Button
            mode="outlined"
            onPress={() => onSelectMode('doctor')}
            style={styles.modeButton}
            contentStyle={styles.modeButtonContent}
            icon="stethoscope"
          >
            Врач клиники
          </Button>
        </View>
      </Surface>
    </View>
  );
}

function OwnerNavigator({ onBack }: { onBack: () => void }) {
  const { isAuthenticated } = useAuth();

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {!isAuthenticated ? (
        <Stack.Screen name="Auth">
          {(props) => <AuthScreen {...props} onBack={onBack} />}
        </Stack.Screen>
      ) : (
        <>
          <Stack.Screen name="Home" component={HomeScreen} />
          <Stack.Screen name="Pets" component={PetsScreen} />
          <Stack.Screen name="PetDetail" component={PetDetailScreen} />
          <Stack.Screen name="Booking" component={BookingScreen} />
        </>
      )}
    </Stack.Navigator>
  );
}

function DoctorNavigator({ onBack }: { onBack: () => void }) {
  const { isAuthenticated, isLoading } = useDoctorAuth();

  if (isLoading) {
    return null;
  }

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {!isAuthenticated ? (
        <Stack.Screen name="DoctorAuth">
          {(props) => <DoctorAuthScreenWithBack {...props} onBack={onBack} />}
        </Stack.Screen>
      ) : (
        <>
          <Stack.Screen name="DoctorHome" component={DoctorHomeScreen} />
          <Stack.Screen name="Queue" component={DoctorQueueScreen} />
          <Stack.Screen name="PatientExam" component={PatientExamScreen} />
        </>
      )}
    </Stack.Navigator>
  );
}

function DoctorAuthScreenWithBack({ onBack }: { onBack: () => void }) {
  return (
    <View style={{ flex: 1 }}>
      <DoctorAuthScreen />
      <View style={styles.backButtonContainer}>
        <Button mode="text" onPress={onBack} icon="arrow-left">
          Назад к выбору
        </Button>
      </View>
    </View>
  );
}

function AppContent() {
  const [mode, setMode] = useState<AppMode>('select');

  const handleBack = () => {
    setMode('select');
  };

  if (mode === 'select') {
    return <ModeSelector onSelectMode={setMode} />;
  }

  if (mode === 'owner') {
    return (
      <AuthProvider>
        <NavigationContainer>
          <OwnerNavigator onBack={handleBack} />
        </NavigationContainer>
      </AuthProvider>
    );
  }

  return (
    <DoctorAuthProvider>
      <NavigationContainer>
        <DoctorNavigator onBack={handleBack} />
      </NavigationContainer>
    </DoctorAuthProvider>
  );
}

export default function App() {
  const colorScheme = useColorScheme();
  const theme = colorScheme === 'dark' ? darkTheme : lightTheme;

  return (
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
        <PaperProvider theme={theme}>
          <AppContent />
          <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />
        </PaperProvider>
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  modeSelector: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modeCard: {
    padding: 32,
    borderRadius: 16,
    width: '100%',
    maxWidth: 400,
    alignItems: 'center',
  },
  modeTitle: {
    fontWeight: 'bold',
    marginBottom: 8,
  },
  modeSubtitle: {
    opacity: 0.7,
    marginBottom: 32,
  },
  modeButtons: {
    width: '100%',
    gap: 16,
  },
  modeButton: {
    width: '100%',
  },
  modeButtonContent: {
    paddingVertical: 8,
  },
  backButtonContainer: {
    position: 'absolute',
    top: 50,
    left: 10,
  },
});
