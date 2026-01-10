import { useState } from 'react';
import { View, StyleSheet, KeyboardAvoidingView, Platform } from 'react-native';
import { Text, TextInput, Button, Surface, HelperText } from 'react-native-paper';
import { useMutation } from '@tanstack/react-query';
import { sendSmsCode, verifySmsCode } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { spacing } from '../theme';
import RegistrationScreen from './RegistrationScreen';

export default function AuthScreen() {
  const { setIsAuthenticated } = useAuth();
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [codeSent, setCodeSent] = useState(false);
  const [needsRegistration, setNeedsRegistration] = useState(false);
  const [verifiedCode, setVerifiedCode] = useState('');
  const [error, setError] = useState('');

  const sendCodeMutation = useMutation({
    mutationFn: sendSmsCode,
    onSuccess: (data) => {
      if (data.success) {
        setCodeSent(true);
      }
    },
    onError: (err: any) => {
      setError(err.response?.data?.error || 'Ошибка отправки кода');
    },
  });

  const verifyCodeMutation = useMutation({
    mutationFn: () => verifySmsCode(phone, code),
    onSuccess: (data) => {
      if (data.needsRegistration) {
        setVerifiedCode(data.verifiedCode || code);
        setNeedsRegistration(true);
      } else if (data.token) {
        setIsAuthenticated(true);
      }
    },
    onError: (err: any) => {
      setError(err.response?.data?.error || 'Неверный код');
    },
  });

  const handleSendCode = () => {
    setError('');
    if (phone.length >= 10) {
      sendCodeMutation.mutate(phone);
    }
  };

  const handleVerifyCode = () => {
    setError('');
    if (code.length === 6) {
      verifyCodeMutation.mutate();
    }
  };

  const handleBackFromRegistration = () => {
    setNeedsRegistration(false);
    setCodeSent(false);
    setCode('');
    setError('');
  };

  if (needsRegistration) {
    return (
      <RegistrationScreen 
        phone={phone}
        verifiedCode={verifiedCode}
        onBack={handleBackFromRegistration} 
      />
    );
  }

  return (
    <KeyboardAvoidingView 
      style={styles.container} 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <Surface style={styles.surface} elevation={2}>
        <Text variant="headlineMedium" style={styles.title}>
          VetSystem Mobile
        </Text>
        <Text variant="bodyMedium" style={styles.subtitle}>
          Войдите или зарегистрируйтесь
        </Text>

        {!codeSent ? (
          <>
            <TextInput
              label="Номер телефона"
              value={phone}
              onChangeText={(text) => {
                setPhone(text);
                setError('');
              }}
              keyboardType="phone-pad"
              mode="outlined"
              style={styles.input}
              placeholder="+7 (XXX) XXX-XX-XX"
            />
            
            {error ? (
              <HelperText type="error" visible={true}>
                {error}
              </HelperText>
            ) : null}
            
            <Button
              mode="contained"
              onPress={handleSendCode}
              loading={sendCodeMutation.isPending}
              disabled={phone.length < 10}
              style={styles.button}
            >
              Получить код
            </Button>
          </>
        ) : (
          <>
            <Text variant="bodyMedium" style={styles.infoText}>
              Код отправлен на номер {phone}
            </Text>
            <TextInput
              label="Код из СМС"
              value={code}
              onChangeText={(text) => {
                setCode(text);
                setError('');
              }}
              keyboardType="number-pad"
              mode="outlined"
              style={styles.input}
              maxLength={6}
            />
            
            {error ? (
              <HelperText type="error" visible={true}>
                {error}
              </HelperText>
            ) : null}
            
            <Button
              mode="contained"
              onPress={handleVerifyCode}
              loading={verifyCodeMutation.isPending}
              disabled={code.length !== 6}
              style={styles.button}
            >
              Войти
            </Button>
            <Button
              mode="text"
              onPress={() => {
                setCodeSent(false);
                setCode('');
                setError('');
              }}
              style={styles.backButton}
            >
              Изменить номер
            </Button>
          </>
        )}
      </Surface>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
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
    marginBottom: spacing.xl,
    opacity: 0.7,
  },
  infoText: {
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  input: {
    marginBottom: spacing.md,
  },
  button: {
    marginTop: spacing.sm,
  },
  backButton: {
    marginTop: spacing.md,
  },
});
