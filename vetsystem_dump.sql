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

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: appointments; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.appointments (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    patient_id character varying NOT NULL,
    doctor_id character varying NOT NULL,
    appointment_date timestamp without time zone NOT NULL,
    duration integer NOT NULL,
    appointment_type character varying(255) NOT NULL,
    status character varying(20) DEFAULT 'scheduled'::character varying,
    notes text,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    branch_id character varying,
    CONSTRAINT appointments_duration_check CHECK ((duration > 0)),
    CONSTRAINT appointments_status_check CHECK (((status)::text = ANY ((ARRAY['scheduled'::character varying, 'confirmed'::character varying, 'in_progress'::character varying, 'completed'::character varying, 'cancelled'::character varying, 'no_show'::character varying])::text[])))
);


ALTER TABLE public.appointments OWNER TO neondb_owner;

--
-- Name: branches; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.branches (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    name character varying(255) NOT NULL,
    address text NOT NULL,
    city character varying(100) NOT NULL,
    region character varying(100),
    phone character varying(50) NOT NULL,
    email character varying(255),
    working_hours jsonb,
    status character varying(20) DEFAULT 'active'::character varying,
    manager_id character varying,
    description text,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    CONSTRAINT branches_status_check CHECK (((status)::text = ANY ((ARRAY['active'::character varying, 'inactive'::character varying, 'maintenance'::character varying])::text[])))
);


ALTER TABLE public.branches OWNER TO neondb_owner;

--
-- Name: doctors; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.doctors (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    name character varying(255) NOT NULL,
    specialization character varying(255),
    phone character varying(50),
    email character varying(255),
    is_active boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    branch_id character varying
);


ALTER TABLE public.doctors OWNER TO neondb_owner;

--
-- Name: invoice_items; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.invoice_items (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    invoice_id character varying NOT NULL,
    item_type character varying(20) NOT NULL,
    item_id character varying NOT NULL,
    item_name character varying(255) NOT NULL,
    quantity integer NOT NULL,
    price numeric(10,2) NOT NULL,
    total numeric(10,2) NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    CONSTRAINT invoice_items_item_type_check CHECK (((item_type)::text = ANY ((ARRAY['service'::character varying, 'product'::character varying])::text[]))),
    CONSTRAINT invoice_items_price_check CHECK ((price >= (0)::numeric)),
    CONSTRAINT invoice_items_quantity_check CHECK ((quantity > 0)),
    CONSTRAINT invoice_items_total_check CHECK ((total >= (0)::numeric))
);


ALTER TABLE public.invoice_items OWNER TO neondb_owner;

--
-- Name: invoices; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.invoices (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    invoice_number character varying(255) NOT NULL,
    patient_id character varying NOT NULL,
    appointment_id character varying,
    issue_date timestamp without time zone DEFAULT now() NOT NULL,
    due_date timestamp without time zone,
    subtotal numeric(10,2) NOT NULL,
    discount numeric(10,2) DEFAULT '0'::numeric,
    total numeric(10,2) NOT NULL,
    status character varying(20) DEFAULT 'pending'::character varying,
    payment_method character varying(100),
    paid_date timestamp without time zone,
    notes text,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    CONSTRAINT invoices_discount_check CHECK ((discount >= (0)::numeric)),
    CONSTRAINT invoices_due_date_check CHECK (((due_date IS NULL) OR (due_date >= issue_date))),
    CONSTRAINT invoices_status_check CHECK (((status)::text = ANY ((ARRAY['pending'::character varying, 'paid'::character varying, 'overdue'::character varying, 'cancelled'::character varying])::text[]))),
    CONSTRAINT invoices_subtotal_check CHECK ((subtotal >= (0)::numeric)),
    CONSTRAINT invoices_total_check CHECK ((total >= (0)::numeric))
);


ALTER TABLE public.invoices OWNER TO neondb_owner;

--
-- Name: lab_orders; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.lab_orders (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    order_number character varying(50) NOT NULL,
    patient_id character varying NOT NULL,
    doctor_id character varying NOT NULL,
    appointment_id character varying,
    medical_record_id character varying,
    study_id character varying NOT NULL,
    status character varying(20) DEFAULT 'pending'::character varying,
    urgency character varying(20) DEFAULT 'routine'::character varying,
    ordered_date timestamp without time zone DEFAULT now() NOT NULL,
    sample_taken_date timestamp without time zone,
    expected_date timestamp without time zone,
    completed_date timestamp without time zone,
    notes text,
    branch_id character varying,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    CONSTRAINT lab_orders_status_check CHECK (((status)::text = ANY ((ARRAY['pending'::character varying, 'sample_taken'::character varying, 'in_progress'::character varying, 'completed'::character varying, 'cancelled'::character varying])::text[]))),
    CONSTRAINT lab_orders_urgency_check CHECK (((urgency)::text = ANY ((ARRAY['routine'::character varying, 'urgent'::character varying, 'stat'::character varying])::text[])))
);


ALTER TABLE public.lab_orders OWNER TO neondb_owner;

