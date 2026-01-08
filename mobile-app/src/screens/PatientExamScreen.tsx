import { useState } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Text, TextInput, Button, useTheme, Surface, Chip, Divider, SegmentedButtons } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useDoctorAuth } from '../contexts/DoctorAuthContext';
import { api } from '../services/api';

export default function PatientExamScreen({ navigation, route }: any) {
  const theme = useTheme();
  const { user } = useDoctorAuth();
  const queryClient = useQueryClient();
  
  const appointment = route.params?.appointment;
  const queueEntry = route.params?.queueEntry;
  
  const patient = appointment?.patient || queueEntry?.patient;
  const owner = appointment?.owner || queueEntry?.owner;

  const [complaints, setComplaints] = useState('');
  const [examination, setExamination] = useState('');
  const [diagnosis, setDiagnosis] = useState('');
  const [treatment, setTreatment] = useState('');
  const [notes, setNotes] = useState('');
  const [weight, setWeight] = useState(patient?.weight?.toString() || '');
  const [temperature, setTemperature] = useState('');

  const saveMutation = useMutation({
    mutationFn: async () => {
      const recordData = {
        patientId: patient?.id,
        doctorId: user?.id,
        visitDate: new Date().toISOString(),
        complaints,
        examination,
        diagnosis,
        treatment,
        notes,
        weight: weight ? parseFloat(weight) : null,
        temperature: temperature ? parseFloat(temperature) : null,
      };
      
      const response = await api.post('/api/medical-records', recordData);
      
      if (queueEntry) {
        await api.patch(`/api/queue/${queueEntry.id}`, { status: 'completed' });
      }
      
      if (appointment) {
        await api.patch(`/api/appointments/${appointment.id}`, { status: 'completed' });
      }
      
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['doctorQueue'] });
      queryClient.invalidateQueries({ queryKey: ['doctorAppointments'] });
      navigation.goBack();
    },
  });

  const handleSave = () => {
    saveMutation.mutate();
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <Surface style={styles.header} elevation={1}>
        <View style={styles.headerContent}>
          <Button icon="arrow-left" onPress={() => navigation.goBack()}>
            Назад
          </Button>
          <Text variant="titleMedium">Осмотр пациента</Text>
          <View style={{ width: 80 }} />
        </View>
      </Surface>

      <ScrollView style={styles.content} contentContainerStyle={styles.scrollContent}>
        <Surface style={styles.patientCard} elevation={1}>
          <Text variant="titleLarge">{patient?.name || 'Пациент'}</Text>
          <Text variant="bodyMedium" style={styles.patientInfo}>
            {patient?.species}{patient?.breed ? `, ${patient.breed}` : ''}
          </Text>
          {owner && (
            <Text variant="bodySmall" style={styles.ownerInfo}>
              Владелец: {owner.lastName} {owner.firstName}
            </Text>
          )}
        </Surface>

        <View style={styles.vitalsRow}>
          <TextInput
            label="Вес (кг)"
            value={weight}
            onChangeText={setWeight}
            mode="outlined"
            keyboardType="decimal-pad"
            style={styles.vitalInput}
          />
          <TextInput
            label="Температура"
            value={temperature}
            onChangeText={setTemperature}
            mode="outlined"
            keyboardType="decimal-pad"
            style={styles.vitalInput}
          />
        </View>

        <TextInput
          label="Жалобы"
          value={complaints}
          onChangeText={setComplaints}
          mode="outlined"
          multiline
          numberOfLines={3}
          style={styles.input}
        />

        <TextInput
          label="Данные осмотра"
          value={examination}
          onChangeText={setExamination}
          mode="outlined"
          multiline
          numberOfLines={4}
          style={styles.input}
        />

        <TextInput
          label="Диагноз"
          value={diagnosis}
          onChangeText={setDiagnosis}
          mode="outlined"
          multiline
          numberOfLines={2}
          style={styles.input}
        />

        <TextInput
          label="Лечение / Назначения"
          value={treatment}
          onChangeText={setTreatment}
          mode="outlined"
          multiline
          numberOfLines={4}
          style={styles.input}
        />

        <TextInput
          label="Примечания"
          value={notes}
          onChangeText={setNotes}
          mode="outlined"
          multiline
          numberOfLines={2}
          style={styles.input}
        />

        <View style={styles.actions}>
          <Button
            mode="outlined"
            onPress={() => navigation.goBack()}
            style={styles.actionButton}
          >
            Отмена
          </Button>
          <Button
            mode="contained"
            onPress={handleSave}
            loading={saveMutation.isPending}
            style={styles.actionButton}
          >
            Сохранить и завершить
          </Button>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    padding: 8,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 32,
  },
  patientCard: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  patientInfo: {
    opacity: 0.7,
    marginTop: 4,
  },
  ownerInfo: {
    opacity: 0.6,
    marginTop: 8,
  },
  vitalsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  vitalInput: {
    flex: 1,
  },
  input: {
    marginBottom: 16,
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
  },
  actionButton: {
    flex: 1,
  },
});
