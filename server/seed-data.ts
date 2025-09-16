import { storage } from "./storage";

export async function seedDatabase() {
  try {
    console.log("Starting database seeding...");

    // Create sample doctors
    const doctor1 = await storage.createDoctor({
      name: "Доктор Петрова А.И.",
      specialization: "Терапевт",
      phone: "+7 (499) 123-45-01",
      email: "petrova@vetclinic.ru",
      isActive: true
    });

    const doctor2 = await storage.createDoctor({
      name: "Доктор Иванов С.П.",
      specialization: "Хирург", 
      phone: "+7 (499) 123-45-02",
      email: "ivanov@vetclinic.ru",
      isActive: true
    });

    const doctor3 = await storage.createDoctor({
      name: "Доктор Сидоров М.К.",
      specialization: "Дерматолог",
      phone: "+7 (499) 123-45-03", 
      email: "sidorov@vetclinic.ru",
      isActive: true
    });

    // Create sample owners
    const owner1 = await storage.createOwner({
      name: "Иванов Иван Иванович",
      phone: "+7 (999) 123-45-67",
      email: "ivanov.ii@example.com",
      address: "г. Москва, ул. Примерная, д. 10, кв. 5"
    });

    const owner2 = await storage.createOwner({
      name: "Петрова Анна Сергеевна",
      phone: "+7 (999) 987-65-43", 
      email: "petrova.as@example.com",
      address: "г. Москва, ул. Центральная, д. 22, кв. 15"
    });

    const owner3 = await storage.createOwner({
      name: "Сидоров Петр Константинович",
      phone: "+7 (999) 555-12-34",
      email: "sidorov.pk@example.com", 
      address: "г. Москва, пр-т. Главный, д. 5, кв. 33"
    });

    // Create sample patients
    const patient1 = await storage.createPatient({
      name: "Барсик",
      species: "Кошка",
      breed: "Персидская",
      gender: "male",
      birthDate: new Date("2021-03-15"),
      color: "Рыжий с белым",
      weight: "4.2",
      microchipNumber: "999000000012345",
      isNeutered: true,
      allergies: "Непереносимость куриного белка",
      chronicConditions: null,
      specialMarks: "Шрам на левом ухе",
      status: "healthy",
      ownerId: owner1.id
    });

    const patient2 = await storage.createPatient({
      name: "Рекс", 
      species: "Собака",
      breed: "Немецкая овчарка",
      gender: "male",
      birthDate: new Date("2019-07-22"),
      color: "Черно-подпалый",
      weight: "32.5",
      microchipNumber: "999000000054321",
      isNeutered: false,
      allergies: null,
      chronicConditions: "Дисплазия тазобедренных суставов",
      specialMarks: null,
      status: "sick",
      ownerId: owner2.id
    });

    const patient3 = await storage.createPatient({
      name: "Мурка",
      species: "Кошка", 
      breed: "Британская короткошерстная",
      gender: "female",
      birthDate: new Date("2022-01-10"),
      color: "Серый",
      weight: "3.8", 
      microchipNumber: "999000000098765",
      isNeutered: true,
      allergies: null,
      chronicConditions: null,
      specialMarks: "Белое пятно на груди",
      status: "healthy", 
      ownerId: owner3.id
    });

    // Create sample appointments
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);

    const appointment1 = await storage.createAppointment({
      patientId: patient1.id,
      doctorId: doctor1.id,
      appointmentDate: new Date(today.getFullYear(), today.getMonth(), today.getDate(), 10, 0),
      duration: 30,
      appointmentType: "Плановый осмотр",
      status: "confirmed",
      notes: "Плановая вакцинация"
    });

    const appointment2 = await storage.createAppointment({
      patientId: patient2.id,
      doctorId: doctor2.id,
      appointmentDate: new Date(today.getFullYear(), today.getMonth(), today.getDate(), 11, 30), 
      duration: 60,
      appointmentType: "Хирургическая операция",
      status: "scheduled",
      notes: "Операция по исправлению дисплазии"
    });

    const appointment3 = await storage.createAppointment({
      patientId: patient3.id,
      doctorId: doctor3.id,
      appointmentDate: new Date(tomorrow.getFullYear(), tomorrow.getMonth(), tomorrow.getDate(), 9, 0),
      duration: 20,
      appointmentType: "Консультация",
      status: "scheduled", 
      notes: "Проверка состояния кожи"
    });

    // Create medical records
    const record1 = await storage.createMedicalRecord({
      patientId: patient1.id,
      doctorId: doctor1.id,
      appointmentId: appointment1.id,
      visitDate: new Date(today.getFullYear(), today.getMonth(), today.getDate() - 7),
      visitType: "Плановый осмотр",
      complaints: "Снижение аппетита, вялость в течение 3 дней",
      diagnosis: "Острый гастрит",
      treatment: ["Общий клинический осмотр", "Взятие крови на анализ", "УЗИ брюшной полости"],
      temperature: "38.5",
      weight: "4.2",
      nextVisit: new Date(today.getFullYear(), today.getMonth(), today.getDate() + 14),
      status: "active",
      notes: "Рекомендована диета, исключить сухой корм на время лечения"
    });

    // Create medications
    await storage.createMedication({
      recordId: record1.id,
      name: "Омепразол",
      dosage: "20 мг",
      frequency: "2 раза в день",
      duration: "7 дней",
      instructions: "Давать за 30 минут до еды"
    });

    await storage.createMedication({
      recordId: record1.id,
      name: "Пробиотик",
      dosage: "1 капсула", 
      frequency: "1 раз в день",
      duration: "14 дней",
      instructions: "Давать во время еды"
    });

    // Create sample services
    const service1 = await storage.createService({
      name: "Общий клинический осмотр",
      category: "Диагностика",
      price: "800",
      duration: 30,
      description: "Полный осмотр животного с проверкой всех систем организма",
      isActive: true
    });

    const service2 = await storage.createService({
      name: "Вакцинация против бешенства",
      category: "Профилактика", 
      price: "1500",
      duration: 30,
      description: "Комплексная вакцинация животного против бешенства",
      isActive: true
    });

    const service3 = await storage.createService({
      name: "Хирургическая операция",
      category: "Хирургия",
      price: "8500", 
      duration: 120,
      description: "Плановая хирургическая операция под общей анестезией",
      isActive: true
    });

    const service4 = await storage.createService({
      name: "УЗИ диагностика",
      category: "Диагностика",
      price: "2200",
      duration: 45,
      description: "Ультразвуковая диагностика органов брюшной полости", 
      isActive: true
    });

    // Create sample products
    const product1 = await storage.createProduct({
      name: "Корм Royal Canin для кошек",
      category: "Корма",
      price: "850",
      stock: 3,
      minStock: 5,
      unit: "уп",
      description: "Сухой корм для взрослых кошек. Полнорационное питание",
      isActive: true
    });

    const product2 = await storage.createProduct({
      name: "Витамины для собак",
      category: "Препараты",
      price: "450",
      stock: 15,
      minStock: 10,
      unit: "шт",
      description: "Комплекс витаминов и минералов для собак",
      isActive: true  
    });

    const product3 = await storage.createProduct({
      name: "Антибиотик широкого спектра",
      category: "Медикаменты",
      price: "320", 
      stock: 2,
      minStock: 8,
      unit: "фл",
      description: "Антибактериальный препарат для лечения инфекций",
      isActive: true
    });

    // Generate invoice number
    const invoiceNumber = `INV-${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}${String(today.getDate()).padStart(2, '0')}-001`;

    // Create sample invoice
    const invoice1 = await storage.createInvoice({
      invoiceNumber: invoiceNumber,
      patientId: patient1.id,
      appointmentId: appointment1.id,
      issueDate: new Date(today.getFullYear(), today.getMonth(), today.getDate() - 3),
      dueDate: new Date(today.getFullYear(), today.getMonth(), today.getDate() + 7),
      subtotal: "3000",
      discount: "150", 
      total: "2850",
      status: "pending",
      notes: "Следующий визит через 2 недели для контрольного осмотра"
    });

    // Create invoice items
    await storage.createInvoiceItem({
      invoiceId: invoice1.id,
      itemType: "service",
      itemId: service1.id,
      itemName: service1.name,
      quantity: 1,
      price: "800",
      total: "800"
    });

    await storage.createInvoiceItem({
      invoiceId: invoice1.id,
      itemType: "service", 
      itemId: service2.id,
      itemName: service2.name,
      quantity: 1,
      price: "1500",
      total: "1500"
    });

    await storage.createInvoiceItem({
      invoiceId: invoice1.id,
      itemType: "product",
      itemId: product2.id,
      itemName: product2.name,
      quantity: 2,
      price: "350", 
      total: "700"
    });

    console.log("Database seeding completed successfully!");
    console.log("Created:");
    console.log("- 3 doctors");
    console.log("- 3 owners"); 
    console.log("- 3 patients");
    console.log("- 3 appointments");
    console.log("- 1 medical record with 2 medications");
    console.log("- 4 services");
    console.log("- 3 products");
    console.log("- 1 invoice with 3 items");

  } catch (error) {
    console.error("Error seeding database:", error);
    throw error;
  }
}