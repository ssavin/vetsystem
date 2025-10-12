import { useState } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { 
  Text, 
  Card, 
  Button, 
  Appbar, 
  RadioButton, 
  TextInput,
  SegmentedButtons,
  ActivityIndicator,
} from 'react-native-paper';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  getOwnerProfile, 
  getAppointmentSlots, 
  createAppointment,
  getDoctors,
  getBranches 
} from '../services/api';
import { spacing } from '../theme';
import { format, addDays } from 'date-fns';
import { ru } from 'date-fns/locale';

export default function BookingScreen({ route, navigation }: any) {
  const queryClient = useQueryClient();
  const { petId: initialPetId } = route.params || {};

  // Steps
  const [step, setStep] = useState(1);
  const [selectedPetId, setSelectedPetId] = useState<number | null>(initialPetId || null);
  const [selectedDoctorId, setSelectedDoctorId] = useState<number | null>(null);
  const [selectedBranchId, setSelectedBranchId] = useState<number | null>(null);
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [description, setDescription] = useState('');

  const { data: profileData } = useQuery({
    queryKey: ['ownerProfile'],
    queryFn: getOwnerProfile,
  });

  // Fetch doctors from API
  const { data: doctorsData, isLoading: doctorsLoading } = useQuery({
    queryKey: ['doctors'],
    queryFn: getDoctors,
    enabled: step >= 2,
  });

  // Fetch branches from API
  const { data: branchesData, isLoading: branchesLoading } = useQuery({
    queryKey: ['branches'],
    queryFn: getBranches,
    enabled: step >= 3,
  });

  const { data: slotsData, isLoading: slotsLoading } = useQuery({
    queryKey: ['appointmentSlots', selectedDoctorId, selectedDate, selectedBranchId],
    queryFn: () => getAppointmentSlots(selectedDoctorId!, selectedDate, selectedBranchId!),
    enabled: !!selectedDoctorId && !!selectedBranchId && step === 4,
  });

  const createAppointmentMutation = useMutation({
    mutationFn: createAppointment,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ownerProfile'] });
      navigation.navigate('Home');
    },
  });

  const handleNext = () => {
    if (step < 5) setStep(step + 1);
  };

  const handleBack = () => {
    if (step > 1) setStep(step - 1);
    else navigation.goBack();
  };

  const handleSubmit = () => {
    if (selectedPetId && selectedDoctorId && selectedBranchId && selectedTime) {
      createAppointmentMutation.mutate({
        petId: selectedPetId,
        doctorId: selectedDoctorId,
        branchId: selectedBranchId,
        scheduledAt: `${selectedDate} ${selectedTime}`,
        description,
      });
    }
  };

  const getNextDays = () => {
    const days = [];
    for (let i = 0; i < 7; i++) {
      const date = addDays(new Date(), i);
      days.push({
        value: format(date, 'yyyy-MM-dd'),
        label: format(date, 'dd MMM', { locale: ru }),
      });
    }
    return days;
  };

  return (
    <View style={styles.container}>
      <Appbar.Header>
        <Appbar.BackAction onPress={handleBack} />
        <Appbar.Content title="Запись на прием" />
      </Appbar.Header>

      <ScrollView style={styles.scrollView}>
        {/* Progress Indicator */}
        <View style={styles.progress}>
          <Text variant="titleMedium">Шаг {step} из 5</Text>
        </View>

        {/* Step 1: Select Pet */}
        {step === 1 && (
          <Card style={styles.card}>
            <Card.Content>
              <Text variant="titleLarge" style={styles.stepTitle}>
                Выберите питомца
              </Text>
              <RadioButton.Group
                onValueChange={(value) => setSelectedPetId(Number(value))}
                value={selectedPetId?.toString() || ''}
              >
                {profileData?.pets.map((pet) => (
                  <RadioButton.Item
                    key={pet.id}
                    label={`${pet.name} (${pet.species})`}
                    value={pet.id.toString()}
                  />
                ))}
              </RadioButton.Group>
            </Card.Content>
          </Card>
        )}

        {/* Step 2: Select Doctor */}
        {step === 2 && (
          <Card style={styles.card}>
            <Card.Content>
              <Text variant="titleLarge" style={styles.stepTitle}>
                Выберите врача
              </Text>
              {doctorsLoading ? (
                <ActivityIndicator size="large" style={styles.loader} />
              ) : (
                <RadioButton.Group
                  onValueChange={(value) => setSelectedDoctorId(Number(value))}
                  value={selectedDoctorId?.toString() || ''}
                >
                  {doctorsData?.map((doctor) => (
                    <RadioButton.Item
                      key={doctor.id}
                      label={`${doctor.name}${doctor.specialization ? ` - ${doctor.specialization}` : ''}`}
                      value={doctor.id.toString()}
                    />
                  ))}
                </RadioButton.Group>
              )}
            </Card.Content>
          </Card>
        )}

        {/* Step 3: Select Branch */}
        {step === 3 && (
          <Card style={styles.card}>
            <Card.Content>
              <Text variant="titleLarge" style={styles.stepTitle}>
                Выберите филиал
              </Text>
              {branchesLoading ? (
                <ActivityIndicator size="large" style={styles.loader} />
              ) : (
                <RadioButton.Group
                  onValueChange={(value) => setSelectedBranchId(Number(value))}
                  value={selectedBranchId?.toString() || ''}
                >
                  {branchesData?.map((branch) => (
                    <RadioButton.Item
                      key={branch.id}
                      label={`${branch.name}${branch.address ? `\n${branch.address}` : ''}`}
                      value={branch.id.toString()}
                    />
                  ))}
                </RadioButton.Group>
              )}
            </Card.Content>
          </Card>
        )}

        {/* Step 4: Select Date & Time */}
        {step === 4 && (
          <>
            <Card style={styles.card}>
              <Card.Content>
                <Text variant="titleLarge" style={styles.stepTitle}>
                  Выберите дату
                </Text>
                <SegmentedButtons
                  value={selectedDate}
                  onValueChange={setSelectedDate}
                  buttons={getNextDays()}
                />
              </Card.Content>
            </Card>

            <Card style={styles.card}>
              <Card.Content>
                <Text variant="titleMedium" style={styles.stepTitle}>
                  Выберите время
                </Text>
                {slotsLoading ? (
                  <ActivityIndicator size="large" style={styles.loader} />
                ) : (
                  <RadioButton.Group
                    onValueChange={setSelectedTime}
                    value={selectedTime || ''}
                  >
                    {slotsData?.map((slot) => (
                      <RadioButton.Item
                        key={slot.time}
                        label={slot.time}
                        value={slot.time}
                        disabled={!slot.available}
                      />
                    ))}
                  </RadioButton.Group>
                )}
              </Card.Content>
            </Card>
          </>
        )}

        {/* Step 5: Description */}
        {step === 5 && (
          <Card style={styles.card}>
            <Card.Content>
              <Text variant="titleLarge" style={styles.stepTitle}>
                Опишите проблему
              </Text>
              <TextInput
                label="Описание (необязательно)"
                value={description}
                onChangeText={setDescription}
                mode="outlined"
                multiline
                numberOfLines={4}
                style={styles.textArea}
              />

              <View style={styles.summary}>
                <Text variant="titleMedium">Итого:</Text>
                <Text variant="bodyMedium" style={styles.summaryText}>
                  Питомец: {profileData?.pets.find(p => p.id === selectedPetId)?.name}
                </Text>
                <Text variant="bodyMedium" style={styles.summaryText}>
                  Врач: {doctorsData?.find(d => d.id === selectedDoctorId)?.name}
                </Text>
                <Text variant="bodyMedium" style={styles.summaryText}>
                  Филиал: {branchesData?.find(b => b.id === selectedBranchId)?.name}
                </Text>
                <Text variant="bodyMedium" style={styles.summaryText}>
                  Дата: {format(new Date(selectedDate), 'dd MMMM yyyy', { locale: ru })}
                </Text>
                <Text variant="bodyMedium" style={styles.summaryText}>
                  Время: {selectedTime}
                </Text>
              </View>
            </Card.Content>
          </Card>
        )}

        {/* Navigation Buttons */}
        <View style={styles.buttons}>
          {step < 5 ? (
            <Button
              mode="contained"
              onPress={handleNext}
              disabled={
                (step === 1 && !selectedPetId) ||
                (step === 2 && !selectedDoctorId) ||
                (step === 3 && !selectedBranchId) ||
                (step === 4 && !selectedTime)
              }
              style={styles.button}
            >
              Далее
            </Button>
          ) : (
            <Button
              mode="contained"
              onPress={handleSubmit}
              loading={createAppointmentMutation.isPending}
              style={styles.button}
            >
              Записаться
            </Button>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  progress: {
    padding: spacing.md,
    alignItems: 'center',
  },
  card: {
    margin: spacing.md,
  },
  stepTitle: {
    marginBottom: spacing.md,
  },
  textArea: {
    marginBottom: spacing.md,
  },
  summary: {
    marginTop: spacing.lg,
    padding: spacing.md,
    backgroundColor: 'rgba(0,0,0,0.05)',
    borderRadius: spacing.sm,
  },
  summaryText: {
    marginTop: spacing.xs,
  },
  loader: {
    marginVertical: spacing.xl,
  },
  buttons: {
    padding: spacing.md,
  },
  button: {
    marginVertical: spacing.xs,
  },
});
