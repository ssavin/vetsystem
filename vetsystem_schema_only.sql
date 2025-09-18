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

