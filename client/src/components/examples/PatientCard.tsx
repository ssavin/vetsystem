import PatientCard from '../PatientCard'

export default function PatientCardExample() {
  const samplePatient = {
    id: "1",
    name: "Барсик",
    species: "Кот",
    breed: "Персидская",
    age: "3 года",
    owner: "Иванов И.И.",
    ownerPhone: "+7 (999) 123-45-67",
    status: 'healthy' as const,
    lastVisit: "15.12.2024",
    avatar: undefined
  }

  return (
    <div className="max-w-md">
      <PatientCard patient={samplePatient} />
    </div>
  )
}