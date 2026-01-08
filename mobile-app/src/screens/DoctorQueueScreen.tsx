import { useState, useCallback } from 'react';
import { View, StyleSheet, FlatList, RefreshControl } from 'react-native';
import { Text, Card, Button, useTheme, Surface, Chip, IconButton, Divider } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useDoctorAuth } from '../contexts/DoctorAuthContext';
import { api } from '../services/api';
import { QueueEntry } from '../types';

export default function DoctorQueueScreen({ navigation }: any) {
  const theme = useTheme();
  const { user } = useDoctorAuth();
  const queryClient = useQueryClient();
  const [refreshing, setRefreshing] = useState(false);

  const { data: queueEntries, refetch, isLoading } = useQuery<QueueEntry[]>({
    queryKey: ['doctorQueue'],
    queryFn: async () => {
      const response = await api.get('/api/queue');
      return response.data.filter((entry: QueueEntry) => 
        entry.status === 'waiting' || entry.status === 'called'
      );
    },
  });

  const callPatientMutation = useMutation({
    mutationFn: async (entryId: number) => {
      const response = await api.post(`/api/queue/${entryId}/call`, {
        doctorId: user?.id
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['doctorQueue'] });
    },
  });

  const startExamMutation = useMutation({
    mutationFn: async (entryId: number) => {
      const response = await api.patch(`/api/queue/${entryId}`, {
        status: 'in_progress'
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['doctorQueue'] });
    },
  });

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'emergency': return theme.colors.error;
      case 'urgent': return theme.colors.tertiary;
      default: return theme.colors.outline;
    }
  };

  const getPriorityText = (priority: string) => {
    switch (priority) {
      case 'emergency': return 'Экстренный';
      case 'urgent': return 'Срочный';
      default: return 'Обычный';
    }
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
  };

  const handleCallPatient = (entry: QueueEntry) => {
    callPatientMutation.mutate(entry.id);
  };

  const handleStartExam = (entry: QueueEntry) => {
    startExamMutation.mutate(entry.id);
    navigation.navigate('PatientExam', { queueEntry: entry });
  };

  const renderQueueEntry = ({ item }: { item: QueueEntry }) => (
    <Card 
      style={[
        styles.queueCard, 
        item.status === 'called' && { borderLeftColor: theme.colors.primary, borderLeftWidth: 4 }
      ]} 
      mode="elevated"
    >
      <Card.Content>
        <View style={styles.queueHeader}>
          <View style={styles.ticketContainer}>
            <Text variant="headlineMedium" style={{ color: theme.colors.primary }}>
              #{item.ticketNumber}
            </Text>
            <Text variant="bodySmall" style={styles.time}>
              {formatTime(item.createdAt)}
            </Text>
          </View>
          
          {item.priority !== 'normal' && (
            <Chip 
              compact 
              style={{ backgroundColor: getPriorityColor(item.priority) + '20' }}
              textStyle={{ color: getPriorityColor(item.priority) }}
            >
              {getPriorityText(item.priority)}
            </Chip>
          )}
        </View>
        
        <Divider style={styles.divider} />
        
        <Text variant="titleMedium" style={styles.patientName}>
          {item.patient?.name || 'Пациент'}
        </Text>
        
        {item.patient?.species && (
          <Text variant="bodyMedium" style={styles.species}>
            {item.patient.species}{item.patient.breed ? `, ${item.patient.breed}` : ''}
          </Text>
        )}
        
        {item.owner && (
          <Text variant="bodySmall" style={styles.owner}>
            Владелец: {item.owner.lastName} {item.owner.firstName}
            {item.owner.phone && ` | ${item.owner.phone}`}
          </Text>
        )}
      </Card.Content>
      
      <Card.Actions>
        {item.status === 'waiting' ? (
          <Button 
            mode="contained" 
            onPress={() => handleCallPatient(item)}
            loading={callPatientMutation.isPending}
          >
            Вызвать
          </Button>
        ) : (
          <Button 
            mode="contained" 
            onPress={() => handleStartExam(item)}
            loading={startExamMutation.isPending}
          >
            Начать приём
          </Button>
        )}
      </Card.Actions>
    </Card>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <Surface style={styles.header} elevation={1}>
        <View style={styles.headerContent}>
          <IconButton icon="arrow-left" onPress={() => navigation.goBack()} />
          <Text variant="titleLarge">Очередь</Text>
          <IconButton icon="refresh" onPress={onRefresh} />
        </View>
      </Surface>

      <View style={styles.statsRow}>
        <Surface style={styles.statCard} elevation={1}>
          <Text variant="headlineMedium" style={{ color: theme.colors.primary }}>
            {queueEntries?.filter(e => e.status === 'waiting').length || 0}
          </Text>
          <Text variant="bodySmall">Ожидают</Text>
        </Surface>
        
        <Surface style={styles.statCard} elevation={1}>
          <Text variant="headlineMedium" style={{ color: theme.colors.tertiary }}>
            {queueEntries?.filter(e => e.status === 'called').length || 0}
          </Text>
          <Text variant="bodySmall">Вызваны</Text>
        </Surface>
      </View>

      <FlatList
        data={queueEntries}
        renderItem={renderQueueEntry}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text variant="bodyLarge" style={styles.emptyText}>
              {isLoading ? 'Загрузка...' : 'Очередь пуста'}
            </Text>
          </View>
        }
      />
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
  statsRow: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
  },
  statCard: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  list: {
    padding: 16,
    paddingTop: 0,
  },
  queueCard: {
    marginBottom: 12,
  },
  queueHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  ticketContainer: {
    alignItems: 'flex-start',
  },
  time: {
    opacity: 0.6,
    marginTop: 2,
  },
  divider: {
    marginVertical: 12,
  },
  patientName: {
    fontWeight: '500',
  },
  species: {
    opacity: 0.7,
    marginTop: 4,
  },
  owner: {
    opacity: 0.6,
    marginTop: 4,
  },
  emptyContainer: {
    padding: 32,
    alignItems: 'center',
  },
  emptyText: {
    opacity: 0.6,
  },
});
