import { View, StyleSheet, FlatList } from 'react-native';
import { Text, Card, Avatar, Searchbar, Appbar } from 'react-native-paper';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { getOwnerProfile } from '../services/api';
import { spacing } from '../theme';
import { Patient } from '../types';

export default function PetsScreen({ navigation }: any) {
  const [searchQuery, setSearchQuery] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['ownerProfile'],
    queryFn: getOwnerProfile,
  });

  const filteredPets = data?.pets.filter(pet => 
    pet.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    pet.species.toLowerCase().includes(searchQuery.toLowerCase()) ||
    pet.breed?.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

  const renderPetCard = ({ item: pet }: { item: Patient }) => (
    <Card
      style={styles.card}
      onPress={() => navigation.navigate('PetDetail', { petId: pet.id })}
    >
      <Card.Content>
        <View style={styles.cardContent}>
          {pet.photoUrl ? (
            <Avatar.Image size={56} source={{ uri: pet.photoUrl }} />
          ) : (
            <Avatar.Icon size={56} icon="paw" />
          )}
          <View style={styles.petInfo}>
            <Text variant="titleMedium">{pet.name}</Text>
            <Text variant="bodyMedium" style={styles.species}>
              {pet.species} • {pet.breed || 'Порода не указана'}
            </Text>
            <View style={styles.badges}>
              <Text variant="bodySmall" style={styles.badge}>
                {pet.gender === 'male' ? '♂ Самец' : '♀ Самка'}
              </Text>
              {pet.weight && (
                <Text variant="bodySmall" style={styles.badge}>
                  {pet.weight} кг
                </Text>
              )}
            </View>
          </View>
        </View>
      </Card.Content>
    </Card>
  );

  return (
    <View style={styles.container}>
      <Appbar.Header>
        <Appbar.BackAction onPress={() => navigation.goBack()} />
        <Appbar.Content title="Мои питомцы" />
      </Appbar.Header>

      <Searchbar
        placeholder="Поиск по имени, виду, породе"
        onChangeText={setSearchQuery}
        value={searchQuery}
        style={styles.searchBar}
      />

      <FlatList
        data={filteredPets}
        renderItem={renderPetCard}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text variant="bodyLarge" style={styles.emptyText}>
              {searchQuery ? 'Питомцы не найдены' : 'У вас нет питомцев'}
            </Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  searchBar: {
    margin: spacing.md,
  },
  listContent: {
    padding: spacing.sm,
  },
  card: {
    marginHorizontal: spacing.md,
    marginVertical: spacing.sm,
  },
  cardContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  petInfo: {
    marginLeft: spacing.md,
    flex: 1,
  },
  species: {
    opacity: 0.7,
    marginTop: spacing.xs,
  },
  badges: {
    flexDirection: 'row',
    marginTop: spacing.sm,
    gap: spacing.sm,
  },
  badge: {
    opacity: 0.6,
  },
  emptyContainer: {
    padding: spacing.xxl,
    alignItems: 'center',
  },
  emptyText: {
    textAlign: 'center',
    opacity: 0.6,
  },
});
