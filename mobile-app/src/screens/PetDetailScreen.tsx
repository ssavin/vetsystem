import { View, StyleSheet, ScrollView } from 'react-native';
import { Text, Card, Avatar, Button, Divider, Appbar, ActivityIndicator } from 'react-native-paper';
import { useQuery } from '@tanstack/react-query';
import { getOwnerProfile, getPetMedicalHistory } from '../services/api';
import { spacing } from '../theme';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';

export default function PetDetailScreen({ route, navigation }: any) {
  const { petId } = route.params;

  const { data: profileData } = useQuery({
    queryKey: ['ownerProfile'],
    queryFn: getOwnerProfile,
  });

  const { data: historyData, isLoading: historyLoading } = useQuery({
    queryKey: ['petHistory', petId],
    queryFn: () => getPetMedicalHistory(petId),
  });

  const pet = profileData?.pets.find(p => p.id === petId);

  if (!pet) {
    return (
      <View style={styles.container}>
        <Appbar.Header>
          <Appbar.BackAction onPress={() => navigation.goBack()} />
          <Appbar.Content title="Питомец" />
        </Appbar.Header>
        <View style={styles.centered}>
          <Text>Питомец не найден</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Appbar.Header>
        <Appbar.BackAction onPress={() => navigation.goBack()} />
        <Appbar.Content title={pet.name} />
      </Appbar.Header>

      <ScrollView style={styles.scrollView}>
        {/* Pet Info Card */}
        <Card style={styles.card}>
          <Card.Content>
            <View style={styles.petHeader}>
              {pet.photoUrl ? (
                <Avatar.Image size={80} source={{ uri: pet.photoUrl }} />
              ) : (
                <Avatar.Icon size={80} icon="paw" />
              )}
              <View style={styles.petBasicInfo}>
                <Text variant="headlineSmall">{pet.name}</Text>
                <Text variant="bodyLarge" style={styles.species}>
                  {pet.species}
                </Text>
                {pet.breed && (
                  <Text variant="bodyMedium" style={styles.breed}>
                    {pet.breed}
                  </Text>
                )}
              </View>
            </View>

            <Divider style={styles.divider} />

            {/* Details Grid */}
            <View style={styles.detailsGrid}>
              <View style={styles.detailItem}>
                <Text variant="labelSmall" style={styles.label}>Пол</Text>
                <Text variant="bodyMedium">
                  {pet.gender === 'male' ? 'Самец' : 'Самка'}
                </Text>
              </View>

              {pet.birthDate && (
                <View style={styles.detailItem}>
                  <Text variant="labelSmall" style={styles.label}>Дата рождения</Text>
                  <Text variant="bodyMedium">
                    {format(new Date(pet.birthDate), 'dd.MM.yyyy', { locale: ru })}
                  </Text>
                </View>
              )}

              {pet.weight && (
                <View style={styles.detailItem}>
                  <Text variant="labelSmall" style={styles.label}>Вес</Text>
                  <Text variant="bodyMedium">{pet.weight} кг</Text>
                </View>
              )}

              {pet.color && (
                <View style={styles.detailItem}>
                  <Text variant="labelSmall" style={styles.label}>Окрас</Text>
                  <Text variant="bodyMedium">{pet.color}</Text>
                </View>
              )}

              {pet.microchipNumber && (
                <View style={styles.detailItem}>
                  <Text variant="labelSmall" style={styles.label}>Микрочип</Text>
                  <Text variant="bodyMedium">{pet.microchipNumber}</Text>
                </View>
              )}
            </View>

            {pet.specialNotes && (
              <>
                <Divider style={styles.divider} />
                <View>
                  <Text variant="labelSmall" style={styles.label}>Особые отметки</Text>
                  <Text variant="bodyMedium">{pet.specialNotes}</Text>
                </View>
              </>
            )}
          </Card.Content>
        </Card>

        {/* Quick Actions */}
        <View style={styles.actions}>
          <Button
            mode="contained"
            icon="calendar-plus"
            onPress={() => navigation.navigate('Booking', { petId })}
            style={styles.actionButton}
          >
            Записаться на прием
          </Button>
        </View>

        {/* Medical History */}
        <Text variant="titleLarge" style={styles.sectionTitle}>
          История болезни
        </Text>

        {historyLoading ? (
          <View style={styles.centered}>
            <ActivityIndicator size="large" />
          </View>
        ) : historyData && historyData.length > 0 ? (
          historyData.map((record) => (
            <Card key={record.id} style={styles.historyCard}>
              <Card.Content>
                <Text variant="titleMedium">
                  {format(new Date(record.visitDate), 'dd MMMM yyyy', { locale: ru })}
                </Text>
                {record.doctor && (
                  <Text variant="bodyMedium" style={styles.doctor}>
                    Врач: {record.doctor.lastName} {record.doctor.firstName}
                    {record.doctor.specialization && ` • ${record.doctor.specialization}`}
                  </Text>
                )}
                {record.diagnosis && (
                  <View style={styles.recordSection}>
                    <Text variant="labelSmall" style={styles.label}>Диагноз</Text>
                    <Text variant="bodyMedium">{record.diagnosis}</Text>
                  </View>
                )}
                {record.treatment && (
                  <View style={styles.recordSection}>
                    <Text variant="labelSmall" style={styles.label}>Лечение</Text>
                    <Text variant="bodyMedium">{record.treatment}</Text>
                  </View>
                )}
                {record.notes && (
                  <View style={styles.recordSection}>
                    <Text variant="labelSmall" style={styles.label}>Примечания</Text>
                    <Text variant="bodyMedium">{record.notes}</Text>
                  </View>
                )}
              </Card.Content>
            </Card>
          ))
        ) : (
          <Card style={styles.emptyCard}>
            <Card.Content>
              <Text variant="bodyLarge" style={styles.emptyText}>
                История посещений пуста
              </Text>
            </Card.Content>
          </Card>
        )}
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
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  card: {
    margin: spacing.md,
    marginTop: spacing.lg,
  },
  petHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  petBasicInfo: {
    marginLeft: spacing.md,
    flex: 1,
  },
  species: {
    marginTop: spacing.xs,
    opacity: 0.7,
  },
  breed: {
    marginTop: spacing.xs,
    opacity: 0.6,
  },
  divider: {
    marginVertical: spacing.md,
  },
  detailsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  detailItem: {
    width: '45%',
  },
  label: {
    opacity: 0.6,
    marginBottom: spacing.xs,
  },
  actions: {
    padding: spacing.md,
  },
  actionButton: {
    marginVertical: spacing.xs,
  },
  sectionTitle: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.lg,
    paddingBottom: spacing.sm,
  },
  historyCard: {
    marginHorizontal: spacing.md,
    marginVertical: spacing.sm,
  },
  doctor: {
    marginTop: spacing.xs,
    opacity: 0.7,
  },
  recordSection: {
    marginTop: spacing.md,
  },
  emptyCard: {
    margin: spacing.md,
  },
  emptyText: {
    textAlign: 'center',
    opacity: 0.6,
  },
});
