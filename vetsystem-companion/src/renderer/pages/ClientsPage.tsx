import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { Client, Patient } from '@shared/types';

export default function ClientsPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddClient, setShowAddClient] = useState(false);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const queryClient = useQueryClient();

  // Fetch clients - ONLY when searching (min 2 chars)
  const { data: clients = [], isLoading } = useQuery({
    queryKey: ['clients', searchQuery],
    queryFn: async () => {
      // Don't load anything if search query is too short
      if (searchQuery.length < 2) {
        return [];
      }
      
      const result = await window.api.searchClients(searchQuery);
      console.log(`[ClientsPage] Search "${searchQuery}": found ${result.length} clients`);
      return result;
    },
    enabled: searchQuery.length >= 2, // Only run query when search is meaningful
  });

  // Fetch patients for selected client
  const { data: patients = [] } = useQuery({
    queryKey: ['patients', selectedClient?.id],
    queryFn: () => window.api.getPatientsByClient(selectedClient!.id!),
    enabled: !!selectedClient?.id,
  });

  // Create client mutation
  const createClientMutation = useMutation({
    mutationFn: (client: Client) => window.api.createClient(client),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      setShowAddClient(false);
    },
  });

  // Create patient mutation
  const createPatientMutation = useMutation({
    mutationFn: (patient: Patient) => window.api.createPatient(patient),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['patients'] });
    },
  });

  const handleAddClient = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    createClientMutation.mutate({
      full_name: formData.get('full_name') as string,
      phone: formData.get('phone') as string,
      email: formData.get('email') as string,
      address: formData.get('address') as string,
    });
  };

  const handleAddPatient = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedClient?.id) return;
    
    const formData = new FormData(e.currentTarget);
    
    createPatientMutation.mutate({
      name: formData.get('name') as string,
      species: formData.get('species') as string,
      breed: formData.get('breed') as string,
      gender: formData.get('gender') as 'male' | 'female',
      client_id: selectedClient.id,
    });
    
    e.currentTarget.reset();
  };

  return (
    <div style={{ maxWidth: '1200px' }}>
      <div style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1 style={{ fontSize: '24px', fontWeight: 'bold' }}>Клиенты</h1>
        <button onClick={() => setShowAddClient(true)} className="btn btn-primary">
          + Добавить клиента
        </button>
      </div>

      {/* Search - REQUIRED to load clients */}
      <div style={{ marginBottom: '20px' }}>
        <input
          type="text"
          placeholder="🔍 Введите минимум 2 символа для поиска клиентов..."
          className="input"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          autoFocus
          style={{ fontSize: '16px', padding: '12px' }}
        />
        {searchQuery.length > 0 && searchQuery.length < 2 && (
          <div style={{ fontSize: '13px', color: '#666', marginTop: '8px' }}>
            ℹ️ Введите минимум 2 символа для поиска
          </div>
        )}
        {searchQuery.length >= 2 && (
          <div style={{ fontSize: '13px', color: '#2196F3', marginTop: '8px' }}>
            ✓ Найдено: {clients.length} клиентов
          </div>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
        {/* Clients List */}
        <div className="card" style={{ maxHeight: '600px', overflow: 'auto' }}>
          <h2 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '16px' }}>
            Список клиентов ({clients.length})
          </h2>
          
          {searchQuery.length < 2 ? (
            <div style={{ 
              padding: '40px 20px', 
              textAlign: 'center', 
              color: '#999',
              fontSize: '14px'
            }}>
              <div style={{ fontSize: '48px', marginBottom: '16px' }}>🔍</div>
              <div>Введите минимум 2 символа в поиск</div>
              <div style={{ fontSize: '12px', marginTop: '8px' }}>
                Это ускоряет работу с большой базой клиентов
              </div>
            </div>
          ) : isLoading ? (
            <div>Загрузка...</div>
          ) : clients.length === 0 ? (
            <div style={{ color: 'var(--text-secondary)' }}>Клиенты не найдены</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {clients.map((client) => (
                <div
                  key={client.id}
                  onClick={() => setSelectedClient(client)}
                  style={{
                    padding: '12px',
                    background: selectedClient?.id === client.id ? '#E3F2FD' : 'white',
                    border: '1px solid var(--border)',
                    borderRadius: '6px',
                    cursor: 'pointer',
                  }}
                >
                  <div style={{ fontWeight: '600' }}>{client.full_name}</div>
                  <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                    {client.phone}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Client Details & Patients */}
        <div className="card">
          {selectedClient ? (
            <>
              <h2 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '16px' }}>
                {selectedClient.full_name}
              </h2>
              
              <div style={{ marginBottom: '20px', fontSize: '14px' }}>
                <div><strong>Телефон:</strong> {selectedClient.phone}</div>
                {selectedClient.email && <div><strong>Email:</strong> {selectedClient.email}</div>}
                {selectedClient.address && <div><strong>Адрес:</strong> {selectedClient.address}</div>}
              </div>

              <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '12px' }}>
                Пациенты
              </h3>

              {patients.length === 0 ? (
                <div style={{ color: 'var(--text-secondary)', marginBottom: '16px' }}>
                  Нет пациентов
                </div>
              ) : (
                <div style={{ marginBottom: '16px' }}>
                  {patients.map((patient) => (
                    <div
                      key={patient.id}
                      style={{
                        padding: '10px',
                        background: 'white',
                        border: '1px solid var(--border)',
                        borderRadius: '6px',
                        marginBottom: '8px',
                      }}
                    >
                      <div style={{ fontWeight: '600' }}>{patient.name}</div>
                      <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                        {patient.species} {patient.breed && `• ${patient.breed}`}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <form onSubmit={handleAddPatient} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <h4 style={{ fontSize: '14px', fontWeight: '600' }}>Добавить пациента</h4>
                <input name="name" placeholder="Кличка" className="input" required />
                <input name="species" placeholder="Вид (собака, кошка...)" className="input" required />
                <input name="breed" placeholder="Порода" className="input" />
                <select name="gender" className="input" required>
                  <option value="">Пол</option>
                  <option value="male">Самец</option>
                  <option value="female">Самка</option>
                </select>
                <button type="submit" className="btn btn-primary" disabled={createPatientMutation.isPending}>
                  {createPatientMutation.isPending ? 'Добавление...' : 'Добавить пациента'}
                </button>
              </form>
            </>
          ) : (
            <div style={{ color: 'var(--text-secondary)' }}>
              Выберите клиента из списка
            </div>
          )}
        </div>
      </div>

      {/* Add Client Modal */}
      {showAddClient && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
          }}
          onClick={() => setShowAddClient(false)}
        >
          <div
            className="card"
            style={{ maxWidth: '500px', width: '100%' }}
            onClick={(e) => e.stopPropagation()}
          >
            <h2 style={{ fontSize: '20px', fontWeight: '600', marginBottom: '20px' }}>
              Новый клиент
            </h2>

            <form onSubmit={handleAddClient} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px', fontWeight: '500' }}>
                  ФИО *
                </label>
                <input name="full_name" className="input" required />
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px', fontWeight: '500' }}>
                  Телефон *
                </label>
                <input name="phone" type="tel" className="input" required />
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px', fontWeight: '500' }}>
                  Email
                </label>
                <input name="email" type="email" className="input" />
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px', fontWeight: '500' }}>
                  Адрес
                </label>
                <input name="address" className="input" />
              </div>

              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  onClick={() => setShowAddClient(false)}
                  className="btn"
                  style={{ background: '#F1F5F9', color: 'var(--text-primary)' }}
                >
                  Отмена
                </button>
                <button type="submit" className="btn btn-primary" disabled={createClientMutation.isPending}>
                  {createClientMutation.isPending ? 'Сохранение...' : 'Сохранить'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