--
-- Name: lab_parameters; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.lab_parameters (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    study_id character varying NOT NULL,
    name character varying(255) NOT NULL,
    code character varying(50),
    unit character varying(50) NOT NULL,
    data_type character varying(20) DEFAULT 'numeric'::character varying,
    sort_order integer DEFAULT 0,
    is_active boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.lab_parameters OWNER TO neondb_owner;

--
-- Name: lab_result_details; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.lab_result_details (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    order_id character varying NOT NULL,
    parameter_id character varying NOT NULL,
    value character varying(255),
    numeric_value numeric(15,6),
    status character varying(20) DEFAULT 'normal'::character varying,
    reference_range_id character varying,
    flags character varying(50),
    notes text,
    reported_date timestamp without time zone DEFAULT now() NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    CONSTRAINT lab_result_details_status_check CHECK (((status)::text = ANY ((ARRAY['normal'::character varying, 'low'::character varying, 'high'::character varying, 'critical_low'::character varying, 'critical_high'::character varying])::text[])))
);


ALTER TABLE public.lab_result_details OWNER TO neondb_owner;

--
-- Name: lab_results; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.lab_results (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    patient_id character varying NOT NULL,
    doctor_id character varying NOT NULL,
    medical_record_id character varying,
    test_type character varying(255) NOT NULL,
    test_name character varying(255) NOT NULL,
    results jsonb NOT NULL,
    normal_ranges jsonb,
    status character varying(20) DEFAULT 'pending'::character varying,
    performed_date timestamp without time zone NOT NULL,
    received_date timestamp without time zone DEFAULT now() NOT NULL,
    notes text,
    lab_technician_name character varying(255),
    urgency character varying(20) DEFAULT 'normal'::character varying,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    CONSTRAINT lab_results_status_check CHECK (((status)::text = ANY ((ARRAY['pending'::character varying, 'in_progress'::character varying, 'completed'::character varying, 'abnormal'::character varying, 'critical'::character varying])::text[]))),
    CONSTRAINT lab_results_urgency_check CHECK (((urgency)::text = ANY ((ARRAY['normal'::character varying, 'urgent'::character varying, 'stat'::character varying])::text[])))
);


ALTER TABLE public.lab_results OWNER TO neondb_owner;

--
-- Name: lab_studies; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.lab_studies (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    name character varying(255) NOT NULL,
    category character varying(100) NOT NULL,
    code character varying(50),
    description text,
    preparation_instructions text,
    sample_type character varying(100),
    estimated_duration integer,
    price numeric(10,2),
    is_active boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.lab_studies OWNER TO neondb_owner;

--
-- Name: medical_records; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.medical_records (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    patient_id character varying NOT NULL,
    doctor_id character varying NOT NULL,
    appointment_id character varying,
    visit_date timestamp without time zone NOT NULL,
    visit_type character varying(255) NOT NULL,
    complaints text,
    diagnosis text,
    treatment jsonb,
    temperature numeric(3,1),
    weight numeric(5,2),
    next_visit timestamp without time zone,
    status character varying(20) DEFAULT 'active'::character varying,
    notes text,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    branch_id character varying,
    CONSTRAINT medical_records_status_check CHECK (((status)::text = ANY ((ARRAY['active'::character varying, 'completed'::character varying, 'follow_up_required'::character varying])::text[]))),
    CONSTRAINT medical_records_temperature_check CHECK (((temperature >= 30.0) AND (temperature <= 45.0))),
    CONSTRAINT medical_records_weight_check CHECK ((weight >= (0)::numeric))
);


ALTER TABLE public.medical_records OWNER TO neondb_owner;

--
-- Name: medications; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.medications (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    record_id character varying NOT NULL,
    name character varying(255) NOT NULL,
    dosage character varying(255) NOT NULL,
    frequency character varying(255) NOT NULL,
    duration character varying(255) NOT NULL,
    instructions text,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.medications OWNER TO neondb_owner;

--
-- Name: owners; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.owners (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    name character varying(255) NOT NULL,
    phone character varying(50) NOT NULL,
    email character varying(255),
    address text,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    branch_id character varying
);


ALTER TABLE public.owners OWNER TO neondb_owner;

--
-- Name: patient_files; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.patient_files (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    patient_id character varying NOT NULL,
    file_name character varying(255) NOT NULL,
    original_name character varying(255) NOT NULL,
    file_type character varying(50) NOT NULL,
    mime_type character varying(100) NOT NULL,
    file_size integer NOT NULL,
    file_path text NOT NULL,
    description text,
    uploaded_by character varying NOT NULL,
    medical_record_id character varying,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    CONSTRAINT patient_files_file_size_check CHECK ((file_size > 0)),
    CONSTRAINT patient_files_file_type_check CHECK (((file_type)::text = ANY ((ARRAY['medical_image'::character varying, 'xray'::character varying, 'scan'::character varying, 'receipt'::character varying, 'lab_result'::character varying, 'vaccine_record'::character varying, 'document'::character varying, 'other'::character varying])::text[])))
);


ALTER TABLE public.patient_files OWNER TO neondb_owner;

--
-- Name: patients; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.patients (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    name character varying(255) NOT NULL,
    species character varying(100) NOT NULL,
    breed character varying(255),
    gender character varying(10),
    birth_date timestamp without time zone,
    color character varying(255),
    weight numeric(5,2),
    microchip_number character varying(255),
    is_neutered boolean DEFAULT false,
    allergies text,
    chronic_conditions text,
    special_marks text,
    status character varying(20) DEFAULT 'healthy'::character varying,
    owner_id character varying NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    branch_id character varying,
    CONSTRAINT patients_gender_check CHECK (((gender)::text = ANY ((ARRAY['male'::character varying, 'female'::character varying, 'unknown'::character varying])::text[]))),
    CONSTRAINT patients_status_check CHECK (((status)::text = ANY ((ARRAY['healthy'::character varying, 'sick'::character varying, 'recovering'::character varying, 'deceased'::character varying])::text[]))),
    CONSTRAINT patients_weight_check CHECK ((weight >= (0)::numeric))
);


ALTER TABLE public.patients OWNER TO neondb_owner;

--
-- Name: products; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.products (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    name character varying(255) NOT NULL,
    category character varying(255) NOT NULL,
    price numeric(10,2) NOT NULL,
    stock integer DEFAULT 0,
    min_stock integer DEFAULT 0,
    unit character varying(50) NOT NULL,
    description text,
    is_active boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    CONSTRAINT products_min_stock_check CHECK ((min_stock >= 0)),
    CONSTRAINT products_price_check CHECK ((price >= (0)::numeric)),
    CONSTRAINT products_stock_check CHECK ((stock >= 0))
);


ALTER TABLE public.products OWNER TO neondb_owner;

--
-- Name: reference_ranges; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.reference_ranges (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    parameter_id character varying NOT NULL,
    species character varying(100) NOT NULL,
    breed character varying(255),
    gender character varying(10),
    age_min integer,
    age_max integer,
    range_min numeric(15,6),
    range_max numeric(15,6),
    critical_min numeric(15,6),
    critical_max numeric(15,6),
    notes text,
    is_active boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.reference_ranges OWNER TO neondb_owner;

--
-- Name: services; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.services (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    name character varying(255) NOT NULL,
    category character varying(255) NOT NULL,
    price numeric(10,2) NOT NULL,
    duration integer,
    description text,
    is_active boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    CONSTRAINT services_duration_check CHECK (((duration IS NULL) OR (duration > 0))),
    CONSTRAINT services_price_check CHECK ((price >= (0)::numeric))
);


ALTER TABLE public.services OWNER TO neondb_owner;

--
-- Name: sms_verification_codes; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.sms_verification_codes (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    user_id character varying NOT NULL,
    phone character varying(20) NOT NULL,
    code_hash text NOT NULL,
    purpose character varying(20) NOT NULL,
    expires_at timestamp without time zone NOT NULL,
    attempt_count integer DEFAULT 0 NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    CONSTRAINT sms_codes_purpose_check CHECK (((purpose)::text = ANY ((ARRAY['phone_verification'::character varying, '2fa'::character varying])::text[])))
);


ALTER TABLE public.sms_verification_codes OWNER TO neondb_owner;

--
-- Name: users; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.users (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    username character varying(100) NOT NULL,
    password text NOT NULL,
    email character varying(255),
    full_name character varying(255) NOT NULL,
    role character varying(50) NOT NULL,
    status character varying(20) DEFAULT 'active'::character varying,
    last_login timestamp without time zone,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    phone character varying(20),
    phone_verified boolean DEFAULT false,
    two_factor_enabled boolean DEFAULT false,
    two_factor_method character varying(10) DEFAULT 'sms'::character varying,
    branch_id character varying,
    CONSTRAINT users_role_check CHECK (((role)::text = ANY ((ARRAY['врач'::character varying, 'администратор'::character varying, 'менеджер'::character varying, 'менеджер_склада'::character varying, 'руководитель'::character varying])::text[]))),
    CONSTRAINT users_status_check CHECK (((status)::text = ANY ((ARRAY['active'::character varying, 'inactive'::character varying])::text[]))),
    CONSTRAINT users_two_factor_method_check CHECK (((two_factor_method)::text = ANY ((ARRAY['sms'::character varying, 'disabled'::character varying])::text[])))
);


ALTER TABLE public.users OWNER TO neondb_owner;

--
-- Data for Name: appointments; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.appointments (id, patient_id, doctor_id, appointment_date, duration, appointment_type, status, notes, created_at, updated_at, branch_id) FROM stdin;
efd2ab56-046a-4ce0-b831-d06f8340a275	349735c2-d364-4a29-b33f-b5a8913da4e0	b53f4cca-b68c-4b33-b7d5-fb5b1eeca575	2025-09-16 10:00:00	30	Плановый осмотр	confirmed	Плановая вакцинация	2025-09-16 12:08:36.639014	2025-09-16 12:08:36.639014	f9c369e8-9f58-4195-bd8e-a5bc4a03a3ed
d2e67233-18af-4eb9-952c-2308db596b3d	f42fc982-5819-4738-897e-0666a098024f	e8408460-a472-4384-826a-90b07afa1a42	2025-09-16 11:30:00	60	Хирургическая операция	scheduled	Операция по исправлению дисплазии	2025-09-16 12:08:36.689663	2025-09-16 12:08:36.689663	f9c369e8-9f58-4195-bd8e-a5bc4a03a3ed
c52a7ad6-7d51-4fc0-a92b-34cda6443e8b	b105cdbd-3a1a-4f8d-82b3-f9f209cd7146	871aa753-8951-45d3-bdaf-18dbf77fe647	2025-09-17 09:00:00	20	Консультация	scheduled	Проверка состояния кожи	2025-09-16 12:08:36.723046	2025-09-16 12:08:36.723046	f9c369e8-9f58-4195-bd8e-a5bc4a03a3ed
\.


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
-- Data for Name: invoice_items; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.invoice_items (id, invoice_id, item_type, item_id, item_name, quantity, price, total, created_at) FROM stdin;
aba4be3b-c9e6-4e9b-bdb5-6f971568486d	87bd1634-3fbf-4a3f-b19f-3efd92a032c8	service	831d93dc-2d37-4785-9f76-d9dd3ca3d04f	Общий клинический осмотр	1	800.00	800.00	2025-09-16 12:08:37.218844
f026b71a-f6bc-4ba3-b85e-e65f3ff9db2a	87bd1634-3fbf-4a3f-b19f-3efd92a032c8	service	7b201f61-ca30-4c99-bd18-9be5956d86e8	Вакцинация против бешенства	1	1500.00	1500.00	2025-09-16 12:08:37.265239
c8d765de-e382-498f-ba26-3ef0ebe0df3e	87bd1634-3fbf-4a3f-b19f-3efd92a032c8	product	ba76123e-4bcf-4464-9469-ecb34dba821e	Витамины для собак	2	350.00	700.00	2025-09-16 12:08:37.299168
\.


--
-- Data for Name: invoices; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.invoices (id, invoice_number, patient_id, appointment_id, issue_date, due_date, subtotal, discount, total, status, payment_method, paid_date, notes, created_at, updated_at) FROM stdin;
87bd1634-3fbf-4a3f-b19f-3efd92a032c8	INV-2025-0916-001	349735c2-d364-4a29-b33f-b5a8913da4e0	efd2ab56-046a-4ce0-b831-d06f8340a275	2025-09-13 00:00:00	2025-09-23 00:00:00	3000.00	150.00	2850.00	pending	\N	\N	Следующий визит через 2 недели для контрольного осмотра	2025-09-16 12:08:37.167992	2025-09-16 12:08:37.167992
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
-- Data for Name: medications; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.medications (id, record_id, name, dosage, frequency, duration, instructions, created_at) FROM stdin;
12403592-f087-496c-8e45-c8bad04e9724	ff1d7af9-57d9-4c34-9c9a-6a643f211289	Омепразол	20 мг	2 раза в день	7 дней	Давать за 30 минут до еды	2025-09-16 12:08:36.812002
0c41ce28-360a-4707-97c2-f1721e65752b	ff1d7af9-57d9-4c34-9c9a-6a643f211289	Пробиотик	1 капсула	1 раз в день	14 дней	Давать во время еды	2025-09-16 12:08:36.862295
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
-- Data for Name: patient_files; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.patient_files (id, patient_id, file_name, original_name, file_type, mime_type, file_size, file_path, description, uploaded_by, medical_record_id, created_at, updated_at) FROM stdin;
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
-- Data for Name: products; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.products (id, name, category, price, stock, min_stock, unit, description, is_active, created_at, updated_at) FROM stdin;
db24c78b-5063-4089-a45e-5a86e6ffcc41	Корм Royal Canin для кошек	Корма	850.00	3	5	уп	Сухой корм для взрослых кошек. Полнорационное питание	t	2025-09-16 12:08:37.050407	2025-09-16 12:08:37.050407
ba76123e-4bcf-4464-9469-ecb34dba821e	Витамины для собак	Препараты	450.00	15	10	шт	Комплекс витаминов и минералов для собак	t	2025-09-16 12:08:37.100708	2025-09-16 12:08:37.100708
daa1ef14-4837-4ce2-8453-524309a9c2c8	Антибиотик широкого спектра	Медикаменты	320.00	2	8	фл	Антибактериальный препарат для лечения инфекций	t	2025-09-16 12:08:37.134317	2025-09-16 12:08:37.134317
\.


--
-- Data for Name: reference_ranges; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.reference_ranges (id, parameter_id, species, breed, gender, age_min, age_max, range_min, range_max, critical_min, critical_max, notes, is_active, created_at, updated_at) FROM stdin;
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
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.users (id, username, password, email, full_name, role, status, last_login, created_at, updated_at, phone, phone_verified, two_factor_enabled, two_factor_method, branch_id) FROM stdin;
e2b1a026-8404-4938-969c-0c7a7684d645	testadmin	$2b$12$LyLPkRJpgLCXwgZjXvowxO7SX0J4t5l.YgJ6ZZl2RtQKwmJL2SqnC	test@admin.com	Тестовый Администратор	администратор	active	\N	2025-09-17 01:39:39.77831	2025-09-17 01:39:39.77831	\N	f	f	sms	4360ed52-9417-4ce1-b9ea-6543898d162a
1e62a7c8-b942-4506-bf1d-8e0385f632b2	admin	admin123	s.mailbox@bk.ru	Системный Администратор	администратор	active	2025-09-17 17:40:05.836	2025-09-17 00:09:11.195933	2025-09-17 00:41:15.076	+79268949839	f	f	disabled	f9c369e8-9f58-4195-bd8e-a5bc4a03a3ed
81be9b16-f825-4bc7-9ff6-7177d9d953e2	demo	$2b$12$R/pPpqNdITB8NsClQ13gte8FxQMRPB5vL0BhaFjiYme0Ia2h7MPg2	\N	Демо Пользователь	администратор	active	2025-09-17 20:23:20.679	2025-09-17 18:01:04.579589	2025-09-17 18:01:04.579589	\N	f	f	sms	\N
\.


--
-- Name: appointments appointments_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.appointments
    ADD CONSTRAINT appointments_pkey PRIMARY KEY (id);


--
-- Name: branches branches_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.branches
    ADD CONSTRAINT branches_pkey PRIMARY KEY (id);


--
-- Name: doctors doctors_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.doctors
    ADD CONSTRAINT doctors_pkey PRIMARY KEY (id);


--
-- Name: invoice_items invoice_items_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.invoice_items
    ADD CONSTRAINT invoice_items_pkey PRIMARY KEY (id);


--
-- Name: invoices invoices_invoice_number_unique; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.invoices
    ADD CONSTRAINT invoices_invoice_number_unique UNIQUE (invoice_number);


--
-- Name: invoices invoices_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.invoices
    ADD CONSTRAINT invoices_pkey PRIMARY KEY (id);


--
-- Name: lab_orders lab_orders_order_number_unique; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.lab_orders
    ADD CONSTRAINT lab_orders_order_number_unique UNIQUE (order_number);


--
-- Name: lab_orders lab_orders_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.lab_orders
    ADD CONSTRAINT lab_orders_pkey PRIMARY KEY (id);


--
-- Name: lab_parameters lab_parameters_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.lab_parameters
    ADD CONSTRAINT lab_parameters_pkey PRIMARY KEY (id);


--
-- Name: lab_result_details lab_result_details_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.lab_result_details
    ADD CONSTRAINT lab_result_details_pkey PRIMARY KEY (id);


--
-- Name: lab_results lab_results_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.lab_results
    ADD CONSTRAINT lab_results_pkey PRIMARY KEY (id);


--
-- Name: lab_studies lab_studies_code_unique; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.lab_studies
    ADD CONSTRAINT lab_studies_code_unique UNIQUE (code);


--
-- Name: lab_studies lab_studies_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.lab_studies
    ADD CONSTRAINT lab_studies_pkey PRIMARY KEY (id);


--
-- Name: medical_records medical_records_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.medical_records
    ADD CONSTRAINT medical_records_pkey PRIMARY KEY (id);


--
-- Name: medications medications_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.medications
    ADD CONSTRAINT medications_pkey PRIMARY KEY (id);


--
-- Name: owners owners_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.owners
    ADD CONSTRAINT owners_pkey PRIMARY KEY (id);


--
-- Name: patient_files patient_files_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.patient_files
    ADD CONSTRAINT patient_files_pkey PRIMARY KEY (id);


--
-- Name: patients patients_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.patients
    ADD CONSTRAINT patients_pkey PRIMARY KEY (id);


--
-- Name: products products_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.products
    ADD CONSTRAINT products_pkey PRIMARY KEY (id);


--
-- Name: reference_ranges reference_ranges_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.reference_ranges
    ADD CONSTRAINT reference_ranges_pkey PRIMARY KEY (id);


--
-- Name: services services_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.services
    ADD CONSTRAINT services_pkey PRIMARY KEY (id);


--
-- Name: sms_verification_codes sms_verification_codes_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.sms_verification_codes
    ADD CONSTRAINT sms_verification_codes_pkey PRIMARY KEY (id);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: users users_username_unique; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_unique UNIQUE (username);


--
-- Name: appointments_branch_id_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX appointments_branch_id_idx ON public.appointments USING btree (branch_id);


--
-- Name: appointments_date_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX appointments_date_idx ON public.appointments USING btree (appointment_date);


--
-- Name: appointments_doctor_date_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX appointments_doctor_date_idx ON public.appointments USING btree (doctor_id, appointment_date);


--
-- Name: appointments_doctor_id_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX appointments_doctor_id_idx ON public.appointments USING btree (doctor_id);


--
-- Name: appointments_patient_id_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX appointments_patient_id_idx ON public.appointments USING btree (patient_id);


--
-- Name: appointments_status_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX appointments_status_idx ON public.appointments USING btree (status);


--
-- Name: branches_city_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX branches_city_idx ON public.branches USING btree (city);


--
-- Name: branches_created_at_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX branches_created_at_idx ON public.branches USING btree (created_at);


--
-- Name: branches_manager_id_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX branches_manager_id_idx ON public.branches USING btree (manager_id);


--
-- Name: branches_name_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX branches_name_idx ON public.branches USING btree (name);


--
-- Name: branches_status_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX branches_status_idx ON public.branches USING btree (status);


--
-- Name: doctors_active_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX doctors_active_idx ON public.doctors USING btree (is_active);


--
-- Name: doctors_branch_id_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX doctors_branch_id_idx ON public.doctors USING btree (branch_id);


--
-- Name: doctors_created_at_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX doctors_created_at_idx ON public.doctors USING btree (created_at);


--
-- Name: doctors_name_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX doctors_name_idx ON public.doctors USING btree (name);


--
-- Name: doctors_specialization_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX doctors_specialization_idx ON public.doctors USING btree (specialization);


--
-- Name: invoice_items_invoice_id_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX invoice_items_invoice_id_idx ON public.invoice_items USING btree (invoice_id);


--
-- Name: invoice_items_item_id_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX invoice_items_item_id_idx ON public.invoice_items USING btree (item_id);


--
-- Name: invoice_items_item_type_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX invoice_items_item_type_idx ON public.invoice_items USING btree (item_type);


--
-- Name: invoices_created_at_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX invoices_created_at_idx ON public.invoices USING btree (created_at);


--
-- Name: invoices_due_date_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX invoices_due_date_idx ON public.invoices USING btree (due_date);


--
-- Name: invoices_issue_date_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX invoices_issue_date_idx ON public.invoices USING btree (issue_date);


--
-- Name: invoices_number_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX invoices_number_idx ON public.invoices USING btree (invoice_number);


--
-- Name: invoices_patient_id_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX invoices_patient_id_idx ON public.invoices USING btree (patient_id);


--
-- Name: invoices_status_due_date_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX invoices_status_due_date_idx ON public.invoices USING btree (status, due_date);


--
-- Name: invoices_status_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX invoices_status_idx ON public.invoices USING btree (status);


--
-- Name: invoices_status_issue_date_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX invoices_status_issue_date_idx ON public.invoices USING btree (status, issue_date);


--
-- Name: lab_orders_branch_id_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX lab_orders_branch_id_idx ON public.lab_orders USING btree (branch_id);


--
-- Name: lab_orders_doctor_id_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX lab_orders_doctor_id_idx ON public.lab_orders USING btree (doctor_id);


--
-- Name: lab_orders_order_number_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX lab_orders_order_number_idx ON public.lab_orders USING btree (order_number);


--
-- Name: lab_orders_ordered_date_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX lab_orders_ordered_date_idx ON public.lab_orders USING btree (ordered_date);


--
-- Name: lab_orders_patient_id_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX lab_orders_patient_id_idx ON public.lab_orders USING btree (patient_id);


--
-- Name: lab_orders_status_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX lab_orders_status_idx ON public.lab_orders USING btree (status);


--
-- Name: lab_orders_study_id_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX lab_orders_study_id_idx ON public.lab_orders USING btree (study_id);


--
-- Name: lab_orders_urgency_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX lab_orders_urgency_idx ON public.lab_orders USING btree (urgency);


--
-- Name: lab_parameters_active_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX lab_parameters_active_idx ON public.lab_parameters USING btree (is_active);


--
-- Name: lab_parameters_code_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX lab_parameters_code_idx ON public.lab_parameters USING btree (code);


--
-- Name: lab_parameters_name_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX lab_parameters_name_idx ON public.lab_parameters USING btree (name);


--
-- Name: lab_parameters_sort_order_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX lab_parameters_sort_order_idx ON public.lab_parameters USING btree (study_id, sort_order);


--
-- Name: lab_parameters_study_id_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX lab_parameters_study_id_idx ON public.lab_parameters USING btree (study_id);


--
-- Name: lab_result_details_order_id_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX lab_result_details_order_id_idx ON public.lab_result_details USING btree (order_id);


--
-- Name: lab_result_details_order_parameter_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX lab_result_details_order_parameter_idx ON public.lab_result_details USING btree (order_id, parameter_id);


--
-- Name: lab_result_details_parameter_id_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX lab_result_details_parameter_id_idx ON public.lab_result_details USING btree (parameter_id);


--
-- Name: lab_result_details_reported_date_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX lab_result_details_reported_date_idx ON public.lab_result_details USING btree (reported_date);


--
-- Name: lab_result_details_status_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX lab_result_details_status_idx ON public.lab_result_details USING btree (status);


--
-- Name: lab_results_created_at_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX lab_results_created_at_idx ON public.lab_results USING btree (created_at);


--
-- Name: lab_results_doctor_id_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX lab_results_doctor_id_idx ON public.lab_results USING btree (doctor_id);


--
-- Name: lab_results_medical_record_id_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX lab_results_medical_record_id_idx ON public.lab_results USING btree (medical_record_id);


--
-- Name: lab_results_patient_date_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX lab_results_patient_date_idx ON public.lab_results USING btree (patient_id, performed_date);


--
-- Name: lab_results_patient_id_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX lab_results_patient_id_idx ON public.lab_results USING btree (patient_id);


--
-- Name: lab_results_performed_date_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX lab_results_performed_date_idx ON public.lab_results USING btree (performed_date);


--
-- Name: lab_results_received_date_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX lab_results_received_date_idx ON public.lab_results USING btree (received_date);


--
-- Name: lab_results_status_date_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX lab_results_status_date_idx ON public.lab_results USING btree (status, performed_date);


--
-- Name: lab_results_status_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX lab_results_status_idx ON public.lab_results USING btree (status);


--
-- Name: lab_results_test_type_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX lab_results_test_type_idx ON public.lab_results USING btree (test_type);


--
-- Name: lab_results_urgency_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX lab_results_urgency_idx ON public.lab_results USING btree (urgency);


--
-- Name: lab_studies_active_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX lab_studies_active_idx ON public.lab_studies USING btree (is_active);


--
-- Name: lab_studies_category_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX lab_studies_category_idx ON public.lab_studies USING btree (category);


--
-- Name: lab_studies_code_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX lab_studies_code_idx ON public.lab_studies USING btree (code);


--
-- Name: lab_studies_name_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX lab_studies_name_idx ON public.lab_studies USING btree (name);


--
-- Name: medical_records_branch_id_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX medical_records_branch_id_idx ON public.medical_records USING btree (branch_id);


--
-- Name: medical_records_doctor_id_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX medical_records_doctor_id_idx ON public.medical_records USING btree (doctor_id);


--
-- Name: medical_records_patient_date_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX medical_records_patient_date_idx ON public.medical_records USING btree (patient_id, visit_date);


--
-- Name: medical_records_patient_id_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX medical_records_patient_id_idx ON public.medical_records USING btree (patient_id);


--
-- Name: medical_records_status_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX medical_records_status_idx ON public.medical_records USING btree (status);


--
-- Name: medical_records_visit_date_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX medical_records_visit_date_idx ON public.medical_records USING btree (visit_date);


--
-- Name: medications_name_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX medications_name_idx ON public.medications USING btree (name);


--
-- Name: medications_record_id_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX medications_record_id_idx ON public.medications USING btree (record_id);


--
-- Name: owners_branch_id_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX owners_branch_id_idx ON public.owners USING btree (branch_id);


--
-- Name: owners_created_at_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX owners_created_at_idx ON public.owners USING btree (created_at);


--
-- Name: owners_email_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX owners_email_idx ON public.owners USING btree (email);


--
-- Name: owners_name_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX owners_name_idx ON public.owners USING btree (name);


--
-- Name: owners_phone_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX owners_phone_idx ON public.owners USING btree (phone);


--
-- Name: patient_files_created_at_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX patient_files_created_at_idx ON public.patient_files USING btree (created_at);


--
-- Name: patient_files_file_type_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX patient_files_file_type_idx ON public.patient_files USING btree (file_type);


--
-- Name: patient_files_medical_record_id_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX patient_files_medical_record_id_idx ON public.patient_files USING btree (medical_record_id);


--
-- Name: patient_files_patient_id_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX patient_files_patient_id_idx ON public.patient_files USING btree (patient_id);


--
-- Name: patient_files_patient_type_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX patient_files_patient_type_idx ON public.patient_files USING btree (patient_id, file_type);


--
-- Name: patient_files_uploaded_by_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX patient_files_uploaded_by_idx ON public.patient_files USING btree (uploaded_by);


--
-- Name: patients_branch_id_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX patients_branch_id_idx ON public.patients USING btree (branch_id);


--
-- Name: patients_breed_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX patients_breed_idx ON public.patients USING btree (breed);


--
-- Name: patients_created_at_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX patients_created_at_idx ON public.patients USING btree (created_at);


--
-- Name: patients_microchip_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX patients_microchip_idx ON public.patients USING btree (microchip_number);


--
-- Name: patients_name_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX patients_name_idx ON public.patients USING btree (name);


--
-- Name: patients_owner_id_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX patients_owner_id_idx ON public.patients USING btree (owner_id);


--
-- Name: patients_species_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX patients_species_idx ON public.patients USING btree (species);


--
-- Name: patients_status_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX patients_status_idx ON public.patients USING btree (status);


--
-- Name: products_active_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX products_active_idx ON public.products USING btree (is_active);


--
-- Name: products_active_stock_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX products_active_stock_idx ON public.products USING btree (is_active, stock);


--
-- Name: products_category_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX products_category_idx ON public.products USING btree (category);


--
-- Name: products_created_at_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX products_created_at_idx ON public.products USING btree (created_at);


--
-- Name: products_low_stock_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX products_low_stock_idx ON public.products USING btree (stock, min_stock);


--
-- Name: products_name_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX products_name_idx ON public.products USING btree (name);


--
-- Name: products_stock_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX products_stock_idx ON public.products USING btree (stock);


--
-- Name: reference_ranges_active_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX reference_ranges_active_idx ON public.reference_ranges USING btree (is_active);


--
-- Name: reference_ranges_breed_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX reference_ranges_breed_idx ON public.reference_ranges USING btree (breed);


--
-- Name: reference_ranges_parameter_id_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX reference_ranges_parameter_id_idx ON public.reference_ranges USING btree (parameter_id);


--
-- Name: reference_ranges_parameter_species_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX reference_ranges_parameter_species_idx ON public.reference_ranges USING btree (parameter_id, species);


--
-- Name: reference_ranges_species_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX reference_ranges_species_idx ON public.reference_ranges USING btree (species);


--
-- Name: services_active_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX services_active_idx ON public.services USING btree (is_active);


--
-- Name: services_category_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX services_category_idx ON public.services USING btree (category);


--
-- Name: services_name_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX services_name_idx ON public.services USING btree (name);


--
-- Name: sms_codes_expires_at_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX sms_codes_expires_at_idx ON public.sms_verification_codes USING btree (expires_at);


--
-- Name: sms_codes_phone_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX sms_codes_phone_idx ON public.sms_verification_codes USING btree (phone);


--
-- Name: sms_codes_purpose_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX sms_codes_purpose_idx ON public.sms_verification_codes USING btree (purpose);


--
-- Name: sms_codes_user_id_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX sms_codes_user_id_idx ON public.sms_verification_codes USING btree (user_id);


--
-- Name: users_branch_id_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX users_branch_id_idx ON public.users USING btree (branch_id);


--
-- Name: users_phone_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX users_phone_idx ON public.users USING btree (phone);


--
-- Name: users_role_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX users_role_idx ON public.users USING btree (role);


--
-- Name: users_status_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX users_status_idx ON public.users USING btree (status);


--
-- Name: users_username_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX users_username_idx ON public.users USING btree (username);


--
-- Name: appointments appointments_branch_id_branches_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.appointments
    ADD CONSTRAINT appointments_branch_id_branches_id_fk FOREIGN KEY (branch_id) REFERENCES public.branches(id);


--
-- Name: appointments appointments_doctor_id_doctors_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.appointments
    ADD CONSTRAINT appointments_doctor_id_doctors_id_fk FOREIGN KEY (doctor_id) REFERENCES public.doctors(id);


--
-- Name: appointments appointments_patient_id_patients_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.appointments
    ADD CONSTRAINT appointments_patient_id_patients_id_fk FOREIGN KEY (patient_id) REFERENCES public.patients(id);


--
-- Name: doctors doctors_branch_id_branches_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.doctors
    ADD CONSTRAINT doctors_branch_id_branches_id_fk FOREIGN KEY (branch_id) REFERENCES public.branches(id);


--
-- Name: invoice_items invoice_items_invoice_id_invoices_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.invoice_items
    ADD CONSTRAINT invoice_items_invoice_id_invoices_id_fk FOREIGN KEY (invoice_id) REFERENCES public.invoices(id);


--
-- Name: invoices invoices_appointment_id_appointments_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.invoices
    ADD CONSTRAINT invoices_appointment_id_appointments_id_fk FOREIGN KEY (appointment_id) REFERENCES public.appointments(id);


--
-- Name: invoices invoices_patient_id_patients_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.invoices
    ADD CONSTRAINT invoices_patient_id_patients_id_fk FOREIGN KEY (patient_id) REFERENCES public.patients(id);


--
-- Name: lab_orders lab_orders_appointment_id_appointments_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.lab_orders
    ADD CONSTRAINT lab_orders_appointment_id_appointments_id_fk FOREIGN KEY (appointment_id) REFERENCES public.appointments(id);


--
-- Name: lab_orders lab_orders_branch_id_branches_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.lab_orders
    ADD CONSTRAINT lab_orders_branch_id_branches_id_fk FOREIGN KEY (branch_id) REFERENCES public.branches(id);


--
-- Name: lab_orders lab_orders_doctor_id_doctors_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.lab_orders
    ADD CONSTRAINT lab_orders_doctor_id_doctors_id_fk FOREIGN KEY (doctor_id) REFERENCES public.doctors(id);


--
-- Name: lab_orders lab_orders_medical_record_id_medical_records_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.lab_orders
    ADD CONSTRAINT lab_orders_medical_record_id_medical_records_id_fk FOREIGN KEY (medical_record_id) REFERENCES public.medical_records(id);


--
-- Name: lab_orders lab_orders_patient_id_patients_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.lab_orders
    ADD CONSTRAINT lab_orders_patient_id_patients_id_fk FOREIGN KEY (patient_id) REFERENCES public.patients(id);


--
-- Name: lab_orders lab_orders_study_id_lab_studies_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.lab_orders
    ADD CONSTRAINT lab_orders_study_id_lab_studies_id_fk FOREIGN KEY (study_id) REFERENCES public.lab_studies(id);


--
-- Name: lab_parameters lab_parameters_study_id_lab_studies_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.lab_parameters
    ADD CONSTRAINT lab_parameters_study_id_lab_studies_id_fk FOREIGN KEY (study_id) REFERENCES public.lab_studies(id);


--
-- Name: lab_result_details lab_result_details_order_id_lab_orders_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.lab_result_details
    ADD CONSTRAINT lab_result_details_order_id_lab_orders_id_fk FOREIGN KEY (order_id) REFERENCES public.lab_orders(id);


--
-- Name: lab_result_details lab_result_details_parameter_id_lab_parameters_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.lab_result_details
    ADD CONSTRAINT lab_result_details_parameter_id_lab_parameters_id_fk FOREIGN KEY (parameter_id) REFERENCES public.lab_parameters(id);


--
-- Name: lab_result_details lab_result_details_reference_range_id_reference_ranges_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.lab_result_details
    ADD CONSTRAINT lab_result_details_reference_range_id_reference_ranges_id_fk FOREIGN KEY (reference_range_id) REFERENCES public.reference_ranges(id);


--
-- Name: lab_results lab_results_doctor_id_doctors_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.lab_results
    ADD CONSTRAINT lab_results_doctor_id_doctors_id_fk FOREIGN KEY (doctor_id) REFERENCES public.doctors(id);


--
-- Name: lab_results lab_results_medical_record_id_medical_records_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.lab_results
    ADD CONSTRAINT lab_results_medical_record_id_medical_records_id_fk FOREIGN KEY (medical_record_id) REFERENCES public.medical_records(id);


--
-- Name: lab_results lab_results_patient_id_patients_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.lab_results
    ADD CONSTRAINT lab_results_patient_id_patients_id_fk FOREIGN KEY (patient_id) REFERENCES public.patients(id);


--
-- Name: medical_records medical_records_appointment_id_appointments_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.medical_records
    ADD CONSTRAINT medical_records_appointment_id_appointments_id_fk FOREIGN KEY (appointment_id) REFERENCES public.appointments(id);


--
-- Name: medical_records medical_records_branch_id_branches_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.medical_records
    ADD CONSTRAINT medical_records_branch_id_branches_id_fk FOREIGN KEY (branch_id) REFERENCES public.branches(id);


--
-- Name: medical_records medical_records_doctor_id_doctors_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.medical_records
    ADD CONSTRAINT medical_records_doctor_id_doctors_id_fk FOREIGN KEY (doctor_id) REFERENCES public.doctors(id);


--
-- Name: medical_records medical_records_patient_id_patients_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.medical_records
    ADD CONSTRAINT medical_records_patient_id_patients_id_fk FOREIGN KEY (patient_id) REFERENCES public.patients(id);


--
-- Name: medications medications_record_id_medical_records_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.medications
    ADD CONSTRAINT medications_record_id_medical_records_id_fk FOREIGN KEY (record_id) REFERENCES public.medical_records(id);


--
-- Name: owners owners_branch_id_branches_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.owners
    ADD CONSTRAINT owners_branch_id_branches_id_fk FOREIGN KEY (branch_id) REFERENCES public.branches(id);


--
-- Name: patient_files patient_files_medical_record_id_medical_records_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.patient_files
    ADD CONSTRAINT patient_files_medical_record_id_medical_records_id_fk FOREIGN KEY (medical_record_id) REFERENCES public.medical_records(id);


--
-- Name: patient_files patient_files_patient_id_patients_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.patient_files
    ADD CONSTRAINT patient_files_patient_id_patients_id_fk FOREIGN KEY (patient_id) REFERENCES public.patients(id);


--
-- Name: patient_files patient_files_uploaded_by_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.patient_files
    ADD CONSTRAINT patient_files_uploaded_by_users_id_fk FOREIGN KEY (uploaded_by) REFERENCES public.users(id);


--
-- Name: patients patients_branch_id_branches_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.patients
    ADD CONSTRAINT patients_branch_id_branches_id_fk FOREIGN KEY (branch_id) REFERENCES public.branches(id);


--
-- Name: patients patients_owner_id_owners_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.patients
    ADD CONSTRAINT patients_owner_id_owners_id_fk FOREIGN KEY (owner_id) REFERENCES public.owners(id);


--
-- Name: reference_ranges reference_ranges_parameter_id_lab_parameters_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.reference_ranges
    ADD CONSTRAINT reference_ranges_parameter_id_lab_parameters_id_fk FOREIGN KEY (parameter_id) REFERENCES public.lab_parameters(id);


--
-- Name: sms_verification_codes sms_verification_codes_user_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.sms_verification_codes
    ADD CONSTRAINT sms_verification_codes_user_id_users_id_fk FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: users users_branch_id_branches_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_branch_id_branches_id_fk FOREIGN KEY (branch_id) REFERENCES public.branches(id);


--
-- Name: DEFAULT PRIVILEGES FOR SEQUENCES; Type: DEFAULT ACL; Schema: public; Owner: cloud_admin
--

ALTER DEFAULT PRIVILEGES FOR ROLE cloud_admin IN SCHEMA public GRANT ALL ON SEQUENCES TO neon_superuser WITH GRANT OPTION;


--
-- Name: DEFAULT PRIVILEGES FOR TABLES; Type: DEFAULT ACL; Schema: public; Owner: cloud_admin
--

ALTER DEFAULT PRIVILEGES FOR ROLE cloud_admin IN SCHEMA public GRANT ALL ON TABLES TO neon_superuser WITH GRANT OPTION;


--
-- PostgreSQL database dump complete
--

