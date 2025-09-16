import ServiceItem from '../ServiceItem'

export default function ServiceItemExample() {
  const sampleService = {
    id: "1",
    name: "Вакцинация против бешенства",
    category: "Профилактика",
    type: 'service' as const,
    price: 1500,
    duration: 30,
    description: "Комплексная вакцинация животного против бешенства с предварительным осмотром",
    isActive: true
  }

  const sampleProduct = {
    id: "2", 
    name: "Корм Royal Canin для кошек",
    category: "Корма",
    type: 'product' as const,
    price: 850,
    stock: 3,
    minStock: 5,
    unit: "шт",
    description: "Сухой корм для взрослых кошек всех пород. Полнорационное питание с оптимальным балансом белков и жиров",
    isActive: true
  }

  return (
    <div className="space-y-4 max-w-md">
      <ServiceItem service={sampleService} />
      <ServiceItem service={sampleProduct} />
    </div>
  )
}