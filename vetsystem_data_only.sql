--
-- PostgreSQL database dump
--

-- Dumped from database version 16.9 (02a153c)
-- Dumped by pg_dump version 16.9

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Data for Name: branches; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.branches (id, name, address, city, region, phone, email, working_hours, status, manager_id, description, created_at, updated_at) FROM stdin;
f9c369e8-9f58-4195-bd8e-a5bc4a03a3ed	Главный филиал	ул. Ветеринарная 1, кв. 10	Москва	\N	+7-495-123-4567	\N	\N	active	\N	\N	2025-09-17 00:08:51.489976	2025-09-17 00:08:51.489976
4360ed52-9417-4ce1-b9ea-6543898d162a	Филиал Тестовый	ул. Тестовая, 123	Тест-город	\N	+7-999-123-4567	\N	\N	active	\N	Тестовый филиал для проверки изоляции данных	2025-09-17 16:52:26.294093	2025-09-17 16:52:26.294093
\.


--
-- Data for Name: doctors; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.doctors (id, name, specialization, phone, email, is_active, created_at, updated_at, branch_id) FROM stdin;
e8408460-a472-4384-826a-90b07afa1a42	Доктор Иванов С.П.	Хирург	+7 (499) 123-45-02	ivanov@vetclinic.ru	t	2025-09-16 12:08:36.315396	2025-09-16 12:08:36.315396	f9c369e8-9f58-4195-bd8e-a5bc4a03a3ed
b53f4cca-b68c-4b33-b7d5-fb5b1eeca575	Доктор Петрова А.И.	Терапевт	+7 (499) 123-45-01	petrova@vetclinic.ru	t	2025-09-16 12:08:36.235984	2025-09-16 12:08:36.235984	4360ed52-9417-4ce1-b9ea-6543898d162a
871aa753-8951-45d3-bdaf-18dbf77fe647	Доктор Сидоров М.К.	Дерматолог	+7 (499) 123-45-03	sidorov@vetclinic.ru	t	2025-09-16 12:08:36.349129	2025-09-16 12:08:36.349129	4360ed52-9417-4ce1-b9ea-6543898d162a
\.


--
-- Data for Name: owners; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.owners (id, name, phone, email, address, created_at, updated_at, branch_id) FROM stdin;
6bc52721-82a5-4362-a804-0e82483a5ca4	Иванов Иван Иванович	+7 (999) 123-45-67	ivanov.ii@example.com	г. Москва, ул. Примерная, д. 10, кв. 5	2025-09-16 12:08:36.382907	2025-09-16 12:08:36.382907	f9c369e8-9f58-4195-bd8e-a5bc4a03a3ed
973ccfde-68ba-4817-8232-f29c8cd91df9	Петрова Анна Сергеевна	+7 (999) 987-65-43	petrova.as@example.com	г. Москва, ул. Центральная, д. 22, кв. 15	2025-09-16 12:08:36.426827	2025-09-16 12:08:36.426827	f9c369e8-9f58-4195-bd8e-a5bc4a03a3ed
42ce4a6c-6710-431f-845d-49c102f1674c	Сидоров Петр Константинович	+7 (999) 555-12-34	sidorov.pk@example.com	г. Москва, пр-т. Главный, д. 5, кв. 33	2025-09-16 12:08:36.460515	2025-09-16 12:08:36.460515	4360ed52-9417-4ce1-b9ea-6543898d162a
\.


--
-- Data for Name: patients; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.patients (id, name, species, breed, gender, birth_date, color, weight, microchip_number, is_neutered, allergies, chronic_conditions, special_marks, status, owner_id, created_at, updated_at, branch_id) FROM stdin;
349735c2-d364-4a29-b33f-b5a8913da4e0	Барсик	Кошка	Персидская	male	2021-03-15 00:00:00	Рыжий с белым	4.20	999000000012345	t	Непереносимость куриного белка	\N	Шрам на левом ухе	healthy	6bc52721-82a5-4362-a804-0e82483a5ca4	2025-09-16 12:08:36.49393	2025-09-16 12:08:36.49393	f9c369e8-9f58-4195-bd8e-a5bc4a03a3ed
f42fc982-5819-4738-897e-0666a098024f	Рекс	Собака	Немецкая овчарка	male	2019-07-22 00:00:00	Черно-подпалый	32.50	999000000054321	f	\N	Дисплазия тазобедренных суставов	\N	sick	973ccfde-68ba-4817-8232-f29c8cd91df9	2025-09-16 12:08:36.569099	2025-09-16 12:08:36.569099	f9c369e8-9f58-4195-bd8e-a5bc4a03a3ed
b105cdbd-3a1a-4f8d-82b3-f9f209cd7146	Мурка	Кошка	Британская короткошерстная	female	2022-01-10 00:00:00	Серый	3.80	999000000098765	t	\N	\N	Белое пятно на груди	healthy	42ce4a6c-6710-431f-845d-49c102f1674c	2025-09-16 12:08:36.605309	2025-09-16 12:08:36.605309	f9c369e8-9f58-4195-bd8e-a5bc4a03a3ed
\.


