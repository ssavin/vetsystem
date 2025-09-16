import AppointmentCard from '../AppointmentCard'

export default function AppointmentCardExample() {
  const sampleAppointment = {
    id: "1",
    time: "14:30",
    duration: "30 мин",
    patientName: "Мурка",
    patientSpecies: "Кошка",
    ownerName: "Петрова А.С.",
    doctorName: "Доктор Сидоров",
    appointmentType: "Осмотр",
    status: 'confirmed' as const,
    notes: "Плановый осмотр, возможна вакцинация"
  }

  return (
    <div className="max-w-md">
      <AppointmentCard appointment={sampleAppointment} />
    </div>
  )
}