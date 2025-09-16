import InvoiceCard from '../InvoiceCard'

export default function InvoiceCardExample() {
  const sampleInvoice = {
    id: "INV-2024-001",
    date: "15.12.2024",
    patientName: "Барсик",
    ownerName: "Иванов И.И.",
    items: [
      {
        id: "1",
        name: "Общий осмотр",
        type: 'service' as const,
        quantity: 1,
        price: 800,
        total: 800
      },
      {
        id: "2", 
        name: "Вакцинация против бешенства",
        type: 'service' as const,
        quantity: 1,
        price: 1500,
        total: 1500
      },
      {
        id: "3",
        name: "Витамины для кошек",
        type: 'product' as const,
        quantity: 2,
        price: 350,
        total: 700
      }
    ],
    subtotal: 3000,
    discount: 150,
    total: 2850,
    status: 'pending' as const,
    dueDate: "22.12.2024",
    notes: "Следующий визит через 2 недели для контрольного осмотра"
  }

  return (
    <div className="max-w-md">
      <InvoiceCard invoice={sampleInvoice} />
    </div>
  )
}