--
-- Data for Name: appointments; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.appointments (id, patient_id, doctor_id, appointment_date, duration, appointment_type, status, notes, created_at, updated_at, branch_id) FROM stdin;
efd2ab56-046a-4ce0-b831-d06f8340a275	349735c2-d364-4a29-b33f-b5a8913da4e0	b53f4cca-b68c-4b33-b7d5-fb5b1eeca575	2025-09-16 10:00:00	30	Плановый осмотр	confirmed	Плановая вакцинация	2025-09-16 12:08:36.639014	2025-09-16 12:08:36.639014	f9c369e8-9f58-4195-bd8e-a5bc4a03a3ed
d2e67233-18af-4eb9-952c-2308db596b3d	f42fc982-5819-4738-897e-0666a098024f	e8408460-a472-4384-826a-90b07afa1a42	2025-09-16 11:30:00	60	Хирургическая операция	scheduled	Операция по исправлению дисплазии	2025-09-16 12:08:36.689663	2025-09-16 12:08:36.689663	f9c369e8-9f58-4195-bd8e-a5bc4a03a3ed
c52a7ad6-7d51-4fc0-a92b-34cda6443e8b	b105cdbd-3a1a-4f8d-82b3-f9f209cd7146	871aa753-8951-45d3-bdaf-18dbf77fe647	2025-09-17 09:00:00	20	Консультация	scheduled	Проверка состояния кожи	2025-09-16 12:08:36.723046	2025-09-16 12:08:36.723046	f9c369e8-9f58-4195-bd8e-a5bc4a03a3ed
\.


--
-- Data for Name: invoices; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.invoices (id, invoice_number, patient_id, appointment_id, issue_date, due_date, subtotal, discount, total, status, payment_method, paid_date, notes, created_at, updated_at) FROM stdin;
87bd1634-3fbf-4a3f-b19f-3efd92a032c8	INV-2025-0916-001	349735c2-d364-4a29-b33f-b5a8913da4e0	efd2ab56-046a-4ce0-b831-d06f8340a275	2025-09-13 00:00:00	2025-09-23 00:00:00	3000.00	150.00	2850.00	pending	\N	\N	Следующий визит через 2 недели для контрольного осмотра	2025-09-16 12:08:37.167992	2025-09-16 12:08:37.167992
\.


--
-- Data for Name: invoice_items; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.invoice_items (id, invoice_id, item_type, item_id, item_name, quantity, price, total, created_at) FROM stdin;
aba4be3b-c9e6-4e9b-bdb5-6f971568486d	87bd1634-3fbf-4a3f-b19f-3efd92a032c8	service	831d93dc-2d37-4785-9f76-d9dd3ca3d04f	Общий клинический осмотр	1	800.00	800.00	2025-09-16 12:08:37.218844
f026b71a-f6bc-4ba3-b85e-e65f3ff9db2a	87bd1634-3fbf-4a3f-b19f-3efd92a032c8	service	7b201f61-ca30-4c99-bd18-9be5956d86e8	Вакцинация против бешенства	1	1500.00	1500.00	2025-09-16 12:08:37.265239
c8d765de-e382-498f-ba26-3ef0ebe0df3e	87bd1634-3fbf-4a3f-b19f-3efd92a032c8	product	ba76123e-4bcf-4464-9469-ecb34dba821e	Витамины для собак	2	350.00	700.00	2025-09-16 12:08:37.299168
\.


