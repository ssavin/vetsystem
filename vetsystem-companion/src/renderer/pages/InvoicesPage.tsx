import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { Invoice, InvoiceItem, Client, NomenclatureItem } from '@shared/types';

export default function InvoicesPage() {
  const [showAddForm, setShowAddForm] = useState(false);
  const [selectedClientId, setSelectedClientId] = useState<number | null>(null);
  const [items, setItems] = useState<InvoiceItem[]>([]);
  const [searchClient, setSearchClient] = useState('');
  const [searchNomenclature, setSearchNomenclature] = useState('');
  const [printingInvoiceId, setPrintingInvoiceId] = useState<number | null>(null);
  const queryClient = useQueryClient();

  const { data: invoices = [], isLoading } = useQuery({
    queryKey: ['invoices'],
    queryFn: () => window.api.getRecentInvoices(100),
  });

  // Only load clients when searching (min 2 chars)
  const { data: clients = [] } = useQuery({
    queryKey: ['clients', searchClient],
    queryFn: () => window.api.searchClients(searchClient),
    enabled: searchClient.length >= 2,
  });

  // Only load nomenclature when searching (min 2 chars)
  const { data: nomenclature = [] } = useQuery({
    queryKey: ['nomenclature', searchNomenclature],
    queryFn: () => window.api.searchNomenclature(searchNomenclature),
    enabled: searchNomenclature.length >= 2,
  });

  const createInvoiceMutation = useMutation({
    mutationFn: (invoice: Invoice) => window.api.createInvoice(invoice),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      setShowAddForm(false);
      setSelectedClientId(null);
      setItems([]);
    },
  });

  const addItem = (nomenclatureItem: NomenclatureItem) => {
    const existingItem = items.find(item => item.nomenclature_id === nomenclatureItem.id);
    
    if (existingItem) {
      setItems(items.map(item => 
        item.nomenclature_id === nomenclatureItem.id
          ? { ...item, quantity: item.quantity + 1, total: (item.quantity + 1) * item.price }
          : item
      ));
    } else {
      setItems([...items, {
        nomenclature_id: nomenclatureItem.id,
        name: nomenclatureItem.name,
        quantity: 1,
        price: nomenclatureItem.price,
        total: nomenclatureItem.price,
      }]);
    }
  };

  const removeItem = (nomenclatureId: number) => {
    setItems(items.filter(item => item.nomenclature_id !== nomenclatureId));
  };

  const totalAmount = items.reduce((sum, item) => sum + item.total, 0);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedClientId || items.length === 0) return;
    
    createInvoiceMutation.mutate({
      client_id: selectedClientId,
      items,
      total_amount: totalAmount,
      payment_status: 'pending',
      created_at: new Date().toISOString(),
    });
  };

  const handlePrintReceipt = async (invoice: Invoice) => {
    setPrintingInvoiceId(invoice.id!);
    try {
      // Get printer settings
      const printerModel = await window.api.getSetting('printerModel');
      const printerPort = await window.api.getSetting('printerPort');
      
      if (!printerModel || !printerPort) {
        alert('Настройте принтер в разделе Настройки → Настройки принтера');
        return;
      }

      // Prepare receipt data
      const receiptData = {
        items: invoice.items.map(item => ({
          name: item.name,
          price: parseFloat(item.price.toString()),
          quantity: item.quantity
        })),
        payment_method: invoice.payment_status === 'paid' ? 'cash' : 'card',
        total: parseFloat(invoice.total_amount.toString())
      };

      // Print receipt
      const result = await window.api.printReceipt(printerModel, printerPort, receiptData);
      
      if (result.success) {
        alert('✓ Чек успешно напечатан');
      } else {
        alert(`❌ Ошибка печати: ${result.message || result.error}`);
      }
    } catch (error: any) {
      alert(`❌ Ошибка: ${error.message}`);
    } finally {
      setPrintingInvoiceId(null);
    }
  };

  return (
    <div style={{ maxWidth: '1000px' }}>
      <div style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1 style={{ fontSize: '24px', fontWeight: 'bold' }}>Счета</h1>
        <button onClick={() => setShowAddForm(true)} className="btn btn-primary">
          + Новый счет
        </button>
      </div>

      <div className="card">
        {isLoading ? (
          <div>Загрузка...</div>
        ) : invoices.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-secondary)' }}>
            Нет счетов
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid var(--border)' }}>
                <th style={{ padding: '12px', textAlign: 'left' }}>№</th>
                <th style={{ padding: '12px', textAlign: 'left' }}>Дата</th>
                <th style={{ padding: '12px', textAlign: 'left' }}>Позиций</th>
                <th style={{ padding: '12px', textAlign: 'right' }}>Сумма</th>
                <th style={{ padding: '12px', textAlign: 'left' }}>Статус</th>
                <th style={{ padding: '12px', textAlign: 'center' }}>Действия</th>
              </tr>
            </thead>
            <tbody>
              {invoices.map((invoice) => (
                <tr key={invoice.id} style={{ borderBottom: '1px solid var(--border)' }}>
                  <td style={{ padding: '12px' }} data-testid={`text-invoice-number-${invoice.id}`}>#{invoice.id}</td>
                  <td style={{ padding: '12px' }}>
                    {new Date(invoice.created_at).toLocaleDateString('ru-RU')}
                  </td>
                  <td style={{ padding: '12px' }}>{invoice.items.length}</td>
                  <td style={{ padding: '12px', textAlign: 'right', fontWeight: '600' }} data-testid={`text-invoice-total-${invoice.id}`}>
                    {invoice.total_amount.toFixed(2)} ₽
                  </td>
                  <td style={{ padding: '12px' }}>
                    <span style={{
                      padding: '4px 12px',
                      borderRadius: '12px',
                      fontSize: '12px',
                      background: invoice.payment_status === 'paid' ? '#E8F5E9' : '#FFF3E0',
                      color: invoice.payment_status === 'paid' ? '#2E7D32' : '#E65100',
                    }}>
                      {invoice.payment_status === 'paid' ? 'Оплачен' : 'Ожидает оплаты'}
                    </span>
                  </td>
                  <td style={{ padding: '12px', textAlign: 'center' }}>
                    <button
                      onClick={() => handlePrintReceipt(invoice)}
                      disabled={printingInvoiceId === invoice.id}
                      className="btn btn-sm"
                      data-testid={`button-print-receipt-${invoice.id}`}
                      style={{
                        padding: '6px 12px',
                        fontSize: '13px',
                        background: 'var(--primary)',
                        color: 'white',
                        border: 'none',
                        borderRadius: '6px',
                        cursor: printingInvoiceId === invoice.id ? 'not-allowed' : 'pointer',
                        opacity: printingInvoiceId === invoice.id ? 0.6 : 1,
                      }}
                    >
                      {printingInvoiceId === invoice.id ? '⏳ Печать...' : '🖨️ Печать'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Add Invoice Form */}
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
            style={{ maxWidth: '800px', width: '100%', maxHeight: '90vh', overflow: 'auto' }}
            onClick={(e) => e.stopPropagation()}
          >
            <h2 style={{ fontSize: '20px', fontWeight: '600', marginBottom: '20px' }}>
              Новый счет
            </h2>

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
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

              <div>
                <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px', fontWeight: '500' }}>
                  Добавить услугу/товар
                </label>
                <input
                  type="text"
                  placeholder="🔍 Поиск услуг/товаров (мин. 2 символа)..."
                  className="input"
                  value={searchNomenclature}
                  onChange={(e) => setSearchNomenclature(e.target.value)}
                />
                
                {searchNomenclature.length >= 2 && nomenclature.length > 0 && (
                  <div style={{
                    marginTop: '8px',
                    maxHeight: '200px',
                    overflow: 'auto',
                    border: '1px solid var(--border)',
                    borderRadius: '6px',
                  }}>
                    {nomenclature.map((item) => (
                      <div
                        key={item.id}
                        onClick={() => {
                          addItem(item);
                          setSearchNomenclature('');
                        }}
                        style={{
                          padding: '10px',
                          cursor: 'pointer',
                          borderBottom: '1px solid var(--border)',
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.background = '#F1F5F9'}
                        onMouseLeave={(e) => e.currentTarget.style.background = 'white'}
                      >
                        <div style={{ fontWeight: '500' }}>{item.name}</div>
                        <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                          {item.price.toFixed(2)} ₽
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Invoice Items */}
              {items.length > 0 && (
                <div>
                  <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '12px' }}>
                    Позиции счета
                  </h3>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ borderBottom: '2px solid var(--border)' }}>
                        <th style={{ padding: '8px', textAlign: 'left' }}>Название</th>
                        <th style={{ padding: '8px', textAlign: 'right' }}>Кол-во</th>
                        <th style={{ padding: '8px', textAlign: 'right' }}>Цена</th>
                        <th style={{ padding: '8px', textAlign: 'right' }}>Сумма</th>
                        <th style={{ padding: '8px' }}></th>
                      </tr>
                    </thead>
                    <tbody>
                      {items.map((item) => (
                        <tr key={item.nomenclature_id} style={{ borderBottom: '1px solid var(--border)' }}>
                          <td style={{ padding: '8px' }}>{item.name}</td>
                          <td style={{ padding: '8px', textAlign: 'right' }}>{item.quantity}</td>
                          <td style={{ padding: '8px', textAlign: 'right' }}>{item.price.toFixed(2)} ₽</td>
                          <td style={{ padding: '8px', textAlign: 'right', fontWeight: '600' }}>
                            {item.total.toFixed(2)} ₽
                          </td>
                          <td style={{ padding: '8px', textAlign: 'center' }}>
                            <button
                              type="button"
                              onClick={() => removeItem(item.nomenclature_id)}
                              style={{ color: 'var(--error)', cursor: 'pointer', background: 'none', border: 'none' }}
                            >
                              ✕
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr>
                        <td colSpan={3} style={{ padding: '12px', textAlign: 'right', fontWeight: '600' }}>
                          ИТОГО:
                        </td>
                        <td style={{ padding: '12px', textAlign: 'right', fontWeight: 'bold', fontSize: '18px' }}>
                          {totalAmount.toFixed(2)} ₽
                        </td>
                        <td></td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )}

              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  onClick={() => setShowAddForm(false)}
                  className="btn"
                  style={{ background: '#F1F5F9', color: 'var(--text-primary)' }}
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={createInvoiceMutation.isPending || items.length === 0 || !selectedClientId}
                >
                  {createInvoiceMutation.isPending ? 'Сохранение...' : 'Создать счет'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
