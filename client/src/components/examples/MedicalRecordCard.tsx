import MedicalRecordCard from '../MedicalRecordCard'

export default function MedicalRecordCardExample() {
  const sampleRecord = {
    id: "1",
    date: "15.12.2024",
    patientName: "Барсик",
    doctorName: "Доктор Петрова",
    visitType: "Плановый осмотр",
    complaints: "Снижение аппетита, вялость в течение 3 дней",
    diagnosis: "Острый гастрит",
    treatment: [
      "Общий клинический осмотр",
      "Взятие крови на анализ",
      "УЗИ брюшной полости"
    ],
    medications: [
      {
        name: "Омепразол",
        dosage: "20 мг",
        frequency: "2 раза в день",
        duration: "7 дней"
      },
      {
        name: "Пробиотик",
        dosage: "1 капсула",
        frequency: "1 раз в день",
        duration: "14 дней"
      }
    ],
    nextVisit: "22.12.2024",
    status: 'active' as const,
    notes: "Рекомендована диета, исключить сухой корм на время лечения",
    temperature: "38.5",
    weight: "4.2"
  }

  return (
    <div className="max-w-2xl">
      <MedicalRecordCard record={sampleRecord} />
    </div>
  )
}