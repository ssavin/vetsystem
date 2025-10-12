import { View, StyleSheet, ScrollView, RefreshControl } from 'react-native';
import { Text, Card, Button, Avatar, FAB, useTheme, Appbar } from 'react-native-paper';
import { useQuery } from '@tanstack/react-query';
import { getOwnerProfile } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { spacing } from '../theme';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';

export default function HomeScreen({ navigation }: any) {
  const theme = useTheme();
  const { logout } = useAuth();

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['ownerProfile'],
    queryFn: getOwnerProfile,
  });

  const handleLogout = async () => {
    await logout();
  };

  const getInitials = (firstName?: string, lastName?: string) => {
    return `${firstName?.[0] || ''}${lastName?.[0] || ''}`.toUpperCase();
  };

  const getPetAgeText = (birthDate?: string | null) => {
    if (!birthDate) return 'Возраст не указан';
    const today = new Date();
    const birth = new Date(birthDate);
    const years = today.getFullYear() - birth.getFullYear();
    const months = today.getMonth() - birth.getMonth();
    
    if (years === 0) {
      return `${months} мес.`;
    }
    return `${years} г.`;
  };

  return (
    <View style={styles.container}>
      <Appbar.Header>
        <Appbar.Content title="VetSystem" />
        <Appbar.Action icon="logout" onPress={handleLogout} />
      </Appbar.Header>

      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={isLoading} onRefresh={refetch} />
        }
      >
        {/* Owner Info Card */}
        <Card style={styles.card}>
          <Card.Content>
            <View style={styles.ownerHeader}>
              <Avatar.Text
                size={60}
                label={getInitials(data?.owner.firstName, data?.owner.lastName)}
              />
              <View style={styles.ownerInfo}>
                <Text variant="headlineSmall">
                  {data?.owner.firstName} {data?.owner.lastName}
                </Text>
                {data?.owner.phone && (
                  <Text variant="bodyMedium" style={styles.phoneText}>
                    {data.owner.phone}
                  </Text>
                )}
              </View>
            </View>
          </Card.Content>
        </Card>

        {/* Quick Actions */}
        <View style={styles.quickActions}>
          <Button
            mode="contained"
            icon="calendar-plus"
            onPress={() => navigation.navigate('Booking')}
            style={styles.actionButton}
          >
            Записаться на прием
          </Button>
        </View>

        {/* Pets Section */}
        <Text variant="titleLarge" style={styles.sectionTitle}>
          Мои питомцы ({data?.pets.length || 0})
        </Text>

        {data?.pets.map((pet) => (
          <Card
            key={pet.id}
            style={styles.petCard}
            onPress={() => navigation.navigate('PetDetail', { petId: pet.id })}
          >
            <Card.Content>
              <View style={styles.petHeader}>
                {pet.photoUrl ? (
                  <Avatar.Image size={48} source={{ uri: pet.photoUrl }} />
                ) : (
                  <Avatar.Icon size={48} icon="paw" />
                )}
                <View style={styles.petInfo}>
                  <Text variant="titleMedium">{pet.name}</Text>
                  <Text variant="bodyMedium" style={styles.petDetails}>
                    {pet.species} • {pet.breed || 'Порода не указана'}
                  </Text>
                  <Text variant="bodySmall" style={styles.petAge}>
                    {getPetAgeText(pet.birthDate)}
                  </Text>
                </View>
              </View>
            </Card.Content>
          </Card>
        ))}

        {(!data?.pets || data.pets.length === 0) && (
          <Card style={styles.emptyCard}>
            <Card.Content>
              <Text variant="bodyLarge" style={styles.emptyText}>
                У вас пока нет добавленных питомцев
              </Text>
              <Text variant="bodyMedium" style={styles.emptySubtext}>
                Обратитесь в клинику для регистрации вашего питомца
              </Text>
            </Card.Content>
          </Card>
        )}
      </ScrollView>

      <FAB
        icon="view-list"
        label="Все питомцы"
        style={styles.fab}
        onPress={() => navigation.navigate('Pets')}
      />
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
  card: {
    margin: spacing.md,
    marginTop: spacing.lg,
  },
  ownerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  ownerInfo: {
    marginLeft: spacing.md,
    flex: 1,
  },
  phoneText: {
    opacity: 0.7,
    marginTop: spacing.xs,
  },
  quickActions: {
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
  petCard: {
    marginHorizontal: spacing.md,
    marginVertical: spacing.xs,
  },
  petHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  petInfo: {
    marginLeft: spacing.md,
    flex: 1,
  },
  petDetails: {
    opacity: 0.7,
    marginTop: spacing.xs,
  },
  petAge: {
    opacity: 0.5,
    marginTop: spacing.xs,
  },
  emptyCard: {
    margin: spacing.md,
  },
  emptyText: {
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  emptySubtext: {
    textAlign: 'center',
    opacity: 0.6,
  },
  fab: {
    position: 'absolute',
    right: spacing.md,
    bottom: spacing.md,
  },
});
