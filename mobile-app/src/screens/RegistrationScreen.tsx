import { useState } from 'react';
import { View, StyleSheet, ScrollView, KeyboardAvoidingView, Platform, Linking } from 'react-native';
import { Text, TextInput, Button, Surface, Checkbox, HelperText } from 'react-native-paper';
import { useMutation } from '@tanstack/react-query';
import { registerOwner } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { spacing } from '../theme';

interface RegistrationScreenProps {
  phone: string;
  verifiedCode: string;
  onBack: () => void;
}

export default function RegistrationScreen({ phone, verifiedCode, onBack }: RegistrationScreenProps) {
  const { setIsAuthenticated } = useAuth();
  
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [petName, setPetName] = useState('');
  const [petBreed, setPetBreed] = useState('');
  const [petSpecies, setPetSpecies] = useState('Собака');
  const [personalDataConsent, setPersonalDataConsent] = useState(false);
  const [error, setError] = useState('');

  const registerMutation = useMutation({
    mutationFn: () => registerOwner({
      phone,
      code: verifiedCode,
      name,
      address,
      petName,
      petBreed,
      petSpecies,
      personalDataConsent,
    }),
    onSuccess: (data) => {
      if (data.token) {
        setIsAuthenticated(true);
      }
    },
    onError: (err: any) => {
      setError(err.response?.data?.error || 'Ошибка регистрации');
    },
  });

  const handleRegister = () => {
    setError('');
    
    if (!name.trim()) {
      setError('Введите ФИО');
      return;
    }
    if (!address.trim()) {
      setError('Введите адрес');
      return;
    }
    if (!petName.trim()) {
      setError('Введите кличку питомца');
      return;
    }
    if (!petBreed.trim()) {
      setError('Введите породу питомца');
      return;
    }
    if (!personalDataConsent) {
      setError('Необходимо согласие на обработку персональных данных');
      return;
    }
    
    registerMutation.mutate();
  };

  const openPrivacyPolicy = () => {
    Linking.openURL('https://vetsystemai.ru/privacy');
  };

  return (
    <KeyboardAvoidingView 
      style={styles.container} 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <Surface style={styles.surface} elevation={2}>
          <Text variant="headlineMedium" style={styles.title}>
            Регистрация
          </Text>
          <Text variant="bodyMedium" style={styles.subtitle}>
            Заполните данные для создания аккаунта
          </Text>

          <Text variant="bodySmall" style={styles.phoneInfo}>
            Номер телефона: {phone}
          </Text>

          <TextInput
            label="ФИО *"
            value={name}
            onChangeText={setName}
            mode="outlined"
            style={styles.input}
            placeholder="Иванов Иван Иванович"
          />

          <TextInput
            label="Адрес *"
            value={address}
            onChangeText={setAddress}
            mode="outlined"
            style={styles.input}
            placeholder="г. Москва, ул. Примерная, д. 1"
            multiline
          />

          <Text variant="titleMedium" style={styles.sectionTitle}>
            Данные питомца
          </Text>

          <TextInput
            label="Кличка питомца *"
            value={petName}
            onChangeText={setPetName}
            mode="outlined"
            style={styles.input}
            placeholder="Барсик"
          />

          <TextInput
            label="Вид животного"
            value={petSpecies}
            onChangeText={setPetSpecies}
            mode="outlined"
            style={styles.input}
            placeholder="Собака, Кошка, и т.д."
          />

          <TextInput
            label="Порода *"
            value={petBreed}
            onChangeText={setPetBreed}
            mode="outlined"
            style={styles.input}
            placeholder="Лабрадор"
          />

          <View style={styles.checkboxContainer}>
            <Checkbox
              status={personalDataConsent ? 'checked' : 'unchecked'}
              onPress={() => setPersonalDataConsent(!personalDataConsent)}
            />
            <Text style={styles.checkboxLabel} onPress={() => setPersonalDataConsent(!personalDataConsent)}>
              Я согласен на обработку{' '}
              <Text style={styles.link} onPress={openPrivacyPolicy}>
                персональных данных
              </Text>
            </Text>
          </View>

          {error ? (
            <HelperText type="error" visible={true} style={styles.error}>
              {error}
            </HelperText>
          ) : null}

          <Button
            mode="contained"
            onPress={handleRegister}
            loading={registerMutation.isPending}
            disabled={registerMutation.isPending}
            style={styles.button}
          >
            Зарегистрироваться
          </Button>

          <Button
            mode="text"
            onPress={onBack}
            style={styles.backButton}
          >
            Назад
          </Button>
        </Surface>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: spacing.lg,
  },
  surface: {
    padding: spacing.xl,
    borderRadius: spacing.md,
  },
  title: {
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  subtitle: {
    textAlign: 'center',
    marginBottom: spacing.lg,
    opacity: 0.7,
  },
  phoneInfo: {
    textAlign: 'center',
    marginBottom: spacing.lg,
    fontWeight: 'bold',
  },
  sectionTitle: {
    marginTop: spacing.lg,
    marginBottom: spacing.md,
  },
  input: {
    marginBottom: spacing.md,
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: spacing.md,
  },
  checkboxLabel: {
    flex: 1,
    marginLeft: spacing.sm,
  },
  link: {
    textDecorationLine: 'underline',
    color: '#1976D2',
  },
  error: {
    marginBottom: spacing.sm,
  },
  button: {
    marginTop: spacing.md,
  },
  backButton: {
    marginTop: spacing.md,
  },
});