--
-- Data for Name: lab_studies; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.lab_studies (id, name, category, code, description, preparation_instructions, sample_type, estimated_duration, price, is_active, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: medical_records; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.medical_records (id, patient_id, doctor_id, appointment_id, visit_date, visit_type, complaints, diagnosis, treatment, temperature, weight, next_visit, status, notes, created_at, updated_at, branch_id) FROM stdin;
ff1d7af9-57d9-4c34-9c9a-6a643f211289	349735c2-d364-4a29-b33f-b5a8913da4e0	b53f4cca-b68c-4b33-b7d5-fb5b1eeca575	efd2ab56-046a-4ce0-b831-d06f8340a275	2025-09-09 00:00:00	Плановый осмотр	Снижение аппетита, вялость в течение 3 дней	Острый гастрит	["Общий клинический осмотр", "Взятие крови на анализ", "УЗИ брюшной полости"]	38.5	4.20	2025-09-30 00:00:00	active	Рекомендована диета, исключить сухой корм на время лечения	2025-09-16 12:08:36.757249	2025-09-16 12:08:36.757249	f9c369e8-9f58-4195-bd8e-a5bc4a03a3ed
\.


--
-- Data for Name: lab_orders; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.lab_orders (id, order_number, patient_id, doctor_id, appointment_id, medical_record_id, study_id, status, urgency, ordered_date, sample_taken_date, expected_date, completed_date, notes, branch_id, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: lab_parameters; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.lab_parameters (id, study_id, name, code, unit, data_type, sort_order, is_active, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: reference_ranges; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.reference_ranges (id, parameter_id, species, breed, gender, age_min, age_max, range_min, range_max, critical_min, critical_max, notes, is_active, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: lab_result_details; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.lab_result_details (id, order_id, parameter_id, value, numeric_value, status, reference_range_id, flags, notes, reported_date, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: lab_results; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.lab_results (id, patient_id, doctor_id, medical_record_id, test_type, test_name, results, normal_ranges, status, performed_date, received_date, notes, lab_technician_name, urgency, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: medications; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.medications (id, record_id, name, dosage, frequency, duration, instructions, created_at) FROM stdin;
12403592-f087-496c-8e45-c8bad04e9724	ff1d7af9-57d9-4c34-9c9a-6a643f211289	Омепразол	20 мг	2 раза в день	7 дней	Давать за 30 минут до еды	2025-09-16 12:08:36.812002
0c41ce28-360a-4707-97c2-f1721e65752b	ff1d7af9-57d9-4c34-9c9a-6a643f211289	Пробиотик	1 капсула	1 раз в день	14 дней	Давать во время еды	2025-09-16 12:08:36.862295
\.


--
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.users (id, username, password, email, full_name, role, status, last_login, created_at, updated_at, phone, phone_verified, two_factor_enabled, two_factor_method, branch_id) FROM stdin;
e2b1a026-8404-4938-969c-0c7a7684d645	testadmin	$2b$12$LyLPkRJpgLCXwgZjXvowxO7SX0J4t5l.YgJ6ZZl2RtQKwmJL2SqnC	test@admin.com	Тестовый Администратор	администратор	active	\N	2025-09-17 01:39:39.77831	2025-09-17 01:39:39.77831	\N	f	f	sms	4360ed52-9417-4ce1-b9ea-6543898d162a
1e62a7c8-b942-4506-bf1d-8e0385f632b2	admin	admin123	s.mailbox@bk.ru	Системный Администратор	администратор	active	2025-09-17 17:40:05.836	2025-09-17 00:09:11.195933	2025-09-17 00:41:15.076	+79268949839	f	f	disabled	f9c369e8-9f58-4195-bd8e-a5bc4a03a3ed
81be9b16-f825-4bc7-9ff6-7177d9d953e2	demo	$2b$12$R/pPpqNdITB8NsClQ13gte8FxQMRPB5vL0BhaFjiYme0Ia2h7MPg2	\N	Демо Пользователь	администратор	active	2025-09-17 20:23:20.679	2025-09-17 18:01:04.579589	2025-09-17 18:01:04.579589	\N	f	f	sms	\N
\.


--
-- Data for Name: patient_files; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.patient_files (id, patient_id, file_name, original_name, file_type, mime_type, file_size, file_path, description, uploaded_by, medical_record_id, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: products; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.products (id, name, category, price, stock, min_stock, unit, description, is_active, created_at, updated_at) FROM stdin;
db24c78b-5063-4089-a45e-5a86e6ffcc41	Корм Royal Canin для кошек	Корма	850.00	3	5	уп	Сухой корм для взрослых кошек. Полнорационное питание	t	2025-09-16 12:08:37.050407	2025-09-16 12:08:37.050407
ba76123e-4bcf-4464-9469-ecb34dba821e	Витамины для собак	Препараты	450.00	15	10	шт	Комплекс витаминов и минералов для собак	t	2025-09-16 12:08:37.100708	2025-09-16 12:08:37.100708
daa1ef14-4837-4ce2-8453-524309a9c2c8	Антибиотик широкого спектра	Медикаменты	320.00	2	8	фл	Антибактериальный препарат для лечения инфекций	t	2025-09-16 12:08:37.134317	2025-09-16 12:08:37.134317
\.


--
-- Data for Name: services; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.services (id, name, category, price, duration, description, is_active, created_at, updated_at) FROM stdin;
831d93dc-2d37-4785-9f76-d9dd3ca3d04f	Общий клинический осмотр	Диагностика	800.00	30	Полный осмотр животного с проверкой всех систем организма	t	2025-09-16 12:08:36.896115	2025-09-16 12:08:36.896115
7b201f61-ca30-4c99-bd18-9be5956d86e8	Вакцинация против бешенства	Профилактика	1500.00	30	Комплексная вакцинация животного против бешенства	t	2025-09-16 12:08:36.941676	2025-09-16 12:08:36.941676
9b3b1ee0-ea68-4ab4-9a2b-98d9f633d058	Хирургическая операция	Хирургия	8500.00	120	Плановая хирургическая операция под общей анестезией	t	2025-09-16 12:08:36.975243	2025-09-16 12:08:36.975243
0dd19717-56f5-497b-91a6-879d0572760d	УЗИ диагностика	Диагностика	2200.00	45	Ультразвуковая диагностика органов брюшной полости	t	2025-09-16 12:08:37.016253	2025-09-16 12:08:37.016253
\.


--
-- Data for Name: sms_verification_codes; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.sms_verification_codes (id, user_id, phone, code_hash, purpose, expires_at, attempt_count, created_at) FROM stdin;
\.


--
-- PostgreSQL database dump complete
--

