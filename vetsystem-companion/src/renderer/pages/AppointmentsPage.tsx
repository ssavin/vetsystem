import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { Appointment, Client, Patient } from '@shared/types';
import { format } from 'date-fns';

export default function AppointmentsPage() {
  const [showAddForm, setShowAddForm] = useState(false);
  const [selectedClientId, setSelectedClientId] = useState<number | null>(null);
  const [searchClient, setSearchClient] = useState('');
  const queryClient = useQueryClient();

  const { data: appointments = [], isLoading } = useQuery({
    queryKey: ['appointments'],
    queryFn: () => window.api.getRecentAppointments(100),
  });

  // Only load clients when searching (min 2 chars)
  const { data: clients = [] } = useQuery({
    queryKey: ['clients', searchClient],
    queryFn: () => window.api.searchClients(searchClient),
    enabled: searchClient.length >= 2,
  });

  const { data: patients = [] } = useQuery({
    queryKey: ['patients', selectedClientId],
    queryFn: () => window.api.getPatientsByClient(selectedClientId!),
    enabled: !!selectedClientId,
  });

  const createAppointmentMutation = useMutation({
    mutationFn: (appointment: Appointment) => window.api.createAppointment(appointment),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
      setShowAddForm(false);
      setSelectedClientId(null);
    },
  });

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    createAppointmentMutation.mutate({
      client_id: Number(formData.get('client_id')),
      patient_id: Number(formData.get('patient_id')),
      appointment_date: formData.get('appointment_date') as string,
      appointment_time: formData.get('appointment_time') as string,
      doctor_name: formData.get('doctor_name') as string,
      notes: formData.get('notes') as string,
    });
  };

  return (
    <div style={{ maxWidth: '1000px' }}>
      <div style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1 style={{ fontSize: '24px', fontWeight: 'bold' }}>Записи на прием</h1>
        <button onClick={() => setShowAddForm(true)} className="btn btn-primary">
          + Новая запись
        </button>
      </div>

      <div className="card">
        {isLoading ? (
          <div>Загрузка...</div>
        ) : appointments.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-secondary)' }}>
            Нет записей на прием
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid var(--border)' }}>
                <th style={{ padding: '12px', textAlign: 'left' }}>Дата</th>
                <th style={{ padding: '12px', textAlign: 'left' }}>Время</th>
                <th style={{ padding: '12px', textAlign: 'left' }}>Врач</th>
                <th style={{ padding: '12px', textAlign: 'left' }}>Примечания</th>
              </tr>
            </thead>
            <tbody>
              {appointments.map((appointment) => (
                <tr key={appointment.id} style={{ borderBottom: '1px solid var(--border)' }}>
                  <td style={{ padding: '12px' }}>{appointment.appointment_date}</td>
                  <td style={{ padding: '12px' }}>{appointment.appointment_time}</td>
                  <td style={{ padding: '12px' }}>{appointment.doctor_name || '—'}</td>
                  <td style={{ padding: '12px', color: 'var(--text-secondary)', fontSize: '13px' }}>
                    {appointment.notes || '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Add Appointment Form */}
      {showAddForm && (
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
          onClick={() => setShowAddForm(false)}
        >
          <div
            className="card"
            style={{ maxWidth: '600px', width: '100%' }}
            onClick={(e) => e.stopPropagation()}
          >
            <h2 style={{ fontSize: '20px', fontWeight: '600', marginBottom: '20px' }}>
              Новая запись на прием
            </h2>

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px', fontWeight: '500' }}>
                  Клиент *
                </label>
                <input
                  type="text"
                  placeholder="🔍 Поиск клиента (мин. 2 символа)..."
                  className="input"
                  value={searchClient}
                  onChange={(e) => setSearchClient(e.target.value)}
                  required={!selectedClientId}
                />
                
                {searchClient.length >= 2 && clients.length > 0 && (
                  <div style={{
                    marginTop: '8px',
                    maxHeight: '200px',
                    overflow: 'auto',
                    border: '1px solid var(--border)',
                    borderRadius: '6px',
                    background: 'white',
                  }}>
                    {clients.map((client) => (
                      <div
                        key={client.id}
                        onClick={() => {
                          setSelectedClientId(client.id!);
                          setSearchClient(client.full_name);
                        }}
                        style={{
                          padding: '10px',
                          cursor: 'pointer',
                          borderBottom: '1px solid var(--border)',
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.background = '#F1F5F9'}
                        onMouseLeave={(e) => e.currentTarget.style.background = 'white'}
                      >
                        <div style={{ fontWeight: '500' }}>{client.full_name}</div>
                        <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                          {client.phone}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                
                {selectedClientId && (
                  <div style={{ 
                    marginTop: '8px', 
                    padding: '8px 12px', 
                    background: '#E8F5E9', 
                    borderRadius: '6px',
                    fontSize: '13px',
                    color: '#2E7D32'
                  }}>
                    ✓ Клиент выбран
                  </div>
                )}
              </div>

              {selectedClientId && (
                <div>
                  <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px', fontWeight: '500' }}>
                    Пациент *
                  </label>
                  <select name="patient_id" className="input" required>
                    <option value="">Выберите пациента</option>
                    {patients.map((patient) => (
                      <option key={patient.id} value={patient.id}>
                        {patient.name} ({patient.species})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px', fontWeight: '500' }}>
                    Дата *
                  </label>
                  <input
                    name="appointment_date"
                    type="date"
                    className="input"
                    defaultValue={format(new Date(), 'yyyy-MM-dd')}
                    required
                  />
                </div>

                <div>
                  <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px', fontWeight: '500' }}>
                    Время *
                  </label>
                  <input name="appointment_time" type="time" className="input" required />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px', fontWeight: '500' }}>
                  Врач
                </label>
                <input name="doctor_name" className="input" />
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px', fontWeight: '500' }}>
                  Примечания
                </label>
                <textarea
                  name="notes"
                  className="input"
                  rows={3}
                  style={{ resize: 'vertical' }}
                />
              </div>

              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  onClick={() => setShowAddForm(false)}
                  className="btn"
                  style={{ background: '#F1F5F9', color: 'var(--text-primary)' }}
                >
                  Отмена
                </button>
                <button type="submit" className="btn btn-primary" disabled={createAppointmentMutation.isPending}>
                  {createAppointmentMutation.isPending ? 'Сохранение...' : 'Создать запись'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
