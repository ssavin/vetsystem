import { useState, useCallback } from 'react';
import { View, StyleSheet, FlatList, RefreshControl } from 'react-native';
import { Text, Card, Button, useTheme, Surface, Chip, IconButton, FAB } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { useDoctorAuth } from '../contexts/DoctorAuthContext';
import { api } from '../services/api';
import { TodayAppointment } from '../types';

export default function DoctorHomeScreen({ navigation }: any) {
  const theme = useTheme();
  const { user, logout } = useDoctorAuth();
  const [refreshing, setRefreshing] = useState(false);

  const { data: appointments, refetch, isLoading } = useQuery<TodayAppointment[]>({
    queryKey: ['doctorAppointments', 'today'],
    queryFn: async () => {
      const today = new Date().toISOString().split('T')[0];
      const response = await api.get(`/api/appointments?date=${today}&doctorId=${user?.id}`);
      return response.data;
    },
    enabled: !!user?.id,
  });

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return theme.colors.primary;
      case 'in-progress': return theme.colors.tertiary;
      case 'cancelled': return theme.colors.error;
      default: return theme.colors.outline;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'scheduled': return 'Запланирован';
      case 'in-progress': return 'В процессе';
      case 'completed': return 'Завершён';
      case 'cancelled': return 'Отменён';
      default: return status;
    }
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
  };

  const renderAppointment = ({ item }: { item: TodayAppointment }) => (
    <Card style={styles.appointmentCard} mode="elevated">
      <Card.Content>
        <View style={styles.appointmentHeader}>
          <Text variant="titleMedium" style={styles.time}>
            {formatTime(item.scheduledAt)}
          </Text>
          <Chip 
            compact 
            style={{ backgroundColor: getStatusColor(item.status) + '20' }}
            textStyle={{ color: getStatusColor(item.status) }}
          >
            {getStatusText(item.status)}
          </Chip>
        </View>
        
        <Text variant="bodyLarge" style={styles.patientName}>
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
          </Text>
        )}
        
        {item.description && (
          <Text variant="bodySmall" style={styles.description} numberOfLines={2}>
            {item.description}
          </Text>
        )}
      </Card.Content>
      
      <Card.Actions>
        <Button 
          mode="text" 
          onPress={() => navigation.navigate('PatientExam', { appointment: item })}
        >
          Начать приём
        </Button>
      </Card.Actions>
    </Card>
  );

  const todayDate = new Date().toLocaleDateString('ru-RU', {
    weekday: 'long',
    day: 'numeric',
    month: 'long'
  });

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <Surface style={styles.header} elevation={1}>
        <View style={styles.headerContent}>
          <View>
            <Text variant="titleLarge">
              {user?.lastName} {user?.firstName?.charAt(0)}.
            </Text>
            <Text variant="bodyMedium" style={styles.date}>
              {todayDate}
            </Text>
          </View>
          <IconButton icon="logout" onPress={logout} />
        </View>
      </Surface>

      <View style={styles.statsRow}>
        <Surface style={styles.statCard} elevation={1}>
          <Text variant="headlineMedium" style={{ color: theme.colors.primary }}>
            {appointments?.length || 0}
          </Text>
          <Text variant="bodySmall">Записей на сегодня</Text>
        </Surface>
        
        <Surface style={styles.statCard} elevation={1}>
          <Text variant="headlineMedium" style={{ color: theme.colors.tertiary }}>
            {appointments?.filter(a => a.status === 'completed').length || 0}
          </Text>
          <Text variant="bodySmall">Завершено</Text>
        </Surface>
      </View>

      <View style={styles.sectionHeader}>
        <Text variant="titleMedium">Расписание на сегодня</Text>
        <Button mode="text" onPress={() => navigation.navigate('Queue')}>
          Очередь
        </Button>
      </View>

      <FlatList
        data={appointments}
        renderItem={renderAppointment}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text variant="bodyLarge" style={styles.emptyText}>
              {isLoading ? 'Загрузка...' : 'Нет записей на сегодня'}
            </Text>
          </View>
        }
      />

      <FAB
        icon="plus"
        style={[styles.fab, { backgroundColor: theme.colors.primary }]}
        onPress={() => navigation.navigate('Queue')}
        label="Очередь"
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    padding: 16,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  date: {
    opacity: 0.7,
    marginTop: 4,
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
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  list: {
    padding: 16,
    paddingTop: 0,
  },
  appointmentCard: {
    marginBottom: 12,
  },
  appointmentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  time: {
    fontWeight: 'bold',
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
  description: {
    marginTop: 8,
    opacity: 0.8,
  },
  emptyContainer: {
    padding: 32,
    alignItems: 'center',
  },
  emptyText: {
    opacity: 0.6,
  },
  fab: {
    position: 'absolute',
    margin: 16,
    right: 0,
    bottom: 0,
  },
});
