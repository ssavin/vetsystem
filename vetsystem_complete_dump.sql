--
-- PostgreSQL database dump
--

-- Dumped from database version 16.9 (63f4182)
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
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.branches OWNER TO neondb_owner;

--
-- Name: cash_operations; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.cash_operations (
    id character varying(255) NOT NULL,
    register_id character varying(255) NOT NULL,
    shift_id character varying(255) NOT NULL,
    cashier_id character varying(255) NOT NULL,
    type character varying(20) NOT NULL,
    amount numeric(10,2) NOT NULL,
    reason character varying(255),
    notes text,
    created_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.cash_operations OWNER TO neondb_owner;

--
-- Name: cash_registers; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.cash_registers (
    id character varying(255) NOT NULL,
    branch_id character varying(255) NOT NULL,
    name character varying(255) NOT NULL,
    serial_number character varying(255),
    model character varying(255),
    fiscal_drive_number character varying(255),
    is_active boolean DEFAULT true,
    com_port character varying(20),
    printer_type character varying(50) DEFAULT 'atol'::character varying,
    settings jsonb DEFAULT '{}'::jsonb,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.cash_registers OWNER TO neondb_owner;

--
-- Name: cash_shifts; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.cash_shifts (
    id character varying(255) NOT NULL,
    register_id character varying(255) NOT NULL,
    cashier_id character varying(255) NOT NULL,
    shift_number integer NOT NULL,
    opened_at timestamp without time zone DEFAULT now(),
    closed_at timestamp without time zone,
    opening_cash_amount numeric(10,2) DEFAULT '0'::numeric,
    closing_cash_amount numeric(10,2),
    expected_cash_amount numeric(10,2),
    cash_difference numeric(10,2),
    total_sales numeric(10,2) DEFAULT '0'::numeric,
    total_returns numeric(10,2) DEFAULT '0'::numeric,
    receipts_count integer DEFAULT 0,
    returns_count integer DEFAULT 0,
    status character varying(20) DEFAULT 'open'::character varying,
    notes text
);


ALTER TABLE public.cash_shifts OWNER TO neondb_owner;

--
-- Name: catalog_item_markings; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.catalog_item_markings (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    catalog_item_id character varying NOT NULL,
    data_matrix_code text NOT NULL,
    gtin character varying(100),
    serial_number character varying(255),
    crypto_tail text,
    production_date timestamp without time zone,
    expiry_date timestamp without time zone,
    is_used boolean DEFAULT false,
    validation_status character varying(20) DEFAULT 'pending'::character varying,
    honest_sign_response jsonb,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    CONSTRAINT catalog_item_markings_validation_status_check CHECK (((validation_status)::text = ANY ((ARRAY['pending'::character varying, 'valid'::character varying, 'invalid'::character varying, 'expired'::character varying])::text[])))
);


ALTER TABLE public.catalog_item_markings OWNER TO neondb_owner;

--
-- Name: catalog_items; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.catalog_items (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    name character varying(255) NOT NULL,
    type character varying(20) NOT NULL,
    category character varying(255) NOT NULL,
    price numeric(10,2) NOT NULL,
    unit character varying(50) NOT NULL,
    vat_rate character varying(20) DEFAULT '20'::character varying,
    marking_status character varying(20) DEFAULT 'not_required'::character varying,
    external_id character varying(255),
    integration_source character varying(20),
    description text,
    is_active boolean DEFAULT true,
    stock integer DEFAULT 0,
    min_stock integer DEFAULT 0,
    duration integer,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    CONSTRAINT catalog_items_marking_status_check CHECK (((marking_status)::text = ANY ((ARRAY['required'::character varying, 'not_required'::character varying, 'marked'::character varying, 'validation_error'::character varying])::text[]))),
    CONSTRAINT catalog_items_price_check CHECK ((price >= (0)::numeric)),
    CONSTRAINT catalog_items_stock_check CHECK ((stock >= 0)),
    CONSTRAINT catalog_items_type_check CHECK (((type)::text = ANY ((ARRAY['service'::character varying, 'product'::character varying, 'medication'::character varying])::text[]))),
    CONSTRAINT catalog_items_vat_rate_check CHECK (((vat_rate)::text = ANY ((ARRAY['0'::character varying, '10'::character varying, '20'::character varying, 'not_applicable'::character varying])::text[])))
);


ALTER TABLE public.catalog_items OWNER TO neondb_owner;

--
-- Name: customers; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.customers (
    id character varying(255) NOT NULL,
    branch_id character varying(255) NOT NULL,
    type character varying(20) DEFAULT 'individual'::character varying,
    first_name character varying(255),
    last_name character varying(255),
    middle_name character varying(255),
    company_name character varying(255),
    phone character varying(20),
    email character varying(255),
    country character varying(100) DEFAULT 'Россия'::character varying,
    region character varying(255),
    city character varying(255),
    address text,
    postal_code character varying(20),
    card_number character varying(100),
    discount_percent numeric(5,2) DEFAULT '0'::numeric,
    bonus_points numeric(10,2) DEFAULT '0'::numeric,
    total_purchases numeric(12,2) DEFAULT '0'::numeric,
    purchases_count integer DEFAULT 0,
    last_visit timestamp without time zone,
    birth_date date,
    notes text,
    tags text[],
    is_vip boolean DEFAULT false,
    is_active boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.customers OWNER TO neondb_owner;

--
-- Name: discount_rules; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.discount_rules (
    id character varying(255) NOT NULL,
    branch_id character varying(255) NOT NULL,
    name character varying(255) NOT NULL,
    type character varying(50) NOT NULL,
    value numeric(10,2) NOT NULL,
    min_purchase_amount numeric(10,2),
    max_discount_amount numeric(10,2),
    apply_to_products text[],
    apply_to_services text[],
    apply_to_categories text[],
    valid_from timestamp without time zone,
    valid_to timestamp without time zone,
    valid_days_of_week text[],
    valid_time_from time without time zone,
    valid_time_to time without time zone,
    usage_limit integer,
    usage_count integer DEFAULT 0,
    is_active boolean DEFAULT true,
    is_combinable boolean DEFAULT false,
    priority integer DEFAULT 0,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.discount_rules OWNER TO neondb_owner;

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
-- Name: fiscal_receipts; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.fiscal_receipts (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    invoice_id character varying NOT NULL,
    receipt_number character varying(255),
    status character varying(20) DEFAULT 'draft'::character varying,
    receipt_type character varying(20) DEFAULT 'sale'::character varying,
    payment_method character varying(20) NOT NULL,
    customer_email character varying(255),
    customer_phone character varying(50),
    taxation_system character varying(20) DEFAULT 'common'::character varying NOT NULL,
    operator_name character varying(255),
    operator_inn character varying(12),
    total_amount numeric(10,2) NOT NULL,
    vat_amount numeric(10,2) DEFAULT '0'::numeric,
    cash_amount numeric(10,2) DEFAULT '0'::numeric,
    card_amount numeric(10,2) DEFAULT '0'::numeric,
    items jsonb NOT NULL,
    marking_status character varying(20) DEFAULT 'not_required'::character varying,
    fiscal_data jsonb,
    integration_account_id character varying,
    external_receipt_id character varying(255),
    error_message text,
    sent_at timestamp without time zone,
    registered_at timestamp without time zone,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    local_print_status character varying(20) DEFAULT 'pending'::character varying,
    local_print_requested boolean DEFAULT false,
    local_printer_type character varying(20),
    local_printed_at timestamp without time zone,
    local_print_data jsonb,
    local_print_error text,
    CONSTRAINT fiscal_receipts_local_print_status_check CHECK (((local_print_status)::text = ANY ((ARRAY['pending'::character varying, 'queued'::character varying, 'printed'::character varying, 'failed'::character varying])::text[]))),
    CONSTRAINT fiscal_receipts_local_printer_type_check CHECK (((local_printer_type IS NULL) OR ((local_printer_type)::text = ANY ((ARRAY['atol'::character varying, 'shtrih'::character varying])::text[])))),
    CONSTRAINT fiscal_receipts_payment_method_check CHECK (((payment_method)::text = ANY ((ARRAY['cash'::character varying, 'card'::character varying, 'online'::character varying, 'mixed'::character varying])::text[]))),
    CONSTRAINT fiscal_receipts_status_check CHECK (((status)::text = ANY ((ARRAY['draft'::character varying, 'pending'::character varying, 'registered'::character varying, 'failed'::character varying, 'cancelled'::character varying])::text[]))),
    CONSTRAINT fiscal_receipts_total_amount_check CHECK ((total_amount >= (0)::numeric))
);


ALTER TABLE public.fiscal_receipts OWNER TO neondb_owner;

--
-- Name: integration_accounts; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.integration_accounts (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    name character varying(255) NOT NULL,
    type character varying(20) NOT NULL,
    status character varying(20) DEFAULT 'inactive'::character varying,
    api_credentials jsonb NOT NULL,
    settings jsonb,
    last_sync_at timestamp without time zone,
    last_error_at timestamp without time zone,
    last_error text,
    sync_frequency integer DEFAULT 3600,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    CONSTRAINT integration_accounts_status_check CHECK (((status)::text = ANY ((ARRAY['active'::character varying, 'inactive'::character varying, 'error'::character varying, 'testing'::character varying])::text[]))),
    CONSTRAINT integration_accounts_type_check CHECK (((type)::text = ANY ((ARRAY['1c_kassa'::character varying, 'moysklad'::character varying, 'yookassa'::character varying, 'honest_sign'::character varying])::text[])))
);


ALTER TABLE public.integration_accounts OWNER TO neondb_owner;

--
-- Name: integration_jobs; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.integration_jobs (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    integration_account_id character varying NOT NULL,
    job_type character varying(50) NOT NULL,
    status character varying(20) DEFAULT 'pending'::character varying,
    priority integer DEFAULT 5,
    payload jsonb,
    result jsonb,
    error_message text,
    attempt_count integer DEFAULT 0,
    max_attempts integer DEFAULT 3,
    next_attempt_at timestamp without time zone,
    started_at timestamp without time zone,
    completed_at timestamp without time zone,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    CONSTRAINT integration_jobs_priority_check CHECK (((priority >= 1) AND (priority <= 10))),
    CONSTRAINT integration_jobs_status_check CHECK (((status)::text = ANY ((ARRAY['pending'::character varying, 'running'::character varying, 'completed'::character varying, 'failed'::character varying, 'retrying'::character varying])::text[])))
);


ALTER TABLE public.integration_jobs OWNER TO neondb_owner;

--
-- Name: integration_logs; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.integration_logs (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    integration_account_id character varying,
    job_id character varying,
    level character varying(10) DEFAULT 'info'::character varying,
    event character varying(100) NOT NULL,
    message text NOT NULL,
    metadata jsonb,
    user_id character varying,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    CONSTRAINT integration_logs_level_check CHECK (((level)::text = ANY ((ARRAY['debug'::character varying, 'info'::character varying, 'warn'::character varying, 'error'::character varying])::text[])))
);


ALTER TABLE public.integration_logs OWNER TO neondb_owner;

--
-- Name: integration_mappings; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.integration_mappings (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    integration_account_id character varying NOT NULL,
    external_id character varying(255) NOT NULL,
    internal_id character varying(255) NOT NULL,
    entity_type character varying(50) NOT NULL,
    metadata jsonb,
    last_sync_at timestamp without time zone,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.integration_mappings OWNER TO neondb_owner;

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
    vat_rate character varying(20) DEFAULT '20'::character varying,
    product_code character varying(255),
    marking_status character varying(50),
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
    payment_id character varying(255),
    payment_url character varying(500),
    fiscal_receipt_id character varying(255),
    fiscal_receipt_url character varying(500),
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
-- Name: payment_intents; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.payment_intents (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    invoice_id character varying NOT NULL,
    fiscal_receipt_id character varying,
    amount numeric(10,2) NOT NULL,
    currency character varying(3) DEFAULT 'RUB'::character varying,
    payment_method character varying(20) NOT NULL,
    status character varying(20) DEFAULT 'pending'::character varying,
    integration_account_id character varying,
    external_payment_id character varying(255),
    payment_data jsonb,
    confirmed_at timestamp without time zone,
    error_message text,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    CONSTRAINT payment_intents_amount_check CHECK ((amount > (0)::numeric)),
    CONSTRAINT payment_intents_payment_method_check CHECK (((payment_method)::text = ANY ((ARRAY['cash'::character varying, 'card'::character varying, 'online'::character varying, 'mixed'::character varying])::text[]))),
    CONSTRAINT payment_intents_status_check CHECK (((status)::text = ANY ((ARRAY['pending'::character varying, 'processing'::character varying, 'succeeded'::character varying, 'failed'::character varying, 'cancelled'::character varying])::text[])))
);


ALTER TABLE public.payment_intents OWNER TO neondb_owner;

--
-- Name: payment_methods; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.payment_methods (
    id character varying(255) NOT NULL,
    branch_id character varying(255) NOT NULL,
    name character varying(255) NOT NULL,
    type character varying(50) NOT NULL,
    is_active boolean DEFAULT true,
    requires_change boolean DEFAULT false,
    is_electronic boolean DEFAULT false,
    commission numeric(5,2) DEFAULT '0'::numeric,
    settings jsonb DEFAULT '{}'::jsonb,
    created_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.payment_methods OWNER TO neondb_owner;

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
    moysklad_id character varying(255),
    article character varying(255),
    vat integer DEFAULT 20,
    last_synced_at timestamp without time zone,
    sync_hash character varying(64),
    deleted_at timestamp without time zone,
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
-- Name: sales_transaction_items; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.sales_transaction_items (
    id character varying(255) NOT NULL,
    transaction_id character varying(255) NOT NULL,
    product_id character varying(255),
    service_id character varying(255),
    name character varying(255) NOT NULL,
    sku character varying(255),
    barcode character varying(255),
    quantity numeric(10,3) NOT NULL,
    unit_price numeric(10,2) NOT NULL,
    discount_amount numeric(10,2) DEFAULT '0'::numeric,
    total_price numeric(10,2) NOT NULL,
    tax_rate numeric(5,2) DEFAULT '20'::numeric,
    tax_amount numeric(10,2) DEFAULT '0'::numeric,
    marking_codes text[],
    created_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.sales_transaction_items OWNER TO neondb_owner;

--
-- Name: sales_transactions; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.sales_transactions (
    id character varying(255) NOT NULL,
    register_id character varying(255) NOT NULL,
    shift_id character varying(255) NOT NULL,
    cashier_id character varying(255) NOT NULL,
    customer_id character varying(255),
    invoice_id character varying(255),
    receipt_number character varying(100),
    fiscal_number character varying(100),
    shift_number integer,
    subtotal numeric(10,2) NOT NULL,
    discount_amount numeric(10,2) DEFAULT '0'::numeric,
    tax_amount numeric(10,2) DEFAULT '0'::numeric,
    total_amount numeric(10,2) NOT NULL,
    type character varying(20) DEFAULT 'sale'::character varying,
    payment_method_id character varying(255),
    applied_discounts jsonb DEFAULT '[]'::jsonb,
    bonus_points_earned numeric(10,2) DEFAULT '0'::numeric,
    bonus_points_used numeric(10,2) DEFAULT '0'::numeric,
    is_fiscalized boolean DEFAULT false,
    is_synced boolean DEFAULT false,
    fiscal_data jsonb,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.sales_transactions OWNER TO neondb_owner;

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
    moysklad_id character varying(255),
    article character varying(255),
    vat integer DEFAULT 20,
    last_synced_at timestamp without time zone,
    sync_hash character varying(64),
    deleted_at timestamp without time zone,
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
-- Name: system_settings; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.system_settings (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    key character varying(100) NOT NULL,
    value text NOT NULL,
    description text,
    category character varying(50) NOT NULL,
    is_active boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.system_settings OWNER TO neondb_owner;

--
-- Name: user_role_assignments; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.user_role_assignments (
    id character varying(255) NOT NULL,
    user_id character varying(255) NOT NULL,
    role_id character varying(255) NOT NULL,
    branch_id character varying(255),
    assigned_at timestamp without time zone DEFAULT now(),
    assigned_by character varying(255)
);


ALTER TABLE public.user_role_assignments OWNER TO neondb_owner;

--
-- Name: user_roles; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.user_roles (
    id character varying(255) NOT NULL,
    name character varying(255) NOT NULL,
    description text,
    permissions jsonb DEFAULT '{}'::jsonb,
    is_active boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.user_roles OWNER TO neondb_owner;

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
    branch_id character varying
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
-- Data for Name: cash_operations; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.cash_operations (id, register_id, shift_id, cashier_id, type, amount, reason, notes, created_at) FROM stdin;
\.


--
-- Data for Name: cash_registers; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.cash_registers (id, branch_id, name, serial_number, model, fiscal_drive_number, is_active, com_port, printer_type, settings, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: cash_shifts; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.cash_shifts (id, register_id, cashier_id, shift_number, opened_at, closed_at, opening_cash_amount, closing_cash_amount, expected_cash_amount, cash_difference, total_sales, total_returns, receipts_count, returns_count, status, notes) FROM stdin;
\.


--
-- Data for Name: catalog_item_markings; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.catalog_item_markings (id, catalog_item_id, data_matrix_code, gtin, serial_number, crypto_tail, production_date, expiry_date, is_used, validation_status, honest_sign_response, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: catalog_items; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.catalog_items (id, name, type, category, price, unit, vat_rate, marking_status, external_id, integration_source, description, is_active, stock, min_stock, duration, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: customers; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.customers (id, branch_id, type, first_name, last_name, middle_name, company_name, phone, email, country, region, city, address, postal_code, card_number, discount_percent, bonus_points, total_purchases, purchases_count, last_visit, birth_date, notes, tags, is_vip, is_active, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: discount_rules; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.discount_rules (id, branch_id, name, type, value, min_purchase_amount, max_discount_amount, apply_to_products, apply_to_services, apply_to_categories, valid_from, valid_to, valid_days_of_week, valid_time_from, valid_time_to, usage_limit, usage_count, is_active, is_combinable, priority, created_at, updated_at) FROM stdin;
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
-- Data for Name: fiscal_receipts; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.fiscal_receipts (id, invoice_id, receipt_number, status, receipt_type, payment_method, customer_email, customer_phone, taxation_system, operator_name, operator_inn, total_amount, vat_amount, cash_amount, card_amount, items, marking_status, fiscal_data, integration_account_id, external_receipt_id, error_message, sent_at, registered_at, created_at, updated_at, local_print_status, local_print_requested, local_printer_type, local_printed_at, local_print_data, local_print_error) FROM stdin;
2df330c9-5e04-45e3-8fa6-a249758aac4b	c70f0b09-3fa7-43dc-9f25-bf3abd0c3da2	\N	pending	payment	cash	petrova.as@example.com	+7 (999) 987-65-43	usn_income	\N	\N	2200.00	0.00	2200.00	0.00	[]	not_required	\N	\N	\N	\N	\N	\N	2025-09-25 01:07:05.932	2025-09-25 01:07:05.932	pending	f	\N	\N	\N	\N
4588c33a-4691-4908-b039-adf101c9528c	c70f0b09-3fa7-43dc-9f25-bf3abd0c3da2	\N	pending	payment	cash	petrova.as@example.com	+7 (999) 987-65-43	usn_income	\N	\N	2200.00	0.00	2200.00	0.00	[]	not_required	\N	\N	\N	\N	\N	\N	2025-09-25 01:39:41.056	2025-09-25 01:39:41.056	pending	f	\N	\N	\N	\N
62a2fc43-820b-4f20-a651-2ef316bd39ee	c70f0b09-3fa7-43dc-9f25-bf3abd0c3da2	\N	pending	payment	cash	petrova.as@example.com	+7 (999) 987-65-43	usn_income	\N	\N	2200.00	0.00	2200.00	0.00	[]	not_required	\N	\N	\N	\N	\N	\N	2025-09-25 01:51:08.328	2025-09-25 01:51:08.328	pending	f	\N	\N	\N	\N
fa2e9f5e-8f14-4ab0-833c-1301770cbf92	c70f0b09-3fa7-43dc-9f25-bf3abd0c3da2	\N	pending	payment	cash	petrova.as@example.com	+7 (999) 987-65-43	usn_income	\N	\N	2200.00	0.00	2200.00	0.00	[]	not_required	\N	\N	\N	\N	\N	\N	2025-09-25 05:08:54.808	2025-09-25 05:08:54.808	pending	f	\N	\N	\N	\N
13b37c02-59d7-4226-b181-a0e6767c09d1	c70f0b09-3fa7-43dc-9f25-bf3abd0c3da2	\N	pending	payment	cash	petrova.as@example.com	+7 (999) 987-65-43	usn_income	\N	\N	2200.00	0.00	2200.00	0.00	[]	not_required	\N	\N	\N	\N	\N	\N	2025-09-25 05:12:11.394	2025-09-25 05:12:11.394	pending	f	\N	\N	\N	\N
53d3353c-4cd8-42c4-bb0a-e9a2fff5d988	0c1724c0-b14b-49f6-9c59-60169ab124b1	\N	draft	sale	cash	\N	\N	simplified_income	Демо Пользователь	\N	2020.00	0.00	2020.00	0.00	[]	not_required	\N	\N	\N	\N	\N	\N	2025-09-27 09:24:37.089	2025-09-27 09:24:37.089	pending	t	atol	\N	\N	\N
\.


--
-- Data for Name: integration_accounts; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.integration_accounts (id, name, type, status, api_credentials, settings, last_sync_at, last_error_at, last_error, sync_frequency, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: integration_jobs; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.integration_jobs (id, integration_account_id, job_type, status, priority, payload, result, error_message, attempt_count, max_attempts, next_attempt_at, started_at, completed_at, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: integration_logs; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.integration_logs (id, integration_account_id, job_id, level, event, message, metadata, user_id, created_at) FROM stdin;
\.


--
-- Data for Name: integration_mappings; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.integration_mappings (id, integration_account_id, external_id, internal_id, entity_type, metadata, last_sync_at, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: invoice_items; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.invoice_items (id, invoice_id, item_type, item_id, item_name, quantity, price, total, created_at, vat_rate, product_code, marking_status) FROM stdin;
aba4be3b-c9e6-4e9b-bdb5-6f971568486d	87bd1634-3fbf-4a3f-b19f-3efd92a032c8	service	831d93dc-2d37-4785-9f76-d9dd3ca3d04f	Общий клинический осмотр	1	800.00	800.00	2025-09-16 12:08:37.218844	20	\N	\N
f026b71a-f6bc-4ba3-b85e-e65f3ff9db2a	87bd1634-3fbf-4a3f-b19f-3efd92a032c8	service	7b201f61-ca30-4c99-bd18-9be5956d86e8	Вакцинация против бешенства	1	1500.00	1500.00	2025-09-16 12:08:37.265239	20	\N	\N
c8d765de-e382-498f-ba26-3ef0ebe0df3e	87bd1634-3fbf-4a3f-b19f-3efd92a032c8	product	ba76123e-4bcf-4464-9469-ecb34dba821e	Витамины для собак	2	350.00	700.00	2025-09-16 12:08:37.299168	20	\N	\N
\.


--
-- Data for Name: invoices; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.invoices (id, invoice_number, patient_id, appointment_id, issue_date, due_date, subtotal, discount, total, status, payment_method, paid_date, notes, created_at, updated_at, payment_id, payment_url, fiscal_receipt_id, fiscal_receipt_url) FROM stdin;
87bd1634-3fbf-4a3f-b19f-3efd92a032c8	INV-2025-0916-001	349735c2-d364-4a29-b33f-b5a8913da4e0	efd2ab56-046a-4ce0-b831-d06f8340a275	2025-09-13 00:00:00	2025-09-23 00:00:00	3000.00	150.00	2850.00	pending	\N	\N	Следующий визит через 2 недели для контрольного осмотра	2025-09-16 12:08:37.167992	2025-09-16 12:08:37.167992	\N	\N	\N	\N
bf1d17ab-3884-436e-b51c-5efe614bb02f	INV-20250925-00001	f42fc982-5819-4738-897e-0666a098024f	\N	2025-09-25 00:26:40.941868	\N	6020.00	0.00	6020.00	pending	\N	\N		2025-09-25 00:26:40.941868	2025-09-25 00:26:40.941868	\N	\N	\N	\N
7331b405-4390-4bc7-9863-ef2ca548f37f	INV-20250925-00011	349735c2-d364-4a29-b33f-b5a8913da4e0	\N	2025-09-25 00:29:20.378959	\N	2200.00	0.00	2200.00	pending	\N	\N		2025-09-25 00:29:20.378959	2025-09-25 00:29:20.378959	\N	\N	\N	\N
c70f0b09-3fa7-43dc-9f25-bf3abd0c3da2	INV-20250925-00021	f42fc982-5819-4738-897e-0666a098024f	\N	2025-09-25 00:36:09.173816	\N	2200.00	0.00	2200.00	pending	\N	\N		2025-09-25 00:36:09.173816	2025-09-25 00:36:09.173816	\N	\N	\N	\N
0c1724c0-b14b-49f6-9c59-60169ab124b1	INV-20250925-00031	f42fc982-5819-4738-897e-0666a098024f	\N	2025-09-25 13:17:15.124613	\N	2020.00	0.00	2020.00	pending	\N	\N		2025-09-25 13:17:15.124613	2025-09-25 13:17:15.124613	\N	\N	\N	\N
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
dd7c389b-08fd-43cb-87ed-e4248b4dbf40	123	123	\N	123	\N	\N	\N	\N	t	2025-09-23 08:54:25.056671	2025-09-23 08:54:25.056671
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
-- Data for Name: payment_intents; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.payment_intents (id, invoice_id, fiscal_receipt_id, amount, currency, payment_method, status, integration_account_id, external_payment_id, payment_data, confirmed_at, error_message, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: payment_methods; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.payment_methods (id, branch_id, name, type, is_active, requires_change, is_electronic, commission, settings, created_at) FROM stdin;
\.


--
-- Data for Name: products; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.products (id, name, category, price, stock, min_stock, unit, description, is_active, created_at, updated_at, moysklad_id, article, vat, last_synced_at, sync_hash, deleted_at) FROM stdin;
db24c78b-5063-4089-a45e-5a86e6ffcc41	Корм Royal Canin для кошек	Корма	850.00	3	5	уп	Сухой корм для взрослых кошек. Полнорационное питание	t	2025-09-16 12:08:37.050407	2025-09-16 12:08:37.050407	\N	\N	20	\N	\N	\N
ba76123e-4bcf-4464-9469-ecb34dba821e	Витамины для собак	Препараты	450.00	15	10	шт	Комплекс витаминов и минералов для собак	t	2025-09-16 12:08:37.100708	2025-09-16 12:08:37.100708	\N	\N	20	\N	\N	\N
daa1ef14-4837-4ce2-8453-524309a9c2c8	Антибиотик широкого спектра	Медикаменты	320.00	2	8	фл	Антибактериальный препарат для лечения инфекций	t	2025-09-16 12:08:37.134317	2025-09-16 12:08:37.134317	\N	\N	20	\N	\N	\N
997c8703-dc68-4c15-8aec-db5fd2728dec	Мильбемакс 50мл	Ветпрепараты	520.00	0	0	уп.		t	2025-09-25 00:01:23.834194	2025-09-25 00:01:23.834194	\N	\N	20	\N	\N	\N
659a87db-3bd4-41fd-90d8-c3cf21c26f5f	Оплата ветеринарных услуг	МойСклад	0.00	0	0	шт		t	2025-09-27 04:30:36.484144	2025-09-27 05:15:12.911	6852703e-9b35-11f0-0a80-017600131a9c		20	\N	\N	\N
602189a7-ceb9-4f48-be26-410f53d0f73c	экспресс тест VetExpert	МойСклад	1430.00	0	0	шт		t	2025-09-27 04:30:36.570685	2025-09-27 05:15:12.952	6855c840-9b35-11f0-0a80-017600131aa1		20	\N	\N	\N
4237881c-27f9-48ed-aa30-6e3b6e3b5841	Предопла	МойСклад	11000.00	0	0	шт		t	2025-09-27 04:30:36.645436	2025-09-27 05:15:12.987	685a8ba4-9b35-11f0-0a80-017600131aa8		20	\N	\N	\N
a198041e-a96f-4626-99b0-d18d917d0472	Оплата задолженности	МойСклад	71977.00	0	0	шт		t	2025-09-27 04:30:36.715386	2025-09-27 05:15:13.023	685d90ee-9b35-11f0-0a80-017600131aad		20	\N	\N	\N
2a882dc4-3b76-42c0-a148-9a8b7bf744e8	Прием врача нефролога-уролога повторный	МойСклад	1815.00	0	0	шт		t	2025-09-27 04:30:36.851464	2025-09-27 05:15:13.103	696b69be-9b35-11f0-0a80-017600131b7d		20	\N	\N	\N
a339adff-8de7-43fb-aaf9-38747e83f957	Мильбемакс 50мл	МойСклад	0.00	0	0	шт		t	2025-09-27 04:30:36.919742	2025-09-27 05:15:13.137	6dc77605-9b4b-11f0-0a80-1625002d2d35	997c8703-dc68-4c15-8aec-db5fd2728dec	20	\N	\N	\N
c0786bf0-b041-4c87-b1ed-18421d30f65e	Корм Royal Canin для кошек	МойСклад	0.00	0	0	шт	Сухой корм для взрослых кошек. Полнорационное питание	t	2025-09-27 04:30:36.98695	2025-09-27 05:15:13.171	6dff2910-9b4b-11f0-0a80-0428002e3139	db24c78b-5063-4089-a45e-5a86e6ffcc41	20	\N	\N	\N
e9255ff4-4994-43d3-af4b-1fbb14b957d7	Антибиотик широкого спектра	МойСклад	0.00	0	0	шт	Антибактериальный препарат для лечения инфекций	t	2025-09-27 04:30:37.055205	2025-09-27 05:15:13.206	6e550702-9b4b-11f0-0a80-02d7002e86ad	daa1ef14-4837-4ce2-8453-524309a9c2c8	20	\N	\N	\N
3340cb2f-b24e-41da-b5fc-3c880dcf3e88	Витамины для собак	МойСклад	0.00	0	0	шт	Комплекс витаминов и минералов для собак	t	2025-09-27 04:30:37.126323	2025-09-27 05:15:13.239	6e8eec6f-9b4b-11f0-0a80-02d7002e86bb	ba76123e-4bcf-4464-9469-ecb34dba821e	20	\N	\N	\N
7b6e21df-a507-4123-a55f-23e2822f6207	14.1.10 Эстрадиол	МойСклад	2420.00	0	0	шт		t	2025-09-27 04:30:37.198341	2025-09-27 05:15:13.277	b5f95c86-9b35-11f0-0a80-017600136c5c		20	\N	\N	\N
d521783e-e1ba-4502-aa37-3fc0077c6c1c	14.1.11 Тестостерон	МойСклад	2420.00	0	0	шт		t	2025-09-27 04:30:37.267076	2025-09-27 05:15:13.31	b5fcf49e-9b35-11f0-0a80-017600136c61		20	\N	\N	\N
fe4248c7-6249-4801-93f1-d0674773420a	14.1.12 Малая дексаметазоновая проба	МойСклад	6600.00	0	0	шт		t	2025-09-27 04:30:37.338366	2025-09-27 05:15:13.344	b6008ec2-9b35-11f0-0a80-017600136c66		20	\N	\N	\N
0497dc8b-2fcd-47c3-a616-361d1850d66d	14.1.13 Большая дексаметазоновая проба	МойСклад	6600.00	0	0	шт		t	2025-09-27 04:30:37.406364	2025-09-27 05:15:13.379	b604277e-9b35-11f0-0a80-017600136c6b		20	\N	\N	\N
639ace19-1636-4036-b741-6209e1e9dc47	15.1.19 Токсоплазмоз Ig М	МойСклад	1672.00	0	0	шт		t	2025-09-27 04:30:37.47477	2025-09-27 05:15:13.412	b608145d-9b35-11f0-0a80-017600136c70		20	\N	\N	\N
0e51db39-008f-4fba-ae8f-3bde985f2153	15.1.21 Хламидиоз Ig G	МойСклад	1672.00	0	0	шт		t	2025-09-27 04:30:37.542374	2025-09-27 05:15:13.446	b623f892-9b35-11f0-0a80-017600136c89		20	\N	\N	\N
a0c14889-3160-452e-904d-c9bf2102275c	14.1.1 Соотношение кортизол/креатинин в моче	МойСклад	2420.00	0	0	шт		t	2025-09-27 04:30:37.61075	2025-09-27 05:15:13.48	b6b745ed-9b35-11f0-0a80-017600136d01		20	\N	\N	\N
25394df8-73cc-4152-aa11-1bff2507521a	14.1.2 ТТГ собак	МойСклад	2772.00	0	0	шт		t	2025-09-27 04:30:37.680724	2025-09-27 05:15:13.514	b6bacb34-9b35-11f0-0a80-017600136d06		20	\N	\N	\N
271dd26b-9e35-497b-8069-ecf737398655	14.1.3 Т4 общий	МойСклад	2178.00	0	0	шт		t	2025-09-27 04:30:37.749856	2025-09-27 05:15:13.549	b6be4753-9b35-11f0-0a80-017600136d0b		20	\N	\N	\N
c3d10a29-7e6b-4861-a664-f597e2379adb	14.1.4 Т4 свободный	МойСклад	2178.00	0	0	шт		t	2025-09-27 04:30:37.818089	2025-09-27 05:15:13.583	b6c1961c-9b35-11f0-0a80-017600136d10		20	\N	\N	\N
ccc9bb02-cd0f-45fb-b498-94b1a17ef6c4	14.1.5 Т3 общий	МойСклад	2420.00	0	0	шт		t	2025-09-27 04:30:37.887235	2025-09-27 05:15:13.617	b6c4f3fc-9b35-11f0-0a80-017600136d15		20	\N	\N	\N
32738559-f7c4-4547-8ffa-4c0dd1695b0a	14.1.6 Т3 свободный	МойСклад	2420.00	0	0	шт		t	2025-09-27 04:30:37.956053	2025-09-27 05:15:13.65	b6c81348-9b35-11f0-0a80-017600136d1a		20	\N	\N	\N
a124792c-cce8-445b-bd17-460a6c3bc730	14.1.7 Кортизол	МойСклад	2420.00	0	0	шт		t	2025-09-27 04:30:38.025547	2025-09-27 05:15:13.684	b6cb51a1-9b35-11f0-0a80-017600136d1f		20	\N	\N	\N
28e0e4e1-47fe-471b-a0f6-9ea0280cc4ce	14.1.8 Прогестерон	МойСклад	2420.00	0	0	шт		t	2025-09-27 04:30:38.096947	2025-09-27 05:15:13.718	b6ce8397-9b35-11f0-0a80-017600136d24		20	\N	\N	\N
76c2fc42-f556-4f08-a2f8-f9b6e6bf3df9	14.1.9 Прогестерон - CITO	МойСклад	4180.00	0	0	шт		t	2025-09-27 04:30:38.166148	2025-09-27 05:15:13.751	b6d2229f-9b35-11f0-0a80-017600136d29		20	\N	\N	\N
32a17943-3827-4052-b83f-ab15b20f30e6	14.2.1 Кортизол собак	МойСклад	2772.00	0	0	шт		t	2025-09-27 04:30:38.235502	2025-09-27 05:15:13.785	b6d5a1b5-9b35-11f0-0a80-017600136d2e		20	\N	\N	\N
66d654fb-967e-4362-bd45-385342d1f879	14.2.2 Т4 общий собак/ кошек	МойСклад	2772.00	0	0	шт		t	2025-09-27 04:30:38.303861	2025-09-27 05:15:13.818	b6d8f2bc-9b35-11f0-0a80-017600136d33		20	\N	\N	\N
4dbed535-65df-462d-aaac-2d4197c38fd6	14.2.3 ТТГ собак	МойСклад	2772.00	0	0	шт		t	2025-09-27 04:30:38.37244	2025-09-27 05:15:13.852	b6dc5f9c-9b35-11f0-0a80-017600136d38		20	\N	\N	\N
4691ee78-758c-46fc-8a1a-6ef77d11a0b1	15.1.1 Вирусная лейкемия кошек Ag	МойСклад	3190.00	0	0	шт		t	2025-09-27 04:30:38.440882	2025-09-27 05:15:13.886	b6df9a42-9b35-11f0-0a80-017600136d3d		20	\N	\N	\N
e69e209b-36d7-4ba5-a32d-9439e9bb24ad	15.1.2 Вирусная лейкемия кошек Ag - CITO	МойСклад	5830.00	0	0	шт		t	2025-09-27 04:30:38.509106	2025-09-27 05:15:13.919	b6e2d26d-9b35-11f0-0a80-017600136d42		20	\N	\N	\N
c16dbac8-b6cd-4bc5-ac9e-7a7f9a7140c1	15.1.3 Вирусный иммунодефицит кошек Ab	МойСклад	3190.00	0	0	шт		t	2025-09-27 04:30:38.577774	2025-09-27 05:15:13.961	b6e65058-9b35-11f0-0a80-017600136d47		20	\N	\N	\N
608b23f0-cb97-499d-9cd3-96ba0c4031ad	15.1.5 Коронавирусная инфекция кошек FCOV (Вирусный перитонит кошек FIP)  Ab (скрининговое исследование)	МойСклад	3190.00	0	0	шт		t	2025-09-27 04:30:38.719248	2025-09-27 05:15:14.03	b6ed9729-9b35-11f0-0a80-017600136d51		20	\N	\N	\N
f18190a1-1b25-467d-86a5-c1405fd12902	15.1.6 Коронавирусная инфекция кошек FCOV (Вирусный перитонит кошек FIP)  Ab (скрининговое исследование) - CITO	МойСклад	5830.00	0	0	шт		t	2025-09-27 04:30:38.787772	2025-09-27 05:15:14.063	b6f0efa1-9b35-11f0-0a80-017600136d56		20	\N	\N	\N
8d36a89b-75bf-4a5c-9f6d-2cc636bb8c2c	15.1.7 Коронавирусная инфекция кошек FCOV (Вирусный перитонит кошек FIP)  Ab (определение титра антител)	МойСклад	6314.00	0	0	шт		t	2025-09-27 04:30:38.855813	2025-09-27 05:15:14.096	b6f42057-9b35-11f0-0a80-017600136d5b		20	\N	\N	\N
fc5daec1-412c-4b4c-a411-0433064d7ffc	15.1.8 Коронавирусная инфекция кошек FCOV (Вирусный перитонит кошек FIP)  Ab (определение титра антител) - CITO	МойСклад	7260.00	0	0	шт		t	2025-09-27 04:30:38.923239	2025-09-27 05:15:14.13	b6f74661-9b35-11f0-0a80-017600136d60		20	\N	\N	\N
deb0d55b-83ff-4460-a880-e4762661c3ae	15.1.9 Герпесвирус Ig G	МойСклад	1672.00	0	0	шт		t	2025-09-27 04:30:38.990632	2025-09-27 05:15:14.163	b6faba66-9b35-11f0-0a80-017600136d65		20	\N	\N	\N
e2a6e215-35c8-4974-a0f7-a07318da67e5	15.1.10 Герпесвирус Ig G - CITO	МойСклад	2310.00	0	0	шт		t	2025-09-27 04:30:39.059016	2025-09-27 05:15:14.196	b6fe3617-9b35-11f0-0a80-017600136d6a		20	\N	\N	\N
062564a6-6bea-4af6-8aac-8e5c958c3df4	15.1.11 Микоплазмоз Ig G	МойСклад	1672.00	0	0	шт		t	2025-09-27 04:30:39.128009	2025-09-27 05:15:14.229	b701abd4-9b35-11f0-0a80-017600136d6f		20	\N	\N	\N
c5d0febe-b79b-424f-b52f-c95c9eec0d46	15.1.12 Микоплазмоз Ig G - CITO	МойСклад	2310.00	0	0	шт		t	2025-09-27 04:30:39.196625	2025-09-27 05:15:14.263	b704b629-9b35-11f0-0a80-017600136d74		20	\N	\N	\N
836815cf-7092-4f4d-8f2f-5946152afe14	15.1.13 Панлейкопения кошек Ig G	МойСклад	1914.00	0	0	шт		t	2025-09-27 04:30:39.265647	2025-09-27 05:15:14.296	b7089fd0-9b35-11f0-0a80-017600136d79		20	\N	\N	\N
67c9ef73-95ec-4342-b312-2bf02945a323	15.1.14 Панлейкопения кошек Ig G - CITO	МойСклад	2640.00	0	0	шт		t	2025-09-27 04:30:39.337059	2025-09-27 05:15:14.33	b70becc6-9b35-11f0-0a80-017600136d7e		20	\N	\N	\N
fe634880-1898-4c69-b7df-511f903a8774	15.1.15 Парвовирусная инфекция собак Ig G	МойСклад	1914.00	0	0	шт		t	2025-09-27 04:30:39.405698	2025-09-27 05:15:14.363	b70fb31f-9b35-11f0-0a80-017600136d83		20	\N	\N	\N
bb5a9a89-5127-4935-8d9b-33cfe2f7d658	15.1.16 Парвовирусная инфекция собак Ig G - CITO	МойСклад	2640.00	0	0	шт		t	2025-09-27 04:30:39.474491	2025-09-27 05:15:14.396	b7142bab-9b35-11f0-0a80-017600136d88		20	\N	\N	\N
1e94b962-afb6-432f-8d9b-44c7e8189552	15.1.17 Токсоплазмоз Ig G	МойСклад	1672.00	0	0	шт		t	2025-09-27 04:30:39.542218	2025-09-27 05:15:14.43	b7179ccc-9b35-11f0-0a80-017600136d8d		20	\N	\N	\N
4b9b4215-917c-4601-bcd1-a1977c0e9268	15.1.18 Токсоплазмоз Ig G - CITO	МойСклад	2310.00	0	0	шт		t	2025-09-27 04:30:39.609989	2025-09-27 05:15:14.463	b71b2bf2-9b35-11f0-0a80-017600136d92		20	\N	\N	\N
e50a7bd8-92a4-4615-8378-8cecaec4f960	15.1.20 Токсоплазмоз Ig М - CITO	МойСклад	2310.00	0	0	шт		t	2025-09-27 04:30:39.677951	2025-09-27 05:15:14.496	b71e9197-9b35-11f0-0a80-017600136d97		20	\N	\N	\N
be73ac28-8c33-4fe6-99cd-eccb8c6205b6	15.1.22 Хламидиоз Ig G - CITO	МойСклад	2310.00	0	0	шт		t	2025-09-27 04:30:39.747312	2025-09-27 05:15:14.529	b721e4f5-9b35-11f0-0a80-017600136d9c		20	\N	\N	\N
60fc4388-fba5-43c1-9b18-7430ff52b6c6	15.1.23 Чума плотоядных Ig G	МойСклад	2640.00	0	0	шт		t	2025-09-27 04:30:39.817422	2025-09-27 05:15:14.563	b72551f7-9b35-11f0-0a80-017600136da1		20	\N	\N	\N
c87135f3-6906-430e-8964-21d14532682b	15.1.24 Чума плотоядных Ig G - CITO	МойСклад	4158.00	0	0	шт		t	2025-09-27 04:30:39.886037	2025-09-27 05:15:14.597	b728bde8-9b35-11f0-0a80-017600136da6		20	\N	\N	\N
f8b92f1b-eb49-4498-bbd0-dc32f2fffd93	15.1.25 Ig E общий собак	МойСклад	2926.00	0	0	шт		t	2025-09-27 04:30:39.954651	2025-09-27 05:15:14.63	b72cc0a1-9b35-11f0-0a80-017600136dab		20	\N	\N	\N
492ddd3f-56ba-4413-a90e-48d522518873	15.2.1 Определение титра антител к вирусу иммунодефицита кошек FIV-Ab	МойСклад	2310.00	0	0	шт		t	2025-09-27 04:30:40.023723	2025-09-27 05:15:14.663	b7304c8a-9b35-11f0-0a80-017600136db0		20	\N	\N	\N
d6f55d0f-ec34-4f2c-b4fe-9e860169ff38	15.2.2 Определение вируса лейкоза кошек FeLV-Ag	МойСклад	2310.00	0	0	шт		t	2025-09-27 04:30:40.091758	2025-09-27 05:15:14.697	b733d102-9b35-11f0-0a80-017600136db5		20	\N	\N	\N
895cf67f-c870-43aa-8f14-b49c7f269e7b	15.2.3 Контроль вакцинации у собак (инфекционный гепатит ICH, парвовироз собак CPV, чума СDV) Ab	МойСклад	3740.00	0	0	шт		t	2025-09-27 04:30:40.160215	2025-09-27 05:15:14.73	b7378449-9b35-11f0-0a80-017600136dba		20	\N	\N	\N
871e3ac5-9fc4-4bf0-90f1-26ef14a5ac57	16.1 РЕСПИРАТОРНЫЙ	МойСклад	4180.00	0	0	шт		t	2025-09-27 04:30:40.29758	2025-09-27 05:15:14.796	b73efaae-9b35-11f0-0a80-017600136dc4		20	\N	\N	\N
42f8ba91-2b66-436b-89d3-ac37379b070a	16.2 РЕПРОДУКТИВНЫЙ	МойСклад	5500.00	0	0	шт		t	2025-09-27 04:30:40.370031	2025-09-27 05:15:14.829	b743226a-9b35-11f0-0a80-017600136dc9		20	\N	\N	\N
ede5c8d7-228e-4093-bca8-338a3b5368d2	16.3 ИММУНОДЕФИЦИТНЫЙ	МойСклад	8140.00	0	0	шт		t	2025-09-27 04:30:40.439042	2025-09-27 05:15:14.862	b746ce03-9b35-11f0-0a80-017600136dce		20	\N	\N	\N
d3dba283-5c70-4352-a64d-1e603aa004ca	16.4 ГАСТРОЭНТЕРАЛЬНЫЙ	МойСклад	6160.00	0	0	шт		t	2025-09-27 04:30:40.516232	2025-09-27 05:15:14.895	b74a5aa0-9b35-11f0-0a80-017600136dd3		20	\N	\N	\N
2625932e-77a1-4730-a35f-89ffd2a0ac6c	17.1 РЕСПИРАТОРНЫЙ	МойСклад	5500.00	0	0	шт		t	2025-09-27 04:30:40.586127	2025-09-27 05:15:14.929	b74d9725-9b35-11f0-0a80-017600136dd8		20	\N	\N	\N
e7fac7b1-761e-4b43-a5b2-dfa11ce8f56d	17.2 РЕПРОДУКТИВНЫЙ	МойСклад	4180.00	0	0	шт		t	2025-09-27 04:30:40.654807	2025-09-27 05:15:14.962	b7512206-9b35-11f0-0a80-017600136ddd		20	\N	\N	\N
266a7360-6156-471d-9f5c-07d9c3cbe37a	18.1 Тест на непищевую аллергию микс "пыльца деревьев":	МойСклад	8580.00	0	0	шт		t	2025-09-27 04:30:40.72401	2025-09-27 05:15:14.995	b75455de-9b35-11f0-0a80-017600136de2		20	\N	\N	\N
e48887fb-249c-47bc-9432-abd726f09902	18.2 Тест на непищевую аллергию микс "пыльца сорных трав":	МойСклад	8580.00	0	0	шт		t	2025-09-27 04:30:40.792808	2025-09-27 05:15:15.029	b757e67e-9b35-11f0-0a80-017600136de7		20	\N	\N	\N
93ad4b3e-882e-4421-98f2-80d000e67193	18.4 Тест на пищевую аллергию	МойСклад	1980.00	0	0	шт		t	2025-09-27 04:30:40.934384	2025-09-27 05:15:15.095	b75f1322-9b35-11f0-0a80-017600136df1		20	\N	\N	\N
7c63db97-3cae-4960-ade1-feddd6c13e4b	19.1 Посев без определения чувствительности выделенной культуры к антибиотикам	МойСклад	3190.00	0	0	шт		t	2025-09-27 04:30:41.003678	2025-09-27 05:15:15.128	b7632b7e-9b35-11f0-0a80-017600136df6		20	\N	\N	\N
725d93d8-52d1-4a91-b55d-8638cbd2c25f	19.2 Посев с определением чувствительности выделенной культуры к антибиотикам	МойСклад	4620.00	0	0	шт		t	2025-09-27 04:30:41.072866	2025-09-27 05:15:15.161	b766af9f-9b35-11f0-0a80-017600136dfb		20	\N	\N	\N
5d248384-abb2-4f9c-975c-b4c288c5191f	19.3 Посев с определением лизирующей активности бактериофагов к выделенной культуре	МойСклад	3190.00	0	0	шт		t	2025-09-27 04:30:41.143099	2025-09-27 05:15:15.195	b76a8b3c-9b35-11f0-0a80-017600136e00		20	\N	\N	\N
4cc3043f-3d6a-41e5-9f28-a955f2f339ef	20.1 Посев без определения чувствительности выделенной культуры к антибиотикам	МойСклад	3190.00	0	0	шт		t	2025-09-27 04:30:41.281833	2025-09-27 05:15:15.261	b771a1fb-9b35-11f0-0a80-017600136e0a		20	\N	\N	\N
6606b663-cbff-4a47-a4b7-6cf2f00ed772	20.2 Посев с определением чувствительности выделенной культуры к антибиотикам	МойСклад	4620.00	0	0	шт		t	2025-09-27 04:30:41.351938	2025-09-27 05:15:15.294	b775128f-9b35-11f0-0a80-017600136e0f		20	\N	\N	\N
40823d25-ee3a-47b2-94a3-eee424f9f978	20.3 Посев с определением лизирующей активности бактериофагов к выделенной культуре	МойСклад	3190.00	0	0	шт		t	2025-09-27 04:30:41.4234	2025-09-27 05:15:15.327	b778bc28-9b35-11f0-0a80-017600136e14		20	\N	\N	\N
e3813d5a-3780-4ccf-a603-cc235a93bd03	20.4 Комплексный посев с определением чувствительности выделенной культуры (бактерии и грибы) к антибиотикам и антимикотикам	МойСклад	8580.00	0	0	шт		t	2025-09-27 04:30:41.494188	2025-09-27 05:15:15.36	b77c68dd-9b35-11f0-0a80-017600136e19		20	\N	\N	\N
4db192b6-5c92-48b9-bec8-f40a9cb4af48	21.1 Посев без определения чувствительности выделенной культуры к антибиотикам	МойСклад	3190.00	0	0	шт		t	2025-09-27 04:30:41.568853	2025-09-27 05:15:15.393	b78007e6-9b35-11f0-0a80-017600136e1e		20	\N	\N	\N
7772ffdf-5ed9-4d47-a0cb-9ef185d615c0	21.2 Посев с определением чувствительности выделенной культуры к антибиотикам	МойСклад	4620.00	0	0	шт		t	2025-09-27 04:30:41.638473	2025-09-27 05:15:15.426	b785c9c4-9b35-11f0-0a80-017600136e23		20	\N	\N	\N
e3d6e844-645c-436c-af8a-5a2a2521ddeb	21.3 Посев с определением лизирующей активности бактериофагов к выделенной культуре	МойСклад	3190.00	0	0	шт		t	2025-09-27 04:30:41.708766	2025-09-27 05:15:15.459	b789689b-9b35-11f0-0a80-017600136e28		20	\N	\N	\N
9b2dd2ff-537f-4c3e-ae82-3fbe3aefe643	21.4 Комплексный посев с определением чувствительности выделенной культуры (бактерии и грибы) к антибиотикам и антимикотикам	МойСклад	8580.00	0	0	шт		t	2025-09-27 04:30:41.782948	2025-09-27 05:15:15.496	b78d30de-9b35-11f0-0a80-017600136e2d		20	\N	\N	\N
38388a4f-1272-4076-9556-dfcbca887f52	22.1 Посев без определения чувствительности выделенной культуры к антибиотикам	МойСклад	3190.00	0	0	шт		t	2025-09-27 04:30:41.851948	2025-09-27 05:15:15.528	b790f399-9b35-11f0-0a80-017600136e32		20	\N	\N	\N
24724a6b-a2ce-44ed-8a80-493549fc564b	22.2 Посев с определением чувствительности выделенной культуры к антибиотикам	МойСклад	4620.00	0	0	шт		t	2025-09-27 04:30:41.924487	2025-09-27 05:15:15.56	b794eb11-9b35-11f0-0a80-017600136e37		20	\N	\N	\N
3b42f9dc-8076-4bba-9b56-97a67fd35318	22.3 Посев с определением лизирующей активности бактериофагов к выделенной культуре	МойСклад	3190.00	0	0	шт		t	2025-09-27 04:30:41.995177	2025-09-27 05:15:15.592	b79994fe-9b35-11f0-0a80-017600136e3c		20	\N	\N	\N
b8588515-cd5f-4de6-bc39-940306b69469	22.4 Комплексный посев с определением чувствительности выделенной культуры (бактерии и грибы) к антибиотикам и антимикотикам	МойСклад	8580.00	0	0	шт		t	2025-09-27 04:30:42.065728	2025-09-27 05:15:15.624	b79da9a7-9b35-11f0-0a80-017600136e41		20	\N	\N	\N
782c68c4-ec4e-41d8-87bc-c6bc5c073115	23.1 Посев без определения чувствительности выделенной культуры к антибиотикам	МойСклад	3190.00	0	0	шт		t	2025-09-27 04:30:42.135848	2025-09-27 05:15:15.657	b7a16210-9b35-11f0-0a80-017600136e46		20	\N	\N	\N
40a2d653-5713-409a-89e2-509c028b8f06	23.2 Посев с определением чувствительности выделенной культуры к антибиотикам	МойСклад	4620.00	0	0	шт		t	2025-09-27 04:30:42.205957	2025-09-27 05:15:15.689	b7a4f5ce-9b35-11f0-0a80-017600136e4b		20	\N	\N	\N
6831a808-5179-476e-bf3a-5bc0ccd27dab	23.3 Посев с определением лизирующей активности бактериофагов к выделенной культуре	МойСклад	3190.00	0	0	шт		t	2025-09-27 04:30:42.279032	2025-09-27 05:15:15.721	b7a84f0c-9b35-11f0-0a80-017600136e50		20	\N	\N	\N
e1e1df50-7614-4f94-a065-405073d2097c	23.4 Комплексный посев с определением чувствительности выделенной культуры (бактерии и грибы) к антибиотикам и антимикотикам	МойСклад	8580.00	0	0	шт		t	2025-09-27 04:30:42.349087	2025-09-27 05:15:15.753	b7abab38-9b35-11f0-0a80-017600136e55		20	\N	\N	\N
5e724d82-357e-4b7b-b378-1f3cdcfe18e6	24.1 Посев без определения чувствительности выделенной культуры к антимикотикам	МойСклад	3036.00	0	0	шт		t	2025-09-27 04:30:42.41807	2025-09-27 05:15:15.784	b7af2adc-9b35-11f0-0a80-017600136e5a		20	\N	\N	\N
60e049c2-9a38-45f2-b742-74d8bba77e61	24.2 Посев с определением чувствительности выделенной культуры к антимикотикам	МойСклад	3960.00	0	0	шт		t	2025-09-27 04:30:42.492737	2025-09-27 05:15:15.816	b8e3842a-9b35-11f0-0a80-017600136f27		20	\N	\N	\N
6d7b2642-1f11-4ace-b88f-59ae9624bdfd	Нативный мазок из уха (микроскопия содержимого НСП)	МойСклад	550.00	0	0	шт		t	2025-09-27 04:30:36.783217	2025-09-27 05:15:13.057	6860a871-9b35-11f0-0a80-017600131ab2		20	\N	\N	\N
406c1873-7fb6-4294-8d7d-83fba81288f0	15.1.4 Вирусный иммунодефицит кошек Ab - CITO	МойСклад	5830.00	0	0	шт		t	2025-09-27 04:30:38.645681	2025-09-27 05:15:13.994	b6e9fe15-9b35-11f0-0a80-017600136d4c		20	\N	\N	\N
f8635acf-bfbd-4eea-9492-3bfc9db20f48	15.2.4 Контроль вакцинации у кошек (панлейкопения FPLV, герпесвирусная инфекция кошек FHV, калицивироз FCV) Ab	МойСклад	3740.00	0	0	шт		t	2025-09-27 04:30:40.228884	2025-09-27 05:15:14.763	b73b6603-9b35-11f0-0a80-017600136dbf		20	\N	\N	\N
5383b4db-f428-4826-a9c9-a2f57e457f2d	18.3 Тест на непищевую аллергию микс " бытовые аллергены"	МойСклад	4400.00	0	0	шт		t	2025-09-27 04:30:40.86436	2025-09-27 05:15:15.062	b75b52aa-9b35-11f0-0a80-017600136dec		20	\N	\N	\N
fac2154d-0af6-4a69-9fb2-4945a5ee242f	19.4 Комплексный посев с определением чувствительности выделенной культуры (бактерии и грибы) к антибиотикам и антимикотикам	МойСклад	8580.00	0	0	шт		t	2025-09-27 04:30:41.211974	2025-09-27 05:15:15.228	b76e22b2-9b35-11f0-0a80-017600136e05		20	\N	\N	\N
c01bbfdd-6a9d-4974-a7f3-35117e2ff6b1	Вакцинация Рабикан 1доз	МойСклад	440.00	0	0	шт	Вакцинация Рабикан 1доз	t	2025-09-27 04:30:42.563672	2025-09-27 05:15:15.849	c1613823-9b35-11f0-0a80-01760013793d		20	\N	\N	\N
\.


--
-- Data for Name: reference_ranges; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.reference_ranges (id, parameter_id, species, breed, gender, age_min, age_max, range_min, range_max, critical_min, critical_max, notes, is_active, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: sales_transaction_items; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.sales_transaction_items (id, transaction_id, product_id, service_id, name, sku, barcode, quantity, unit_price, discount_amount, total_price, tax_rate, tax_amount, marking_codes, created_at) FROM stdin;
\.


--
-- Data for Name: sales_transactions; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.sales_transactions (id, register_id, shift_id, cashier_id, customer_id, invoice_id, receipt_number, fiscal_number, shift_number, subtotal, discount_amount, tax_amount, total_amount, type, payment_method_id, applied_discounts, bonus_points_earned, bonus_points_used, is_fiscalized, is_synced, fiscal_data, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: services; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.services (id, name, category, price, duration, description, is_active, created_at, updated_at, moysklad_id, article, vat, last_synced_at, sync_hash, deleted_at) FROM stdin;
831d93dc-2d37-4785-9f76-d9dd3ca3d04f	Общий клинический осмотр	Диагностика	800.00	30	Полный осмотр животного с проверкой всех систем организма	t	2025-09-16 12:08:36.896115	2025-09-16 12:08:36.896115	\N	\N	20	\N	\N	\N
7b201f61-ca30-4c99-bd18-9be5956d86e8	Вакцинация против бешенства	Профилактика	1500.00	30	Комплексная вакцинация животного против бешенства	t	2025-09-16 12:08:36.941676	2025-09-16 12:08:36.941676	\N	\N	20	\N	\N	\N
9b3b1ee0-ea68-4ab4-9a2b-98d9f633d058	Хирургическая операция	Хирургия	8500.00	120	Плановая хирургическая операция под общей анестезией	t	2025-09-16 12:08:36.975243	2025-09-16 12:08:36.975243	\N	\N	20	\N	\N	\N
0dd19717-56f5-497b-91a6-879d0572760d	УЗИ диагностика	Диагностика	2200.00	45	Ультразвуковая диагностика органов брюшной полости	t	2025-09-16 12:08:37.016253	2025-09-16 12:08:37.016253	\N	\N	20	\N	\N	\N
9e058bcb-bb24-4710-863d-2ee0f7385485	Купирование хвоста	Хирургические операции	5500.00	\N		t	2025-09-25 00:03:16.579031	2025-09-25 00:03:16.579031	\N	\N	20	\N	\N	\N
5c2cf7c1-b0fb-447d-b2b4-d37c0c2d522e	УЗИ диагностика	МойСклад	0.00	30	Ультразвуковая диагностика органов брюшной полости	t	2025-09-27 04:30:44.166144	2025-09-27 05:15:16.85	6ef2a582-9b4b-11f0-0a80-0863002e830e		20	\N	\N	\N
c0a5ca06-dbc8-43d1-b66b-d0c857f16988	Вакцинация против бешенства	МойСклад	0.00	30	Комплексная вакцинация животного против бешенства	t	2025-09-27 04:30:44.233129	2025-09-27 05:15:16.886	6f168f5a-9b4b-11f0-0a80-02d7002e86cc		20	\N	\N	\N
872931c9-c088-4cf5-8572-52d4cd05d836	Купирование хвоста	МойСклад	0.00	30		t	2025-09-27 04:30:44.300773	2025-09-27 05:15:16.921	6f499100-9b4b-11f0-0a80-1a12002d92c1		20	\N	\N	\N
50d63a51-8939-413c-ac7e-d3f6e77be015	Хирургическая операция	МойСклад	0.00	30	Плановая хирургическая операция под общей анестезией	t	2025-09-27 04:30:44.368176	2025-09-27 05:15:16.956	6f71ca29-9b4b-11f0-0a80-1625002d2d47		20	\N	\N	\N
b3b52e0b-c431-440b-a0f8-5b1c90bd5779	IDEXX Catalist One  10 показателей ( экспресс) Бутово	МойСклад	3216.00	30	IDEXX Catalist One  10 показателей ( экспресс) Бутово	t	2025-09-27 04:30:44.436678	2025-09-27 05:15:16.99	7d1236c4-9b35-11f0-0a80-017600133309		20	\N	\N	\N
24eb0b85-37a8-407f-8111-a135062618f2	Catalyst® Urine P:C Ratio	МойСклад	1815.00	30	Catalyst® Urine P:C Ratio	t	2025-09-27 04:30:44.504335	2025-09-27 05:15:17.023	7d14d8b8-9b35-11f0-0a80-01760013330d		20	\N	\N	\N
720de534-efac-4237-89fb-fcbf15ed2d6c	Цитологическое исследование Алисавет №1	МойСклад	1302.00	30	Цитологическое исследование Алисавет №1	t	2025-09-27 04:30:44.571755	2025-09-27 05:15:17.058	7eb4aac8-9b35-11f0-0a80-0176001334e3		20	\N	\N	\N
33c2e7a4-38e7-4533-b62c-843966db9d44	Общий клинический анализ крови FUJI	МойСклад	1265.00	30	Общий клинический анализ крови FUJI	t	2025-09-27 04:30:44.708397	2025-09-27 05:15:17.129	7ec47f95-9b35-11f0-0a80-0176001334f9		20	\N	\N	\N
d23cdc55-b917-4730-859d-d501f9dc953f	Общий анализ мочи, микроскопия осадка,экспресс тест полоска	МойСклад	1072.00	30	Общий анализ мочи, микроскопия осадка,экспресс тест полоска	t	2025-09-27 04:30:44.778183	2025-09-27 05:15:17.163	7ec87d3e-9b35-11f0-0a80-0176001334fd		20	\N	\N	\N
a0aba307-016e-4d5d-8dfc-f5db4a9170bc	IDEXX Catalist One  электролиты ( экспресс) Бутово	МойСклад	1378.00	30	IDEXX Catalist One  электролиты ( экспресс) Бутово	t	2025-09-27 04:30:44.845624	2025-09-27 05:15:17.196	7ecfb134-9b35-11f0-0a80-01760013350a		20	\N	\N	\N
66ca5cd2-6584-4fc8-8bfb-91ef272eaa16	IDEXX CATALYST BILE ACIDS + Аммиак	МойСклад	4133.00	30	IDEXX CATALYST BILE ACIDS + Аммиак	t	2025-09-27 04:30:44.912975	2025-09-27 05:15:17.23	7ed276f6-9b35-11f0-0a80-01760013350e		20	\N	\N	\N
728d2dd4-0bb0-432b-a37b-760295976a5f	IDEXX Catalyst Progesterone	МойСклад	2296.00	30	IDEXX Catalyst Progesterone	t	2025-09-27 04:30:44.980491	2025-09-27 05:15:17.263	7ed622b6-9b35-11f0-0a80-017600133512		20	\N	\N	\N
4570d76a-178e-43b3-a94f-24aaf4fa4d28	IDEXX ProBNP (экспресс) кошек	МойСклад	3520.00	30	IDEXX ProBNP (экспресс) кошек	t	2025-09-27 04:30:45.049036	2025-09-27 05:15:17.297	7ed88a05-9b35-11f0-0a80-017600133516		20	\N	\N	\N
e6e4fa07-7351-4da9-a498-72ea7bfa9d23	IDEXX Биохимический показатель один (экспресс)	МойСклад	459.00	30	IDEXX Биохимический показатель один (экспресс)	t	2025-09-27 04:30:45.11727	2025-09-27 05:15:17.331	7edadad7-9b35-11f0-0a80-01760013351a		20	\N	\N	\N
a942a4f3-322e-4e5d-9e43-f948eb8a561e	IDEXX Общий клинический анализ крови (экспресс)	МойСклад	1265.00	30	IDEXX Общий клинический анализ крови (экспресс)	t	2025-09-27 04:30:45.186785	2025-09-27 05:15:17.365	7edd4e1d-9b35-11f0-0a80-01760013351e		20	\N	\N	\N
69b76b86-667d-4e45-af98-8836868913c1	Биохимический анализ крови (фосфор)  один показатель FUJI	МойСклад	383.00	30	Биохимический анализ крови (фосфор)  один показатель FUJI	t	2025-09-27 04:30:45.255226	2025-09-27 05:15:17.398	7edff7e6-9b35-11f0-0a80-017600133522		20	\N	\N	\N
be89d9b6-1e65-4235-9e83-45ca4923f0bb	Биохимический анализ развёрнутый 24 показателя Cito FUJI	МойСклад	4133.00	30	Биохимический анализ развёрнутый 24 показателя Cito FUJI	t	2025-09-27 04:30:45.323497	2025-09-27 05:15:17.431	7ee28e01-9b35-11f0-0a80-017600133526		20	\N	\N	\N
218172ac-6b16-4a7e-b065-a210f7ac45e9	Биохимический анализ развёрнутый 24 показателя FUJI	МойСклад	3215.00	30	Биохимический анализ развёрнутый 24 показателя FUJI	t	2025-09-27 04:30:45.391964	2025-09-27 05:15:17.464	7ee4fac2-9b35-11f0-0a80-01760013352a		20	\N	\N	\N
ccdc6555-8737-4c54-babb-34e4dde0f75e	Биохимический анализ стандартный 10 показателей Cito FUJI	МойСклад	3215.00	30	Биохимический анализ стандартный 10 показателей Cito FUJI	t	2025-09-27 04:30:45.459553	2025-09-27 05:15:17.498	7ee782e0-9b35-11f0-0a80-01760013352e		20	\N	\N	\N
ce8bf4df-24d7-412e-89e4-54eada25d446	Биохимическое исследование 1 показатель	МойСклад	230.00	30	Биохимическое исследование 1 показатель	t	2025-09-27 04:30:45.529918	2025-09-27 05:15:17.531	7eea39a6-9b35-11f0-0a80-017600133532		20	\N	\N	\N
fea11462-b6f0-48d3-a44d-c0643ac60cf8	AN161ИГ Исследование гельминта	МойСклад	1218.00	30		t	2025-09-27 04:30:52.997605	2025-09-27 05:15:21.147	9edb7127-9b35-11f0-0a80-0176001359dc		20	\N	\N	\N
b8dd81ed-fd7e-4c05-b2d4-5e05123dd03a	Биохимическое исследование 1 показатель (ГГТ)	МойСклад	230.00	30	Биохимическое исследование 1 показатель (ГГТ)	t	2025-09-27 04:30:45.671328	2025-09-27 05:15:17.598	7eef9958-9b35-11f0-0a80-01760013353a		20	\N	\N	\N
3cf322e3-0a7c-40f1-b9d4-8c0bd1abc8e8	Биохимическое исследование 1 показатель (КФК)	МойСклад	230.00	30	Биохимическое исследование 1 показатель (КФК)	t	2025-09-27 04:30:45.744052	2025-09-27 05:15:17.631	7ef23a16-9b35-11f0-0a80-01760013353e		20	\N	\N	\N
168551fe-4524-4156-8cf2-63bc40227be2	Общий клинический анализ крови (ОКА) Алисавет IDEXX, в течение 30 минут	МойСклад	1302.00	30	Общий клинический анализ крови (ОКА) Алисавет IDEXX, в течение 30 минут	t	2025-09-27 04:30:45.812172	2025-09-27 05:15:17.664	7ef4c80f-9b35-11f0-0a80-017600133542		20	\N	\N	\N
4321d6cf-c672-49c5-9bd5-5329b8fc860b	Цитологическое исследование (№1)	МойСклад	1072.00	30	Цитологическое исследование (№1)	t	2025-09-27 04:30:45.948382	2025-09-27 05:15:17.733	7ef9c63e-9b35-11f0-0a80-01760013354a		20	\N	\N	\N
ab925d8c-b0c6-4964-bb11-ee582fe705dc	Цитологическое исследование (№3)	МойСклад	2296.00	30	Цитологическое исследование (№3)	t	2025-09-27 04:30:46.016146	2025-09-27 05:15:17.766	7efc2921-9b35-11f0-0a80-01760013354e		20	\N	\N	\N
6111710f-b462-4d10-b64d-68afca05b40f	Тест FIP кошки	МойСклад	1456.00	30	Тест FIP кошки	t	2025-09-27 04:30:46.084309	2025-09-27 05:15:17.799	7efec3c8-9b35-11f0-0a80-017600133552		20	\N	\N	\N
d7f56b5e-6ce0-4001-8b22-ecdc41cdb315	Тест Панлекопения (АГ)	МойСклад	1456.00	30	Тест Панлекопения (АГ)	t	2025-09-27 04:30:46.152975	2025-09-27 05:15:17.833	7f014d16-9b35-11f0-0a80-017600133556		20	\N	\N	\N
007d191e-fd80-4c14-871d-314b7205ced5	Клинический анализ крови Heska экспресс	МойСклад	1265.00	30	Клинический анализ крови Heska экспресс	t	2025-09-27 04:30:46.222218	2025-09-27 05:15:17.928	7f043055-9b35-11f0-0a80-01760013355a		20	\N	\N	\N
db5ccca2-fe63-41a9-8ad7-4534e8e3ed72	Тест Чума	МойСклад	1601.00	30	Тест Чума	t	2025-09-27 04:30:46.290063	2025-09-27 05:15:17.961	7f072f36-9b35-11f0-0a80-01760013355e		20	\N	\N	\N
6375da13-af93-4057-8e51-a6db3819907d	IDEXX Электролиты 8+ газы крови (экспресс)	МойСклад	1685.00	30	IDEXX Электролиты 8+ газы крови (экспресс)	t	2025-09-27 04:30:46.358105	2025-09-27 05:15:17.995	7f09f0fc-9b35-11f0-0a80-017600133562		20	\N	\N	\N
81d223e5-2df4-4277-9249-cb12df90a819	Тест Лямблии (АГ)	МойСклад	1456.00	30	Тест Лямблии (АГ)	t	2025-09-27 04:30:46.425589	2025-09-27 05:15:18.028	7f0cd7b6-9b35-11f0-0a80-017600133566		20	\N	\N	\N
542d15b2-1144-4567-a466-efc4b9ffac91	IDEXX Catalist One-  Т 4	МойСклад	2756.00	30	IDEXX Catalist One-  Т 4	t	2025-09-27 04:30:46.493177	2025-09-27 05:15:18.061	7f0fda24-9b35-11f0-0a80-01760013356a		20	\N	\N	\N
b230a74d-6f2a-4ff9-bd34-ac2b92355bd7	Тест Релаксин (RLN и FRL)	МойСклад	766.00	30	Тест Релаксин (RLN и FRL)	t	2025-09-27 04:30:46.563127	2025-09-27 05:15:18.094	7f12b1cf-9b35-11f0-0a80-01760013356e		20	\N	\N	\N
fcd665c2-7cfb-4c66-9d20-78ab57520cdc	Тест полоска для пробы Ширмера	МойСклад	919.00	30	Тест полоска для пробы Ширмера	t	2025-09-27 04:30:46.630587	2025-09-27 05:15:18.127	7f15634b-9b35-11f0-0a80-017600133572		20	\N	\N	\N
27605de6-affa-47b7-8c30-9d4d7a94319b	Тест  кошки Лейкоз (АГ) + Иммунодефицит (АТ)	МойСклад	1762.00	30	Тест  кошки Лейкоз (АГ) + Иммунодефицит (АТ)	t	2025-09-27 04:30:46.698155	2025-09-27 05:15:18.16	7f17dac5-9b35-11f0-0a80-017600133576		20	\N	\N	\N
d246fc48-4cda-4534-ac59-cdd1ccb54403	Цитологическое исследование (№2)	МойСклад	1532.00	30	Цитологическое исследование (№2)	t	2025-09-27 04:30:46.766789	2025-09-27 05:15:18.194	7f1a985d-9b35-11f0-0a80-01760013357a		20	\N	\N	\N
80474d0e-baa7-48e6-a689-21ff9b1236fa	Общий анализ мочи скрининг тест полоска	МойСклад	766.00	30	Общий анализ мочи скрининг тест полоска	t	2025-09-27 04:30:46.836745	2025-09-27 05:15:18.228	7f1d8075-9b35-11f0-0a80-01760013357e		20	\N	\N	\N
d501e60c-41bf-4bba-aa41-d41ad7ebb772	Биохимический показатель мочи один FUJI	МойСклад	277.00	30	Биохимический показатель мочи один FUJI	t	2025-09-27 04:30:46.905482	2025-09-27 05:15:18.261	7f2027a8-9b35-11f0-0a80-017600133582		20	\N	\N	\N
bfe624fc-e1ed-4a5d-87d9-1ff348032808	Биохимический анализ крови (Na+K+CL)  один показатель FUJI	МойСклад	613.00	30	Биохимический анализ крови (Na+K+CL)  один показатель FUJI	t	2025-09-27 04:30:46.973333	2025-09-27 05:15:18.294	7f22b5b5-9b35-11f0-0a80-017600133586		20	\N	\N	\N
d551ad5d-d1ae-4e3c-8a7b-e944405a77c6	Биохимический анализ крови  один показатель FUJI	МойСклад	277.00	30	Биохимический анализ крови  один показатель FUJI	t	2025-09-27 04:30:47.041531	2025-09-27 05:15:18.327	7f25385f-9b35-11f0-0a80-01760013358a		20	\N	\N	\N
aa59e349-b11a-4ee3-a0e1-ffa83146acf2	Экспресс-тест для диагностики дерматофитов 1 исследование	МойСклад	1532.00	30	Экспресс-тест для диагностики дерматофитов 1 исследование	t	2025-09-27 04:30:47.110616	2025-09-27 05:15:18.36	7f281270-9b35-11f0-0a80-01760013358e		20	\N	\N	\N
3fb88215-aef8-4fba-a723-642377514641	IDEXX Тест-система Snap Панкреатическая липаза для кошек (Feline fPL) (экспресс)	МойСклад	2816.00	30	IDEXX Тест-система Snap Панкреатическая липаза для кошек (Feline fPL) (экспресс)	t	2025-09-27 04:30:47.179403	2025-09-27 05:15:18.394	7f2af133-9b35-11f0-0a80-017600133592		20	\N	\N	\N
4f8d66dd-f839-44a0-9b8b-b2ab01048d6d	IDEXX Catalist One- SDMA ТЕСТ	МойСклад	3163.00	30	IDEXX Catalist One- SDMA ТЕСТ	t	2025-09-27 04:30:47.249136	2025-09-27 05:15:18.427	7f35c97c-9b35-11f0-0a80-0176001335a2		20	\N	\N	\N
ae0c95e7-a7ff-4c35-85fb-178f8c90da11	IDEXX CATALYST BILE ACIDS	МойСклад	3720.00	30	IDEXX CATALYST BILE ACIDS	t	2025-09-27 04:30:47.320574	2025-09-27 05:15:18.46	7f386f19-9b35-11f0-0a80-0176001335a6		20	\N	\N	\N
a4c2628f-2a03-403c-bc7d-8fac720e429c	IDEXX SNAP® Combo Plus (FeLV/FIV)	МойСклад	2756.00	30	IDEXX SNAP® Combo Plus (FeLV/FIV)	t	2025-09-27 04:30:47.390331	2025-09-27 05:15:18.493	7f3af377-9b35-11f0-0a80-0176001335aa		20	\N	\N	\N
1be315d9-4b91-4465-80fe-b5119cbab605	Посев - микологическое исследование и чувствительность к антимикотическим препаратам	МойСклад	1532.00	30	Посев - микологическое исследование и чувствительность к антимикотическим препаратам	t	2025-09-27 04:30:47.527441	2025-09-27 05:15:18.56	7fc13fba-9b35-11f0-0a80-017600133662		20	\N	\N	\N
0c103ea0-d55a-4174-b357-877e822b8138	Посев - исследование на бактериальную микрофлору и чувствительность к антибиотикам	МойСклад	1532.00	30	Посев - исследование на бактериальную микрофлору и чувствительность к антибиотикам	t	2025-09-27 04:30:47.596144	2025-09-27 05:15:18.593	7fc4aa0b-9b35-11f0-0a80-017600133666		20	\N	\N	\N
a5491fc1-99d6-44e3-8b6f-2c1152c26032	Экспресс-тест  для определения группы крови  кошек	МойСклад	1540.00	30	Экспресс-тест  для определения группы крови  кошек	t	2025-09-27 04:30:47.664198	2025-09-27 05:15:18.627	7fc755a8-9b35-11f0-0a80-01760013366a		20	\N	\N	\N
4f4bbaa9-40ec-415c-b0fa-bc89aab6b5f2	AN150CAT Ретикулоциты кошек	МойСклад	832.00	30		t	2025-09-27 04:30:47.732271	2025-09-27 05:15:18.66	9c7390a3-9b35-11f0-0a80-0176001357bf		20	\N	\N	\N
443c9599-977e-4715-864c-448928da93d8	AN1266КФ Исследование желчного камня (ИК-спектрометрия)	МойСклад	4441.00	30		t	2025-09-27 04:30:47.801	2025-09-27 05:15:18.693	9c7987bb-9b35-11f0-0a80-0176001357c4		20	\N	\N	\N
2b006e72-a642-4906-a626-663e99e3fcaa	AN1114CU Медь	МойСклад	1727.00	30		t	2025-09-27 04:30:47.871294	2025-09-27 05:15:18.726	9c7f7c8f-9b35-11f0-0a80-0176001357c9		20	\N	\N	\N
f90b2247-9240-42d0-b3c7-1acf7643787b	AN1119ZN Цинк	МойСклад	1727.00	30		t	2025-09-27 04:30:47.942267	2025-09-27 05:15:18.76	9c851627-9b35-11f0-0a80-0176001357ce		20	\N	\N	\N
0a28a6fe-9f42-4a81-90de-5d66800f0731	AN1144AM Антимюллеров гормон	МойСклад	1523.00	30		t	2025-09-27 04:30:48.010497	2025-09-27 05:15:18.793	9c8aa631-9b35-11f0-0a80-0176001357d3		20	\N	\N	\N
642cbd0f-04dd-401a-9363-4e8621f1be62	AN114 Фракционная экскреция калия и натрия с мочой	МойСклад	626.00	30		t	2025-09-27 04:30:48.079289	2025-09-27 05:15:18.827	9c8ff38f-9b35-11f0-0a80-0176001357d8		20	\N	\N	\N
e284a98c-b912-4bba-bdc2-9da581337c52	AN1265ИУ Исследование уролитов (ИК-спектрометрия)	МойСклад	4441.00	30		t	2025-09-27 04:30:48.148528	2025-09-27 05:15:18.86	9c954dce-9b35-11f0-0a80-0176001357dd		20	\N	\N	\N
9d73633e-9d1c-4e92-ba88-d5682b286c3c	AN1000LI Литий (Li) (шерсть)	МойСклад	2007.00	30		t	2025-09-27 04:30:48.217363	2025-09-27 05:15:18.894	9ca038d9-9b35-11f0-0a80-0176001357e7		20	\N	\N	\N
388a4ff8-8f55-4f62-97d7-eeb0473857d4	AN1003MG Магний (Mg) (шерсть)	МойСклад	2007.00	30		t	2025-09-27 04:30:48.292958	2025-09-27 05:15:18.927	9ca56b60-9b35-11f0-0a80-0176001357ec		20	\N	\N	\N
2352b775-7f88-48d5-bd16-a2a14b0a46da	AN1010MN Марганец (Mn) (шерсть)	МойСклад	2007.00	30		t	2025-09-27 04:30:48.362038	2025-09-27 05:15:18.961	9caa84c7-9b35-11f0-0a80-0176001357f1		20	\N	\N	\N
2d08d6bf-13a4-45f6-98f8-a8c3e190c1b9	AN1014CU Медь (Cu) (шерсть)	МойСклад	2007.00	30		t	2025-09-27 04:30:48.432272	2025-09-27 05:15:18.994	9caf8c45-9b35-11f0-0a80-0176001357f6		20	\N	\N	\N
cc525708-93e7-456f-bde6-80b4d5c4466c	AN1016AS Мышьяк (As) (шерсть)	МойСклад	2007.00	30		t	2025-09-27 04:30:48.500463	2025-09-27 05:15:19.028	9cb52a0a-9b35-11f0-0a80-0176001357fb		20	\N	\N	\N
3d5c7775-0bd7-48e8-b664-dfb15b8799b9	AN1002NA Натрий (Na) (шерсть)	МойСклад	2007.00	30		t	2025-09-27 04:30:48.56929	2025-09-27 05:15:19.061	9cca5a41-9b35-11f0-0a80-01760013580f		20	\N	\N	\N
3bcff67e-f2d0-47bf-8a3a-14070865afc6	AN1013NI Никель (Ni) (шерсть)	МойСклад	3447.00	30		t	2025-09-27 04:30:48.638219	2025-09-27 05:15:19.095	9d7634ea-9b35-11f0-0a80-0176001358a6		20	\N	\N	\N
65e2c8db-c577-4619-b745-1ed813b05581	AN1136SN Олово (Sn) (шерсть)	МойСклад	5108.00	30		t	2025-09-27 04:30:48.708531	2025-09-27 05:15:19.128	9d7c5ce1-9b35-11f0-0a80-0176001358ab		20	\N	\N	\N
c30b50fc-e55d-4dde-b007-e63e9acbf13c	AN1021HG Ртуть (Hg) (шерсть)	МойСклад	7722.00	30		t	2025-09-27 04:30:48.77699	2025-09-27 05:15:19.161	9d817db4-9b35-11f0-0a80-0176001358b0		20	\N	\N	\N
27c37573-37bd-4655-a39d-93d0ef129796	AN11AMY Альфа - амилаза	МойСклад	224.00	30		t	2025-09-27 04:30:48.84619	2025-09-27 05:15:19.194	9d86fdb1-9b35-11f0-0a80-0176001358b5		20	\N	\N	\N
b1658868-6a43-4ccc-8fd3-7d7086dab5f0	AN116 Общий анализ мочи (с микроскопией осадка)	МойСклад	691.00	30		t	2025-09-27 04:30:48.915847	2025-09-27 05:15:19.227	9d8beebb-9b35-11f0-0a80-0176001358ba		20	\N	\N	\N
e97ed35b-7e13-45cb-992c-9fe2aba153a2	AN10ALB Альбумин	МойСклад	149.00	30		t	2025-09-27 04:30:48.986464	2025-09-27 05:15:19.262	9d910ee1-9b35-11f0-0a80-0176001358bf		20	\N	\N	\N
bde084ad-db1b-4acb-8a44-835a552759aa	AN13B-T Билирубин общий	МойСклад	149.00	30		t	2025-09-27 04:30:49.056407	2025-09-27 05:15:19.295	9d96bf9c-9b35-11f0-0a80-0176001358c4		20	\N	\N	\N
ec52e4c9-7396-4a7b-953b-5f0e03c18e37	AN14B-D Билирубин прямой	МойСклад	149.00	30		t	2025-09-27 04:30:49.125835	2025-09-27 05:15:19.329	9d9c3248-9b35-11f0-0a80-0176001358c9		20	\N	\N	\N
29ec7103-6c58-46ec-9aad-5ae2403e09b5	AN10ОБС Диабетический первичный (АЛТ, альбумин, АСТ, белок общий, глюкоза, калий, кальций, креатинин, липаза, мочевина, натрий, триглицериды, холестерин, хлор, ЩФ + фруктозамин) 16 + Общий анализ мочи + Кетоны в крови	МойСклад	4237.00	30		t	2025-09-27 04:30:49.26351	2025-09-27 05:15:19.398	9da87201-9b35-11f0-0a80-0176001358d3		20	\N	\N	\N
c7f5f8c0-348b-4ef3-8f5d-82d1a42b7413	AN11ОБС Контроль диабета (АЛТ, АСТ, глюкоза, кальций,  триглицериды, холестерин, ЩФ + фруктозамин) 8	МойСклад	2056.00	30		t	2025-09-27 04:30:49.332958	2025-09-27 05:15:19.431	9dae4f7a-9b35-11f0-0a80-0176001358d8		20	\N	\N	\N
1d774758-3950-41ba-b4ba-9acf2d55ad89	AN1041LK Лекарственные и ядовитые вещества (нафтилтиокарбамид,  варфарин, ратиндан, бродифакум, кумарин, зоокумарин, 4-аминопиридин, изониазид, фтивазид, дигоксин, дигитоксин, 11 показателей)	МойСклад	2007.00	30		t	2025-09-27 04:30:50.880718	2025-09-27 05:15:20.164	9e2b6ef4-9b35-11f0-0a80-017600135946		20	\N	\N	\N
35282347-b674-4bae-98b6-383ee412658b	AN13ОБС Неврологический мониторинг (АЛТ, альбумин, АСТ, билирубин общий, калий, кальций, креатинин, магний, мочевина, натрий, хлор, ЩФ) 12	МойСклад	1589.00	30		t	2025-09-27 04:30:49.473249	2025-09-27 05:15:19.499	9db8b86f-9b35-11f0-0a80-0176001358e2		20	\N	\N	\N
3a549457-fc70-42ae-9b6d-5735b2cf00bb	AN117V12 Исследование на уровень кобаламина (цианокобаламина, витамина В12)	МойСклад	1523.00	30		t	2025-09-27 04:30:49.54253	2025-09-27 05:15:19.532	9dbe4a43-9b35-11f0-0a80-0176001358e7		20	\N	\N	\N
d6336c33-f6f8-416c-9a52-b571f1ac1646	AN118FOL Витамин В9	МойСклад	1523.00	30		t	2025-09-27 04:30:49.61094	2025-09-27 05:15:19.565	9dc40cb1-9b35-11f0-0a80-0176001358ec		20	\N	\N	\N
9fdd9d50-b97f-42cd-9f75-7b976c1f8ca6	AN117ОБС Проба с АКТГ	МойСклад	1597.00	30		t	2025-09-27 04:30:49.680916	2025-09-27 05:15:19.599	9dc9ef18-9b35-11f0-0a80-0176001358f1		20	\N	\N	\N
fc65bd78-c654-4381-b350-da30e2a38c9f	AN100ACT АКТГ (адренокортикотропный гормон)	МойСклад	1736.00	30		t	2025-09-27 04:30:49.749747	2025-09-27 05:15:19.632	9dcf7164-9b35-11f0-0a80-0176001358f6		20	\N	\N	\N
36c73318-a131-494c-9ca7-e87d19e131f8	AN102PTH Паратиреоидный гормон (ПТГ)	МойСклад	2172.00	30		t	2025-09-27 04:30:49.820902	2025-09-27 05:15:19.665	9dd53ccb-9b35-11f0-0a80-0176001358fb		20	\N	\N	\N
7732777b-ba06-4d15-8ee4-6025aba8a8fd	AN1271LEV Леветирацетам	МойСклад	5881.00	30		t	2025-09-27 04:30:49.889615	2025-09-27 05:15:19.698	9ddac349-9b35-11f0-0a80-017600135900		20	\N	\N	\N
712f1724-90ba-4151-908d-d5c78456a890	AN120ОБС Респираторный малый профиль (Аденовирус 2 типа (CAV 2) , бордетелла  (Вordetella bronchiseptica), вирус парагриппа (СPiV))	МойСклад	2418.00	30		t	2025-09-27 04:30:49.958785	2025-09-27 05:15:19.732	9de04bb4-9b35-11f0-0a80-017600135905		20	\N	\N	\N
bc37b609-f903-4898-98b3-e24eb42a0833	AN121ОБС Желудочно-кишечный профиль (парвовирус собак (CPV 2), коронавирус собак энтеральный (CCoV 1), Аденовирус 1 типа (CAV 1), вирус чумы плотоядных (CDV))	МойСклад	3388.00	30		t	2025-09-27 04:30:50.032791	2025-09-27 05:15:19.765	9de68b0a-9b35-11f0-0a80-01760013590a		20	\N	\N	\N
467a0b21-4ab5-4ba2-8474-94f5d6a89fa6	AN122ОБС Желудочно-кишечный большой профиль (парвовирус собак (CPV 2), коронавирус собак энтеральный (CCoV 1), Аденовирус 1 типа (CAV 1), вирус чумы плотоядных (CDV), гиардиа (Giardia spp.), криптоспоридии (Cryptosporidium spp.)), ротавирус А (Rotavi	МойСклад	6901.00	30		t	2025-09-27 04:30:50.10331	2025-09-27 05:15:19.798	9debe009-9b35-11f0-0a80-01760013590f		20	\N	\N	\N
5a3b4496-ad16-40d4-a19d-9bae563bfb25	AN124ОБС Кровепаразитарный малый профиль (анаплазма (аnaplasma phagocytophilum и Anaplasma platys,  дифференциальная диагностика)), бабезия (Babesia spp.), Эрлихия (Ehrlichia canis))	МойСклад	2550.00	30		t	2025-09-27 04:30:50.173825	2025-09-27 05:15:19.831	9df0ef63-9b35-11f0-0a80-017600135914		20	\N	\N	\N
005d37a3-8e91-4533-bef3-16da53a9604a	AN126ОБС Кровепаразитарный большой профиль (анаплазма (Anaplasma phagocytophilum и Anaplasma platys,  дифференциальная диагностика)), бабезия (Babesia spp.), бабезия Гибсона (Babesia gibsoni), Эрлихия (Ehrlichia canis), гемоплазма (Haemobartonella ca	МойСклад	4162.00	30		t	2025-09-27 04:30:50.24347	2025-09-27 05:15:19.865	9df5edff-9b35-11f0-0a80-017600135919		20	\N	\N	\N
2535a949-b3d7-4689-aca8-bb1a8ff62cf8	AN125ОБС Кровепаразитарный расширенный профиль (анаплазма (Anaplasma phagocytophilum и Anaplasma platys,  дифференциальная диагностика)), бабезия (Babesia spp.), бабезия Гибсона (Babesia gibsoni), Эрлихия (Ehrlichia canis), гемоплазма (Haemobartonell	МойСклад	6752.00	30		t	2025-09-27 04:30:50.312353	2025-09-27 05:15:19.898	9dfb50b7-9b35-11f0-0a80-01760013591e		20	\N	\N	\N
f0bfc221-2439-49eb-8fb9-b865f7f3ef29	AN136ОБС Желудочно-кишечный стандартный профиль (вирус панлейкопении (FPV), коронавирус кошек энтеральный (FCoV), токсоплазма (Toxoplasma gondii), гиардиа (Giardia spp.), криптоспоридии (Cryptosporidium spp.))	МойСклад	4072.00	30		t	2025-09-27 04:30:50.382377	2025-09-27 05:15:19.931	9e0250c8-9b35-11f0-0a80-017600135923		20	\N	\N	\N
fdf88c22-4f39-4d3f-8fa7-7554944c2555	AN123ОБС Желудочно-кишечный профиль (вирус панлейкопении (FPV), коронавирус кошек энтеральный (FCoV), токсоплазма (Toxoplasma gondii),Трихомонада (Tritrichomonas blagburni (foetus))	МойСклад	3289.00	30		t	2025-09-27 04:30:50.458847	2025-09-27 05:15:19.964	9e0850a9-9b35-11f0-0a80-017600135928		20	\N	\N	\N
38efeb5d-265d-4e4a-b0c2-bfaff86a169e	AN135ОБС Паразитарный профиль при хронической диарее (гиардиа (Giardia spp.), криптоспоридии (Cryptosporidium spp.), трихомонада (тritrichomonas blagburni (foetus))	МойСклад	2418.00	30		t	2025-09-27 04:30:50.530866	2025-09-27 05:15:19.998	9e0e0c13-9b35-11f0-0a80-01760013592d		20	\N	\N	\N
e518444c-8267-458d-9bf4-b3c4716c97a4	AN1227КЛ Исследование клеща (анаплазма (Anaplasma phagocytophilum и Anaplasma platys,  дифференциальная диагностика), бабезия (Babesia spp.), эрлихия (Ehrlichia canis), боррелия (Borrelia burgdorferi sensu lato))	МойСклад	3825.00	30		t	2025-09-27 04:30:50.60031	2025-09-27 05:15:20.031	9e13918c-9b35-11f0-0a80-017600135932		20	\N	\N	\N
3cc3c840-0d0d-4960-b667-80a279d7e970	AN1005SI Кремний (Si) (шерсть)	МойСклад	2007.00	30		t	2025-09-27 04:30:50.669947	2025-09-27 05:15:20.064	9e1aeb02-9b35-11f0-0a80-017600135937		20	\N	\N	\N
13145f7a-780c-476a-9153-e0a43d0f101b	AN1139CUP Определение меди в патматериале	МойСклад	4220.00	30		t	2025-09-27 04:30:50.739435	2025-09-27 05:15:20.097	9e205d7c-9b35-11f0-0a80-01760013593c		20	\N	\N	\N
3977a98c-842c-49af-9111-46ed22e9fed8	AN1040MT Комплексное токсикологическое исследование (Микроэлементы и тяжелые металлы: Li, B, Na, Mg, Al, Be, K, Ca, P, Cr, Mn, Fe, Co, Ni, Cu, Zn, Ga, Ge, As, Se, Rb, Sr, Zr, Nb, Mo, Ag, Cd, Sn, Sb, Te, Cs, Ba, Ce, Pr, Sm, W, Hg, Tl, Pb, U, 40 показа	МойСклад	2007.00	30		t	2025-09-27 04:30:50.810234	2025-09-27 05:15:20.13	9e25df7e-9b35-11f0-0a80-017600135941		20	\N	\N	\N
3c6e732f-7003-48b8-beda-0b9530627021	AN1PTT АЧТВ	МойСклад	421.00	30		t	2025-09-27 04:30:52.928294	2025-09-27 05:15:21.115	9ed55a82-9b35-11f0-0a80-0176001359d7		20	\N	\N	\N
8d63964a-1047-47d4-b3d4-c5aa2119468c	AN1041LK - Лекарственные и ядовитые вещества (нафтилтиокарбамид,  варфарин, ратиндан, бродифакум, кумарин, зоокумарин, 4-аминопиридин, изониазид, фтивазид, дигоксин, дигитоксин, 11 показателей)"	МойСклад	2007.00	30		t	2025-09-27 04:30:51.020564	2025-09-27 05:15:20.232	9e3655bb-9b35-11f0-0a80-017600135950		20	\N	\N	\N
496f9d82-d2d8-4ec0-9a29-ded67815ba3e	AN1004AL Алюминий (Al) (шерсть)	МойСклад	2007.00	30		t	2025-09-27 04:30:51.091697	2025-09-27 05:15:20.265	9e3b8f14-9b35-11f0-0a80-017600135955		20	\N	\N	\N
498a04d8-edc1-493a-bb0d-acc5c94738cf	AN1001BO Бор (B) (шерсть)	МойСклад	2007.00	30		t	2025-09-27 04:30:51.163235	2025-09-27 05:15:20.299	9e414d86-9b35-11f0-0a80-01760013595a		20	\N	\N	\N
a0ce8d1f-8ed8-46cb-bf4c-32a7ee941221	AN1138VA Ванадий (V) (шерсть)	МойСклад	2007.00	30		t	2025-09-27 04:30:51.23339	2025-09-27 05:15:20.333	9e470ac6-9b35-11f0-0a80-01760013595f		20	\N	\N	\N
f8614164-a70f-4137-8878-3fbd58ea5fea	AN1011FE Железо (Fe) (шерсть)	МойСклад	2007.00	30		t	2025-09-27 04:30:51.304242	2025-09-27 05:15:20.367	9e4c44ae-9b35-11f0-0a80-017600135964		20	\N	\N	\N
2b69972c-1a5c-42ef-a7f0-779f9518959d	AN1131I Йод (I) (шерсть)	МойСклад	2007.00	30		t	2025-09-27 04:30:51.373203	2025-09-27 05:15:20.4	9e51c351-9b35-11f0-0a80-017600135969		20	\N	\N	\N
b46ec73c-46ad-4cc2-99cc-62ee5c1e221c	AN1006KA Калий (К) (шерсть)	МойСклад	2007.00	30		t	2025-09-27 04:30:51.442965	2025-09-27 05:15:20.433	9e570e5f-9b35-11f0-0a80-01760013596e		20	\N	\N	\N
551859dc-6106-4c3e-bb4a-3a7736e07365	AN1007CA Кальций (Са) (шерсть)	МойСклад	2007.00	30		t	2025-09-27 04:30:51.515328	2025-09-27 05:15:20.466	9e5c885a-9b35-11f0-0a80-017600135973		20	\N	\N	\N
806a0ef6-e04a-4bb6-87d6-1fda4f972af7	AN1019CD Кадмий (Cd) (шерсть)	МойСклад	2007.00	30		t	2025-09-27 04:30:51.586229	2025-09-27 05:15:20.499	9e62157e-9b35-11f0-0a80-017600135978		20	\N	\N	\N
e5c37579-634e-4c31-a06c-5f94910b821a	AN1012CO Кобальт (Cо) (шерсть)	МойСклад	2007.00	30		t	2025-09-27 04:30:51.65651	2025-09-27 05:15:20.533	9e68054a-9b35-11f0-0a80-01760013597d		20	\N	\N	\N
18700ef7-70f4-47a6-9c76-caa1b0a1f58d	AN133ОБС Джек Рассел/Парсон Рассел Терьер.  Спиноцеребеллярная атаксия с миокимией и/или судорогам (SCA), Поздняя мозжечковая атаксия (LOA)	МойСклад	6514.00	30		t	2025-09-27 04:30:51.725541	2025-09-27 05:15:20.566	9e6e7937-9b35-11f0-0a80-017600135982		20	\N	\N	\N
33e3aa89-00eb-4b0c-9330-d5a94024a320	AN100ОБС Русский черный терьер.  Гиперурикозурия (HUU), Ювенильный паралич гортани/Полинейропатия	МойСклад	6514.00	30		t	2025-09-27 04:30:51.865526	2025-09-27 05:15:20.632	9e7a88b6-9b35-11f0-0a80-01760013598c		20	\N	\N	\N
83c6e1e0-e146-4efd-8066-d358ac17795e	AN109ОБС Староанглийская овчарка (бобтейл).  Первичная цилиарная дискенезия (PCD), Чувствительность к лекарственным препаратам (MDR 1)	МойСклад	6514.00	30		t	2025-09-27 04:30:51.934903	2025-09-27 05:15:20.665	9e7fd61f-9b35-11f0-0a80-017600135991		20	\N	\N	\N
94990460-0659-435e-8eb1-67818f7743d8	AN110ОБС Староанглийская овчарка (бобтейл) (расширенный). Первичная цилиарная дискенезия (PCD), Коллапс, вызываемый физическими нагрузками (EIC), Чувствительность к лекарственным препаратам (MDR 1)	МойСклад	9555.00	30		t	2025-09-27 04:30:52.005282	2025-09-27 05:15:20.698	9e85a1ee-9b35-11f0-0a80-017600135996		20	\N	\N	\N
f705ff79-d542-4d83-b90e-476ae547b900	AN102ОБС Энтленбухер зенненхунд. Длина шерсти, Прогрессирующая атрофия сетчатки PRA-prcd	МойСклад	6514.00	30		t	2025-09-27 04:30:52.075485	2025-09-27 05:15:20.731	9e8b348e-9b35-11f0-0a80-01760013599b		20	\N	\N	\N
a75bf13c-1915-49ae-bef8-2b0d26ce6cbd	AN118ОБС Британская короткошерстная /Шотландская (расширенный).  Группа крови кошек, Длина шерсти, Поликистоз почек	МойСклад	5937.00	30		t	2025-09-27 04:30:52.151021	2025-09-27 05:15:20.763	9e90ef17-9b35-11f0-0a80-0176001359a0		20	\N	\N	\N
fcc6fce5-e694-4526-8f46-ad72ba9c1b5c	AN119ОБС Бурманская кошка.  Ганглиозидоз бурманских кошек, Гипокалиемия бурм, Черепно-лицевая дисплазия бурм	МойСклад	5937.00	30		t	2025-09-27 04:30:52.223734	2025-09-27 05:15:20.795	9e97c4e4-9b35-11f0-0a80-0176001359a5		20	\N	\N	\N
56422a6f-dfd2-4d93-83d0-9503bec295e7	AN103ОБС Ориентальная кошка расширенный.  Группа крови кошек, Дефицит пируваткиназы, Прогрессирующая атрофия сетчатки rdAc	МойСклад	5937.00	30		t	2025-09-27 04:30:52.293532	2025-09-27 05:15:20.827	9e9d1665-9b35-11f0-0a80-0176001359aa		20	\N	\N	\N
6990ab16-7294-4710-8d7a-f4a146fec0ae	AN150DOG Ретикулоциты собак	МойСклад	832.00	30		t	2025-09-27 04:30:52.363349	2025-09-27 05:15:20.859	9ea25140-9b35-11f0-0a80-0176001359af		20	\N	\N	\N
991fb49c-400c-4528-8fd5-812a0edbb9b9	AN164DD D-димер	МойСклад	2681.00	30		t	2025-09-27 04:30:52.432724	2025-09-27 05:15:20.891	9ea94f7e-9b35-11f0-0a80-0176001359b4		20	\N	\N	\N
bd4e4abd-356d-415d-ae2e-b4074b600183	AN194TT Тромбиновое время	МойСклад	412.00	30		t	2025-09-27 04:30:52.502176	2025-09-27 05:15:20.923	9eaf2eb9-9b35-11f0-0a80-0176001359b9		20	\N	\N	\N
89b61c58-d120-4ca2-9892-d7ad0ac18054	AN18KET Определение кетонов в крови тест-полоской	МойСклад	404.00	30		t	2025-09-27 04:30:52.57331	2025-09-27 05:15:20.955	9eb55e4d-9b35-11f0-0a80-0176001359be		20	\N	\N	\N
f52c43b5-c28a-46fd-a334-cf63ebbce50d	AN165CA2 Кальций ионизированный	МойСклад	428.00	30		t	2025-09-27 04:30:52.643518	2025-09-27 05:15:20.987	9ebb904b-9b35-11f0-0a80-0176001359c3		20	\N	\N	\N
463f9cfc-b638-4de9-8808-6c8a0d49b324	AN215LAC Лактат (молочная кислота)	МойСклад	733.00	30		t	2025-09-27 04:30:52.713524	2025-09-27 05:15:21.019	9ec22df2-9b35-11f0-0a80-0176001359c8		20	\N	\N	\N
67070775-6fef-4eef-9d90-8af52fbcedb0	AN222GAS Гастрин	МойСклад	1415.00	30		t	2025-09-27 04:30:52.785026	2025-09-27 05:15:21.051	9ec90621-9b35-11f0-0a80-0176001359cd		20	\N	\N	\N
968bf692-6e50-4ab9-92b3-6f744505a8dc	AN225PRA Рениновая активность (PRA)	МойСклад	1670.00	30		t	2025-09-27 04:30:52.857048	2025-09-27 05:15:21.083	9ecf0eaf-9b35-11f0-0a80-0176001359d2		20	\N	\N	\N
a8828269-2939-4395-98da-9c5bda40febc	AN15GGT ГГТ (гамма-глутамилтрансфераза)	МойСклад	149.00	30		t	2025-09-27 04:30:53.138389	2025-09-27 05:15:21.212	9ee6fcce-9b35-11f0-0a80-0176001359e6		20	\N	\N	\N
8f5589f6-7976-4531-81bb-661d33f09d69	AN16GLU Глюкоза	МойСклад	149.00	30		t	2025-09-27 04:30:53.209882	2025-09-27 05:15:21.244	9eecfc3f-9b35-11f0-0a80-0176001359eb		20	\N	\N	\N
58a96831-d536-4556-ba7b-be34760c90a1	AN17FRU Фруктозамин	МойСклад	1194.00	30		t	2025-09-27 04:30:53.280957	2025-09-27 05:15:21.275	9ef30acc-9b35-11f0-0a80-0176001359f0		20	\N	\N	\N
77ac96c1-cc83-428a-999e-aa41e70b2572	AN19CK КФК общая (креатинфосфокиназа)	МойСклад	149.00	30		t	2025-09-27 04:30:53.351517	2025-09-27 05:15:21.307	9efa306d-9b35-11f0-0a80-0176001359f5		20	\N	\N	\N
ca5416fd-6ea2-4827-baa0-4f6847bb427b	AN20FPLI Липаза панкреатическая (кошки)	МойСклад	3833.00	30		t	2025-09-27 04:30:53.42078	2025-09-27 05:15:21.339	9f006c0c-9b35-11f0-0a80-0176001359fa		20	\N	\N	\N
eaed2cfd-0054-4773-88b1-893ea18d8a1b	AN21CPLI Липаза панкреатическая (собаки)	МойСклад	3833.00	30		t	2025-09-27 04:30:53.491251	2025-09-27 05:15:21.371	9f063663-9b35-11f0-0a80-0176001359ff		20	\N	\N	\N
94f670f2-9191-44d7-a1ec-85125a977297	AN22CRE Креатинин	МойСклад	149.00	30		t	2025-09-27 04:30:53.562215	2025-09-27 05:15:21.403	9f0c209b-9b35-11f0-0a80-017600135a04		20	\N	\N	\N
808164b5-eeab-4462-89c7-d78263f12467	AN1ОБС Базовый (АЛТ, АСТ, белок общий, билирубин общий, глюкоза, креатинин, мочевина) 7	МойСклад	955.00	30		t	2025-09-27 04:30:53.633571	2025-09-27 05:15:21.435	9f12037c-9b35-11f0-0a80-017600135a09		20	\N	\N	\N
db3be48a-af89-4ded-8d49-fbab1441ce29	AN169ОБС Мониторинг лечения фенобарбиталом (АЛТ, альбумин, ГГТ, желчные кислоты (проба натощак), ЩФ) 5 + Фенобарбитал	МойСклад	5494.00	30		t	2025-09-27 04:30:53.704699	2025-09-27 05:15:21.467	9f18043a-9b35-11f0-0a80-017600135a0e		20	\N	\N	\N
27f51f8d-8fef-4e52-8935-e78e7b14d92b	AN172INS Инсулин	МойСклад	1415.00	30		t	2025-09-27 04:30:53.779852	2025-09-27 05:15:21.498	9f1de96d-9b35-11f0-0a80-017600135a13		20	\N	\N	\N
105b6a17-82c9-4e20-a56e-0ef6314f2e51	AN174S-C Соматомедин С (инсулиноподобный фактор роста-1, ИФР-1)	МойСклад	2065.00	30		t	2025-09-27 04:30:53.849403	2025-09-27 05:15:21.53	9f24eb77-9b35-11f0-0a80-017600135a18		20	\N	\N	\N
b84516cd-1007-4e9c-960c-e43a789de916	AN195AND Андростендион	МойСклад	1670.00	30		t	2025-09-27 04:30:53.919001	2025-09-27 05:15:21.562	9f2af7cf-9b35-11f0-0a80-017600135a1d		20	\N	\N	\N
7a71d089-3dac-447a-8eb4-13bb95e879e9	AN205ALD Альдостерон	МойСклад	1736.00	30		t	2025-09-27 04:30:53.98908	2025-09-27 05:15:21.594	9f30f9ca-9b35-11f0-0a80-017600135a22		20	\N	\N	\N
c62b71ea-0ffa-491b-affc-3a293adc418e	AN16ОБС Прогестерон, определение овуляции (AN63OPGN) + Вагинальная цитология (определение фазы эстрального  цикла (AN408ЦИТ))	МойСклад	3027.00	30		t	2025-09-27 04:30:54.059633	2025-09-27 05:15:21.626	9f378760-9b35-11f0-0a80-017600135a27		20	\N	\N	\N
32a76bf1-b68f-4996-a85f-01ffbc202d40	AN157TPI Тропонин I	МойСклад	1984.00	30		t	2025-09-27 04:30:54.130565	2025-09-27 05:15:21.659	9f3e780b-9b35-11f0-0a80-017600135a2c		20	\N	\N	\N
f882e510-da26-40e7-8980-c1f837f41339	AN16110 Глюкоза/креатинин соотношение в моче	МойСклад	395.00	30		t	2025-09-27 04:30:54.201322	2025-09-27 05:15:21.692	9f4b096a-9b35-11f0-0a80-017600135a31		20	\N	\N	\N
6f3211d7-fc79-432b-b19a-ccbff5d4720e	AN159 Паразитологическое исследование фекалий (нативный препарат, флотация)	МойСклад	816.00	30		t	2025-09-27 04:30:54.27143	2025-09-27 05:15:21.725	9f511abd-9b35-11f0-0a80-017600135a36		20	\N	\N	\N
7c719981-64e6-4fba-bf22-0f5025ddb9ac	AN200SN Исследование на дирофиляриоз, анаплазмоз, боррелиоз, эрлихиоз (SNAP 4D)	МойСклад	4934.00	30		t	2025-09-27 04:30:54.41307	2025-09-27 05:15:21.793	9f5d4796-9b35-11f0-0a80-017600135a40		20	\N	\N	\N
21650bb1-e077-49d1-b942-4145e8ee71ff	AN201DIO Исследование на дирофиляриоз (Dirofilaria immitis, определение АГ), собаки	МойСклад	2772.00	30		t	2025-09-27 04:30:54.483172	2025-09-27 05:15:21.826	9f6318b2-9b35-11f0-0a80-017600135a45		20	\N	\N	\N
37650fee-eedf-4e7a-a3bf-8ad2c37cc518	AN207TOX Суммарные антитела класса IgG + IgM к Toxoplasma gondii (тИФА)	МойСклад	1144.00	30		t	2025-09-27 04:30:54.55517	2025-09-27 05:15:21.86	9f691e1c-9b35-11f0-0a80-017600135a4a		20	\N	\N	\N
17353252-2cf8-4a00-9545-f267a96a7279	AN208CORV Антитела класса IgG к коронавирусной инфекции кошек (тИФА)	МойСклад	7319.00	30		t	2025-09-27 04:30:54.626358	2025-09-27 05:15:21.894	9f6eca8e-9b35-11f0-0a80-017600135a4f		20	\N	\N	\N
b9d0c5d5-72cb-4c7e-add3-0155ed3a98fd	AN209FIV Антитела класса IgG к FIV (Feline immunodeficiency virus) (тИФА)	МойСклад	2600.00	30		t	2025-09-27 04:30:54.700426	2025-09-27 05:15:21.927	9f754233-9b35-11f0-0a80-017600135a54		20	\N	\N	\N
4dd000a2-b7fa-41fd-8e05-abc137e2f099	AN210FELV Определение антигена р27 FeLv (Feline leukemia virus) (тИФА)	МойСклад	5354.00	30		t	2025-09-27 04:30:54.772645	2025-09-27 05:15:21.961	9f7bee08-9b35-11f0-0a80-017600135a59		20	\N	\N	\N
2fa244b3-f50c-414a-a2c2-0b55e3982b54	AN237ЧЕК ВакциЧек, определение антител класса IgG к аденовирусу тип I (вирусный гепатит собак (СAV I), парвовирусу (CPV), чуме плотоядных (CDV)	МойСклад	5420.00	30		t	2025-09-27 04:30:54.843112	2025-09-27 05:15:21.994	9f830193-9b35-11f0-0a80-017600135a5e		20	\N	\N	\N
4d598402-589c-413a-93f2-966d2f932e33	AN238ЧЕК ВакциЧек, определение антител класса IgG к вирусу панлейкопении (FPV), калицивирусу (FCV), герпес вирусу (FHV)	МойСклад	5420.00	30		t	2025-09-27 04:30:54.914402	2025-09-27 05:15:22.028	9f895c02-9b35-11f0-0a80-017600135a63		20	\N	\N	\N
643ef716-26be-4bb5-8d56-7b77a0fce753	AN22ОБС Респираторный малый профиль (Аденовирус 2 типа (CAV 2) , бордетелла  (Вordetella bronchiseptica), парагрипп собак (СPiV))	МойСклад	2418.00	30		t	2025-09-27 04:30:54.987601	2025-09-27 05:15:22.061	9f903857-9b35-11f0-0a80-017600135a68		20	\N	\N	\N
0fcf7a3e-2437-4872-9719-f944206ea588	AN197ОБС Миттельшнауцер. Гиперурикозурия (HUU), Дилатационная кардиомиопатия шнауцеров (DCMS), Наследственная миотония (MC)	МойСклад	9555.00	30		t	2025-09-27 04:30:57.478995	2025-09-27 05:15:23.203	a066d6bd-9b35-11f0-0a80-017600135b12		20	\N	\N	\N
98bf6a3d-6fb7-4a0d-bca2-1f3e2246039e	AN220ОБС Исследование на дерматомикозы (обнаружение Microsporum canis, Microsporum gypseum, Malassezia pachydermatis, Trichophyton spp) ПЦР	МойСклад	2007.00	30		t	2025-09-27 04:30:55.132381	2025-09-27 05:15:22.129	9f9e2c95-9b35-11f0-0a80-017600135a72		20	\N	\N	\N
2b0ecd06-510f-42d2-b8b9-db1215d6628e	AN150ОБС Вирус лейкемии (FeLV, обнаружение вирусной РНК и провирусной ДНК одновременно)	МойСклад	1802.00	30		t	2025-09-27 04:30:55.202536	2025-09-27 05:15:22.162	9fa41b91-9b35-11f0-0a80-017600135a77		20	\N	\N	\N
1126c123-f296-49ff-8d36-f695e5db3f19	AN218ОБС Желудочно-кишечный большой профиль (вирус панлейкопении (FPV), коронавирус кошек энтеральный (FCoV), токсоплазма (Toxoplasma gondii), гиардиа (Giardia spp.), криптоспоридии (Cryptosporidium spp.), кампилобактер (Campylobacter spp.), Клострид	МойСклад	7368.00	30		t	2025-09-27 04:30:55.273245	2025-09-27 05:15:22.196	9faa59e4-9b35-11f0-0a80-017600135a7c		20	\N	\N	\N
b54dfe42-53c8-4c13-bcda-1a69a5379322	AN219ОБС Желудочно-кишечный расширенный профиль (вирус панлейкопении (FPV), коронавирус кошек энтеральный (FCoV), токсоплазма (Toxoplasma gondii), гиардиа (Giardia spp.), криптоспоридии (Cryptosporidium spp.), трихомонада (тritrichomonas blagburni (f	МойСклад	8183.00	30		t	2025-09-27 04:30:55.347125	2025-09-27 05:15:22.229	9fb0747a-9b35-11f0-0a80-017600135a81		20	\N	\N	\N
f7b47d2e-2b30-4132-a2db-195089f06b5b	AN151ОБС "Отравление неизвестным ядом.	МойСклад	2007.00	30		t	2025-09-27 04:30:55.419676	2025-09-27 05:15:22.263	9fb64276-9b35-11f0-0a80-017600135a86		20	\N	\N	\N
e123d3c4-0cef-4d5e-a152-3305cbeaf7fa	AN179ОБС Австралийская пастушья собака  (хилер). Первичный вывих хрусталика (PLL), Прогрессирующая атрофия сетчатки PRA-prcd, Чувствительность к лекарственным препаратам (MDR 1)	МойСклад	9555.00	30		t	2025-09-27 04:30:55.561348	2025-09-27 05:15:22.333	9fc4d41b-9b35-11f0-0a80-017600135a90		20	\N	\N	\N
dafc5ff4-c143-4ffd-bb74-f5fdbb198f25	AN180ОБС Австралийская пастушья собака (хилер) расширенный. Нейрональный цероидный липофусциноз 5-го типа (NCL5), Наследственный цероидный липофусциноз австралийской пастушьей собаки 12-го типа (NCL12 АС), Первичный вывих хрусталика (PLL), Прогрессир	МойСклад	20484.00	30		t	2025-09-27 04:30:55.633292	2025-09-27 05:15:22.367	9fcc244a-9b35-11f0-0a80-017600135a95		20	\N	\N	\N
5f15016c-d9de-4382-9018-14c8e497bd99	AN181ОБС Аляскинский маламут. Первичная цилиарная дискинезия (PCD AM) Аляскинских маламутов, Ранняя прогрессирующая полинейропатия маламутов (AMPN)	МойСклад	6514.00	30		t	2025-09-27 04:30:55.712706	2025-09-27 05:15:22.4	9fd20f52-9b35-11f0-0a80-017600135a9a		20	\N	\N	\N
67e5a9a2-75fb-48ce-a775-69506d86b081	AN152ОБС Американский булли. Гиперурикозурия (HUU), Дегенеративная миелопатия (DM Ex2), Нейрональный цероидный липофусциноз 4A типа (NCL IVA)	МойСклад	6514.00	30		t	2025-09-27 04:30:55.785043	2025-09-27 05:15:22.435	9fd880bc-9b35-11f0-0a80-017600135a9f		20	\N	\N	\N
d9496941-aa29-4cf2-8f3c-59014681d36f	AN153ОБС Американский булли расширенный. Гиперурикозурия (HUU), Дегенеративная миелопатия (DM Ex2), Нейрональный цероидный липофусциноз 4A типа (NCL IVA), Наследственая катаракта (HC), Прогрессирующая атрофия PRA- cord1	МойСклад	17951.00	30		t	2025-09-27 04:30:55.859319	2025-09-27 05:15:22.469	9fde9ac5-9b35-11f0-0a80-017600135aa4		20	\N	\N	\N
ed161099-a406-452e-a424-befca1b59ba9	AN154ОБС Английский кокер спаниель. Cемейная нефропатия английских кокер спаниелей (FN), Прогрессирующая атрофия сетчатки PRA-prcd	МойСклад	6514.00	30		t	2025-09-27 04:30:55.934814	2025-09-27 05:15:22.502	9fe57165-9b35-11f0-0a80-017600135aa9		20	\N	\N	\N
1e5a8dec-9f26-4611-8ef9-2ff467c17ef5	AN182ОБС Басенджи расширенный. Локус А (агути), Прогрессирующая атрофия сетчатки басенджи (bas-PRA), Синдром Фанкони (FBS)	МойСклад	9555.00	30		t	2025-09-27 04:30:56.008045	2025-09-27 05:15:22.538	9febaf13-9b35-11f0-0a80-017600135aae		20	\N	\N	\N
de66eb89-3a9c-4e30-97f6-10288f32eb8a	AN183ОБС Бассет хаунд. Болезнь Виллебранда I-го типа (vWD type I), Дегенеративная миелопатия (DM Ex2), Тяжелый комбинированный иммунодефицит, сцепленный с Х-хромосомой (X-SCID), Хондродисплазия (CDPA), Хондродистрофия с риском дегенерации межпозвоноч	МойСклад	12245.00	30		t	2025-09-27 04:30:56.081268	2025-09-27 05:15:22.571	9ff1e294-9b35-11f0-0a80-017600135ab3		20	\N	\N	\N
3ff430e1-4ffd-4d9b-910d-adc38169e765	AN184ОБС Бигль. Гипокаталазия, акаталазия (CAT), Мальабсорбция кишечного кобаламина, Синдром Имерслунд-Гресбека биглей (IGS B, ICM B), Мозжечковая абиотрофия (NCCD), Недостаточность фактора VII (FVIID), Синдром Мусладина-Люка / Синдром китайского биг	МойСклад	15344.00	30		t	2025-09-27 04:30:56.151905	2025-09-27 05:15:22.605	9ff8ba5f-9b35-11f0-0a80-017600135ab8		20	\N	\N	\N
d0bdfecb-2fdf-4310-8b9b-4c7dae0f67c2	AN198ОБС Пинчеры. Болезнь фон Виллебранда I-го типа (vWD type I), Дегенеративная миелопатия (DM Ex2)	МойСклад	6514.00	30		t	2025-09-27 04:30:57.613962	2025-09-27 05:15:23.236	a06c9d86-9b35-11f0-0a80-017600135b17		20	\N	\N	\N
7524d691-7a46-4f0f-80e5-42d50154e43d	AN323НОС Хламидиоз (Chlamydia spp.) (ПЦР)	МойСклад	766.00	30		t	2025-09-27 04:31:03.636186	2025-09-27 05:15:25.99	a3924d21-9b35-11f0-0a80-017600135d7a		20	\N	\N	\N
a8d758d6-fcec-4020-800e-881b07eba393	AN155ОБС Большой Швейцарский Зенненхунд. Болезнь фон Виллебранда I типа (vWD type I), Дегенеративная миелопатия (DM Ex2), Длина шерсти	МойСклад	9555.00	30		t	2025-09-27 04:30:56.295578	2025-09-27 05:15:22.672	a004fc13-9b35-11f0-0a80-017600135ac2		20	\N	\N	\N
331ef2ed-4408-43b3-8cb6-f65cc572d35e	AN186ОБС Бордер колли. Аномалия глаз колли (CEA), Нейрональный цероидный липофусциноз 5-го типа (NCL5), Сенсорная невропатия (SN), Синдром захваченных нейтрофилов (TNS), Чувствительность к медикаментам (MDR 1)	МойСклад	15344.00	30		t	2025-09-27 04:30:56.366483	2025-09-27 05:15:22.705	a00b7bd7-9b35-11f0-0a80-017600135ac7		20	\N	\N	\N
0f36a6fd-3c55-489d-8bfa-b975af95ecfb	AN187ОБС Бордер колли расширенный. Аномалия глаз колли (CEA), Гониодисгенез и глаукома бордер колли (GGD), Зубная гипоминерализация / Синдром Райна (RS BC), Мальабсорбция кишечного кобаламина, синдром Имерслунд-Гресбека бордер колли (IGS BC, ICM BC),	МойСклад	23451.00	30		t	2025-09-27 04:30:56.440217	2025-09-27 05:15:22.738	a01221d2-9b35-11f0-0a80-017600135acc		20	\N	\N	\N
70acf51a-1f15-4f7f-bec1-e0c58cbe4069	AN188ОБС Бультерьер. Летальный акродерматит бультерьеров (LAD), Паралич гортани бультерьеров  (LP), Поликистоз почек бультерьеров (BTPKD)	МойСклад	9555.00	30		t	2025-09-27 04:30:56.513494	2025-09-27 05:15:22.774	a018b5fb-9b35-11f0-0a80-017600135ad1		20	\N	\N	\N
282b8b40-2fe3-431b-9226-8e33e015ddda	AN189ОБС Венгерская выжла.  Длина шерсти, Дегенерация коры мозжечка новорожденных / Мозжечковая абиотрофия (NCCD V)	МойСклад	6514.00	30		t	2025-09-27 04:30:56.586414	2025-09-27 05:15:22.807	a01f24c1-9b35-11f0-0a80-017600135ad6		20	\N	\N	\N
9442e045-be48-47b4-a482-a03ad501853a	AN156ОБС Вест хайленд уайт терьер. Глобоидно-клеточная лейкодистрофия (Болезнь Краббе, GLD), Дефицит пируваткиназы (PKdef), Краниомандибулярная остеопатия (CMO)	МойСклад	9555.00	30		t	2025-09-27 04:30:56.65753	2025-09-27 05:15:22.84	a0250cf4-9b35-11f0-0a80-017600135adb		20	\N	\N	\N
771c5163-0c9d-47a3-b488-5a8d65db6f32	AN190ОБС Голден ретривер (расширенный). Ихтиоз голден ретриверов (ICT-A), Нейрональный цероидный липофусциноз голден ретриверов 5-го типа (NCL5GR), Прогрессирующая атрофия сетчатки GR-PRA1, Прогрессирующая атрофия сетчатки  GR-PRA2, Сенсорная атакти	МойСклад	15344.00	30		t	2025-09-27 04:30:56.729266	2025-09-27 05:15:22.873	a02aec5a-9b35-11f0-0a80-017600135ae0		20	\N	\N	\N
5dc7aa77-2a0c-475e-ac6b-0fdccb1b3c6e	AN157ОБС Доберман. Болезнь фон Виллебранда I-го типа (vWD type I), Нарколепсия доберманов (NARC_dob)	МойСклад	6514.00	30		t	2025-09-27 04:30:56.800024	2025-09-27 05:15:22.905	a0310495-9b35-11f0-0a80-017600135ae5		20	\N	\N	\N
9631f295-965b-49c1-9817-c6cf403ffd54	AN158ОБС Дратхаар. Болезнь Фон Виллебранда II-го типа (vWD type II), Длина шерсти на морде, KB (доминантный черный)	МойСклад	9555.00	30		t	2025-09-27 04:30:56.871165	2025-09-27 05:15:22.939	a036de6a-9b35-11f0-0a80-017600135aea		20	\N	\N	\N
18b4c600-096e-4c13-9f45-4c2e69de90fc	AN191ОБС Ирландский мягкошёрстный пшеничный терьер. Микрофтальмия (RBP4), Нефропатия с потерей белка (PLN)	МойСклад	6514.00	30		t	2025-09-27 04:30:56.945905	2025-09-27 05:15:22.972	a03d639d-9b35-11f0-0a80-017600135aef		20	\N	\N	\N
1e8631be-736f-4494-a060-81720d0a5690	AN192ОБС Кане-Корсо.  Аномалия скелета, зубов и сетчатки системная (DSRA), Мультифокальная ретинопатия (CMR1), Нейрональный цероидный липофусциноз 1-го типа (NCL1)	МойСклад	9555.00	30		t	2025-09-27 04:30:57.017695	2025-09-27 05:15:23.005	a0430c6e-9b35-11f0-0a80-017600135af4		20	\N	\N	\N
6bbafeac-781d-4cba-a943-e4edd963071a	AN159ОБС Кинг чарльз спаниель. Дегенеративная миелопатия (DM Ex2), Синдром эпизодического падения (EFS)	МойСклад	6514.00	30		t	2025-09-27 04:30:57.089882	2025-09-27 05:15:23.038	a048c79c-9b35-11f0-0a80-017600135af9		20	\N	\N	\N
455c6059-f64a-4d0a-b605-839eaef1aca0	AN193ОБС Кламбер спаниель. Дегенеративная миелопатия Экзон 2 (DM Ex2), Дефицит пируватдегидрогеназы (PDP1), Коллапс, вызываемый физическими нагрузками (EIC), Прогрессирующая атрофия сетчатки (PRA-cord1)	МойСклад	12524.00	30		t	2025-09-27 04:30:57.186926	2025-09-27 05:15:23.071	a04ed82a-9b35-11f0-0a80-017600135afe		20	\N	\N	\N
21749136-b542-4ddd-a2db-8eacabe283c5	AN194ОБС Котон де тулеар. Болезнь фон Виллебранда I-го типа (vWD type I), Дегенеративная миелопатия Экзон 2 (DM Ex2), Мультифокальная ретинопатия 2 типа (CMR2), Прогрессирующая атрофия сетчатки (PRA-prcd), Хондродисплазия (CDPA), Хондродистрофия с ри	МойСклад	16430.00	30		t	2025-09-27 04:30:57.258991	2025-09-27 05:15:23.105	a05541c3-9b35-11f0-0a80-017600135b03		20	\N	\N	\N
2ccba342-5e73-4ec7-9770-d824f7156183	AN196ОБС Леонбергер. Лейкоэнцефаломиелопатия (LEMP), Наследственная полинейропатия леонбергеров 1 (LPN1), Наследственная полинейропатия леонбергеров 2 (LPN2)	МойСклад	9555.00	30		t	2025-09-27 04:30:57.405577	2025-09-27 05:15:23.17	a06125b4-9b35-11f0-0a80-017600135b0d		20	\N	\N	\N
f09de28c-7491-4d32-8376-70a6b64c09fe	AN321ВПТ Toxoplasma gondii (ПЦР)	МойСклад	799.00	30		t	2025-09-27 04:31:03.563654	2025-09-27 05:15:25.956	a38be953-9b35-11f0-0a80-017600135d75		20	\N	\N	\N
9064e987-2922-446e-8b0c-d9e6b6298d51	AN200ОБС Пудель большой (королевский, стандартный) расширенный. Болезнь фон Виллебранда I-го типа (vWD type I), Дегенеративная миелопатия (DM Ex2), Неонатальная энцефалопатия с судорогами (NEWS), Прогрессирующая атрофия сетчатки (PRA-prcd), Прогресси	МойСклад	15344.00	30		t	2025-09-27 04:30:57.757227	2025-09-27 05:15:23.303	a0782759-9b35-11f0-0a80-017600135b21		20	\N	\N	\N
0f0acc32-7bac-4eab-848a-a0d44c6c33a2	AN201ОБС Пудель средний (малый), миниатюрный (карликовый), той расширенный. Болезнь фон Виллебранда I-го типа (vWD type I), Дегенеративная миелопатия (DM Ex2), Прогрессирующая атрофия сетчатки (PRA-prcd), Прогрессирующая атрофия сетчатки (PRA-rcd4),	МойСклад	15344.00	30		t	2025-09-27 04:30:57.829548	2025-09-27 05:15:23.336	a07daa1c-9b35-11f0-0a80-017600135b26		20	\N	\N	\N
3644014d-027a-4b45-8072-bfa96ccba20e	AN202ОБС Ризеншнауцер. Гиперурикозурия (HUU), Дилатационная кардиомиопатия шнауцеров (DCMS), Недостаточность фактора VII (FVIID), Прогрессирующая атрофия сетчатки (PRA-prcd)	МойСклад	12524.00	30		t	2025-09-27 04:30:57.90399	2025-09-27 05:15:23.369	a083503d-9b35-11f0-0a80-017600135b2b		20	\N	\N	\N
f1d86c5f-7d08-42f3-ab28-e2d6097cb0a9	AN160ОБС Родезийский риджбек. Дегенеративная миелопатия (DM Ex2), Ювенильная миоклоническая эпилепсия	МойСклад	6514.00	30		t	2025-09-27 04:30:57.976669	2025-09-27 05:15:23.401	a088a67b-9b35-11f0-0a80-017600135b30		20	\N	\N	\N
1583c9ed-8cc9-43ea-b9d7-e9b0b8900058	AN161ОБС Родезийский риджбек расширенный. Дегенеративная миелопатия (DM Ex2),, Осветление окраса собак, Ювенильная миоклоническая эпилепсия	МойСклад	9555.00	30		t	2025-09-27 04:30:58.048017	2025-09-27 05:15:23.435	a08e52d7-9b35-11f0-0a80-017600135b35		20	\N	\N	\N
e7b11621-a3e7-47ad-9d97-39d6f84a5749	AN162ОБС Ротвейлер. Дегенеративная миелопатия (DM Ex2), Полинейропатия (JLPP)	МойСклад	6514.00	30		t	2025-09-27 04:30:58.120225	2025-09-27 05:15:23.468	a09405f6-9b35-11f0-0a80-017600135b3a		20	\N	\N	\N
a99c929d-e87b-407e-b650-f363d2c85455	AN203ОБС Ротвейлер расширенный.  Болезнь фон Виллебранда I-го типа (vWD type I), Дегенеративная миелопатия (DM Ex2), Лейкоэнцефаломиелопатия немецких догов и ротвейлеров (LEMP R), Нейроаксональная дистрофия ротвейлеров (NAD R), Ювенильный паралич гор	МойСклад	15344.00	30		t	2025-09-27 04:30:58.194316	2025-09-27 05:15:23.501	a0995e2c-9b35-11f0-0a80-017600135b3f		20	\N	\N	\N
e5f50cbb-65b7-49e0-9064-49c653ff7aa3	AN205ОБС Сиба-ину. Ганглиозидоз GM1, Ганглиозидоз GM2	МойСклад	6514.00	30		t	2025-09-27 04:30:58.336345	2025-09-27 05:15:23.569	a0a48eee-9b35-11f0-0a80-017600135b49		20	\N	\N	\N
18d21a3e-1087-4fde-a307-e96b7e7a3f6d	AN206ОБС Таксы расширенный. Гиперурикозурия (HUU), Дегенеративная миелопатия (DM Ex2), Прогрессирующая атрофия сетчатки PRA-cord1, Хондродистрофия с риском дегенерации межпозвоночных дисков (CDDY, IVDD)	МойСклад	12524.00	30		t	2025-09-27 04:30:58.410234	2025-09-27 05:15:23.603	a0aa80d8-9b35-11f0-0a80-017600135b4e		20	\N	\N	\N
b9b7dbc6-8483-4e19-a204-e01866ed7aa7	AN207ОБС Таксы (жесткошерстные). Гиперурикозурия (HUU), Дегенеративная миелопатия (DM Ex2), Прогрессирующая атрофия сетчатки (CRD-SWD / PRA-cord2), Хондродистрофия с риском дегенерации межпозвоночных дисков (CDDY, IVDD)	МойСклад	12524.00	30		t	2025-09-27 04:30:58.481931	2025-09-27 05:15:23.636	a0b04feb-9b35-11f0-0a80-017600135b53		20	\N	\N	\N
20fceee9-89c9-4859-beb6-5ede975cf9b3	AN163ОБС Той-фокстерьер. Врожденный гипотиреоз с зобом Terier (CHG), Первичный вывих хрусталика (PLL), Спиноцеребеллярная атаксия с миокимией и/или судорогами (SCA)	МойСклад	9555.00	30		t	2025-09-27 04:30:58.55419	2025-09-27 05:15:23.669	a0b6ae3b-9b35-11f0-0a80-017600135b58		20	\N	\N	\N
f79bd6da-a336-4f21-b3b0-3b50a508ae5c	AN208ОБС Французский бульдог.  Цистинурия бульдогов (Cys-bd), Мультифокальная ретинопатия (CMR 1), Наследственная катаракта (HC)	МойСклад	9555.00	30		t	2025-09-27 04:30:58.626437	2025-09-27 05:15:23.72	a0bc7a89-9b35-11f0-0a80-017600135b5d		20	\N	\N	\N
685098cd-c36c-4947-b64c-e43433b604c7	AN209ОБС Французский бульдог (расширенный). Врожденный гипотиреоз с зобом FB (CHG), Цистинурия бульдогов (Cys-bd), Мультифокальная ретинопатия (CMR 1), Наследственная катаракта (HC)	МойСклад	12524.00	30		t	2025-09-27 04:30:58.69815	2025-09-27 05:15:23.753	a0c2a7f9-9b35-11f0-0a80-017600135b62		20	\N	\N	\N
bc27c029-76b4-4fcf-b800-c2886ff6a232	AN210ОБС Цвергшнауцер. Прогрессирующая атрофия сетчатки цвергшнауцеров тип B1 (PRA B1), Спондилокостальный дизостоз (SCD), Устойчивость к микобактериозу (МАС)	МойСклад	9555.00	30		t	2025-09-27 04:30:58.770208	2025-09-27 05:15:23.786	a0c836d4-9b35-11f0-0a80-017600135b67		20	\N	\N	\N
6f51a6dd-1c96-41d4-ab90-cf6874e79667	AN211ОБС Цвергшнауцер расширенный. Болезнь Шарко-Мари-Тута (CMT), Наследственная миотония (MC), Прогрессирующая атрофия сетчатки цвергшнауцеров тип B1 (PRA B1), Спондилокостальный дизостоз (SCD), Устойчивость к микобактериозу (МАС)	МойСклад	15344.00	30		t	2025-09-27 04:30:58.840794	2025-09-27 05:15:23.819	a0cdaf94-9b35-11f0-0a80-017600135b6c		20	\N	\N	\N
561bd5fa-bbd3-4e7c-bd59-592eddee5e77	AN213ОБС Шипперке расширенный. Болезнь фон Виллебранда I-го типа (vWD type I), Локус K (доминантный черный), Мукополисахаридоз IIIB типа (MPS IIIB)	МойСклад	9555.00	30		t	2025-09-27 04:30:58.989114	2025-09-27 05:15:23.886	a0d90853-9b35-11f0-0a80-017600135b76		20	\N	\N	\N
242b1fb3-82a3-476f-97f9-447d1d74929b	AN164ОБС Шорти булл. L-2-гидроксиглутаровая ацидурия Стаффордширских бультерьеров (L2HGA), Дегенеративная миелопатия (DM Ex2), Наследственная катаракта (HC)	МойСклад	9555.00	30		t	2025-09-27 04:30:59.062409	2025-09-27 05:15:23.918	a0dea2ee-9b35-11f0-0a80-017600135b7b		20	\N	\N	\N
f32b7600-5ca3-404f-9c60-2364cf880fb2	AN165ОБС Шотландский терьер (Скотч терьер). Болезнь Виллебранда 3-го типа (vWD III), Краниомандибулярная остеопатия (CMO)	МойСклад	6514.00	30		t	2025-09-27 04:30:59.133605	2025-09-27 05:15:23.951	a0e4c4d8-9b35-11f0-0a80-017600135b80		20	\N	\N	\N
acddf864-b50c-4864-be6f-375e1bafb46a	AN215ОБС Бенгальская кошка / Саванна. Дефицит эритроцитарной пируваткиназы (PKDef), Прогрессирующая атрофия сетчатки бенгалов (PRA-b)	МойСклад	4204.00	30		t	2025-09-27 04:30:59.280225	2025-09-27 05:15:24.02	a0f10f21-9b35-11f0-0a80-017600135b8a		20	\N	\N	\N
fb54ad5b-31cb-44f5-94db-24ff73050674	AN216ОБС Норвежская лесная кошка. Гликогеноз IV типа (GSD IV), Дефицит эритроцитарной пируваткиназы кошек (PK def)	МойСклад	4204.00	30		t	2025-09-27 04:30:59.351615	2025-09-27 05:15:24.053	a0f6e570-9b35-11f0-0a80-017600135b8f		20	\N	\N	\N
7418047b-7d82-47f5-aeb4-4c3645d34578	AN166ОБС Персидская / Экзотическая. Поликистоз почек, Прогрессирующая атрофия сетчатки персов (PRA-pd)	МойСклад	4204.00	30		t	2025-09-27 04:30:59.423071	2025-09-27 05:15:24.086	a0fd0661-9b35-11f0-0a80-017600135b94		20	\N	\N	\N
585f3924-67c8-4bb8-90c7-d1e36dc176c9	AN167ОБС Рэгдолл. Гипертрофическая кардиомиопатия рэгдоллов, Поликистоз почек	МойСклад	4204.00	30		t	2025-09-27 04:30:59.496244	2025-09-27 05:15:24.12	a102e9c6-9b35-11f0-0a80-017600135b99		20	\N	\N	\N
37b23444-17be-4e48-baae-53e27aa11772	AN168ОБС Рэгдолл расширенный. Гипертрофическая кардиомиопатия рэгдоллов, Длина шерсти, Поликистоз почек	МойСклад	5937.00	30		t	2025-09-27 04:30:59.567618	2025-09-27 05:15:24.153	a24665e8-9b35-11f0-0a80-017600135c67		20	\N	\N	\N
25f153ce-be87-491a-81dd-ef21ad3ea6d7	AN308НОС Герпесвирус собак (Canine Herpesvirus) (ПЦР)	МойСклад	816.00	30		t	2025-09-27 04:30:59.642486	2025-09-27 05:15:24.186	a24cd5d3-9b35-11f0-0a80-017600135c6c		20	\N	\N	\N
edc29cbd-eeaa-4929-8e78-8312e34eb157	AN308УРО Герпесвирус собак (Canine Herpesvirus) (ПЦР)	МойСклад	816.00	30		t	2025-09-27 04:30:59.716095	2025-09-27 05:15:24.219	a2534b2b-9b35-11f0-0a80-017600135c71		20	\N	\N	\N
9b4ea210-7088-4ce8-8a9b-7ddabae3c50e	AN2PT Протромбиновое время	МойСклад	421.00	30		t	2025-09-27 04:30:59.787148	2025-09-27 05:15:24.252	a25970a7-9b35-11f0-0a80-017600135c76		20	\N	\N	\N
c75665d3-8372-4ae4-bdee-21a38f787557	AN239RAB Определение титра антител к бешенству (сертификат)	МойСклад	12993.00	30		t	2025-09-27 04:30:59.859821	2025-09-27 05:15:24.285	a2606b46-9b35-11f0-0a80-017600135c7b		20	\N	\N	\N
a8f313a2-369a-46fb-ab6b-fc4505acfba3	AN239RABCT Определение титра антител к бешенству CITO (сертификат)	МойСклад	24734.00	30		t	2025-09-27 04:30:59.93062	2025-09-27 05:15:24.318	a266c774-9b35-11f0-0a80-017600135c80		20	\N	\N	\N
96c21094-8f27-4f73-a1c3-96335475b26b	AN239DS Дубликат сертификата	МойСклад	2328.00	30		t	2025-09-27 04:31:00.005612	2025-09-27 05:15:24.351	a26cd28a-9b35-11f0-0a80-017600135c85		20	\N	\N	\N
4c973534-0db8-476a-a64e-ad6a02df5aea	AN301НОС Аденовирус 2 типа (CAV 2)	МойСклад	807.00	30		t	2025-09-27 04:31:00.079687	2025-09-27 05:15:24.384	a2729b39-9b35-11f0-0a80-017600135c8a		20	\N	\N	\N
113aaeb3-cacd-402c-8802-ab5d0a21f559	AN301БАЛ Аденовирус 2 типа (CAV 2)	МойСклад	807.00	30		t	2025-09-27 04:31:00.15153	2025-09-27 05:15:24.417	a278af87-9b35-11f0-0a80-017600135c8f		20	\N	\N	\N
8e2d521e-a8b6-46a2-89d9-dd4b5b3b3c66	AN307КР Вирусный гепатит собак (Adenovirus I) (ПЦР)	МойСклад	873.00	30		t	2025-09-27 04:31:00.2245	2025-09-27 05:15:24.45	a27e6940-9b35-11f0-0a80-017600135c94		20	\N	\N	\N
bc5a813a-6abd-4165-bbd1-ec70b397db32	AN307ФК Вирусный гепатит собак (Adenovirus I) (ПЦР)	МойСклад	873.00	30		t	2025-09-27 04:31:00.29823	2025-09-27 05:15:24.483	a2845dd1-9b35-11f0-0a80-017600135c99		20	\N	\N	\N
54ade5de-3fdd-42a0-801f-a72a9716b8a6	AN307ПРК Вирусный гепатит собак (Adenovirus I) (ПЦР)	МойСклад	873.00	30		t	2025-09-27 04:31:00.371727	2025-09-27 05:15:24.516	a28a3e4f-9b35-11f0-0a80-017600135c9e		20	\N	\N	\N
15e65b50-e155-4bc0-a2e3-097860ee6122	AN307МОЧ Вирусный гепатит собак (Adenovirus I) (ПЦР)	МойСклад	873.00	30		t	2025-09-27 04:31:00.443581	2025-09-27 05:15:24.549	a28fe203-9b35-11f0-0a80-017600135ca3		20	\N	\N	\N
eec65ff1-e0ef-463b-bc8a-a38797ce2e63	AN302КР Anaplasma Phagocytophilum/Anaplasma platys	МойСклад	1119.00	30		t	2025-09-27 04:31:00.517534	2025-09-27 05:15:24.582	a29631fa-9b35-11f0-0a80-017600135ca8		20	\N	\N	\N
b1d12332-9066-464b-a2ca-3d21db359d42	AN302КМ Anaplasma Phagocytophilum/Anaplasma platys	МойСклад	1119.00	30		t	2025-09-27 04:31:00.590778	2025-09-27 05:15:24.616	a29c23a6-9b35-11f0-0a80-017600135cad		20	\N	\N	\N
b80614ff-ed1f-453e-b63e-f06a5d3fbf66	AN3051НОС Аспергиллус (Aspergillus fumigatus/ flavus/terreus/niger)	МойСклад	2855.00	30		t	2025-09-27 04:31:00.66345	2025-09-27 05:15:24.649	a2a2ab4f-9b35-11f0-0a80-017600135cb2		20	\N	\N	\N
bf353e52-bbc8-44b4-a6aa-b5bcedead553	AN3051БТК Аспергиллус (Aspergillus fumigatus/ flavus/terreus/niger)	МойСклад	2855.00	30		t	2025-09-27 04:31:00.737342	2025-09-27 05:15:24.682	a2a899b2-9b35-11f0-0a80-017600135cb7		20	\N	\N	\N
8ea3c728-b77d-46b5-9ff2-d09e58e50e11	AN3051АСП Аспергиллус (Aspergillus fumigatus/ flavus/terreus/niger)	МойСклад	2855.00	30		t	2025-09-27 04:31:00.810035	2025-09-27 05:15:24.714	a2ae2927-9b35-11f0-0a80-017600135cbc		20	\N	\N	\N
0d2a1f2d-0848-400c-99a2-e915b17db27c	AN3051БАЛ Аспергиллус (Aspergillus fumigatus/ flavus/terreus/niger)	МойСклад	2855.00	30		t	2025-09-27 04:31:00.8817	2025-09-27 05:15:24.752	a2b39257-9b35-11f0-0a80-017600135cc1		20	\N	\N	\N
03a035c9-2680-4085-9be0-5c260d9d016a	AN303КМ Бабезиоз (пироплазмоз) (Babesia spp.) (ПЦР)	МойСклад	849.00	30		t	2025-09-27 04:31:01.027831	2025-09-27 05:15:24.82	a2be93e2-9b35-11f0-0a80-017600135ccb		20	\N	\N	\N
dea20bbc-9f27-46c9-bc34-3845c3ad4b2d	AN3043КР Бабезия (Babesia canis)	МойСклад	700.00	30		t	2025-09-27 04:31:01.101555	2025-09-27 05:15:24.854	a2c44a4d-9b35-11f0-0a80-017600135cd0		20	\N	\N	\N
258531ee-0922-452b-8ed3-b004652b6b7c	AN309КР Дирофиляриоз (Dirofilaria immitis + D. repens) (ПЦР)	МойСклад	1119.00	30		t	2025-09-27 04:31:01.177321	2025-09-27 05:15:24.887	a2c9b998-9b35-11f0-0a80-017600135cd5		20	\N	\N	\N
7e3861fc-5ca5-4737-883e-2223ce6b180e	AN304СИН Боррелиоз (болезнь Лайма) (Borrelia burgdorferi sensu lato) (ПЦР)	МойСклад	981.00	30		t	2025-09-27 04:31:01.250531	2025-09-27 05:15:24.921	a2cf1797-9b35-11f0-0a80-017600135cda		20	\N	\N	\N
c1354b1b-57c0-4166-ba71-9bbc4b2a2f71	AN305НОС Бордетеллез (Bordetella bronchiseptica) (ПЦР)	МойСклад	750.00	30		t	2025-09-27 04:31:01.324848	2025-09-27 05:15:24.953	a2d4a6c4-9b35-11f0-0a80-017600135cdf		20	\N	\N	\N
f22159a2-58d8-4375-9dad-0e50a1af8f6c	AN305БАЛ Бордетеллез (Bordetella bronchiseptica) (ПЦР)	МойСклад	750.00	30		t	2025-09-27 04:31:01.396591	2025-09-27 05:15:24.986	a2da87f2-9b35-11f0-0a80-017600135ce4		20	\N	\N	\N
403286fb-6f03-460a-b328-6ed53df8b23d	AN317НОС Парагрипп собак (Canine parainfluenza virus) (ПЦР)	МойСклад	1070.00	30		t	2025-09-27 04:31:01.468187	2025-09-27 05:15:25.019	a2e07c56-9b35-11f0-0a80-017600135ce9		20	\N	\N	\N
6590442e-d475-4c9e-b982-ea48609d5deb	AN317БАЛ Парагрипп собак (Canine parainfluenza virus) (ПЦР)	МойСклад	1070.00	30		t	2025-09-27 04:31:01.53936	2025-09-27 05:15:25.054	a2e68233-9b35-11f0-0a80-017600135cee		20	\N	\N	\N
71300c39-ad53-4b18-8e2a-af3b9634cddc	AN322ГЛЗ Чума плотоядных (Canine distemper virus) (ПЦР)	МойСклад	1004.00	30		t	2025-09-27 04:31:01.612659	2025-09-27 05:15:25.087	a2ec4e82-9b35-11f0-0a80-017600135cf3		20	\N	\N	\N
e7e21942-8c82-4464-b549-03b4606801d3	AN322НОС Чума плотоядных (Canine distemper virus) (ПЦР)	МойСклад	1004.00	30		t	2025-09-27 04:31:01.685117	2025-09-27 05:15:25.12	a2f2bc95-9b35-11f0-0a80-017600135cf8		20	\N	\N	\N
6890e46b-c55b-42df-81a2-23762ed84c03	AN322ПРК Чума плотоядных (Canine distemper virus) (ПЦР)	МойСклад	1004.00	30		t	2025-09-27 04:31:01.759935	2025-09-27 05:15:25.153	a2f909ce-9b35-11f0-0a80-017600135cfd		20	\N	\N	\N
04359e1d-f7da-42d9-bcaa-ad280e271c09	AN322ФК Чума плотоядных (Canine distemper virus) (ПЦР)	МойСклад	1004.00	30		t	2025-09-27 04:31:01.834033	2025-09-27 05:15:25.187	a2fedac2-9b35-11f0-0a80-017600135d02		20	\N	\N	\N
e1426fad-df8d-40dd-9cb2-2613e1329d68	AN310ПРК Коронавирус собак энтеральный (CCoV 1)	МойСклад	972.00	30		t	2025-09-27 04:31:01.905595	2025-09-27 05:15:25.22	a3047cfc-9b35-11f0-0a80-017600135d07		20	\N	\N	\N
36ed2b33-a7a1-4dcb-82ef-30b83819d642	AN310ФК Коронавирус собак энтеральный (CCoV 1)	МойСклад	972.00	30		t	2025-09-27 04:31:01.97826	2025-09-27 05:15:25.253	a30a091c-9b35-11f0-0a80-017600135d0c		20	\N	\N	\N
fb6ce158-c110-4460-90c9-85a90d71a247	AN311НОС Криптококкоз (Cryptococcus spp.) (ПЦР)	МойСклад	2945.00	30		t	2025-09-27 04:31:02.050532	2025-09-27 05:15:25.286	a30fe216-9b35-11f0-0a80-017600135d11		20	\N	\N	\N
577997af-0adc-4a30-91a3-2a299022c669	AN311БАЛ Криптококкоз (Cryptococcus spp.) (ПЦР)	МойСклад	2945.00	30		t	2025-09-27 04:31:02.123847	2025-09-27 05:15:25.32	a3156bf8-9b35-11f0-0a80-017600135d16		20	\N	\N	\N
03db6ff6-6180-4a8f-82b0-de69113a9487	AN311ЛИК Криптококкоз (Cryptococcus spp.) (ПЦР)	МойСклад	2945.00	30		t	2025-09-27 04:31:02.201375	2025-09-27 05:15:25.353	a31b118a-9b35-11f0-0a80-017600135d1b		20	\N	\N	\N
7c8108fc-106b-4f32-b245-1072b8199e47	AN312КР Лептоспироз (Leptospira spp.) (ПЦР)	МойСклад	2313.00	30		t	2025-09-27 04:31:02.275961	2025-09-27 05:15:25.386	a3205b72-9b35-11f0-0a80-017600135d20		20	\N	\N	\N
6798af7a-f44f-4f91-88f6-aca29f6ddb97	AN312МОЧ Лептоспироз (Leptospira spp.) (ПЦР)	МойСклад	2313.00	30		t	2025-09-27 04:31:02.349043	2025-09-27 05:15:25.419	a325e556-9b35-11f0-0a80-017600135d25		20	\N	\N	\N
3c48cfd7-efe7-4dfb-93b2-b6b1e2dcaa8f	AN312БТК Лептоспироз (Leptospira spp.) (ПЦР)	МойСклад	2313.00	30		t	2025-09-27 04:31:02.423745	2025-09-27 05:15:25.454	a32c411e-9b35-11f0-0a80-017600135d2a		20	\N	\N	\N
7c293117-8245-46f1-9bfe-a853fb201441	AN315БТК Микоплазмоз (Mycoplasma canis) (ПЦР)	МойСклад	972.00	30		t	2025-09-27 04:31:02.49805	2025-09-27 05:15:25.488	a33308ec-9b35-11f0-0a80-017600135d2f		20	\N	\N	\N
8233bd47-c939-4a04-ba0a-4b82c37dd243	AN315СП Микоплазмоз (Mycoplasma canis) (ПЦР)	МойСклад	972.00	30		t	2025-09-27 04:31:02.571066	2025-09-27 05:15:25.521	a339c1ab-9b35-11f0-0a80-017600135d34		20	\N	\N	\N
0e19b649-5231-4140-9108-7b4c8a11ef58	AN315УРО Микоплазмоз (Mycoplasma canis) (ПЦР)	МойСклад	972.00	30		t	2025-09-27 04:31:02.64555	2025-09-27 05:15:25.554	a340918e-9b35-11f0-0a80-017600135d39		20	\N	\N	\N
e4fe3f31-e371-4287-8297-c669bd6dd0d4	AN314БАЛ Микоплазмоз (Mycoplasma сynos) (ПЦР)	МойСклад	832.00	30		t	2025-09-27 04:31:02.717207	2025-09-27 05:15:25.587	a3465f07-9b35-11f0-0a80-017600135d3e		20	\N	\N	\N
e90b4ac7-8f1f-4226-9605-f28dd01324b9	AN314НОС Микоплазмоз (Mycoplasma сynos) (ПЦР)	МойСклад	832.00	30		t	2025-09-27 04:31:02.792085	2025-09-27 05:15:25.62	a34c5dd2-9b35-11f0-0a80-017600135d43		20	\N	\N	\N
c55f458d-7756-449c-ac11-4750a4f2d9e9	AN316ЛИК Неоспора (Neospora caninum)	МойСклад	2797.00	30		t	2025-09-27 04:31:02.901049	2025-09-27 05:15:25.653	a3525393-9b35-11f0-0a80-017600135d48		20	\N	\N	\N
deb85659-6e62-4614-a33a-916e75d7e439	AN318ПРК Парвовирусный энтерит (Canine рarvovirus) (ПЦР)	МойСклад	832.00	30		t	2025-09-27 04:31:02.97373	2025-09-27 05:15:25.686	a357fa1d-9b35-11f0-0a80-017600135d4d		20	\N	\N	\N
089f234f-0c25-4a64-95d9-0b2f786a3113	AN319ПРК Ротавирус А (Rotavirus А)	МойСклад	1194.00	30		t	2025-09-27 04:31:03.122389	2025-09-27 05:15:25.753	a36350ed-9b35-11f0-0a80-017600135d57		20	\N	\N	\N
b92e149c-6e86-4cb3-958d-d6417dfd5570	AN319ФК Ротавирус А (Rotavirus А)	МойСклад	1194.00	30		t	2025-09-27 04:31:03.198525	2025-09-27 05:15:25.788	a368ebd9-9b35-11f0-0a80-017600135d5c		20	\N	\N	\N
eb1d981a-6645-4d72-9e7e-b91652254271	AN320ПРК Сальмонеллез (Salmonella spp.) (ПЦР)	МойСклад	889.00	30		t	2025-09-27 04:31:03.272232	2025-09-27 05:15:25.821	a36e6a84-9b35-11f0-0a80-017600135d61		20	\N	\N	\N
ba469b08-0715-4cce-81a5-718b81efd405	AN320ФК Сальмонеллез (Salmonella spp.) (ПЦР)	МойСклад	889.00	30		t	2025-09-27 04:31:03.345236	2025-09-27 05:15:25.855	a3742274-9b35-11f0-0a80-017600135d66		20	\N	\N	\N
3b5bfb72-87ab-4c84-984b-c4bcf878ec02	AN321ГЛЗ Toxoplasma gondii (ПЦР)	МойСклад	799.00	30		t	2025-09-27 04:31:03.416815	2025-09-27 05:15:25.888	a37aedea-9b35-11f0-0a80-017600135d6b		20	\N	\N	\N
80d6ed76-e73b-4a07-8aec-3c30ad70564d	AN321РОТ Toxoplasma gondii (ПЦР)	МойСклад	799.00	30		t	2025-09-27 04:31:03.490388	2025-09-27 05:15:25.921	a38515f4-9b35-11f0-0a80-017600135d70		20	\N	\N	\N
0b267f29-8eb8-46a7-8e07-6acfd47d65fe	AN324КР Эрлихиоз (E. canis) (ПЦР)	МойСклад	799.00	30		t	2025-09-27 04:31:03.781838	2025-09-27 05:15:26.058	a39e02ba-9b35-11f0-0a80-017600135d84		20	\N	\N	\N
27ec8b04-b565-4d9b-8b04-f7111a968aa4	AN324КМ Эрлихиоз (E. canis) (ПЦР)	МойСклад	799.00	30		t	2025-09-27 04:31:03.860232	2025-09-27 05:15:26.091	a3a40b9c-9b35-11f0-0a80-017600135d89		20	\N	\N	\N
70d7f499-1818-41e3-a5bc-341c7e50f31a	AN329РОТ Калицивирус (Feline calicivirus) (ПЦР)	МойСклад	964.00	30		t	2025-09-27 04:31:03.935669	2025-09-27 05:15:26.124	a3aa4a09-9b35-11f0-0a80-017600135d8e		20	\N	\N	\N
3185cd4b-5899-4246-8f1c-8d922cfd9a0a	AN329БТК Калицивирус (Feline calicivirus) (ПЦР)	МойСклад	964.00	30		t	2025-09-27 04:31:04.009397	2025-09-27 05:15:26.157	a3afed09-9b35-11f0-0a80-017600135d93		20	\N	\N	\N
bd8be813-9321-424a-b732-64c11798585f	AN330БТК Коронавирусная инфекция кошек (Feline coronavirus) (ПЦР)	МойСклад	964.00	30		t	2025-09-27 04:31:04.084697	2025-09-27 05:15:26.19	a3b569e1-9b35-11f0-0a80-017600135d98		20	\N	\N	\N
220b9586-2c2d-4df0-ba0b-ecba0de6415b	AN321ФК Toxoplasma gondii (ПЦР)	МойСклад	799.00	30		t	2025-09-27 04:31:04.157481	2025-09-27 05:15:26.224	a3bacfcc-9b35-11f0-0a80-017600135d9d		20	\N	\N	\N
84d1093b-28ea-4fd8-9a3f-ca8e72742563	AN321ПРК Toxoplasma gondii (ПЦР)	МойСклад	799.00	30		t	2025-09-27 04:31:04.232948	2025-09-27 05:15:26.257	a3c02523-9b35-11f0-0a80-017600135da2		20	\N	\N	\N
c295bf50-afd8-4e99-a45d-5c55149cd35e	AN321КР Toxoplasma gondii (ПЦР)	МойСклад	799.00	30		t	2025-09-27 04:31:04.306355	2025-09-27 05:15:26.29	a3c579d8-9b35-11f0-0a80-017600135da7		20	\N	\N	\N
d3bafad7-1c62-4826-910d-d75c11de3645	AN26UREA Мочевина	МойСклад	149.00	30		t	2025-09-27 04:31:04.381131	2025-09-27 05:15:26.324	a3cad468-9b35-11f0-0a80-017600135dac		20	\N	\N	\N
02ce4f65-273b-4c3f-b036-ed816ebd872e	AN274CYC Циклоспорин	МойСклад	2731.00	30		t	2025-09-27 04:31:04.454341	2025-09-27 05:15:26.357	a3d0d014-9b35-11f0-0a80-017600135db1		20	\N	\N	\N
6a7abeb8-996e-4469-bdca-b296811599a7	AN322КР Чума плотоядных (Canine distemper virus) (ПЦР)	МойСклад	1004.00	30		t	2025-09-27 04:31:04.527654	2025-09-27 05:15:26.389	a3d6727c-9b35-11f0-0a80-017600135db6		20	\N	\N	\N
ac83a52d-2b84-48ba-8518-6c1209d61e2e	AN23LIP Липаза общая	МойСклад	297.00	30		t	2025-09-27 04:31:04.600249	2025-09-27 05:15:26.422	a3dd3ca5-9b35-11f0-0a80-017600135dbb		20	\N	\N	\N
c1511bc8-1aeb-4292-a540-041770e925dd	AN24LDH ЛДГ (лактатдегидрогеназа)	МойСклад	149.00	30		t	2025-09-27 04:31:04.673023	2025-09-27 05:15:26.455	a3e3dcfd-9b35-11f0-0a80-017600135dc0		20	\N	\N	\N
bc7c7147-7437-4404-844f-81b2622b3118	AN27UA Мочевая кислота	МойСклад	149.00	30		t	2025-09-27 04:31:04.746582	2025-09-27 05:15:26.488	a3e9f12a-9b35-11f0-0a80-017600135dc5		20	\N	\N	\N
39504dfe-0f29-4c84-82ba-d8bd11b69f0a	AN28TP Белок общий	МойСклад	149.00	30		t	2025-09-27 04:31:04.819056	2025-09-27 05:15:26.521	a3f01b43-9b35-11f0-0a80-017600135dca		20	\N	\N	\N
258d9730-7685-405f-a834-dc3702bc41ca	AN30TG Триглицериды	МойСклад	149.00	30		t	2025-09-27 04:31:04.891796	2025-09-27 05:15:26.554	a3f5bae9-9b35-11f0-0a80-017600135dcf		20	\N	\N	\N
ae89e2b8-c72e-46f3-be19-ad612873ced7	AN31CHOL Холестерин	МойСклад	149.00	30		t	2025-09-27 04:31:04.965528	2025-09-27 05:15:26.587	a3fb7fae-9b35-11f0-0a80-017600135dd4		20	\N	\N	\N
675f68d1-8435-4115-a31b-80fd31913795	AN300DIG Дигоксин (плазма)	МойСклад	5881.00	30		t	2025-09-27 04:31:05.110021	2025-09-27 05:15:26.653	a406b17c-9b35-11f0-0a80-017600135dde		20	\N	\N	\N
f59c0157-8fe7-4c9c-a817-f3a3ce1e9e0b	AN28110 Соотношение белок / креатинин в моче	МойСклад	421.00	30		t	2025-09-27 04:31:05.181869	2025-09-27 05:15:26.686	a40c5f74-9b35-11f0-0a80-017600135de3		20	\N	\N	\N
cae9f759-a0f1-4348-a7e9-fb544abd3143	AN240СКР Определение скрытой крови в кале	МойСклад	487.00	30		t	2025-09-27 04:31:05.254282	2025-09-27 05:15:26.72	a411f2be-9b35-11f0-0a80-017600135de8		20	\N	\N	\N
5453d42d-c3f0-46c3-a844-493e22c2ec50	AN31ОБС Исследование на вирусную лейкемию и вирусный иммунодефицит кошек (определение АТ к FIV и АГ FeLV)	МойСклад	3915.00	30		t	2025-09-27 04:31:05.327838	2025-09-27 05:15:26.753	a41787b3-9b35-11f0-0a80-017600135ded		20	\N	\N	\N
03fe54c1-e776-432e-901f-f92bd9e7b318	AN23ОБС Респираторный большой профиль (Аденовирус 2 типа (CAV 2), бордетелла  (Bordetella bronchiseptica), герпесвирус собак (CHV 1), парагрипп собак (СPiV), микоплазма (Mycoplasma cynos), хламидия (Сhlamydia spp.), вирус чумы плотоядных (CDV), пасте	МойСклад	5560.00	30		t	2025-09-27 04:31:05.402871	2025-09-27 05:15:26.786	a41cc516-9b35-11f0-0a80-017600135df2		20	\N	\N	\N
f0f48eb7-e5f8-4edc-8a7f-732a39a01f75	AN24ОБС Желудочно-кишечный профиль (парвовирус собак (CPV 2), коронавирус собак энтеральный (CCoV 1), Аденовирус 1 типа (CAV 1), вирус чумы плотоядных (CDV))	МойСклад	3388.00	30		t	2025-09-27 04:31:05.475367	2025-09-27 05:15:26.821	a4224d20-9b35-11f0-0a80-017600135df7		20	\N	\N	\N
d99258d4-257c-4cf2-b607-557ff361540c	AN25ОБС Кровепаразитарный малый профиль (анаплазма (Anaplasma phagocytophilum и Anaplasma platys,  дифференциальная диагностика)), бабезия (Babesia spp.), Эрлихия (Ehrlichia canis))	МойСклад	2550.00	30		t	2025-09-27 04:31:05.549085	2025-09-27 05:15:26.853	a427f2ee-9b35-11f0-0a80-017600135dfc		20	\N	\N	\N
aac76f1e-de76-4446-a4c1-82018eeee456	AN325КР Вирус иммунодефицита кошек (Feline immunodeficiency virus, FIV) (ПЦР)	МойСклад	865.00	30		t	2025-09-27 04:31:05.622253	2025-09-27 05:15:26.887	a42d2c86-9b35-11f0-0a80-017600135e01		20	\N	\N	\N
35e4a833-f6a6-4437-a704-04ef32b7c61d	AN325КМ Вирус иммунодефицита кошек (Feline immunodeficiency virus, FIV) (ПЦР)	МойСклад	865.00	30		t	2025-09-27 04:31:05.69473	2025-09-27 05:15:26.92	a43376e5-9b35-11f0-0a80-017600135e06		20	\N	\N	\N
ee6ce72b-ac74-4ffc-8fce-2ce278ba66a6	AN326КР Вирусная лейкемия (FeLV, обнаружение провирусной ДНК) (ПЦР)	МойСклад	823.00	30		t	2025-09-27 04:31:05.767201	2025-09-27 05:15:26.953	a4394be8-9b35-11f0-0a80-017600135e0b		20	\N	\N	\N
6e82bd1b-ba42-4987-b824-5d2db6fca6e9	AN326КМ Вирусная лейкемия (FeLV, обнаружение провирусной ДНК) (ПЦР)	МойСклад	823.00	30		t	2025-09-27 04:31:05.840548	2025-09-27 05:15:26.986	a43f3d7c-9b35-11f0-0a80-017600135e10		20	\N	\N	\N
a212575e-c6bc-4c54-bfb2-9cec0cda6da0	AN3052КР Вирус лейкемии (FeLV, количественное обнаружение вирусной РНК)	МойСклад	1802.00	30		t	2025-09-27 04:31:05.916722	2025-09-27 05:15:27.018	a4451520-9b35-11f0-0a80-017600135e15		20	\N	\N	\N
53354bdc-5497-4c8e-99fa-bd688d4bec59	AN328НОС Герпесвирус кошек (инфекционный ринотрахеит, ИРТ) (Feline herpesvirus) (ПЦР)	МойСклад	741.00	30		t	2025-09-27 04:31:06.068042	2025-09-27 05:15:27.085	a452665c-9b35-11f0-0a80-017600135e1f		20	\N	\N	\N
11b24312-761a-445e-a2f3-89316f26da39	AN328РОТ Герпесвирус кошек (инфекционный ринотрахеит, ИРТ) (Feline herpesvirus) (ПЦР)	МойСклад	741.00	30		t	2025-09-27 04:31:06.141362	2025-09-27 05:15:27.118	a459730f-9b35-11f0-0a80-017600135e24		20	\N	\N	\N
dec5fb8c-85a4-464a-984e-1801798f14f2	AN329КР Калицивирус (Feline calicivirus) (ПЦР)	МойСклад	964.00	30		t	2025-09-27 04:31:06.215015	2025-09-27 05:15:27.151	a45f9687-9b35-11f0-0a80-017600135e29		20	\N	\N	\N
743f7cae-3842-44e5-95ca-e6e1229ae010	AN329НОС Калицивирус (Feline calicivirus) (ПЦР)	МойСклад	964.00	30		t	2025-09-27 04:31:06.288288	2025-09-27 05:15:27.184	a464c19e-9b35-11f0-0a80-017600135e2e		20	\N	\N	\N
c4765594-a757-4daf-8aeb-bd33088f0c7c	AN27ОБС Респираторный большой профиль (бордетелла (вordetella bronchiseptica), герпесвирус кошек (FHV-1), калицивирус (FCV), микоплазма (Mycoplasma felis), хламидия (Chlamydia felis), пастерелла мультоцида (Pasteurella multocida))	МойСклад	4638.00	30		t	2025-09-27 04:31:06.441205	2025-09-27 05:15:27.25	a470918c-9b35-11f0-0a80-017600135e38		20	\N	\N	\N
1615f732-aa44-4544-ac01-ea9bab97e1a8	AN28ОБС Желудочно-кишечный профиль (вирус панлейкопении (FPV), коронавирус кошек энтеральный (FCoV), токсоплазма (Toxoplasma gondii))	МойСклад	2468.00	30		t	2025-09-27 04:31:06.515283	2025-09-27 05:15:27.283	a476fff7-9b35-11f0-0a80-017600135e3d		20	\N	\N	\N
8dc9337e-b520-4652-bf5c-1d8944f1b316	AN32ОБС Гемотропные микоплазмы (Mycoplasma haemofelis, Candidatus Mycoplasma haemominutum, Candidatus Mycoplasma turicensis)	МойСклад	2394.00	30		t	2025-09-27 04:31:06.590823	2025-09-27 05:15:27.317	a47ccec3-9b35-11f0-0a80-017600135e42		20	\N	\N	\N
c7b165e5-9e55-465f-bb23-92840966786d	AN30ОБС Стоматологический большой профиль  (вирус иммунодефицита (FIV, обнаружение провирусной ДНК), вирус лейкемии (FeLV, обнаружение провирусной ДНК), калицивирус (FCV), бартонелла (Bartonalla spp.))	МойСклад	3208.00	30		t	2025-09-27 04:31:06.664629	2025-09-27 05:15:27.35	a48289c3-9b35-11f0-0a80-017600135e47		20	\N	\N	\N
37fae384-f4f3-4d99-a4db-6d6bec540bb6	AN302КЛЩ Anaplasma Phagocytophilum/Anaplasma platys	МойСклад	1177.00	30		t	2025-09-27 04:31:06.739088	2025-09-27 05:15:27.382	a4883346-9b35-11f0-0a80-017600135e4c		20	\N	\N	\N
042cbe37-d550-465c-a6fb-93c7bb378f0b	AN303КЛЩ Бабезиоз (пироплазмоз) (Babesia spp.) (ПЦР)	МойСклад	1020.00	30		t	2025-09-27 04:31:06.81172	2025-09-27 05:15:27.416	a48e691e-9b35-11f0-0a80-017600135e51		20	\N	\N	\N
7c07d791-db9a-4294-bc8c-0c4d5216e1a9	AN304КЛЩ Боррелиоз (болезнь Лайма) (Borrelia burgdorferi sensu lato) (ПЦР)	МойСклад	1136.00	30		t	2025-09-27 04:31:06.885019	2025-09-27 05:15:27.449	a494144c-9b35-11f0-0a80-017600135e56		20	\N	\N	\N
7d8caca6-9125-4c50-958a-17af67fe6365	AN324КЛЩ Эрлихиоз (E. canis) (ПЦР)	МойСклад	849.00	30		t	2025-09-27 04:31:06.957451	2025-09-27 05:15:27.482	a499e2b2-9b35-11f0-0a80-017600135e5b		20	\N	\N	\N
e013d31b-b052-4dda-b126-62a567484158	AN371КР Haemobartonella canis/ Mycoplasma haemocanis (ПЦР)	МойСклад	889.00	30		t	2025-09-27 04:31:07.032296	2025-09-27 05:15:27.514	a49f48f9-9b35-11f0-0a80-017600135e60		20	\N	\N	\N
31594a6b-a03d-4ea0-ad24-8e4fbd8ace99	AN375КР Гепатозооноз (Hepatozoon canis) (ПЦР)	МойСклад	807.00	30		t	2025-09-27 04:31:07.112412	2025-09-27 05:15:27.547	a4a4c4d7-9b35-11f0-0a80-017600135e65		20	\N	\N	\N
abba8f40-ce33-450b-8a99-f8b6c7b21609	AN375КМ Гепатозооноз (Hepatozoon canis) (ПЦР)	МойСклад	807.00	30		t	2025-09-27 04:31:07.185897	2025-09-27 05:15:27.581	a4aa6039-9b35-11f0-0a80-017600135e6a		20	\N	\N	\N
54d32bbb-1b77-4964-ba9b-2b1c9c78e5a3	AN3FIBR Фибриноген	МойСклад	511.00	30		t	2025-09-27 04:31:07.258678	2025-09-27 05:15:27.614	a4af7eb1-9b35-11f0-0a80-017600135e6f		20	\N	\N	\N
bec53f63-cad3-4044-b6b2-ff754883d2f1	AN37CA Кальций общий	МойСклад	149.00	30		t	2025-09-27 04:31:07.333904	2025-09-27 05:15:27.647	a4b6223c-9b35-11f0-0a80-017600135e74		20	\N	\N	\N
85c20110-6b67-4e1c-8a59-bb38a3f22e0d	AN38AC Желчные кислоты (две пробы)	МойСклад	1399.00	30		t	2025-09-27 04:31:07.409814	2025-09-27 05:15:27.68	a4bbfec4-9b35-11f0-0a80-017600135e79		20	\N	\N	\N
6a77ec1d-af08-46ca-9dc2-9614e3f9b53a	AN42ACF Желчные кислоты (одна проба натощак)	МойСклад	807.00	30		t	2025-09-27 04:31:07.486133	2025-09-27 05:15:27.713	a4c1b347-9b35-11f0-0a80-017600135e7e		20	\N	\N	\N
5ea57d7c-be9a-4830-bf82-4c769b78a598	AN44ACL2 Желчные кислоты (одна проба после еды)	МойСклад	807.00	30		t	2025-09-27 04:31:07.563798	2025-09-27 05:15:27.746	a4c7963f-9b35-11f0-0a80-017600135e83		20	\N	\N	\N
c3633a2d-bca1-4b6e-9d01-ad272acb6de2	AN39ISE Электролиты (Калий, натрий, хлор)	МойСклад	388.00	30		t	2025-09-27 04:31:07.636857	2025-09-27 05:15:27.779	a4cd631c-9b35-11f0-0a80-017600135e88		20	\N	\N	\N
aea2e04d-14e7-4010-a6a3-9111df17f779	AN40MG Магний	МойСклад	149.00	30		t	2025-09-27 04:31:07.710139	2025-09-27 05:15:27.812	a4d4c338-9b35-11f0-0a80-017600135e8d		20	\N	\N	\N
3638fd07-0b47-4a8b-8c50-4e4500193228	AN41PHOS Фосфор неорганический	МойСклад	149.00	30		t	2025-09-27 04:31:07.785317	2025-09-27 05:15:27.846	a4daab0c-9b35-11f0-0a80-017600135e92		20	\N	\N	\N
07ea222e-6fda-4461-a34a-6686ece3f21c	AN361ПРК Лямблиоз (Giardia lamblia spp.) (ПЦР)	МойСклад	856.00	30		t	2025-09-27 04:31:07.861448	2025-09-27 05:15:27.881	a4e09eee-9b35-11f0-0a80-017600135e97		20	\N	\N	\N
71a7c203-fba9-4470-ba2e-c336ca9999ce	AN361ФК Лямблиоз (Giardia lamblia spp.) (ПЦР)	МойСклад	856.00	30		t	2025-09-27 04:31:07.936844	2025-09-27 05:15:27.914	a4e6e9da-9b35-11f0-0a80-017600135e9c		20	\N	\N	\N
93554281-abec-4014-8aaa-2e22e7796966	AN363КР Бабезиоз (пироплазмоз) (Babesia gibsoni) (ПЦР)	МойСклад	873.00	30		t	2025-09-27 04:31:08.016171	2025-09-27 05:15:27.948	a4ed3565-9b35-11f0-0a80-017600135ea1		20	\N	\N	\N
7d91c358-aeaa-415a-8214-d6cc3738e5d0	AN363КМ Бабезиоз (пироплазмоз) (Babesia gibsoni) (ПЦР)	МойСклад	873.00	30		t	2025-09-27 04:31:08.098565	2025-09-27 05:15:27.981	a4f312c3-9b35-11f0-0a80-017600135ea6		20	\N	\N	\N
b313411b-8149-4e90-af1c-9c6003386ba5	AN374КР Бартонеллез (Bartonella spp.) (ПЦР)	МойСклад	865.00	30		t	2025-09-27 04:31:08.175118	2025-09-27 05:15:28.014	a4f8cf27-9b35-11f0-0a80-017600135eab		20	\N	\N	\N
53923041-7838-4fb6-8b62-175d3e0aa354	AN365ПРК Кампилобактериоз (Campylobacter spp.) (ПЦР)	МойСклад	1694.00	30		t	2025-09-27 04:31:08.248635	2025-09-27 05:15:28.047	a4feca79-9b35-11f0-0a80-017600135eb0		20	\N	\N	\N
72330c40-d1c5-4d66-b4b1-b63087045b61	AN333КР Бруцеллез (ПЦР)	МойСклад	1119.00	30		t	2025-09-27 04:31:08.39483	2025-09-27 05:15:28.114	a50b0b28-9b35-11f0-0a80-017600135eba		20	\N	\N	\N
5b3d6335-9a99-41fa-8a25-c6bac3c5b92e	AN333СИН Бруцеллез (ПЦР)	МойСклад	1119.00	30		t	2025-09-27 04:31:08.468462	2025-09-27 05:15:28.146	a5114f0e-9b35-11f0-0a80-017600135ebf		20	\N	\N	\N
957ef9b4-10f5-401d-bcb5-c8e8d1eb269b	AN333СП Бруцеллез (ПЦР)	МойСклад	1119.00	30		t	2025-09-27 04:31:08.546111	2025-09-27 05:15:28.179	a51700b5-9b35-11f0-0a80-017600135ec4		20	\N	\N	\N
2aa6d5eb-7fdf-4c6c-98c4-8720ef0b38f9	AN333УРО Бруцеллез (ПЦР)	МойСклад	1119.00	30		t	2025-09-27 04:31:08.623758	2025-09-27 05:15:28.212	a51c83c5-9b35-11f0-0a80-017600135ec9		20	\N	\N	\N
4af08724-44e8-43be-a991-ead5f15d9319	AN365ФК Кампилобактериоз (Campylobacter spp.) (ПЦР)	МойСклад	1694.00	30		t	2025-09-27 04:31:08.697436	2025-09-27 05:15:28.245	a5218fd5-9b35-11f0-0a80-017600135ece		20	\N	\N	\N
53eff9f4-582b-4f87-8e15-44bd56229f5e	AN366ПРК Энтеротоксин (Clostridium perfringes) (ПЦР)	МойСклад	1892.00	30		t	2025-09-27 04:31:08.770669	2025-09-27 05:15:28.278	a52743e2-9b35-11f0-0a80-017600135ed3		20	\N	\N	\N
f8210a46-5d82-44d7-a68d-cf9a55af71e8	AN366ФК Энтеротоксин (Clostridium perfringes) (ПЦР)	МойСклад	1892.00	30		t	2025-09-27 04:31:08.848327	2025-09-27 05:15:28.311	a52ca678-9b35-11f0-0a80-017600135ed8		20	\N	\N	\N
ed5d20db-681b-42ba-8867-9564d90b315b	AN362ФК Криптоспоридиоз (Cryptosporidium spp.) (ПЦР)	МойСклад	882.00	30		t	2025-09-27 04:31:08.923785	2025-09-27 05:15:28.344	a531e7f4-9b35-11f0-0a80-017600135edd		20	\N	\N	\N
9ab1c101-2585-4c38-8000-9f3f9e348048	AN362ПРК Криптоспоридиоз (Cryptosporidium spp.) (ПЦР)	МойСклад	882.00	30		t	2025-09-27 04:31:09.001443	2025-09-27 05:15:28.378	a5371c76-9b35-11f0-0a80-017600135ee2		20	\N	\N	\N
2721f348-48d7-4838-b58c-a4fd8051c4e2	AN373КМ Лейшмания (Leishmania spp.)	МойСклад	889.00	30		t	2025-09-27 04:31:09.07874	2025-09-27 05:15:28.41	a53c517c-9b35-11f0-0a80-017600135ee7		20	\N	\N	\N
a0214bb9-665b-41b6-bf1c-a7ed7d2a00de	AN373КР Лейшмания (Leishmania spp.)	МойСклад	889.00	30		t	2025-09-27 04:31:09.15349	2025-09-27 05:15:28.443	a541bc44-9b35-11f0-0a80-017600135eec		20	\N	\N	\N
f0f29607-9973-4a7c-beb7-4667006cb622	AN372ВПТ Микобактериоз (Mycobacterium tuberculosis complex) (ПЦР)	МойСклад	1177.00	30		t	2025-09-27 04:31:09.307031	2025-09-27 05:15:28.511	a54ee88a-9b35-11f0-0a80-017600135ef6		20	\N	\N	\N
f1f8b50b-1491-4af9-b3b3-f857137a1f42	AN391КР Пастерелла мультоцида (Pasteurella multocida)	МойСклад	1086.00	30		t	2025-09-27 04:31:09.381328	2025-09-27 05:15:28.546	a557b55c-9b35-11f0-0a80-017600135efb		20	\N	\N	\N
4949e5d1-f5c9-4d20-9b91-4e54a4eac5b7	AN391НОС Пастерелла мультоцида (Pasteurella multocida)	МойСклад	1086.00	30		t	2025-09-27 04:31:09.456352	2025-09-27 05:15:28.58	a55daa38-9b35-11f0-0a80-017600135f00		20	\N	\N	\N
7a274da2-cd39-4d25-b4b9-190f17527343	AN391РОТ Пастерелла мультоцида (Pasteurella multocida)	МойСклад	1086.00	30		t	2025-09-27 04:31:09.531362	2025-09-27 05:15:28.613	a563f4a8-9b35-11f0-0a80-017600135f05		20	\N	\N	\N
0ecabcda-1ebe-48ae-8623-2d8b8fc37beb	AN330ВПТ Коронавирусная инфекция кошек (Feline coronavirus) (ПЦР)	МойСклад	964.00	30		t	2025-09-27 04:31:09.608562	2025-09-27 05:15:28.645	a569e973-9b35-11f0-0a80-017600135f0a		20	\N	\N	\N
9d208c8f-b322-4274-a1c0-67dc0fdaa67d	AN330ЛИК Коронавирусная инфекция кошек (Feline coronavirus) (ПЦР)	МойСклад	964.00	30		t	2025-09-27 04:31:09.686111	2025-09-27 05:15:28.679	a56f653d-9b35-11f0-0a80-017600135f0f		20	\N	\N	\N
d4aaa3e4-11e8-4f31-bdfb-3a577b072bad	AN331ПРК Коронавирусный гастроэнтерит (Feline coronavirus enteritis) (ПЦР)	МойСклад	972.00	30		t	2025-09-27 04:31:09.764188	2025-09-27 05:15:28.711	a57507a6-9b35-11f0-0a80-017600135f14		20	\N	\N	\N
0ae241a7-0f6d-4de1-b2eb-9b80ebe0ab75	AN331ФК Коронавирусный гастроэнтерит (Feline coronavirus enteritis) (ПЦР)	МойСклад	972.00	30		t	2025-09-27 04:31:09.840676	2025-09-27 05:15:28.744	a57ab84a-9b35-11f0-0a80-017600135f19		20	\N	\N	\N
640e6e2f-f7ef-415f-b3f6-5e1fcf81470d	AN332БАЛ Микоплазмоз (Mycoplasma felis) (ПЦР)	МойСклад	766.00	30		t	2025-09-27 04:31:09.915388	2025-09-27 05:15:28.777	a5800c92-9b35-11f0-0a80-017600135f1e		20	\N	\N	\N
ae0bd9ef-49e7-4d35-aef3-8836fae9007b	AN332ГЛЗ Микоплазмоз (Mycoplasma felis) (ПЦР)	МойСклад	766.00	30		t	2025-09-27 04:31:09.993292	2025-09-27 05:15:28.81	a58745b8-9b35-11f0-0a80-017600135f23		20	\N	\N	\N
76e7fcd3-d806-4732-94d3-0a1003fdbfd8	AN332НОС Микоплазмоз (Mycoplasma felis) (ПЦР)	МойСклад	766.00	30		t	2025-09-27 04:31:10.07198	2025-09-27 05:15:28.843	a58d0f78-9b35-11f0-0a80-017600135f28		20	\N	\N	\N
c6189d97-ec47-4f0c-9ed0-4c5c3ea0efc4	AN364ФК Трихомоноз (Tritrichomonas blagburni (foetus)) (ПЦР)	МойСклад	889.00	30		t	2025-09-27 04:31:10.151686	2025-09-27 05:15:28.876	a5925ceb-9b35-11f0-0a80-017600135f2d		20	\N	\N	\N
821ccc0b-0249-4839-95dd-e86d83c48c1d	AN364ГСК Трихомоноз (Tritrichomonas blagburni (foetus)) (ПЦР)	МойСклад	889.00	30		t	2025-09-27 04:31:10.232038	2025-09-27 05:15:28.91	a597d9f5-9b35-11f0-0a80-017600135f32		20	\N	\N	\N
4cda683d-bdab-44e5-b848-5740889ac473	AN339БАЛ Хламидиоз (Chl. felis) (ПЦР)	МойСклад	741.00	30		t	2025-09-27 04:31:10.311796	2025-09-27 05:15:28.943	a59df6f5-9b35-11f0-0a80-017600135f37		20	\N	\N	\N
14a3cc93-cd04-4aa2-b348-4c7395320519	AN339ГЛЗ Хламидиоз (Chl. felis) (ПЦР)	МойСклад	741.00	30		t	2025-09-27 04:31:10.39097	2025-09-27 05:15:28.975	a5a3ea96-9b35-11f0-0a80-017600135f3c		20	\N	\N	\N
4aa41253-ca7e-4193-86ac-cfccb685ba20	AN339НОС Хламидиоз (Chl. felis) (ПЦР)	МойСклад	741.00	30		t	2025-09-27 04:31:10.465898	2025-09-27 05:15:29.009	a5a92407-9b35-11f0-0a80-017600135f41		20	\N	\N	\N
7fd4fcd1-beaa-4809-8eb4-2d2f7d2bef5f	AN401ПДЕ Контроль лечения дерматомикозов	МойСклад	1597.00	30		t	2025-09-27 04:31:10.543884	2025-09-27 05:15:29.042	a5ae8514-9b35-11f0-0a80-017600135f46		20	\N	\N	\N
015bf9f7-73c3-4632-a75b-701e4adf630f	AN372БТК Микобактериоз (Mycobacterium tuberculosis complex) (ПЦР)	МойСклад	1177.00	30		t	2025-09-27 04:31:10.621518	2025-09-27 05:15:29.075	a5b42f77-9b35-11f0-0a80-017600135f4b		20	\N	\N	\N
433a685e-74de-4c40-916b-0f7db32c5ce0	AN46SDMA СДМА (Симметричный диметиларгинин)	МойСклад	3454.00	30		t	2025-09-27 04:31:10.698139	2025-09-27 05:15:29.108	a5ba0149-9b35-11f0-0a80-017600135f50		20	\N	\N	\N
cef438ee-ed79-4cb5-b44d-0af0f8818aff	AN36ALP Щелочная фосфатаза	МойСклад	149.00	30		t	2025-09-27 04:31:10.779676	2025-09-27 05:15:29.142	a5bfecf1-9b35-11f0-0a80-017600135f55		20	\N	\N	\N
e9e6565d-2cb1-44dd-86d9-00561e36551a	AN43CRP С-реактивный белок (собаки)	МойСклад	2139.00	30		t	2025-09-27 04:31:11.009391	2025-09-27 05:15:29.241	a5d14e1b-9b35-11f0-0a80-017600135f64		20	\N	\N	\N
51c85daf-5e64-40cb-ab50-6700e9751564	AN45SAA SAA (Сывороточный амилоид А (кошки))	МойСклад	2139.00	30		t	2025-09-27 04:31:11.084601	2025-09-27 05:15:29.274	a5d6fe6a-9b35-11f0-0a80-017600135f69		20	\N	\N	\N
4b164aeb-2a69-4ac0-8a15-b4d09dd29dff	AN342DIGPU Дигоксин (моча)	МойСклад	5881.00	30		t	2025-09-27 04:31:11.158664	2025-09-27 05:15:29.307	a5dcc50e-9b35-11f0-0a80-017600135f6e		20	\N	\N	\N
f791064b-4358-40c6-8e73-e7af13788c35	AN400ИДЕ Микроскопическое исследование на дерматомикозы	МойСклад	856.00	30		t	2025-09-27 04:31:11.234283	2025-09-27 05:15:29.34	a5e36a0c-9b35-11f0-0a80-017600135f73		20	\N	\N	\N
44620709-7167-47c0-8de8-e883fd6e50de	AN402ОТО Исследование на отодектоз	МойСклад	733.00	30		t	2025-09-27 04:31:11.30959	2025-09-27 05:15:29.373	a5e8b5a6-9b35-11f0-0a80-017600135f78		20	\N	\N	\N
872a2947-183d-4cdd-98e4-34177ce45bb1	AN403ЛНСП Цитологическое исследование НСП (наружного слухового прохода)	МойСклад	849.00	30		t	2025-09-27 04:31:11.386177	2025-09-27 05:15:29.406	a5edfbe4-9b35-11f0-0a80-017600135f7d		20	\N	\N	\N
f0ed485b-ee2e-4bfc-a771-335ab7c54604	AN407ЭКТ Исследование на эктопаразитов	МойСклад	733.00	30		t	2025-09-27 04:31:11.460997	2025-09-27 05:15:29.44	a5f3a539-9b35-11f0-0a80-017600135f82		20	\N	\N	\N
f504180c-de2b-485d-b70f-e2181e86a36d	AN404КОЖ Цитологическое исследование мазка-отпечатка с кожи	МойСклад	865.00	30		t	2025-09-27 04:31:11.534553	2025-09-27 05:15:29.473	a5f991e1-9b35-11f0-0a80-017600135f87		20	\N	\N	\N
74f6d6de-138b-44f9-b762-39997d480873	AN390КР Вирусная лейкемия (FeLV, обнаружение вирусной РНК) (ПЦР)	МойСклад	1128.00	30		t	2025-09-27 04:31:11.610044	2025-09-27 05:15:29.506	a5ff2315-9b35-11f0-0a80-017600135f8c		20	\N	\N	\N
16a959fc-40ac-4990-a7cb-4cb9029a128e	AN334ПРК Панлейкопения кошек (Feline panleukopenia virus) (ПЦР)	МойСклад	915.00	30		t	2025-09-27 04:31:11.687096	2025-09-27 05:15:29.539	a60473fa-9b35-11f0-0a80-017600135f91		20	\N	\N	\N
fc6b6f37-8aa4-4c65-9985-173f3c29d871	AN334ФК Панлейкопения кошек (Feline panleukopenia virus) (ПЦР)	МойСклад	915.00	30		t	2025-09-27 04:31:11.762062	2025-09-27 05:15:29.572	a6098e0c-9b35-11f0-0a80-017600135f96		20	\N	\N	\N
eae98fa4-17a3-4c80-90ce-2aa7198ee43d	AN393КР Гемоплазма (Mycoplasma haemofelis) кол.	МойСклад	1316.00	30		t	2025-09-27 04:31:11.838709	2025-09-27 05:15:29.605	a60f0fbb-9b35-11f0-0a80-017600135f9b		20	\N	\N	\N
40651d21-81e2-4e2c-be28-cb6709c342d1	AN394КР Гемоплазма (Candidatus Mycoplasma haemominutum) кол.	МойСклад	1316.00	30		t	2025-09-27 04:31:11.918205	2025-09-27 05:15:29.638	a6141f1e-9b35-11f0-0a80-017600135fa0		20	\N	\N	\N
f7e6bee4-250d-44a8-8d37-f662a0466dc8	AN441-Р Посев мочи на микрофлору с определением чувствительности к антимикробным препаратам  (дополнительный перечень антибиотиков)	МойСклад	2797.00	30		t	2025-09-27 04:31:12.068863	2025-09-27 05:15:29.705	a61f2a59-9b35-11f0-0a80-017600135faa		20	\N	\N	\N
50aa2199-e3f9-4371-9dba-3ea186f1f6c5	AN441-М Посев мочи на микрофлору с определением чувствительности к антимикробным препаратам  (определение минимальной ингибирующей концентрации антибиотика)	МойСклад	3175.00	30		t	2025-09-27 04:31:12.144633	2025-09-27 05:15:29.738	a6246772-9b35-11f0-0a80-017600135faf		20	\N	\N	\N
8f311cd8-66f5-4fd3-9bb9-22530d7fbaac	AN441-КОР Посев мочи на Corynebacterium urealyticum с определением чувствительности к антимикробным препаратам	МойСклад	1826.00	30		t	2025-09-27 04:31:12.219014	2025-09-27 05:15:29.771	a629e55a-9b35-11f0-0a80-017600135fb4		20	\N	\N	\N
79456e3e-b5d6-46fd-85d5-31f4410f87db	AN442МОЧ Посев на грибы рода Candida с определением чувствительности к антимикотическим препаратам	МойСклад	1826.00	30		t	2025-09-27 04:31:12.293918	2025-09-27 05:15:29.804	a62f26e6-9b35-11f0-0a80-017600135fb9		20	\N	\N	\N
bb9c8d55-6e20-48ed-a84e-4487c9172973	AN452-АНАЭ Посев на анаэробы с определением чувствительности к антимикробным препаратам	МойСклад	2986.00	30		t	2025-09-27 04:31:12.369342	2025-09-27 05:15:29.837	a63450c3-9b35-11f0-0a80-017600135fbe		20	\N	\N	\N
868c4e12-7e7b-44a5-b3bc-80f76e402d75	AN442ЖЕЛ Посев на грибы рода Candida с определением чувствительности к антимикотическим препаратам	МойСклад	1826.00	30		t	2025-09-27 04:31:12.447411	2025-09-27 05:15:29.871	a63a6247-9b35-11f0-0a80-017600135fc3		20	\N	\N	\N
0f7edad0-5b24-470a-92dd-96ed4905fcd7	AN442ПУН Посев на грибы рода Candida с определением чувствительности к антимикотическим препаратам	МойСклад	1826.00	30		t	2025-09-27 04:31:12.522419	2025-09-27 05:15:29.904	a640c0cd-9b35-11f0-0a80-017600135fc8		20	\N	\N	\N
adeb43b8-f259-4a01-bdd4-e0225d113d9e	AN442РАН Посев на грибы рода Candida с определением чувствительности к антимикотическим препаратам	МойСклад	1826.00	30		t	2025-09-27 04:31:12.598944	2025-09-27 05:15:29.939	a6477546-9b35-11f0-0a80-017600135fcd		20	\N	\N	\N
c15cce30-8d1c-40fe-b325-8d464f6fc339	AN467-А Посев отделяемого верхних дыхательных путей на микрофлору с определением чувствительности к антимикробным препаратам (основной перечень антибиотиков)	МойСклад	1934.00	30		t	2025-09-27 04:31:12.675091	2025-09-27 05:15:29.972	a64e1ba4-9b35-11f0-0a80-017600135fd2		20	\N	\N	\N
7d5d8383-4d8b-418e-88cf-7432ef96a219	AN467-Р Посев отделяемого верхних дыхательных путей на микрофлору с определением чувствительности к антимикробным препаратам  (дополнительный перечень антибиотиков)	МойСклад	3043.00	30		t	2025-09-27 04:31:12.753573	2025-09-27 05:15:30.006	a654d427-9b35-11f0-0a80-017600135fd7		20	\N	\N	\N
897f3e1a-6ad0-4810-8b1f-f38e0d1c41db	AN475-А Посев желчи на микрофлору с определением чувствительности к антимикробным препаратам (основной перечень антибиотиков)	МойСклад	1990.00	30		t	2025-09-27 04:31:16.21553	2025-09-27 05:15:31.51	a8662ab0-9b35-11f0-0a80-017600136180		20	\N	\N	\N
9cd13f95-c0b1-4239-9dde-7e0ea22da414	AN442ЗЕВ Посев на грибы рода Candida с определением чувствительности к антимикотическим препаратам	МойСклад	1826.00	30		t	2025-09-27 04:31:12.907094	2025-09-27 05:15:30.072	a661afb6-9b35-11f0-0a80-017600135fe1		20	\N	\N	\N
287a8a87-0cc2-4d3d-b8b7-90766798525f	AN446-А Посев отделяемого половых органов на микрофлору с определением чувствительности к антимикробным препаратам (основной перечень антибиотиков)	МойСклад	1934.00	30		t	2025-09-27 04:31:12.98156	2025-09-27 05:15:30.105	a667d30c-9b35-11f0-0a80-017600135fe6		20	\N	\N	\N
9aca87de-f245-4223-96c9-e2d30a0f443f	AN446-Р Посев отделяемого половых органов на микрофлору с определением чувствительности к антимикробным препаратам (дополнительный перечень антибиотиков)	МойСклад	3043.00	30		t	2025-09-27 04:31:13.057506	2025-09-27 05:15:30.138	a66e14aa-9b35-11f0-0a80-017600135feb		20	\N	\N	\N
b30cfbad-2bb7-4d91-9e04-c4f0b9c301f9	AN442ГИН Посев на грибы рода Candida с определением чувствительности к антимикотическим препаратам	МойСклад	1826.00	30		t	2025-09-27 04:31:13.135122	2025-09-27 05:15:30.172	a67473ca-9b35-11f0-0a80-017600135ff0		20	\N	\N	\N
611a25ff-fdef-497f-92bb-200c67bef0be	AN465-А Посев отделяемого глаз на микрофлору с определением чувствительности к антимикробным препаратам  (основной перечень антибиотиков)	МойСклад	2435.00	30		t	2025-09-27 04:31:13.209898	2025-09-27 05:15:30.205	a67a9ca8-9b35-11f0-0a80-017600135ff5		20	\N	\N	\N
2b605dbc-c244-42dd-b020-13012d258b9e	AN465-Р Посев отделяемого глаз на микрофлору с определением чувствительности к антимикробным препаратам   (дополнительный перечень антибиотиков)	МойСклад	3043.00	30		t	2025-09-27 04:31:13.285175	2025-09-27 05:15:30.238	a6808e84-9b35-11f0-0a80-017600135ffa		20	\N	\N	\N
eb0ed6d0-a078-4cd6-9633-d3388eb5c47d	AN442ГЛА Посев на грибы рода Candida с определением чувствительности к антимикотическим препаратам	МойСклад	1826.00	30		t	2025-09-27 04:31:13.360116	2025-09-27 05:15:30.271	a685c01b-9b35-11f0-0a80-017600135fff		20	\N	\N	\N
f1d6a02b-c2cf-4a4c-830b-34cc2bef4c17	AN473-А Посев отделяемого наружного слухового прохода (НСП) на микрофлору с определением чувствительности к антимикробным препаратам (основной перечень антибиотиков)	МойСклад	2435.00	30		t	2025-09-27 04:31:13.436112	2025-09-27 05:15:30.318	a68b3c80-9b35-11f0-0a80-017600136004		20	\N	\N	\N
403a1695-98eb-4a2b-b79f-1bf40a7d4897	AN473-Р Посев отделяемого наружного слухового прохода (НСП) на микрофлору с определением чувствительности к антимикробным препаратам (дополнительный перечень антибиотиков)	МойСклад	3043.00	30		t	2025-09-27 04:31:13.512533	2025-09-27 05:15:30.352	a691017a-9b35-11f0-0a80-017600136009		20	\N	\N	\N
f36553a9-83a9-473c-bf55-d9fdd9b25b41	AN442УХО Посев на грибы рода Candida, Malassezia с определением чувствительности к антимикотическим препаратам	МойСклад	1826.00	30		t	2025-09-27 04:31:13.58808	2025-09-27 05:15:30.385	a696238f-9b35-11f0-0a80-01760013600e		20	\N	\N	\N
0ad12595-40b5-43ec-9a19-4a99bf9facb5	AN438 -А Посев крови на аэробную микрофлору  с определением чувствительности к антимикробным  препаратам (основной перечень антибиотиков)	МойСклад	3060.00	30		t	2025-09-27 04:31:13.662976	2025-09-27 05:15:30.419	a69be842-9b35-11f0-0a80-017600136013		20	\N	\N	\N
014d6f99-84b6-4b85-b31f-882cc1740175	AN438 -Р Посев крови на аэробную микрофлору с определением чувствительности к антимикробным  препаратам (дополнительный перечень антибиотиков)	МойСклад	3651.00	30		t	2025-09-27 04:31:13.738346	2025-09-27 05:15:30.452	a6a2d796-9b35-11f0-0a80-017600136018		20	\N	\N	\N
72936a6c-fe29-4c3c-88fa-e9ff617dc113	AN35ОБС Американский питбультерьер.   Гиперурикозурия (HUU), Нейрональный цероидный липофусциноз 4A типа (NCL IVA), Прогресирующая атрофия сетчатки PRA-crd2	МойСклад	9555.00	30		t	2025-09-27 04:31:13.81834	2025-09-27 05:15:30.485	a6a82818-9b35-11f0-0a80-01760013601d		20	\N	\N	\N
1dff37d9-6d95-4d3b-9c1f-4ee1c626d0c6	AN36ОБС Американский стаффордширский терьер. Гиперурикозурия (HUU), Нейрональный цероидный липофусциноз 4A типа (NCL IVA), Прогресирующая атрофия сетчатки PRA-crd1	МойСклад	9555.00	30		t	2025-09-27 04:31:13.893813	2025-09-27 05:15:30.518	a6ad4d83-9b35-11f0-0a80-017600136022		20	\N	\N	\N
d0c7a85c-2db8-4267-8bb8-09f933025e55	AN37ОБС Бернский зенненхунд.  Дегенеративная миелопатия (DM Ex1-Ex2),  Болезнь фон Виллебранда 1-го типа	МойСклад	7960.00	30		t	2025-09-27 04:31:13.972987	2025-09-27 05:15:30.551	a6b342c4-9b35-11f0-0a80-017600136027		20	\N	\N	\N
990d6256-a2cb-416e-afb4-45c86cf5a03b	AN38ОБС Бурбуль. Гиперурикозурия, Дегенеративная миелопатия (DM Ex2), Злокачественная гипертермия (MH), Мультифокальная ретинопатия CMR 1),Чувствительность к лекарственным препаратам (MDR 1)	МойСклад	15344.00	30		t	2025-09-27 04:31:14.050898	2025-09-27 05:15:30.584	a6b8f58a-9b35-11f0-0a80-01760013602c		20	\N	\N	\N
49325df9-c78e-4b5a-8f6d-9b1c742a7b3a	AN39ОБС Вельш корги кардиган / пемброк расширенный.  Дегенеративная миелопатия (DM Ex2), Прогрессирующая атрофия сетчатки rcd3-PRA, Болезнь Виллебранда1-го типа,  Длина шерсти	МойСклад	12524.00	30		t	2025-09-27 04:31:14.129454	2025-09-27 05:15:30.617	a6be33a6-9b35-11f0-0a80-017600136031		20	\N	\N	\N
f3c8a087-54b6-441e-b1a1-55eea1a6d3ed	AN40ОБС Вельш корги кардиган / пемброк. Болезнь Виллебранда I-го типа (vWD type I), Дегенеративная миелопатия (DM Ex2), Длина шерсти	МойСклад	9555.00	30		t	2025-09-27 04:31:14.207314	2025-09-27 05:15:30.65	a6c370cc-9b35-11f0-0a80-017600136036		20	\N	\N	\N
2a6f317b-757f-497f-98a7-498b86c6ce0b	AN42ОБС Голден ретривер. Ихтиоз голден ретриверов (ICT-A), Прогрессирующая атрофия сетчатки GR-PRA1, Прогрессирующая атрофия сетчатки GR-PRA2	МойСклад	9555.00	30		t	2025-09-27 04:31:14.360938	2025-09-27 05:15:30.716	a6ce4498-9b35-11f0-0a80-017600136040		20	\N	\N	\N
4b7d6c8c-9449-40d8-8f60-494b958ba2b6	AN44ОБС Доберман. Болезнь фон Виллебранда I-го типа (vWD type I), Дилатационная кардиомиопатия (DCM_dob), Нарколепсия доберманов (NARC_dob)	МойСклад	9555.00	30		t	2025-09-27 04:31:14.435773	2025-09-27 05:15:30.749	a6d3cd5f-9b35-11f0-0a80-017600136045		20	\N	\N	\N
d3ca384e-d0f1-4b40-9c9b-85a8733ea262	AN45ОБС Йоркширский терьер.  Гиперурикозурия, Дегенеративная миелопатия (DM Ex2), Первичный вывих хрусталика (PLL), Прогрессирующая атрофия сетчатки PRA-prcd	МойСклад	12524.00	30		t	2025-09-27 04:31:14.51215	2025-09-27 05:15:30.782	a6d9edb9-9b35-11f0-0a80-01760013604a		20	\N	\N	\N
7bcec620-6ab4-486a-b153-0fb34b0b4941	AN46ОБС Кавалер кинг чарльз спаниель  (расширенный). Дегенеративная миелопатия (DM Ex2), Мышечная дистрофия кавалер кинг чарльз спаниэлей (DMD-CKCS), Синдром эпизодического падения (EFS), Синдром сухого глаза и курчавошерстности (CKCID)	МойСклад	12524.00	30		t	2025-09-27 04:31:14.590051	2025-09-27 05:15:30.815	a7f23adf-9b35-11f0-0a80-017600136117		20	\N	\N	\N
e0d65fb7-d81d-4f2e-8bb6-bb1a85d23ddb	AN4AT3 Антитромбин III	МойСклад	840.00	30		t	2025-09-27 04:31:14.666035	2025-09-27 05:15:30.848	a7f817fe-9b35-11f0-0a80-01760013611c		20	\N	\N	\N
d1b06102-1046-4317-a902-a7a904eb4ba5	AN48FE Железо	МойСклад	149.00	30		t	2025-09-27 04:31:14.742589	2025-09-27 05:15:30.88	a7fe0158-9b35-11f0-0a80-017600136121		20	\N	\N	\N
4c45e9f3-34be-48ad-95aa-6683cf688595	AN7000ГА Локус А (агути) Породы: Все породы	МойСклад	3331.00	30		t	2025-09-27 04:31:14.823488	2025-09-27 05:15:30.913	a80374af-9b35-11f0-0a80-017600136126		20	\N	\N	\N
69feab75-74a5-4a3c-af53-d4c907b5a324	AN7002ГВ Локус B (коричневый) Породы: Все породы	МойСклад	3331.00	30		t	2025-09-27 04:31:14.897835	2025-09-27 05:15:30.947	a808f8f1-9b35-11f0-0a80-01760013612b		20	\N	\N	\N
8506b104-2a63-4b3f-8659-2f492c1997f7	AN7007ГО3 Три локуса окраса Породы: Все породы	МойСклад	9555.00	30		t	2025-09-27 04:31:14.974002	2025-09-27 05:15:30.98	a80e65d0-9b35-11f0-0a80-017600136130		20	\N	\N	\N
ab0cf182-3024-4ad6-95fa-729b46d0c09f	AN5 Общий анализ крови (флуоресцентная проточная цитометрия + микроскопия мазка при наличии патологических сдвигов)	МойСклад	626.00	30		t	2025-09-27 04:31:15.057062	2025-09-27 05:15:31.012	a813ca08-9b35-11f0-0a80-017600136135		20	\N	\N	\N
dce3ad4d-3959-4b4e-95d3-b943f7f1bd2f	AN4ОБС Расширенный (АЛТ, альбумин, альбумин/глобулин соотношение, АСТ, белок общий, билирубин общий, ГГТ, глюкоза, калий, кальций, креатинин, мочевина, натрий, триглицериды, фосфор, холестерин, хлор, ЩФ) 18	МойСклад	2271.00	30		t	2025-09-27 04:31:15.133779	2025-09-27 05:15:31.046	a8196ee0-9b35-11f0-0a80-01760013613a		20	\N	\N	\N
12687d61-5352-4845-81b3-6d5e07fe21d9	AN6ОБС Почечный (альбумин, белок общий, глюкоза, калий, кальций, креатинин, мочевина, натрий, фосфор, хлор) 10	МойСклад	1316.00	30		t	2025-09-27 04:31:15.285081	2025-09-27 05:15:31.113	a82468c1-9b35-11f0-0a80-017600136144		20	\N	\N	\N
06a328fb-bcfa-4628-9529-dc7b63e74b0e	AN54T4 Т4 общий (тироксин)	МойСклад	987.00	30		t	2025-09-27 04:31:15.361356	2025-09-27 05:15:31.146	a82a516f-9b35-11f0-0a80-017600136149		20	\N	\N	\N
8d80da62-dc15-4722-be98-694e91d71566	AN56TSH ТТГ собак (тиреотропный гормон)	МойСклад	987.00	30		t	2025-09-27 04:31:15.436363	2025-09-27 05:15:31.179	a82fd9b6-9b35-11f0-0a80-01760013614e		20	\N	\N	\N
277e2340-6a4a-4b72-a4b3-d6dd2359abf1	AN62E2 Эстрадиол	МойСклад	987.00	30		t	2025-09-27 04:31:15.511688	2025-09-27 05:15:31.213	a835c333-9b35-11f0-0a80-017600136153		20	\N	\N	\N
1707c1ad-50e6-4620-90f0-9f931eb18981	AN63PGN Прогестерон	МойСклад	987.00	30		t	2025-09-27 04:31:15.591817	2025-09-27 05:15:31.246	a83b0879-9b35-11f0-0a80-017600136158		20	\N	\N	\N
b3a0e90d-fe49-4be1-ab24-ff8d88258c21	AN64TES Тестостерон	МойСклад	987.00	30		t	2025-09-27 04:31:15.670259	2025-09-27 05:15:31.28	a8403348-9b35-11f0-0a80-01760013615d		20	\N	\N	\N
5ee89191-b378-43c8-9c4b-f8df93ac43c1	AN65COR Кортизол	МойСклад	987.00	30		t	2025-09-27 04:31:15.746554	2025-09-27 05:15:31.313	a845601f-9b35-11f0-0a80-017600136162		20	\N	\N	\N
10680f52-1540-4517-ac8d-c6861e00bf16	AN57ДМП Малая/Большая дексаметазоновая проба	МойСклад	2385.00	30		t	2025-09-27 04:31:15.823733	2025-09-27 05:15:31.345	a84ad455-9b35-11f0-0a80-017600136167		20	\N	\N	\N
9a8ac162-37b3-41a8-b9f4-0d4b1c595db5	AN63OPGN Прогестерон, определение овуляции	МойСклад	2139.00	30		t	2025-09-27 04:31:15.898841	2025-09-27 05:15:31.378	a8504c9b-9b35-11f0-0a80-01760013616c		20	\N	\N	\N
3564542a-110f-4970-8ac2-016e793a19bd	AN65110 Соотношение кортизол / креатинин в моче	МойСклад	939.00	30		t	2025-09-27 04:31:15.978012	2025-09-27 05:15:31.411	a855a5dd-9b35-11f0-0a80-017600136171		20	\N	\N	\N
9ccdfbf5-9894-4d0e-9e8d-cd1260d75b73	AN66110 Соотношение норметанефрин/креатинин в моче	МойСклад	4375.00	30		t	2025-09-27 04:31:16.060157	2025-09-27 05:15:31.444	a85afd93-9b35-11f0-0a80-017600136176		20	\N	\N	\N
a058089f-9b99-41c2-acc2-8406c5b393c1	AN67110 Норметанефрин + метанефрин в суточной моче	МойСклад	4359.00	30		t	2025-09-27 04:31:16.138002	2025-09-27 05:15:31.477	a860c1dc-9b35-11f0-0a80-01760013617b		20	\N	\N	\N
17c6cc07-e442-4387-8c6d-e1359e0ffd4c	AN508ГИИ Изготовление препарата до стекла с окрашиванием (до 2 блоков, до 2 стекол)	МойСклад	1349.00	30		t	2025-09-27 04:31:17.829362	2025-09-27 05:15:32.178	a8ef624a-9b35-11f0-0a80-0176001361e9		20	\N	\N	\N
83864f20-c488-41e0-aab7-e7f6d13586cb	AN475-М Посев желчи на микрофлору с определением чувствительности к антимикробным препаратам  (определение минимальной ингибирующей концентрации антибиотика)	МойСклад	3980.00	30		t	2025-09-27 04:31:16.367351	2025-09-27 05:15:31.577	a870b4b1-9b35-11f0-0a80-01760013618a		20	\N	\N	\N
a86f49cc-4aaf-443b-b6d6-bbd13d070e4b	AN477-А Посев пункционной или аспирационной жидкости  на микрофлору с определением чувствительности к антимикробным препаратам  (основной перечень антибиотиков)	МойСклад	2073.00	30		t	2025-09-27 04:31:16.443776	2025-09-27 05:15:31.609	a876061d-9b35-11f0-0a80-01760013618f		20	\N	\N	\N
78074433-85a7-4845-96ba-0dd83c370ae4	AN477-М Посев пункционной или аспирационной жидкости  на микрофлору с определением чувствительности к антимикробным препаратам  (определение минимальной ингибирующей концентрации антибиотика)	МойСклад	3487.00	30		t	2025-09-27 04:31:16.597085	2025-09-27 05:15:31.672	a881fd65-9b35-11f0-0a80-017600136199		20	\N	\N	\N
b0619295-065d-4e4d-aa6a-769a2b2bc895	AN474-А Посев раневого отделяемого/нестерильного биоматериала на микрофлору с определением чувствительности к антимикробным препаратам  (основной перечень антибиотиков)	МойСклад	2435.00	30		t	2025-09-27 04:31:16.671868	2025-09-27 05:15:31.704	a887bcf1-9b35-11f0-0a80-01760013619e		20	\N	\N	\N
525a7968-6af8-4a5c-84a0-221081cd390d	AN474-Р Посев раневого отделяемого/нестерильного биоматериала на микрофлору с определением чувствительности к антимикробным препаратам (дополнительный перечень антибиотиков)	МойСклад	3520.00	30		t	2025-09-27 04:31:16.748004	2025-09-27 05:15:31.735	a88e2945-9b35-11f0-0a80-0176001361a3		20	\N	\N	\N
bbfc7a54-2668-426e-9682-7b2b2bba559b	AN474-М Посев раневого отделяемого/нестерильного биоматериала на микрофлору с определением чувствительности к антимикробным препаратам (определение минимальной ингибирующей концентрации антибиотика)	МойСклад	3668.00	30		t	2025-09-27 04:31:16.822715	2025-09-27 05:15:31.766	a894d2f7-9b35-11f0-0a80-0176001361a8		20	\N	\N	\N
26fbad01-7e04-4b4b-849a-ac29201400bb	AN529ГИЭ ИГХ исследование при лимфоидных нозологиях у собак / кошек 3 АТ: CD3, PAX5, Ki67, (определение Т и В фенотипа клеток ЗНО)	МойСклад	8272.00	30		t	2025-09-27 04:31:16.900282	2025-09-27 05:15:31.798	a89c5d96-9b35-11f0-0a80-0176001361ad		20	\N	\N	\N
0f932392-8eee-4fb7-a577-a501944c6d4b	AN501 Заключение о типе выпота (транссудаты и экссудаты (биохимия + цитологическое исследование осадка, клеточный состав, включая описание атипичных/опухолевых клеток))	МойСклад	2855.00	30		t	2025-09-27 04:31:16.975823	2025-09-27 05:15:31.83	a8a44696-9b35-11f0-0a80-0176001361b2		20	\N	\N	\N
6f263939-5570-48ba-9dfb-35f8491c73c8	AN505ГИЭ Цитологическое исследование (пунктаты, биоптаты, кроме костного мозга)	МойСклад	2303.00	30		t	2025-09-27 04:31:17.051319	2025-09-27 05:15:31.861	a8ac1b99-9b35-11f0-0a80-0176001361b7		20	\N	\N	\N
73e7a76a-25bd-4587-be03-51650f6cf39f	AN522ГИЭ Цитологическое исследование бронхоальвеолярного лаважа	МойСклад	2214.00	30		t	2025-09-27 04:31:17.129732	2025-09-27 05:15:31.893	a8b23934-9b35-11f0-0a80-0176001361bc		20	\N	\N	\N
6d53c802-a4ba-4396-90dd-c1a708045f3c	AN501КР Цитологическое исследование венозной крови (наличие патологических клеток + общий анализ крови)	МойСклад	2385.00	30		t	2025-09-27 04:31:17.20578	2025-09-27 05:15:31.924	a8b84725-9b35-11f0-0a80-0176001361c1		20	\N	\N	\N
7a391f45-8555-4ab6-8a48-e1b3a64d419b	AN514ГИЭ Цитологическое исследование костного мозга (включает общий анализ крови (одновременно со взятием костного мозга взять пробу цельной крови))	МойСклад	4046.00	30		t	2025-09-27 04:31:17.281382	2025-09-27 05:15:31.956	a8bdf716-9b35-11f0-0a80-0176001361c6		20	\N	\N	\N
d5d8634f-7f37-47cc-8bdf-6ddadbaf3fed	AN501УРО Цитологическое исследование мочи	МойСклад	2214.00	30		t	2025-09-27 04:31:17.356635	2025-09-27 05:15:31.988	a8c3937c-9b35-11f0-0a80-0176001361cb		20	\N	\N	\N
b1df4c97-a2f2-4944-9998-6b24c7f54f0f	AN501СИН Цитологическое исследование синовиальной жидкости	МойСклад	2214.00	30		t	2025-09-27 04:31:17.431662	2025-09-27 05:15:32.02	a8ca09ff-9b35-11f0-0a80-0176001361d0		20	\N	\N	\N
f3c9db38-2d40-48e0-b2f4-b912bf3f0aa5	AN511 Гистологическое заключение патолога (приготовление препарата до 2 блоков, до 2 стекол + описательная часть)	МойСклад	3126.00	30		t	2025-09-27 04:31:17.512555	2025-09-27 05:15:32.052	a8d0fa64-9b35-11f0-0a80-0176001361d5		20	\N	\N	\N
027d2725-9d0e-4c4e-888a-2f51900bf34e	AN519 Гистологическое заключение патолога (приготовление препарата до 6 блоков, до 6 стекол + описательная часть	МойСклад	4375.00	30		t	2025-09-27 04:31:17.591217	2025-09-27 05:15:32.083	a8d8813c-9b35-11f0-0a80-0176001361da		20	\N	\N	\N
f1b3e0ad-6748-478c-9137-a57317608e39	AN523 Гистологическое исследование кожи (приготовление препарата до 6 блоков, до 6 стекол + описательная часть)	МойСклад	5757.00	30		t	2025-09-27 04:31:17.674764	2025-09-27 05:15:32.114	a8e08b81-9b35-11f0-0a80-0176001361df		20	\N	\N	\N
eabd39ec-37cd-48f9-8d9a-57d1758ed212	AN502 Гистологическое заключение патолога (приготовление препарата (костные фрагменты) до 2 блоков, до 2 стекол + описательная часть)	МойСклад	3537.00	30		t	2025-09-27 04:31:17.753005	2025-09-27 05:15:32.146	a8e7e1f4-9b35-11f0-0a80-0176001361e4		20	\N	\N	\N
714b56dd-2a97-4636-af36-b7501943b324	AN512ГИИ Изготовление препарата до стекла с окрашиванием (до 24 блоков, до 24 стекол)	МойСклад	6578.00	30		t	2025-09-27 04:31:17.986168	2025-09-27 05:15:32.273	a8fff1ea-9b35-11f0-0a80-0176001361f3		20	\N	\N	\N
8750746a-daf2-4896-8165-e5e0b9189911	AN504 Гистологическое заключение патолога (Европа, США, Канада) (приготовление препарата(костные фрагменты) до 2 блоков, до 2 стекол + сканирование стекол + описательная часть)	МойСклад	10690.00	30		t	2025-09-27 04:31:18.147638	2025-09-27 05:15:32.339	a91096a0-9b35-11f0-0a80-0176001361fd		20	\N	\N	\N
50c01172-be41-42a9-a348-d2325f0cffe6	AN512 Гистологическое исследование некропсийного материала (приготовление препарата до 24 блоков, до 24 стекол + описательная часть)	МойСклад	9867.00	30		t	2025-09-27 04:31:18.229287	2025-09-27 05:15:32.371	a918fb35-9b35-11f0-0a80-017600136202		20	\N	\N	\N
72d37af9-1bbc-4e69-87a2-9ea22e1054f8	AN507 Гистологическое заключение патолога (Европа, США, Канада) (сканирование готового стекла + описательная часть)	МойСклад	10707.00	30		t	2025-09-27 04:31:18.31008	2025-09-27 05:15:32.403	a920afdd-9b35-11f0-0a80-017600136207		20	\N	\N	\N
b31aeca2-5cae-462f-8d56-a2b51b0ebad1	AN506ГИЭ Консультация патолога (Россия) по стеклам с заключением	МойСклад	2287.00	30		t	2025-09-27 04:31:18.385777	2025-09-27 05:15:32.435	a927f655-9b35-11f0-0a80-01760013620c		20	\N	\N	\N
e07c04ad-c772-4ab6-b1ef-20d57ace0625	AN520ГИЭ, AN5202ГИЭ, AN5203ГИЭ, AN5204ГИЭ, AN5205ГИЭ, AN5206ГИЭ "Сканирование готового стекла	МойСклад	964.00	30		t	2025-09-27 04:31:18.463054	2025-09-27 05:15:32.466	a9326545-9b35-11f0-0a80-017600136211		20	\N	\N	\N
e2485df8-980d-44b1-a5dd-5d747e7d9029	AN5201ГИЭ Запись на электронный носитель	МойСклад	16923.00	30		t	2025-09-27 04:31:18.540031	2025-09-27 05:15:32.499	a9394818-9b35-11f0-0a80-017600136216		20	\N	\N	\N
94324764-1cfd-4609-ac77-6c1d79abf4a6	AN513ГИЭ Приготовление стекла из парафинового блока (дорезка без окрашивания)	МойСклад	18699.00	30		t	2025-09-27 04:31:18.615518	2025-09-27 05:15:32.531	a93fbef3-9b35-11f0-0a80-01760013621b		20	\N	\N	\N
cb84dc64-1e37-4346-ab85-aa21c716ea2c	AN515ГИЭ Приготовление стекла из парафинового блока (дорезка с окрашиванием)	МойСклад	25665.00	30		t	2025-09-27 04:31:18.690522	2025-09-27 05:15:32.563	a9461372-9b35-11f0-0a80-017600136220		20	\N	\N	\N
10f138c0-0f92-4ca8-97a6-ea1885e425af	AN516ГИЭ ИГХ исследование (приготовление препарата + 1 АТ)	МойСклад	21676.00	30		t	2025-09-27 04:31:18.771473	2025-09-27 05:15:32.595	a94c782e-9b35-11f0-0a80-017600136225		20	\N	\N	\N
52ba8be9-5e06-49ab-a5f8-1bd581acaa7a	AN525ГИЭ ИГХ исследование (приготовление препарата + 2 АТ)	МойСклад	18412.00	30		t	2025-09-27 04:31:18.85215	2025-09-27 05:15:32.626	a95279f7-9b35-11f0-0a80-01760013622a		20	\N	\N	\N
a61f4740-6e2b-4a51-9d74-9fb3d2006b11	AN526ГИЭ ИГХ исследование (приготовление препарата + 4 АТ)	МойСклад	21676.00	30		t	2025-09-27 04:31:18.927097	2025-09-27 05:15:32.658	a95892e1-9b35-11f0-0a80-01760013622f		20	\N	\N	\N
35bbe4e1-20d3-4e6f-8189-6c9a2eecba17	AN527ГИЭ ИГХ исследование (приготовление препарата + 6 АТ)	МойСклад	42347.00	30		t	2025-09-27 04:31:19.00447	2025-09-27 05:15:32.691	a95e95d8-9b35-11f0-0a80-017600136234		20	\N	\N	\N
e77b18e8-d515-47e2-ad30-cf7411b0d6b0	AN528ГИЭ ИГХ исследование (приготовление препарата + 8 АТ)	МойСклад	25665.00	30		t	2025-09-27 04:31:19.082913	2025-09-27 05:15:32.724	a964e60e-9b35-11f0-0a80-017600136239		20	\N	\N	\N
7afc3358-37ae-4846-8d25-0a035153aa63	AN530ГИЭ Прогностическая ИГХ оценка мастоцитом опухоли тучных клеток у собак / кошек 2 АТ: CD117, Ki67 + Giemza	МойСклад	8272.00	30		t	2025-09-27 04:31:19.159773	2025-09-27 05:15:32.756	a96b7b30-9b35-11f0-0a80-01760013623e		20	\N	\N	\N
2e4e57b5-320b-4c4c-a361-b6b35ba21eab	AN531ГИЭ ИГХ исследование при меланоме у собак / кошек (диагностическая и прогностическая) 3АТ: Melan A, S100, Ki67	МойСклад	13700.00	30		t	2025-09-27 04:31:19.238728	2025-09-27 05:15:32.788	a971584a-9b35-11f0-0a80-017600136243		20	\N	\N	\N
f26e4188-c81e-4fc5-bd97-d8509b6a355a	AN532ГИЭ ИГХ исследование для верификации мягкотканных сарком у собак / кошек 8АТ: SMA, Myogenin, pCK, CD31, S100, GFAP, Ki67, Desmin	МойСклад	1448.00	30		t	2025-09-27 04:31:19.319391	2025-09-27 05:15:32.819	a9773a66-9b35-11f0-0a80-017600136248		20	\N	\N	\N
87cb0db8-345e-465c-a972-d53016b485d6	AN533ГИЭ Дифференциальная диагностика карциномы молочной железы у кошек / собак 4 АТ: pCK, миэпителиальный слой (для дифференциального диагноза инвазивной карциномы и in situ) – p63, SMA, calponin	МойСклад	2139.00	30		t	2025-09-27 04:31:19.400461	2025-09-27 05:15:32.851	a97d6129-9b35-11f0-0a80-01760013624d		20	\N	\N	\N
2e8ae2a0-0371-473b-b292-3ce973bc51a8	AN509ГИЭ Выявление клональности лимфоцитов (PARR)	МойСклад	4220.00	30		t	2025-09-27 04:31:19.477775	2025-09-27 05:15:32.883	a983290d-9b35-11f0-0a80-017600136252		20	\N	\N	\N
92fc5528-b2d9-4e4a-8b12-b30165eee3c1	AN510ГИЭ Мутация в гене C-KIT (собаки)	МойСклад	4220.00	30		t	2025-09-27 04:31:19.557951	2025-09-27 05:15:32.914	a988d812-9b35-11f0-0a80-017600136257		20	\N	\N	\N
9d0d14ee-412e-4bcf-961d-975170547fc0	AN510C-K Мутация в гене C-KIT (8,9,11 экзоны) (кошки)	МойСклад	4220.00	30		t	2025-09-27 04:31:19.636247	2025-09-27 05:15:32.946	a98e6072-9b35-11f0-0a80-01760013625c		20	\N	\N	\N
e9add3ff-d134-4587-b55c-d9d5c2293331	AN64ОБС Комплексное исследование на: этанол, ксилол, толуол, фенол, формальдегид, метанол, ацетон, изопропанол	МойСклад	5536.00	30		t	2025-09-27 04:31:19.713251	2025-09-27 05:15:32.978	a994a04f-9b35-11f0-0a80-017600136261		20	\N	\N	\N
87237c0b-8c3e-4863-b099-70b2b25fb16f	AN6000NP Комплексное токсикологическое исследование (наркотические и психоактивные вещества, более 6000 веществ)	МойСклад	2007.00	30		t	2025-09-27 04:31:19.793399	2025-09-27 05:15:33.01	a99b80f1-9b35-11f0-0a80-017600136266		20	\N	\N	\N
970fbca1-8a77-43f0-8998-f09fcf5285e3	AN7003ГД Локус D, аллель d1 (осветленный) Породы: Все породы	МойСклад	3331.00	30		t	2025-09-27 04:31:19.952999	2025-09-27 05:15:33.074	a9a84bcc-9b35-11f0-0a80-017600136270		20	\N	\N	\N
33802b53-7df8-4ec0-9285-8de82b564916	AN7001ГЕ Локус Е, аллели EM (маска) и е1 (палевый) Породы: Все породы	МойСклад	3331.00	30		t	2025-09-27 04:31:20.029633	2025-09-27 05:15:33.105	a9ae46d4-9b35-11f0-0a80-017600136275		20	\N	\N	\N
0541b94e-0379-4901-9d39-2ca84092fd27	AN7004ГК Локус K (доминантный черный) Породы: Все породы	МойСклад	3331.00	30		t	2025-09-27 04:31:20.106964	2025-09-27 05:15:33.137	a9b47113-9b35-11f0-0a80-01760013627a		20	\N	\N	\N
78cf4989-1e06-4286-bff9-1c0d93aaba06	AN7005ГМ Локус M (Мерль) Породы: Все породы	МойСклад	3331.00	30		t	2025-09-27 04:31:20.18563	2025-09-27 05:15:33.169	a9ba26ee-9b35-11f0-0a80-01760013627f		20	\N	\N	\N
05b53e89-71c0-4e7e-ac82-bd5a68418c94	AN7006ГО2 Два локуса окраса Породы: Все породы	МойСклад	6514.00	30		t	2025-09-27 04:31:20.263387	2025-09-27 05:15:33.2	a9c012eb-9b35-11f0-0a80-017600136284		20	\N	\N	\N
cb67bdfc-0e93-4a5a-998b-8faf59f32697	AN7008ГО4 Четыре локуса окраса Породы: Все породы	МойСклад	12524.00	30		t	2025-09-27 04:31:20.343429	2025-09-27 05:15:33.232	a9c5c22d-9b35-11f0-0a80-017600136289		20	\N	\N	\N
c28c40e9-08d2-45fd-9ecc-e32c9fb84ca8	AN7011УИП Объем мышечной массы уиппетов ("bully").  Породы: уиппет.	МойСклад	3331.00	30		t	2025-09-27 04:31:20.498489	2025-09-27 05:15:33.297	a9d227f1-9b35-11f0-0a80-017600136293		20	\N	\N	\N
d8fd19c7-fedf-477a-8580-c2dc59adaf3d	AN7012CEA Аномалия глаз колли (Сollie Eye Anomaly, CEA). Породы: Австралийская овчарка (Аусси), Английская овчарка, Бойкин-спаниель, Колли (все разновидности), Ланкаширский хилер, Миниатюрная американская овчарка, Новошотландский ретривер, Уиппет дли	МойСклад	3331.00	30		t	2025-09-27 04:31:20.577887	2025-09-27 05:15:33.329	a9d79d4e-9b35-11f0-0a80-017600136298		20	\N	\N	\N
d9db22cc-a38a-4c45-923d-5896310fd0cf	AN7013VWD Болезнь фон Виллебранда 1-го типа (von Willebrand Disease, vWD type I).  Породы: Австралийский лабрадудль (Коббердог), Австралийский терьер, Барбет, Бассет-хаунд, Бернедудель, Бернский зенненхунд (Бернская овчарка), Бразильский терьер, Вель	МойСклад	3331.00	30		t	2025-09-27 04:31:20.657376	2025-09-27 05:15:33.361	a9dce62e-9b35-11f0-0a80-01760013629d		20	\N	\N	\N
31e7af39-95d4-4a0d-b0aa-cb42d1436f21	AN7014HUU Гиперурикозурия (Hyperuricosuria, HUU).  Породы: все.	МойСклад	3331.00	30		t	2025-09-27 04:31:20.735367	2025-09-27 05:15:33.393	a9e2a642-9b35-11f0-0a80-0176001362a2		20	\N	\N	\N
ee470e58-942b-47d4-9dc3-f3e0de88b6f9	AN7015GSD Гликогеноз IIIa типа (Glycogen Storage Disease type IIIa, GSD IIIa).  Породы: курчавошерстный ретривер.	МойСклад	3331.00	30		t	2025-09-27 04:31:20.814762	2025-09-27 05:15:33.424	a9e8185c-9b35-11f0-0a80-0176001362a7		20	\N	\N	\N
99b6c146-2711-4a58-ba35-f13914d7f3da	AN7016DM Дегенеративная миелопатия. Экзон 2 (Degenerative Myelopathy, DM Ex2). Породы: все.	МойСклад	3331.00	30		t	2025-09-27 04:31:20.900568	2025-09-27 05:15:33.456	a9ed6925-9b35-11f0-0a80-0176001362ac		20	\N	\N	\N
4702516e-30aa-48b6-a456-c254d6c546ab	AN7017DCM Дилатационная кардиомиопатия доберманов (Dilated Cardiomyopathy, DCM) Породы: Доберман	МойСклад	3331.00	30		t	2025-09-27 04:31:20.983521	2025-09-27 05:15:33.487	a9f2e567-9b35-11f0-0a80-0176001362b1		20	\N	\N	\N
d94e2ebd-bfd5-470d-9554-b399104ab0a5	AN7018DCMB Дилатационная кардиомиопатия боксёров (Dilated Cardiomyopathy, DCM-box) Породы: Боксер	МойСклад	3331.00	30		t	2025-09-27 04:31:21.062152	2025-09-27 05:15:33.519	a9f85053-9b35-11f0-0a80-0176001362b6		20	\N	\N	\N
5009b70f-7a5f-4c43-9f17-acc80be1c623	AN7019DCMI Дилатационная кардиомиопатия ирландских волкодавов (Dilated Cardiomyopathy, DCM-iw) Породы: Ирландский волкодав	МойСклад	3331.00	30		t	2025-09-27 04:31:21.143941	2025-09-27 05:15:33.55	a9fe3d9f-9b35-11f0-0a80-0176001362bb		20	\N	\N	\N
d19c0bd1-8c97-459e-a391-260357d9473a	AN7020MH Злокачественная гипертермия (Malignant Hyperthermia, MH). Породы: все.	МойСклад	3331.00	30		t	2025-09-27 04:31:21.226414	2025-09-27 05:15:33.582	aa03f1db-9b35-11f0-0a80-0176001362c0		20	\N	\N	\N
f5d8a226-ae38-4d8d-a901-d468bfd78ae8	AN7021ICT Ихтиоз голден ретриверов (Ichthyosis, ICT-A).    Породы: Голден ретривер (Золотистый ретривер)	МойСклад	3331.00	30		t	2025-09-27 04:31:21.307096	2025-09-27 05:15:33.614	aa09291e-9b35-11f0-0a80-0176001362c5		20	\N	\N	\N
769b895a-189b-468d-8bf8-f4a39e0a1b34	AN7022EIC Коллапс, вызываемый физическими нагрузками (Exercise Induced Collapse, EIC).  Породы: Австралийский лабрадудль (Коббердог), Американский кокер спаниель, Английский кокер спаниель, Бобтейл (Староанглийская овчарка), Бойкин-спаниель, Вельш-ко	МойСклад	3331.00	30		t	2025-09-27 04:31:21.388612	2025-09-27 05:15:33.646	aa0e62f7-9b35-11f0-0a80-0176001362ca		20	\N	\N	\N
dba0d6b8-cfdd-4b18-9350-7db92495da9d	AN7023CSNB Куриная слепота бриаров (Briard Congenital Stationary Night Blindness, Briard CSNB) Породы: Бриар	МойСклад	3331.00	30		t	2025-09-27 04:31:21.4721	2025-09-27 05:15:33.678	aa132f1e-9b35-11f0-0a80-0176001362cf		20	\N	\N	\N
24d48e8d-b386-43ba-ade6-b697a3086824	AN47ОБС Китайская хохлатая.  Дегенеративная миелопатия (DM Ex2), Первичный вывих хрусталика (PLL), Прогрессирующая атрофия сетчатки PRA-prcd	МойСклад	9555.00	30		t	2025-09-27 04:31:21.556451	2025-09-27 05:15:33.71	aa184900-9b35-11f0-0a80-0176001362d4		20	\N	\N	\N
d08b55a2-0b3d-4cbd-94bd-f19a9d0e1219	AN7097LAD Летальный акродерматит бультерьеров (LAD). Породы: Бультерьер, Миниатюрный бультерьер	МойСклад	3331.00	30		t	2025-09-27 04:31:25.113831	2025-09-27 05:15:35.077	ab061eda-9b35-11f0-0a80-0176001363ab		20	\N	\N	\N
e9263797-3a01-47ef-b207-cddbdae2220c	AN49ОБС Колли/Шелти.  Дегенеративная миелопатия (DM Ex2), Аномалия глаз колли (CEA), Чувствительность к лекарственным препаратам (MDR 1)	МойСклад	9555.00	30		t	2025-09-27 04:31:21.718295	2025-09-27 05:15:33.773	aa226cb4-9b35-11f0-0a80-0176001362de		20	\N	\N	\N
fa79ba82-c120-4d08-a6fc-6c0098858f82	AN51ОБС Ньюфаундленд. Гиперурикозурия (HUU), Дегенеративная миелопатия (DM Ex2), Цистинурия	МойСклад	9555.00	30		t	2025-09-27 04:31:21.881355	2025-09-27 05:15:33.837	aa2d93bc-9b35-11f0-0a80-0176001362e8		20	\N	\N	\N
c16052c4-35ab-426c-9083-fc8ac7b44363	AN53ОБС Спрингер спаниель.  Прогрессирующая атрофия сетчатки PRA-cord1, Дегенеративная миелопатия (DM Ex2), Гиперурикозурия, Недостаточность фосфофруктокиназы PFK)	МойСклад	12524.00	30		t	2025-09-27 04:31:21.962757	2025-09-27 05:15:33.868	aa33042f-9b35-11f0-0a80-0176001362ed		20	\N	\N	\N
4cc8ec37-dbe9-4973-aff3-e6d2c7257264	AN54ОБС Таксы(кроме стандартных).  Гиперурикозурия (HUU), Дегенеративная миелопатия (DM Ex2), Прогрессирующая атрофия сетчатки PRA-cord1	МойСклад	9555.00	30		t	2025-09-27 04:31:22.049864	2025-09-27 05:15:33.899	aa38a332-9b35-11f0-0a80-0176001362f2		20	\N	\N	\N
c0225230-487a-486c-a9b6-51bbf5fe3436	AN55ОБС Абиссинская кошка / Сомали. Группа крови кошек, Дефицит пируваткиназы, Прогрессирующая атрофия сетчатки rdAc	МойСклад	5937.00	30		t	2025-09-27 04:31:22.134641	2025-09-27 05:15:33.932	aa3e4856-9b35-11f0-0a80-0176001362f7		20	\N	\N	\N
0b569c0c-4b95-4dcc-9570-7bb6d9bcd7d6	AN56ОБС Британская  / Сибирская кошка / Шотландская/ Священная бирма.  Группа крови кошек, Поликистоз почек	МойСклад	4204.00	30		t	2025-09-27 04:31:22.218257	2025-09-27 05:15:33.963	aa43c4a4-9b35-11f0-0a80-0176001362fc		20	\N	\N	\N
1676c6fa-6dee-497e-8af3-7b999d60a318	AN57ОБС Мейн-кун. Гипертрофическая кардиомиопатия мейн кунов 1 мутация: A31P, Дефицит пируваткиназы, Спинальная мышечная атрофия	МойСклад	5937.00	30		t	2025-09-27 04:31:22.302713	2025-09-27 05:15:33.994	aa49575d-9b35-11f0-0a80-017600136301		20	\N	\N	\N
a7824ab7-f27e-4906-ac52-11288e37e11b	AN58ОБС Ориентальная кошка.  Дефицит пируваткиназы, Прогрессирующая атрофия сетчатки rdAc	МойСклад	4204.00	30		t	2025-09-27 04:31:22.386927	2025-09-27 05:15:34.026	aa4f9786-9b35-11f0-0a80-017600136306		20	\N	\N	\N
40e4e748-c40f-460f-98a4-0fd3924942d1	AN59ОБС Персидская / Экзотическая расширенный  Группа крови кошек, Длина шерсти, Поликистоз почек, Прогрессирующая атрофия сетчатки персов (PRA-pd)	МойСклад	7821.00	30		t	2025-09-27 04:31:22.472781	2025-09-27 05:15:34.058	aa54bb19-9b35-11f0-0a80-01760013630b		20	\N	\N	\N
aa5dff79-28f2-4178-abc3-501e58ea4b5b	AN7104GD2 Локус D, аллель d2 (осветленный) Породы: Слюги, Тайский риджбек, Чау-чау	МойСклад	3331.00	30		t	2025-09-27 04:31:22.555503	2025-09-27 05:15:34.089	aa59ec75-9b35-11f0-0a80-017600136310		20	\N	\N	\N
0505187d-5387-493b-a612-3b33edf3039a	AN7106GE2 Локус Е, аллель e2 (кремовый окрас австралийской пастушьей собаки) Породы: Австралийская пастушья собака (хилер)	МойСклад	3331.00	30		t	2025-09-27 04:31:22.646189	2025-09-27 05:15:34.121	aa5efb5e-9b35-11f0-0a80-017600136315		20	\N	\N	\N
752c0998-0720-4ed3-899b-224a7fe50294	AN7107GE3 Локус Е, аллель e3 (светло-кремовый окрас хаски) Породы: Сибирский хаски	МойСклад	3331.00	30		t	2025-09-27 04:31:22.735759	2025-09-27 05:15:34.152	aa643a52-9b35-11f0-0a80-01760013631a		20	\N	\N	\N
19a03061-b07d-47e8-80e6-e192c00f0c2b	AN7108GEG Локус Е, аллель EG (гризли, домино) Породы: Афганская борзая, Салюки	МойСклад	3331.00	30		t	2025-09-27 04:31:22.813466	2025-09-27 05:15:34.184	aa696973-9b35-11f0-0a80-01760013631f		20	\N	\N	\N
171e0e9a-1870-49e7-bdde-aa2e253e0347	AN7109GEA Локус Е, аллель еА Породы: Все породы	МойСклад	3331.00	30		t	2025-09-27 04:31:22.894436	2025-09-27 05:15:34.216	aa6e956b-9b35-11f0-0a80-017600136324		20	\N	\N	\N
a7e97e71-9431-4a39-a705-5d0a6770ca06	AN7110GH Локус H (арлекин) Породы: Немецкий дог	МойСклад	3331.00	30		t	2025-09-27 04:31:22.970686	2025-09-27 05:15:34.248	aa73c0e9-9b35-11f0-0a80-017600136329		20	\N	\N	\N
c2d356f3-08f8-4dfe-b032-451fe2e2b94b	AN7111GI Локус I (ослабление феомеланина) Породы: Австралийская овчарка, Австралийский шелковистый терьер, Акита, Аляскинский маламут, Афганская борзая, Белая швейцарская овчарка, Бишон Фризе, Вест хайленд уайт терьер, Евразийский и  Французский буль	МойСклад	3331.00	30		t	2025-09-27 04:31:23.047838	2025-09-27 05:15:34.28	aa790188-9b35-11f0-0a80-01760013632e		20	\N	\N	\N
cd07f3b8-207f-4ee7-a8c6-15dce79d68a8	AN7112GS Локус S (белая пятнистость) Породы: Все породы	МойСклад	3331.00	30		t	2025-09-27 04:31:23.127003	2025-09-27 05:15:34.311	aa7e643c-9b35-11f0-0a80-017600136333		20	\N	\N	\N
d33ebd39-c8f1-4328-aef1-889fbe14aa7e	AN7113GAS Подпалый / чепрачный окрас с подпалинами (Saddle tan) Породы: Бассет хаунд, Вельш корги пемброк	МойСклад	3331.00	30		t	2025-09-27 04:31:23.210816	2025-09-27 05:15:34.343	aa837004-9b35-11f0-0a80-017600136338		20	\N	\N	\N
6cb833a5-5fa0-4df9-9376-fc0bec6687f7	AN7084AKI Длина шерсти акит, сибирских хаски, самоедов (мутация p.A193V (c.578C>T) Породы:  Акита-ину, Американская акита, Сибирская хаски, Самоедская собака (встречаются обе мутации)	МойСклад	3331.00	30		t	2025-09-27 04:31:23.290355	2025-09-27 05:15:34.375	aa88763d-9b35-11f0-0a80-01760013633d		20	\N	\N	\N
be893454-4972-47b2-9e88-e286ba01d045	10.17 Герпесвирус кошек (ринотрахеит) (FHV)	МойСклад	1089.00	30		t	2025-09-27 04:31:47.24603	2025-09-27 05:15:44.053	b268b999-9b35-11f0-0a80-0176001369a3		20	\N	\N	\N
db356773-caa6-4cc3-9a5a-aa04a37bf961	AN7078КУЦ Куцевохвостость. Породы:  Австралийская овчарка (Аусси), Австралийская пастушья собака (Австралийский хилер), Австрийский пинчер, Бразильский терьер, Бретонский спаниель, Бурбонский бракк, Вельш-корги пемброк, Датско-шведский дартхунд, Джек	МойСклад	3331.00	30		t	2025-09-27 04:31:23.497893	2025-09-27 05:15:34.443	aa931f94-9b35-11f0-0a80-017600136347		20	\N	\N	\N
2aa0df69-dd36-4474-83f9-57a6915334d6	AN7118CDPA Хондродисплазия (CDPA) Породы: Бассет хаунд, Вандейский бассет-гриффон, Вельш корги кардиган, Вельш корги пемброк, Вест хайленд уайт терьер, Гаванский бишон, Денди динмонт терьер, Джек рассел терьер, Керн терьер, Китайская хохлатая собака,	МойСклад	6514.00	30		t	2025-09-27 04:31:23.579764	2025-09-27 05:15:34.475	aa9898cb-9b35-11f0-0a80-01760013634c		20	\N	\N	\N
c728b42b-e91d-4f69-8544-d76885d48e45	AN7073L2 L-2-гидроксиглутаровая ацидурия стаффордширских бультерьеров (L2HGA). Породы: Стаффордширский бультерьер, Шорти булл	МойСклад	3331.00	30		t	2025-09-27 04:31:23.658381	2025-09-27 05:15:34.507	aa9db7db-9b35-11f0-0a80-017600136351		20	\N	\N	\N
7d9fd2cf-7b5f-409f-949d-3ceb8de12b60	AN7119OCA2 Альбинизм немецкого шпица (OCA2) Породы: Немецкий шпиц	МойСклад	3331.00	30		t	2025-09-27 04:31:23.740233	2025-09-27 05:15:34.538	aaa35868-9b35-11f0-0a80-017600136356		20	\N	\N	\N
1db4d84b-7ba4-4653-866a-ab4e8130a066	AN7120ACHM Ахроматопсия (дневная слепота, ACHM) Породы: Куцхаар, Лабрадор ретривер, Немецкая овчарка	МойСклад	3331.00	30		t	2025-09-27 04:31:23.81691	2025-09-27 05:15:34.57	aaa85a3b-9b35-11f0-0a80-01760013635b		20	\N	\N	\N
55c23813-089e-4af1-a0a4-1b3f2fd5ab18	AN7121VWP2 Болезнь фон Виллебранда 2-го типа (von Willebrand Disease, vWD type 2) Породы: Немецкий курцхаар (Немецкий короткошерстный пойнтер), Немецкий дратхаар (Немецкий жёсткошерстный пойнтер)	МойСклад	3331.00	30		t	2025-09-27 04:31:23.897381	2025-09-27 05:15:34.602	aaae2245-9b35-11f0-0a80-017600136360		20	\N	\N	\N
791c37ff-9f3e-4d0e-bf2b-eeea4c5d90b3	AN7122VWP3 Болезнь фон Виллебранда 3-го типа (von Willebrand Disease, vWD type 3) Породы: Шотландский терьер (Скотч терьер), Коикерхондье, Шелти	МойСклад	3331.00	30		t	2025-09-27 04:31:23.979001	2025-09-27 05:15:34.633	aab3bc44-9b35-11f0-0a80-017600136365		20	\N	\N	\N
2c92659d-18b7-42a5-aff5-65c93cd25efe	AN7080SWD Врожденный гипотиреоз с зобом SWD (CHG). Породы: испанская водяная собака	МойСклад	3331.00	30		t	2025-09-27 04:31:24.058336	2025-09-27 05:15:34.665	aabc13f2-9b35-11f0-0a80-01760013636a		20	\N	\N	\N
76f89eb8-a290-4bb0-b9d6-8775a135d245	AN7081TER Врожденный гипотиреоз с зобом Terier (CHG). Породы: Рет-терьер, Тентерфилд-терьер, Той-фокстерьер	МойСклад	3331.00	30		t	2025-09-27 04:31:24.137037	2025-09-27 05:15:34.697	aac1b035-9b35-11f0-0a80-01760013636f		20	\N	\N	\N
b948b211-e2ba-432e-8efd-55ae86fa0bf7	AN7082FB Врожденный гипотиреоз с зобом FB (CHG). Породы: французский бульдог	МойСклад	3331.00	30		t	2025-09-27 04:31:24.221288	2025-09-27 05:15:34.729	aac73cb3-9b35-11f0-0a80-017600136374		20	\N	\N	\N
a4ff097e-dd41-4faa-8336-7bbeb5cac619	AN7123GM1 Ганглиозидоз GM1 Породы: Шиба-ину (Сиба-ину)	МойСклад	3331.00	30		t	2025-09-27 04:31:24.302862	2025-09-27 05:15:34.761	aacd4de8-9b35-11f0-0a80-017600136379		20	\N	\N	\N
a0bd99c4-a50c-4e20-9a62-e4fa0dd5fe24	AN7124GM2 Ганглиозидоз GM2 Породы: Шиба-ину (Сиба-ину)	МойСклад	3331.00	30		t	2025-09-27 04:31:24.382008	2025-09-27 05:15:34.793	aad2fa65-9b35-11f0-0a80-01760013637e		20	\N	\N	\N
eb4eeafd-8641-459f-8929-0d54dbef0bd9	AN7125FIXD Гемофилия B (дефицит фактора IX, FIXD) Породы: Лхасский апсо, Родезийский риджбек	МойСклад	3331.00	30		t	2025-09-27 04:31:24.460518	2025-09-27 05:15:34.825	aad8e4b3-9b35-11f0-0a80-017600136383		20	\N	\N	\N
c0d2c3af-a0e0-413e-bceb-63876384c075	AN7126CAT Гипокаталазия, акаталазия (CAT) Породы: Американский фоксхаунд, Бигль	МойСклад	3331.00	30		t	2025-09-27 04:31:24.538942	2025-09-27 05:15:34.857	aade7f46-9b35-11f0-0a80-017600136388		20	\N	\N	\N
16a30d32-3cff-48c4-85ff-2ee957cc329f	AN7127GLD Глобоидно-клеточная лейкодистрофия (Болезнь Краббе, GLD) Породы: Ирландский сеттер, Вест хайленд уайт терьер, Керн терьер	МойСклад	3331.00	30		t	2025-09-27 04:31:24.619239	2025-09-27 05:15:34.888	aae43e08-9b35-11f0-0a80-01760013638d		20	\N	\N	\N
fc2b149a-c03f-4c60-8230-c7843f1d8260	AN7128GGD Гониодисгенез и глаукома бордер колли (GGD) Породы: Бордер колли	МойСклад	3331.00	30		t	2025-09-27 04:31:24.698005	2025-09-27 05:15:34.92	aae9da0e-9b35-11f0-0a80-017600136392		20	\N	\N	\N
e422adbc-43ca-436f-903e-b0973f10e13d	AN7129SDCA Губчатая дегенерация мозжечка с мозжечковой атаксией тип 1 (SDCA1) Породы: Бельгийская овчарка Малинуа, Бельгийская овчарка Тервюрен	МойСклад	3331.00	30		t	2025-09-27 04:31:24.781651	2025-09-27 05:15:34.951	aaf03a80-9b35-11f0-0a80-017600136397		20	\N	\N	\N
284fde0d-99d6-4aa3-9eb4-a6911713e834	AN7095DM Дегенеративная миелопатия. Экзон 1 (Degenerative Myelopathy, DM Ex1).  Породы: Бернский зенненхунд	МойСклад	4927.00	30		t	2025-09-27 04:31:24.869957	2025-09-27 05:15:34.983	aaf5f8ee-9b35-11f0-0a80-01760013639c		20	\N	\N	\N
c42de004-5a6f-4a03-9b77-61dd5eb3bad9	AN7094DM Дегенеративная миелопатия. Два экзона (Degenerative Myelopathy, DM Ex1- Ex2). Породы: бернский зенненхунд	МойСклад	3331.00	30		t	2025-09-27 04:31:24.954719	2025-09-27 05:15:35.014	aafba4a8-9b35-11f0-0a80-0176001363a1		20	\N	\N	\N
4ebebfe2-c15f-495e-bdbd-849278a1d84f	AN7096CMO "Краниомандибулярная остеопатия (CMO). Породы: Австралийская овчарка, Вест-хайленд-уайт-терьер, Керн-терьер,	МойСклад	3331.00	30		t	2025-09-27 04:31:25.035016	2025-09-27 05:15:35.046	ab010845-9b35-11f0-0a80-0176001363a6		20	\N	\N	\N
0ad4ac6d-9341-4111-97d2-35c31212e879	10.18 Герпесвирус собак (CHV)	МойСклад	1089.00	30		t	2025-09-27 04:31:47.337207	2025-09-27 05:15:44.086	b26edb35-9b35-11f0-0a80-0176001369a8		20	\N	\N	\N
d3ecd865-a23a-44bc-9571-fa1c87a64ed6	AN7027DMD Мышечная дистрофия кавалер кинг чарльз спаниэлей (Duchenne Muscular Dystrophy Cavalier King Charles Spaniels, DMD-CKCS) Породы: Кавалер кинг чарльз спаниель	МойСклад	3331.00	30		t	2025-09-27 04:31:25.362214	2025-09-27 05:15:35.174	ab15bdcf-9b35-11f0-0a80-0176001363ba		20	\N	\N	\N
92aefba6-cc62-4e6c-bd35-23ec1d968079	AN7028HAКД Нарколепсия доберманов (Narcolepsy, NARC) Породы: Доберман	МойСклад	3331.00	30		t	2025-09-27 04:31:25.443182	2025-09-27 05:15:35.206	ab1b3f9a-9b35-11f0-0a80-0176001363bf		20	\N	\N	\N
c3456054-4dcb-4274-b422-60e7539c9507	AN7029НАКЛ Нарколепсия лабрадоров (Narcolepsy, NARC). Породы: Австралийский лабрадудль (Коббердог), Лабрадудль ориджинал, Лабрадор ретривер	МойСклад	3331.00	30		t	2025-09-27 04:31:25.523147	2025-09-27 05:15:35.238	ab2084ee-9b35-11f0-0a80-0176001363c4		20	\N	\N	\N
f254fa21-0eb2-4c7c-8654-6ce5f76a3764	AN7030HSF4 Наследственная катаракта (Cataract, Еarly Оnset, HSF4, HC). Породы: Австралийская овчарка (Аусси), Американский булли, Веллер, Миниатюрная австралийская овчарка, Миниатюрный американская овчарка, Бостон-терьер, Стаффордширский булльтерьер,	МойСклад	3331.00	30		t	2025-09-27 04:31:25.600452	2025-09-27 05:15:35.271	ab260770-9b35-11f0-0a80-0176001363c9		20	\N	\N	\N
14429c27-64ab-4a44-8fe5-5de5382705ae	AN7031MC Наследственная миотония (Myotonia Congenita, MC). Породы: Цвергшнауцер, Миттельшнауцер	МойСклад	3331.00	30		t	2025-09-27 04:31:25.680648	2025-09-27 05:15:35.302	ab2b34d0-9b35-11f0-0a80-0176001363ce		20	\N	\N	\N
6843cd58-060e-49a3-ba6b-10deffe0a25e	AN7087HFH Наследственный гиперкератоз подушечек лап (HFH) Породы: Ирландский терьер, Кромфорлендер	МойСклад	3331.00	30		t	2025-09-27 04:31:25.759166	2025-09-27 05:15:35.333	ab305f06-9b35-11f0-0a80-0176001363d3		20	\N	\N	\N
910ff276-4c2a-4ca1-bc65-2ae2d1e85a97	AN7032HNPK Наследственный носовой паракератоз ретриверов (Hereditary Nasal Parakeratosis, HNPK).  Породы: Австралийский лабрадудль (Коббердог), Лабрадудоль ориджинал, Лабрадор ретривер	МойСклад	3331.00	30		t	2025-09-27 04:31:25.840926	2025-09-27 05:15:35.365	ab35952e-9b35-11f0-0a80-0176001363d8		20	\N	\N	\N
db8bae6a-8a67-45ac-b09e-9c6de779d764	AN7033NME Наследственный энцефалит мопсов (Necrotizing Meningoencephalitis, NME, Pug Dogs Encephalitis, PDE) Породы: Мопс	МойСклад	3331.00	30		t	2025-09-27 04:31:25.933598	2025-09-27 05:15:35.397	ab3b30ab-9b35-11f0-0a80-0176001363dd		20	\N	\N	\N
1f1cf0b9-36fe-4b59-81f6-3860d7ef9638	AN7034PFK Недостаточность фосфофруктокиназы (Phosphofructokinase deficiency, PFK). Породы: Американский кокер спаниель, Английский кокер спаниель, Ирландский водяной спаниель, Кавалер кинг чарльз спаниель, Кламбер спаниель, Кокапу,  Немецкий вахтельх	МойСклад	3331.00	30		t	2025-09-27 04:31:26.025822	2025-09-27 05:15:35.428	ab40b918-9b35-11f0-0a80-0176001363e2		20	\N	\N	\N
30ef56c5-d849-4ccc-9095-c608a477554b	AN7088NAD Нейроаксональная дистрофия (NAD).  Породы: Папийон, Фален	МойСклад	3331.00	30		t	2025-09-27 04:31:26.107812	2025-09-27 05:15:35.46	ab466d2c-9b35-11f0-0a80-0176001363e7		20	\N	\N	\N
60a5466e-d191-4e97-a5d1-3f7e7785fab5	AN7024NCL "Нейрональный цероидный липофусциноз 4A типа (NCL IVA)  Породы: Американский булли, Американский стаффордширский терьер,	МойСклад	3331.00	30		t	2025-09-27 04:31:26.187317	2025-09-27 05:15:35.492	ab4bd6fb-9b35-11f0-0a80-0176001363ec		20	\N	\N	\N
e492f8b1-ee36-4e6a-acec-282f51af1a77	AN7089PCD Первичная цилиарная дискинезия (PCD).  Породы: Cтароанглийская овчарка (Бобтейл)	МойСклад	3331.00	30		t	2025-09-27 04:31:26.269546	2025-09-27 05:15:35.526	ab512e81-9b35-11f0-0a80-0176001363f1		20	\N	\N	\N
09ba09bc-fd02-471e-820f-10ef924ad5e8	AN7035PLL Первичный вывих хрусталика (Primary Lens Luxation, PLL). Породы: Австралийская короткохвостая пастушья собака, Австралийская пастушья собака (Австралийский хилер), Австралийский келпи, Американская эскимосская собака, Американский голый те	МойСклад	3331.00	30		t	2025-09-27 04:31:26.351838	2025-09-27 05:15:35.56	ab567712-9b35-11f0-0a80-0176001363f6		20	\N	\N	\N
7bfecf34-380e-4d1c-96d5-b362d7f0a816	AN7098LOA Поздняя мозжечковая атаксия (LOA).   Породы: Джек рассел терьер, Парсон рассел терьер	МойСклад	3331.00	30		t	2025-09-27 04:31:26.447196	2025-09-27 05:15:35.592	ab5b8c4e-9b35-11f0-0a80-0176001363fb		20	\N	\N	\N
3d164cab-a94d-4f07-863f-785bf3143da4	AN7074BT Поликистоз почек бультерьеров (BTPKD). Породы: Бультерьер	МойСклад	3331.00	30		t	2025-09-27 04:31:26.530044	2025-09-27 05:15:35.624	ab60b12c-9b35-11f0-0a80-017600136400		20	\N	\N	\N
f5e6acac-423f-4b2d-a0b4-a2dc1c4669c9	AN7036GR1 Прогрессирующая атрофия сетчатки (Progressive Retinal Atrophy, GR-PRA1, Golden Retriever PRA1). Породы:  Годен ретривер (Золотистый ретривер)	МойСклад	3331.00	30		t	2025-09-27 04:31:26.612449	2025-09-27 05:15:35.655	ab65f1c0-9b35-11f0-0a80-017600136405		20	\N	\N	\N
6d98bf6e-8246-4c0e-9653-46b7202c23df	AN7037GR2 Прогрессирующая атрофия сетчатки (Progressive Retinal Atrophy, GR-PRA2, Golden Retriever PRA2). Породы:  Годен ретривер (Золотистый ретривер)	МойСклад	3331.00	30		t	2025-09-27 04:31:26.693843	2025-09-27 05:15:35.687	ab6b1eaa-9b35-11f0-0a80-01760013640a		20	\N	\N	\N
f1baf44f-a383-4cd1-9757-a16e5c45ca29	AN7038PRAC Прогрессирующая атрофия сетчатки (Progressive Retinal Atrophy, PRA-cord1(CОne-Rod Dystrophy 1)) Породы: Американский булли, Английский спрингер-спаниель, Курчавошерстный ретривер, Папийон, Таксы (кроме стандартных), Фален	МойСклад	3331.00	30		t	2025-09-27 04:31:26.774304	2025-09-27 05:15:35.719	ab711957-9b35-11f0-0a80-01760013640f		20	\N	\N	\N
127fe69d-c96a-48fc-a118-eb1c3b75f6eb	AN7042PRA1 Прогрессирующая атрофия сетчатки (Progressive Retinal Atrophy, PRA-crd1 (Cоne-Rod Dystrophy 1)). Породы: Американский стаффордширский терьер.	МойСклад	3331.00	30		t	2025-09-27 04:31:26.941225	2025-09-27 05:15:35.783	ab7c9152-9b35-11f0-0a80-017600136419		20	\N	\N	\N
7c42be14-ab95-4ef5-8d54-0f07255708e8	AN7043PRA2 Прогрессирующая атрофия сетчатки (Progressive Retinal Atrophy, PRA-crd2 (Cоne-Rod Dystrophy 2)). Породы: Американский питбультерьер.	МойСклад	3331.00	30		t	2025-09-27 04:31:27.023299	2025-09-27 05:15:35.815	ab82a66d-9b35-11f0-0a80-01760013641e		20	\N	\N	\N
b954d109-1139-423c-a570-cb99b419a9c8	AN7040PRA3 Прогрессирующая атрофия сетчатки (Progressive Retinal Atrophy, PRA-rcd3 (Rod-Cone Dysplasia 3)).  Породы: Вельш-корги кардиган, Вельш-корги пемброк, Китайская хохлатая собака, Померанский шпиц, Тибетский спаниель	МойСклад	3331.00	30		t	2025-09-27 04:31:27.104111	2025-09-27 05:15:35.847	ab88e75d-9b35-11f0-0a80-017600136423		20	\N	\N	\N
df3b294e-455c-435b-b7b1-1f6340efea6d	AN7044BPRA Прогрессирующая атрофия сетчатки басенджи (Progressive Retinal Atrophy, bas-PRA). Породы: Бесенджи	МойСклад	3331.00	30		t	2025-09-27 04:31:27.184966	2025-09-27 05:15:35.879	ab8f11d1-9b35-11f0-0a80-017600136428		20	\N	\N	\N
0406d536-e799-48ea-96b4-3c116f232a4f	AN7045PPRA Прогрессирующая атрофия сетчатки папильонов и фаленов (Progressive Retinal Atrophy, pap-PRA). Породы: Папийон, Фален	МойСклад	3331.00	30		t	2025-09-27 04:31:27.26581	2025-09-27 05:15:35.911	ab9507f2-9b35-11f0-0a80-01760013642d		20	\N	\N	\N
c277060a-ce4f-47ad-903e-3a36d9428623	AN7041XL Прогрессирующая атрофия сетчатки (Progressive Retinal Atrophy, XL-PRA (X-Linked PRA)). Породы: Cамоедская собака, сибирский хаски.	МойСклад	3331.00	30		t	2025-09-27 04:31:27.348389	2025-09-27 05:15:35.942	ab9a934e-9b35-11f0-0a80-017600136432		20	\N	\N	\N
8f3cd244-f34c-4b53-863e-fd30ea0b4887	AN7075AM Ранняя прогрессирующая полинейропатия маламутов (AMPN).   Породы: Аляскинский маламут	МойСклад	3331.00	30		t	2025-09-27 04:31:27.42897	2025-09-27 05:15:35.974	aba00f86-9b35-11f0-0a80-017600136437		20	\N	\N	\N
0a63c646-429c-4eb5-9d7a-190f16de40d9	AN7048CKC Синдром сухого глаза и курчавошерстности (Congenital Keratoconjunctivitis Sicca and Ichtyosiform Dermatosis, CKCSID).  Породы: Кавалер кинг чарльз спаниель.	МойСклад	3331.00	30		t	2025-09-27 04:31:27.510203	2025-09-27 05:15:36.006	aba7b308-9b35-11f0-0a80-01760013643c		20	\N	\N	\N
25e5398d-0a7c-431d-ba8b-5677bcaef769	AN7076FBS Синдром Фанкони басенджи (FBS). Породы: Бесенджи	МойСклад	3331.00	30		t	2025-09-27 04:31:27.593626	2025-09-27 05:15:36.037	abad6dbe-9b35-11f0-0a80-017600136441		20	\N	\N	\N
e7eae15e-ea7b-4fe4-9a7f-7a3a6f8125d2	AN7047EFS Синдром эпизодического падения (Episodic Falling Syndrome, EFS).  Породы: Кавалер кинг чарльз спаниель, Кинг чарльз спаниель	МойСклад	3331.00	30		t	2025-09-27 04:31:27.677237	2025-09-27 05:15:36.069	abb2f225-9b35-11f0-0a80-017600136446		20	\N	\N	\N
7d775ed5-fee4-4f20-82fe-dcbe04d99126	AN7099SCA Спиноцеребеллярная атаксия с миокимией и/или судорогами (SCA). Породы: Гладкошерстный фокстерьер, Джек-Рассел-терьер, Парсон-Рассел-терьер, Тентерфилд-терьер, Той-фокстерьер	МойСклад	3331.00	30		t	2025-09-27 04:31:27.754594	2025-09-27 05:15:36.1	abb83477-9b35-11f0-0a80-01760013644b		20	\N	\N	\N
9b183fda-a31a-4808-b4b2-0ea35737a392	AN7049CNM Центроядерная миопатия (Centronuclear Myopathy, CNM).  Породы: Австралийский лабрадудль (Коббердог), Лабродудоль ориджинал, Лабрадор ретривер	МойСклад	3331.00	30		t	2025-09-27 04:31:27.837994	2025-09-27 05:15:36.132	abbe1f81-9b35-11f0-0a80-017600136450		20	\N	\N	\N
25a29138-68e2-49d5-967b-da04d37affc6	AN7050GSC Циклическая (периодическая) нейтропения (синдром "серой колли", Cyclic Neutropenia, Gray Collie Syndrome, GSC). Породы: Колли	МойСклад	3331.00	30		t	2025-09-27 04:31:27.917184	2025-09-27 05:15:36.164	abc3619d-9b35-11f0-0a80-017600136455		20	\N	\N	\N
51579ff4-de7e-4991-83b4-b7a536ae5594	AN7051CYS Цистинурия (Cystinuria, Cys). Породы: Ньюфаундленд, Ландзир.	МойСклад	3331.00	30		t	2025-09-27 04:31:28.00495	2025-09-27 05:15:36.196	abc977d1-9b35-11f0-0a80-01760013645a		20	\N	\N	\N
e9be6a8d-32f0-4c97-b65f-04f6db0ebb5b	AN7052MDR1 Чувствительность к медикаментам (Multi-Drug Resistance 1, MDR 1). Породы: Австралийская овчарка (Аусси), Австралийская пастушья собака (хилер), Английская овчарка, Афганская борзая, Аффенпинчер, Басенджи, Белая швейцарская овчарка, Бобтейл	МойСклад	3331.00	30		t	2025-09-27 04:31:28.099548	2025-09-27 05:15:36.228	abced944-9b35-11f0-0a80-01760013645f		20	\N	\N	\N
9ad67da6-6ec9-4549-a5c7-0de49de658f1	AN7090JME Ювенильная миоклоническая эпилепсия Родезийских риджбеков (JME)  Породы: Родезийский риджбек	МойСклад	3331.00	30		t	2025-09-27 04:31:28.181217	2025-09-27 05:15:36.26	abd4281b-9b35-11f0-0a80-017600136464		20	\N	\N	\N
c153af62-f6d2-4833-9d07-a13a71b3f043	AN7053JLPP Ювенильный паралич гортани / Полинейропатия (Juvenile Laryngeal Paralysis and Polyneuropathy, JLPP).   Породы: Ротвейлер, Русский черный терьер	МойСклад	3331.00	30		t	2025-09-27 04:31:28.260497	2025-09-27 05:15:36.292	abd9e2aa-9b35-11f0-0a80-017600136469		20	\N	\N	\N
bb1ec9d5-8ed9-430a-ac44-62670b8e3ed9	AN7054ГИ1 Паспорт генетической идентификации	МойСклад	3915.00	30		t	2025-09-27 04:31:28.339702	2025-09-27 05:15:36.325	abe05c8c-9b35-11f0-0a80-01760013646e		20	\N	\N	\N
30ffdc13-7c11-4fc8-966e-4bba338eb370	AN7055ГА Локус А (агути / не агути): А (агути); а (не агути) Породы: все.	МойСклад	2468.00	30		t	2025-09-27 04:31:28.422197	2025-09-27 05:15:36.358	abe6edc2-9b35-11f0-0a80-017600136473		20	\N	\N	\N
aeb6d770-f801-42f3-8358-0ca3ec1a546b	AN7056ГВ Локус B: B (черный); b (шоколад); bl (циннамон) Породы: все.	МойСклад	2468.00	30		t	2025-09-27 04:31:28.51873	2025-09-27 05:15:36.391	abecbe86-9b35-11f0-0a80-017600136478		20	\N	\N	\N
9f3cfc0f-fa42-4d4e-a82b-dff30d977d9b	AN7058ГД Локус D (осветление окраса): D (интенсивный окрас); d (осветленный окрас) Породы: все.	МойСклад	2468.00	30		t	2025-09-27 04:31:28.683919	2025-09-27 05:15:36.458	abf80cb6-9b35-11f0-0a80-017600136482		20	\N	\N	\N
af534d2c-8e20-4716-be68-a2b7d9484d70	AN7114GCA Альбинизм: С (не альбино); са (альбино) Породы: все.	МойСклад	2468.00	30		t	2025-09-27 04:31:28.762356	2025-09-27 05:15:36.491	abfebfb6-9b35-11f0-0a80-017600136487		20	\N	\N	\N
b4e93858-ee5e-426a-bb2a-19c53132c845	AN7059ГЕ Локус E (амбер): E (не амбер); е (амбер)                               Породы: норвежская лесная кошка	МойСклад	2468.00	30		t	2025-09-27 04:31:28.841585	2025-09-27 05:15:36.524	ac07c1d7-9b35-11f0-0a80-01760013648c		20	\N	\N	\N
669cec50-da95-424c-80ff-4e16b8b3eab7	AN7100CK Сердолик (cornellian): E (не сердолик); ec (сердолик) Породы: курильский бобтейл.	МойСклад	2468.00	30		t	2025-09-27 04:31:28.999664	2025-09-27 05:15:36.59	ac1468de-9b35-11f0-0a80-017600136496		20	\N	\N	\N
2d64a24e-92e4-42d3-909b-c3cc9dd018ca	AN7101КБ Рассет (красный) окрас бурм: E (не рассет); er (рассет) Породы: Бурманская кошка	МойСклад	2468.00	30		t	2025-09-27 04:31:29.080165	2025-09-27 05:15:36.623	ac1a08c5-9b35-11f0-0a80-01760013649b		20	\N	\N	\N
85fabd82-1676-4f55-8bc9-217a955ee740	AN7102УБ Угольный окрас бенгальских кошек: Угольный окрас – угольные по цвету узоры на теле кошки. Является результатом сочетания аллелей APb (аллель азиатской леопардовой кошки) и а (не-агути) по гену А. Породы: Бенгальская	МойСклад	2468.00	30		t	2025-09-27 04:31:29.16203	2025-09-27 05:15:36.656	ac1fd157-9b35-11f0-0a80-0176001364a0		20	\N	\N	\N
dd8e4061-e5da-4c66-82b5-e3773298c2d7	AN7060ГО2 Два локуса окраса	МойСклад	4204.00	30		t	2025-09-27 04:31:29.243226	2025-09-27 05:15:36.69	ac262128-9b35-11f0-0a80-0176001364a5		20	\N	\N	\N
9771d781-8828-435b-84b3-fa951cfe6074	AN7061ГО3 Три локуса окраса	МойСклад	5937.00	30		t	2025-09-27 04:31:29.325119	2025-09-27 05:15:36.723	ac2ba802-9b35-11f0-0a80-0176001364aa		20	\N	\N	\N
5c782c8e-b0c3-42e4-8ecb-7d6df3879a37	AN7116GO4 Четыре локуса окраса	МойСклад	7821.00	30		t	2025-09-27 04:31:29.404052	2025-09-27 05:15:36.755	ac31470d-9b35-11f0-0a80-0176001364af		20	\N	\N	\N
2ea5f4ac-3588-49b9-8d64-df63aaa72f5c	AN7117GO5 Пять локусов окраса	МойСклад	9408.00	30		t	2025-09-27 04:31:29.481498	2025-09-27 05:15:36.789	ac37a0d7-9b35-11f0-0a80-0176001364b4		20	\N	\N	\N
2f0d6b69-718a-4464-9eb5-5e60c3f840d6	AN7062ШЕР Длина шерсти кошек, четыре мутации: SS (короткая шерсть); ll (длинная шесть); Sl (короткая шерсть; носитель длинной шерсти) Породы: все.	МойСклад	2468.00	30		t	2025-09-27 04:31:29.563458	2025-09-27 05:15:36.822	ac3dd64d-9b35-11f0-0a80-0176001364b9		20	\N	\N	\N
478bf199-7640-4676-8a34-ee97382a700b	AN7091CMS Врожденный миастенический синдром девон - рексов и сфинксов (CMS) Породы: Девон-рекс, Сфинкс	МойСклад	2468.00	30		t	2025-09-27 04:31:29.642712	2025-09-27 05:15:36.856	ac43eb59-9b35-11f0-0a80-0176001364be		20	\N	\N	\N
a5473848-aa49-4d5e-91c2-22790b695fb3	AN7079ГАН Ганглиозидоз GM2 бурманских кошек Породы: Бурманская кошка (бурма)	МойСклад	2468.00	30		t	2025-09-27 04:31:29.726063	2025-09-27 05:15:36.889	ac49842a-9b35-11f0-0a80-0176001364c3		20	\N	\N	\N
325f6029-7d5c-49de-a6bc-8ff4466c5580	AN7063HCMM Гипертрофическая кардиомиопатия мейн-кунов 1 мутация, A31P (HCM) Породы: Мейн-кун	МойСклад	2468.00	30		t	2025-09-27 04:31:29.809473	2025-09-27 05:15:36.922	ac4ee5e1-9b35-11f0-0a80-0176001364c8		20	\N	\N	\N
779dea96-e72b-4e60-9315-0a59370e7bc3	AN7077H2 Гипертрофическая кардиомиопатия мейн-кунов 2 мутации A31P, A74T(HCM) Породы: Мейн-кун	МойСклад	3618.00	30		t	2025-09-27 04:31:29.88979	2025-09-27 05:15:36.956	ac540116-9b35-11f0-0a80-0176001364cd		20	\N	\N	\N
88f031c2-f110-449d-8707-ff3b6d087f27	AN7064HCMP Гипертрофическая кардиомиопатия рэгдоллов (HCM) Породы: Рэгдолл	МойСклад	2468.00	30		t	2025-09-27 04:31:29.969166	2025-09-27 05:15:36.989	ac593106-9b35-11f0-0a80-0176001364d2		20	\N	\N	\N
076adfef-47bb-4b76-a8ec-3f93de5d5db1	AN7092BHP Гипокалиемия бурм (BHK).   Породы: Австралийский мист, Бурманская кошка (бурма), Бомбейская кошка, Бурмилла, Девон-рекс, Корниш-рекс, Сингапурская кошка (сингапура), Сфинкс, Тиффани, Тонкинская кошка	МойСклад	2468.00	30		t	2025-09-27 04:31:30.050686	2025-09-27 05:15:37.023	ac6235df-9b35-11f0-0a80-0176001364d7		20	\N	\N	\N
8e6f6be3-adaa-4599-b814-23fe250341e6	AN7065GSD4 Гликогеноз IV типа (GSD IV) Породы: норвежская лесная кошка	МойСклад	2468.00	30		t	2025-09-27 04:31:30.130717	2025-09-27 05:15:37.056	ac67e6e4-9b35-11f0-0a80-0176001364dc		20	\N	\N	\N
0189d75e-8044-4b26-90bc-ee369733a59f	AN7066PK Дефицит эритроцитарной пируваткиназы кошек (PK def) Породы: Абиссинская, Сомали, Бенгальская, Египетская мау, Лаперм, Мейн-кун, Норвежская лесная кошка, Ориентальная, Саванна, Сибирская кошка, Сингапурская кошка (сингапура)	МойСклад	2468.00	30		t	2025-09-27 04:31:30.214884	2025-09-27 05:15:37.106	ac6d3354-9b35-11f0-0a80-0176001364e1		20	\N	\N	\N
2dd7bf09-d660-4dea-a796-d092fecdec6a	AN7067PKD Поликистоз почек (PKD)  Породы: Американская короткошерстная, Британская длинношерстная, Британская короткошерстная, Бурмилла, Гималайская, Невская маскарадная, Персидская, Русская голубая, Рэгдолл, Священная бирма, Селкирк-рекс, Сибирская,	МойСклад	2468.00	30		t	2025-09-27 04:31:30.296563	2025-09-27 05:15:37.139	ac727f51-9b35-11f0-0a80-0176001364e6		20	\N	\N	\N
1f78e217-404a-4241-b025-bcec77eca7b8	AN7201ICT Врожденный ихтиоз (ICT-B/CI/ARCI) Породы: Американский бульдог, Американский булли	МойСклад	3331.00	30		t	2025-09-27 04:31:32.420844	2025-09-27 05:15:38.056	ae2ece30-9b35-11f0-0a80-017600136630		20	\N	\N	\N
a01af422-6e66-4e76-80d4-f692580269a5	AN7103ПА Прогрессирующая атрофия сетчатки персов (PRA-pd) Породы: Британская длинношерстная, Британская короткошерстная, Бурмилла, Гималайская, Персидская, Русская голубая, Рэгдолл, Священная бирма, Селкирк рекс, Турецкая ангора, Шартрез, Шотландская	МойСклад	2468.00	30		t	2025-09-27 04:31:30.452386	2025-09-27 05:15:37.206	ac7e466b-9b35-11f0-0a80-0176001364f0		20	\N	\N	\N
e0be5d73-9aaa-4fff-b092-85c64a72536a	AN7069SMA Спинальная мышечная атрофия (SMA)   Породы: мейн-кун.	МойСклад	2468.00	30		t	2025-09-27 04:31:30.530479	2025-09-27 05:15:37.24	ac83f3b9-9b35-11f0-0a80-0176001364f5		20	\N	\N	\N
c500ea85-6734-4a14-b6e0-a939a25bf6be	AN7093FND Черепно-лицевая дисплазия бурм (FND) Породы: Бурманская кошка (бурма)	МойСклад	2468.00	30		t	2025-09-27 04:31:30.612022	2025-09-27 05:15:37.273	ac89992c-9b35-11f0-0a80-0176001364fa		20	\N	\N	\N
bd31b709-1299-4389-9f41-03591edf6618	AN7072ГР Группа крови: A (группа крови А); Ab (группа крови А или АB, носитель группы крови B); B (группа крови B). Породы: все	МойСклад	2468.00	30		t	2025-09-27 04:31:30.693951	2025-09-27 05:15:37.306	adad17d8-9b35-11f0-0a80-0176001365c7		20	\N	\N	\N
865fffe1-340d-4745-bbfc-f62fa29983ab	AN7187ГО5 Пять локусов окраса Породы: Все породы	МойСклад	15344.00	30		t	2025-09-27 04:31:30.798352	2025-09-27 05:15:37.339	adb3fc4d-9b35-11f0-0a80-0176001365cc		20	\N	\N	\N
ebedbb07-9431-45d0-b163-29b914848216	AN7182GBA Коричневый окрас шерсти, аллель bA Породы: Австралийская овчарка	МойСклад	3331.00	30		t	2025-09-27 04:31:30.876528	2025-09-27 05:15:37.372	adb9b99b-9b35-11f0-0a80-0176001365d1		20	\N	\N	\N
05f15522-9825-49c2-96cc-07ac0387080b	AN7183ОС Окрас какао/шоколад Французского бульдога (Cocoa)	МойСклад	3331.00	30		t	2025-09-27 04:31:30.956269	2025-09-27 05:15:37.405	adbfaa88-9b35-11f0-0a80-0176001365d6		20	\N	\N	\N
0aaca9f2-de7b-4243-b05a-f46afaab712f	AN7184GC Локус C, аллель ch Породы: Все породы	МойСклад	3331.00	30		t	2025-09-27 04:31:31.035328	2025-09-27 05:15:37.438	adc581c1-9b35-11f0-0a80-0176001365db		20	\N	\N	\N
0b6fd007-b0a8-444c-9411-5bb4952bc7df	AN7185GD3 Локус D, аллель d3 (осветленный) Породы: Все породы	МойСклад	3331.00	30		t	2025-09-27 04:31:31.114043	2025-09-27 05:15:37.471	adcbabf8-9b35-11f0-0a80-0176001365e0		20	\N	\N	\N
05f7b142-458a-46af-882d-44d796e34b4a	AN7186EH Аллель eH (соболиный) Породы: Английский кокер-спаниель, американский кокер-спаниель	МойСклад	3331.00	30		t	2025-09-27 04:31:31.192394	2025-09-27 05:15:37.505	add186ff-9b35-11f0-0a80-0176001365e5		20	\N	\N	\N
a2a8ae1c-ff6d-46ca-ad6f-bdce1c34dbb1	AN7188ГО6 Шесть локусов окраса Породы: Все породы	МойСклад	17951.00	30		t	2025-09-27 04:31:31.277878	2025-09-27 05:15:37.538	add6ebad-9b35-11f0-0a80-0176001365ea		20	\N	\N	\N
d409427b-b672-4a90-83f8-b6e5ed5aaf85	AN7189FGL3 Длина шерсти Евразиера, аллель L3 (c.556_571del16) (FGF_L3) Породы: Евразиер	МойСклад	3331.00	30		t	2025-09-27 04:31:31.359023	2025-09-27 05:15:37.572	addc8603-9b35-11f0-0a80-0176001365ef		20	\N	\N	\N
2371392c-b320-4cdd-ba08-f8c2841508ba	AN7190FGL4 Длина шерсти Афганской борзой, Евразиера и Французского бульдога, аллель L4 (c.559-560dupGG) (FGF5_L4) Породы: Афганская борзая, Евразиер, Французский бульдог	МойСклад	3331.00	30		t	2025-09-27 04:31:31.437172	2025-09-27 05:15:37.605	ade35d63-9b35-11f0-0a80-0176001365f4		20	\N	\N	\N
da5a4814-7a8e-4f22-a940-24262d64e0d4	AN7191FGL5 Длина шерсти Афганской борзой, аллель L5 (g.8193T>A) (FGF5_L5) Породы: Афганская борзая	МойСклад	3331.00	30		t	2025-09-27 04:31:31.51823	2025-09-27 05:15:37.638	ade9175f-9b35-11f0-0a80-0176001365f9		20	\N	\N	\N
1a34614e-633c-4599-8463-be53c045bf23	AN7204OCAB Глазной альбинизм 4 типа (OCA4 B) Породы: Бульмастиф	МойСклад	3331.00	30		t	2025-09-27 04:31:31.598423	2025-09-27 05:15:37.672	adef40b1-9b35-11f0-0a80-0176001365fe		20	\N	\N	\N
5ab092bc-fde8-4d8b-8779-6e8dc4767b74	AN7192CUR1 Курчавая шерсть собак (Curl1) Породы: Все породы, кроме курчавошерстного ретривера	МойСклад	3331.00	30		t	2025-09-27 04:31:31.677942	2025-09-27 05:15:37.754	adf548bb-9b35-11f0-0a80-017600136603		20	\N	\N	\N
27b213d5-4735-4e0c-80ab-72fc2789a79d	AN7193CUR2 "Курчавая шерсть собак (Curl2) Породы: Курчавошерстный ретривер.	МойСклад	3331.00	30		t	2025-09-27 04:31:31.762983	2025-09-27 05:15:37.787	adfb7eed-9b35-11f0-0a80-017600136608		20	\N	\N	\N
857e3849-37ee-4d0f-aa35-3062cec4fbbd	AN7194SD Локус SD собак, интенсивность линьки (Shedding) Породы: Все породы	МойСклад	3331.00	30		t	2025-09-27 04:31:31.848225	2025-09-27 05:15:37.824	ae01b6eb-9b35-11f0-0a80-01760013660d		20	\N	\N	\N
b39d94f9-8d0f-4afd-8ebc-f4d8cd0d82ef	AN7195L14 Длина шерсти французкого бульдога (L1, L4) Породы: Французский бульдог	МойСклад	6514.00	30		t	2025-09-27 04:31:31.928429	2025-09-27 05:15:37.857	ae07f3e9-9b35-11f0-0a80-017600136612		20	\N	\N	\N
e7cb4ada-d6e9-475b-b461-5346c8e7c5a6	AN7196L12 Длина шерсти самоеда (L1, L2) Породы: Самоедская собака	МойСклад	6514.00	30		t	2025-09-27 04:31:32.009878	2025-09-27 05:15:37.89	ae0e4b14-9b35-11f0-0a80-017600136617		20	\N	\N	\N
462fb256-04e1-4da8-99bb-882893f70c7a	AN7197L45 Длина шерсти афганской борзой (L4, L5) Породы: Афганская борзая	МойСклад	15344.00	30		t	2025-09-27 04:31:32.090175	2025-09-27 05:15:37.923	ae159d1c-9b35-11f0-0a80-01760013661c		20	\N	\N	\N
940362b7-92e8-4442-a9dc-fcc72d247fd9	AN7198L5 Длина шерсти 5 мутаций (L1, L2, L3, L4, L5) Породы: Все породы	МойСклад	3331.00	30		t	2025-09-27 04:31:32.172701	2025-09-27 05:15:37.956	ae1bca39-9b35-11f0-0a80-017600136621		20	\N	\N	\N
be85b2af-0876-43ca-85eb-06b011eecee6	AN7199DSRA Аномалия скелета, зубов и сетчатки системная (DSRA) Породы: Кане-корсо	МойСклад	3331.00	30		t	2025-09-27 04:31:32.253926	2025-09-27 05:15:37.989	ae226fe9-9b35-11f0-0a80-017600136626		20	\N	\N	\N
03c5ca08-288b-4cb2-b9fd-4e156281fa13	AN7200CMT Болезнь Шарко-Мари-Тута (CMT) Породы: Цвергшнауцер	МойСклад	3331.00	30		t	2025-09-27 04:31:32.336035	2025-09-27 05:15:38.023	ae289136-9b35-11f0-0a80-01760013662b		20	\N	\N	\N
8fea9782-e2ab-4bf1-8f41-ce8031db498e	AN7203SPS Гипомиелинизация ЦНС, Синдром трясущихся щенков веймаранеров (HYM (SPS)) Породы: Веймаранер	МойСклад	3331.00	30		t	2025-09-27 04:31:32.584194	2025-09-27 05:15:38.124	ae3ad77f-9b35-11f0-0a80-01760013663a		20	\N	\N	\N
7b651f58-fb7a-482c-b687-a1039ab4dbc9	AN7205OCAL Глазной альбинизм 4 типа (OCA4 L) Породы: Лхасский апсо, Пекинес, Померанский шпиц	МойСклад	3331.00	30		t	2025-09-27 04:31:32.663297	2025-09-27 05:15:38.157	ae412d21-9b35-11f0-0a80-01760013663f		20	\N	\N	\N
de6bae69-9792-4b8d-8375-234c5e79bab9	AN7206OCAD Глазной альбинизм 4 типа (OCA4 D) Породы: Доберман пинчер	МойСклад	3331.00	30		t	2025-09-27 04:31:32.742778	2025-09-27 05:15:38.19	ae472746-9b35-11f0-0a80-017600136644		20	\N	\N	\N
487c4899-2ed9-435b-8540-c83d1b002c04	AN7207NCCD Дегенерация коры мозжечка новорожденных / Мозжечковая абиотрофия (NCCD V) Породы: Венгерская выжла	МойСклад	3331.00	30		t	2025-09-27 04:31:32.821876	2025-09-27 05:15:38.223	ae4d3a73-9b35-11f0-0a80-017600136649		20	\N	\N	\N
6aa08ce0-8560-4f79-9dcf-b54d342766ed	AN7130DMS Дерматомиозит (DMS) Породы: Бородатый колли, Бордер колли, Колли длинношерстный, Колли гладкошерстный, Шелти	МойСклад	3331.00	30		t	2025-09-27 04:31:32.906982	2025-09-27 05:15:38.256	ae5331f3-9b35-11f0-0a80-01760013664e		20	\N	\N	\N
418fcf7a-7a23-4076-9add-27e65a494ba6	AN7131PDP1 Дефицит пируватдегидрогеназы (PDP1) Породы: Кламбер спаниель, Суссекс спаниель	МойСклад	3331.00	30		t	2025-09-27 04:31:32.986412	2025-09-27 05:15:38.289	ae58d50c-9b35-11f0-0a80-017600136653		20	\N	\N	\N
4f6e6737-7d14-467a-b2a8-87fbea8f2b94	AN7132PKD Дефицит пируваткиназы (Pkdef) Породы: Бассенжи, Бигль, Вест хайленд уайт терьер, Лабрадор ретривер, Мопс	МойСклад	3331.00	30		t	2025-09-27 04:31:33.067991	2025-09-27 05:15:38.322	ae5eb24d-9b35-11f0-0a80-017600136658		20	\N	\N	\N
8d7d52e8-f14e-45a9-a76f-15f5632895b9	AN7208LM Дефицит плазминогена/Лигнеозный мембранит (LM) Породы: Шотландский терьер	МойСклад	3331.00	30		t	2025-09-27 04:31:33.146896	2025-09-27 05:15:38.356	ae647be3-9b35-11f0-0a80-01760013665d		20	\N	\N	\N
293c263d-347e-480d-8a5d-7c482e7bae15	AN7135SPAI Лихорадка шарпеев (SPAID) Породы: Шарпей	МойСклад	3331.00	30		t	2025-09-27 04:31:33.230177	2025-09-27 05:15:38.389	ae6b0541-9b35-11f0-0a80-017600136662		20	\N	\N	\N
e0671e3e-d50f-4b3e-819b-3e1eaf5012a2	AN7133DCM2 Дилатационная кардиомиопатия доберманов 2 мутации (Dilated Cardiomyopathy, DCM2) Породы: Доберман	МойСклад	3331.00	30		t	2025-09-27 04:31:33.314954	2025-09-27 05:15:38.422	ae716058-9b35-11f0-0a80-017600136667		20	\N	\N	\N
bfcb155d-2d73-4051-87cf-3af0062a873b	AN7209DCMS Дилатационная кардиомиопатия шнауцеров (DCMS) Породы: Миттельшнауцер, Ризеншнауцер	МойСклад	3331.00	30		t	2025-09-27 04:31:33.393723	2025-09-27 05:15:38.456	ae7798db-9b35-11f0-0a80-01760013666c		20	\N	\N	\N
6ba26f17-e98d-4308-97c1-7d8f54b58dc7	AN7210RSBC Зубная гипоминерализация / Синдром Райна (RS BC) Породы: Бордер колли	МойСклад	3331.00	30		t	2025-09-27 04:31:33.477002	2025-09-27 05:15:38.489	ae7e21ee-9b35-11f0-0a80-017600136671		20	\N	\N	\N
8e073b75-d1db-41c3-9128-f175024d932e	AN7211CJM Кардиомиопатия и ювенильная смертность (CJM) Породы: Бельгийская овчарка	МойСклад	3331.00	30		t	2025-09-27 04:31:33.560272	2025-09-27 05:15:38.522	ae83ed0b-9b35-11f0-0a80-017600136676		20	\N	\N	\N
81932050-c5be-401f-af05-fd792aa2a33c	AN7134LEMP Лейкоэнцефаломиелопатия (LEMP) Породы: Леонбергер	МойСклад	3331.00	30		t	2025-09-27 04:31:33.645595	2025-09-27 05:15:38.556	ae89b681-9b35-11f0-0a80-01760013667b		20	\N	\N	\N
fb9c115b-9c1c-4787-838d-b3557d68a379	AN7213LSD Лизосомная болезнь накопления (LSD) Породы: Лаготто раманьоло	МойСклад	3331.00	30		t	2025-09-27 04:31:33.805017	2025-09-27 05:15:38.624	ae95b1ef-9b35-11f0-0a80-017600136685		20	\N	\N	\N
473c33ec-4ab0-4974-8883-048e92bd5f38	AN7136MTCT Макротромбоцитопения (MTC) Породы: Норфолк терьер, Керн терьер	МойСклад	3331.00	30		t	2025-09-27 04:31:33.887504	2025-09-27 05:15:38.657	ae9b3121-9b35-11f0-0a80-01760013668a		20	\N	\N	\N
e22b3363-3ae9-49c7-8695-d2a4383fc220	AN7137MTS Макротромбоцитопения (MTC) Породы: Кавалер кинг чарльз спаниель	МойСклад	3331.00	30		t	2025-09-27 04:31:33.974242	2025-09-27 05:15:38.69	aea0981d-9b35-11f0-0a80-01760013668f		20	\N	\N	\N
e86cc0a8-bd9d-42ef-be66-51d7e2f84002	AN7138IGBC Мальабсорбция кишечного кобаламина, синдром Имерслунд-Гресбека бордер колли (IGS BC, ICM BC) Породы: Бордер колли	МойСклад	3331.00	30		t	2025-09-27 04:31:34.054046	2025-09-27 05:15:38.723	aea6992c-9b35-11f0-0a80-017600136694		20	\N	\N	\N
cac3031e-e8d8-4c63-a42f-7173bfbdbf80	AN7139IGSB Мальабсорбция кишечного кобаламина, синдром Имерслунд-Гресбека биглей (IGS B, ICM B)	МойСклад	3331.00	30		t	2025-09-27 04:31:34.138183	2025-09-27 05:15:38.756	aeac28c9-9b35-11f0-0a80-017600136699		20	\N	\N	\N
1b61303a-15af-45d5-91d5-3edf8ddadf41	AN7214MCM Мезиоверсия клыков верхней челюсти (эффект копья) (MCM) Породы: Шелти	МойСклад	3331.00	30		t	2025-09-27 04:31:34.221535	2025-09-27 05:15:38.789	aeb1cd55-9b35-11f0-0a80-01760013669e		20	\N	\N	\N
7db26e00-0976-4b3d-b911-f1400afe05dd	AN7215RBP4 Микрофтальмия (RBP4) Породы: Ирландский мягкошёрстный пшеничный терьер	МойСклад	3331.00	30		t	2025-09-27 04:31:34.303116	2025-09-27 05:15:38.822	aeb7536b-9b35-11f0-0a80-0176001366a3		20	\N	\N	\N
5a1c32a7-89a8-4156-b856-9c91d27fe894	AN7140MTM Миотубулярная миопатия (MTM1, XL-MTM) Породы: Лабрадор ретривер	МойСклад	3331.00	30		t	2025-09-27 04:31:34.385775	2025-09-27 05:15:38.855	aebcc3ac-9b35-11f0-0a80-0176001366a8		20	\N	\N	\N
9d550bc7-7776-4308-b51f-1bc10297ce99	AN7141NCCD Мозжечковая абиотрофия (NCCD) Породы: Бигль	МойСклад	3331.00	30		t	2025-09-27 04:31:34.468202	2025-09-27 05:15:38.888	aec1ccf3-9b35-11f0-0a80-0176001366ad		20	\N	\N	\N
fef247b5-f981-4972-bc2e-baa217731561	AN7216CMSD Мультисистемная дегенерация (CMSD) Породы: Китайская хохлатая	МойСклад	3331.00	30		t	2025-09-27 04:31:34.550854	2025-09-27 05:15:38.921	aec79f61-9b35-11f0-0a80-0176001366b2		20	\N	\N	\N
74b60c59-f675-4f83-9a7d-2545bd823d8b	AN7220NADR Нейроаксональная дистрофия ротвейлеров (NAD R) Породы: Ротвейлер	МойСклад	3331.00	30		t	2025-09-27 04:31:34.795006	2025-09-27 05:15:39.021	aed8f5e9-9b35-11f0-0a80-0176001366c1		20	\N	\N	\N
45a8cc51-b4a0-4ea8-8f5a-1e464b93a77d	AN7143LPN1 Наследственная полинейропатия леонбергеров 1 (LPN1) Породы: Леонбергер	МойСклад	3331.00	30		t	2025-09-27 04:31:34.873981	2025-09-27 05:15:39.054	aedf3ffb-9b35-11f0-0a80-0176001366c6		20	\N	\N	\N
aeb48f38-cc50-4eb8-acef-9f63be7bf7a1	AN7144LPN2 Наследственная полинейропатия леонбергеров 2 (LPN1) Породы: Леонбергер	МойСклад	3331.00	30		t	2025-09-27 04:31:34.956527	2025-09-27 05:15:39.087	aee4bd87-9b35-11f0-0a80-0176001366cb		20	\N	\N	\N
3301c15e-25ca-4254-9d24-13d10c66243b	AN7219LPN3 Наследственная полинейропатия 3 / Паралич гортани (LPPN3) Породы: Лабрадор ретривер, Леонбергер, Сенбернар	МойСклад	3331.00	30		t	2025-09-27 04:31:35.048896	2025-09-27 05:15:39.121	aeea4d39-9b35-11f0-0a80-0176001366d0		20	\N	\N	\N
55e5ec45-584d-4c6c-9239-6c48d9669af9	AN7142HFH Наследственный гиперкератоз подушечек лап бордоского дога (HFH-B) Породы: Бордоский дог	МойСклад	3331.00	30		t	2025-09-27 04:31:35.129528	2025-09-27 05:15:39.154	aef023f0-9b35-11f0-0a80-0176001366d5		20	\N	\N	\N
3f70cb9d-ffb2-488f-8ad4-75a51f8867ee	AN7145HN Наследственный нефрит (HN) Породы: Самоедская собака	МойСклад	3331.00	30		t	2025-09-27 04:31:35.210373	2025-09-27 05:15:39.187	aef60f97-9b35-11f0-0a80-0176001366da		20	\N	\N	\N
a4d83284-5b39-4183-b3d9-5b8dedf3d23b	AN7146FVII Недостаточность фактора VII (FVIID) Породы: Аляскинский кли кай, Бигль, Вельш спрингер спаниель, Дирхаунд, Ризеншнауцер, Финская гончая, Эрдельтерьер	МойСклад	3331.00	30		t	2025-09-27 04:31:35.29284	2025-09-27 05:15:39.22	aefc0462-9b35-11f0-0a80-0176001366df		20	\N	\N	\N
dd642372-8611-44ea-9e21-693af1371aad	AN7147NCL1 Нейрональный цероидный липофусциноз 1-го типа (NCL1) Породы: Кане корсо, Такса	МойСклад	3331.00	30		t	2025-09-27 04:31:35.373699	2025-09-27 05:15:39.254	af023b4f-9b35-11f0-0a80-0176001366e4		20	\N	\N	\N
b91023c2-8d74-4184-8f07-08fe929893eb	AN7148NCL2 Нейрональный цероидный липофусциноз 2-го типа (NCL2) Породы: Такса	МойСклад	3331.00	30		t	2025-09-27 04:31:35.455634	2025-09-27 05:15:39.29	af07e121-9b35-11f0-0a80-0176001366e9		20	\N	\N	\N
9bd80ce7-7ef1-4f37-8827-3fad680482cf	AN7149NCL5 Нейрональный цероидный липофусциноз 5-го типа (NCL5) Породы: Австралийская пастушья собака (хилер), Бордер колли	МойСклад	3331.00	30		t	2025-09-27 04:31:35.542657	2025-09-27 05:15:39.323	af0d7594-9b35-11f0-0a80-0176001366ee		20	\N	\N	\N
76353bca-dbb3-4da6-a439-66feb9fb4873	AN7221NCLR Нейрональный цероидный липофусциноз голден ретриверов 5-го типа (NCL5GR) Породы: Золотистый Ретривер	МойСклад	3331.00	30		t	2025-09-27 04:31:35.626858	2025-09-27 05:15:39.356	af130bf7-9b35-11f0-0a80-0176001366f3		20	\N	\N	\N
70ca00fc-510d-412e-ac1b-533353d3f4f3	AN7150NCL6 Нейрональный цероидный липофусциноз 6-го типа (NCL6) Породы: Австралийская овчарка (аусси), Австралийская пастушья собака (хилер)	МойСклад	3331.00	30		t	2025-09-27 04:31:35.707895	2025-09-27 05:15:39.39	af1893ae-9b35-11f0-0a80-0176001366f8		20	\N	\N	\N
c10f5a22-f88b-427c-9bdb-ccf0eae2daf1	AN7222NCL8 Нейрональный цероидный липофусциноз 8-го типа (NCL8S) Породы: Салюки	МойСклад	3331.00	30		t	2025-09-27 04:31:35.788634	2025-09-27 05:15:39.423	af1de0ca-9b35-11f0-0a80-0176001366fd		20	\N	\N	\N
a0f2c5b2-df29-420a-9d0d-fec9291d93d4	AN7151CL10 Нейрональный цероидный липофусциноз 10-го типа (NCL10) Породы: Американский бульдог	МойСклад	3331.00	30		t	2025-09-27 04:31:35.871393	2025-09-27 05:15:39.456	af2336f7-9b35-11f0-0a80-017600136702		20	\N	\N	\N
45359d4f-d539-41be-9743-339a783a6228	AN7223CL12 Нейрональный цероидный липофусциноз 12-го типа (NCL12) Породы: Тибетский терьер	МойСклад	3331.00	30		t	2025-09-27 04:31:35.950902	2025-09-27 05:15:39.489	af28aa5f-9b35-11f0-0a80-017600136707		20	\N	\N	\N
b827bb95-5390-44d3-aa6c-6b025d0464e6	AN7224CL12 Наследственный цероидный липофусциноз австралийской пастушьей собаки 12-го типа (NCL12 АС) Породы: Австралийская пастушья собака (хилер)	МойСклад	3331.00	30		t	2025-09-27 04:31:36.032581	2025-09-27 05:15:39.522	af2ea6df-9b35-11f0-0a80-01760013670c		20	\N	\N	\N
801e424e-90e0-42de-a7e2-87b97423390e	AN7225NEWS Неонатальная энцефалопатия с судорогами (NEWS) Породы: Стандартный пудель	МойСклад	3331.00	30		t	2025-09-27 04:31:36.117652	2025-09-27 05:15:39.555	af33dffd-9b35-11f0-0a80-017600136711		20	\N	\N	\N
d172720a-e45e-44c9-b61e-bbb806dd6de4	AN7152AAFA Несовершенный амелогенез / Наследственная гипоплазия эмали акит (ARAI A / FEH A) Породы: Акита, Американска акита	МойСклад	3331.00	30		t	2025-09-27 04:31:36.197569	2025-09-27 05:15:39.588	af38e81a-9b35-11f0-0a80-017600136716		20	\N	\N	\N
3cf98221-5b94-40b7-a9fa-b0d4d9993d11	AN7153ALFL Несовершенный амелогенез / Наследственная гипоплазия эмали левреток (ARAI L / FEH L) Породы: Левретка	МойСклад	3331.00	30		t	2025-09-27 04:31:36.281171	2025-09-27 05:15:39.622	af3f7183-9b35-11f0-0a80-01760013671b		20	\N	\N	\N
fedde66d-4f74-4910-a8d4-3fc969030633	AN7226ALFP Несовершенный амелогенез / Наследственная гипоплазия эмали Парсон рассел терьера (AI P / ARAI-P/ FEH-P) Породы: Парсон рассел терьер	МойСклад	3331.00	30		t	2025-09-27 04:31:36.363891	2025-09-27 05:15:39.655	af459da7-9b35-11f0-0a80-017600136720		20	\N	\N	\N
edb05a28-8802-4146-963f-e756b31a7661	AN7227ALS Несовершенный амелогенез / Наследственная гипоплазия эмали самоеда (ARAI-S) Породы: Самоед	МойСклад	3331.00	30		t	2025-09-27 04:31:36.444782	2025-09-27 05:15:39.688	af4c482c-9b35-11f0-0a80-017600136725		20	\N	\N	\N
198af0e4-a1f9-4e12-ac17-b65c36e716b1	10.19 Дирофиляриоз (repens/immitis)	МойСклад	2112.00	30		t	2025-09-27 04:31:47.426706	2025-09-27 05:15:44.119	b3800772-9b35-11f0-0a80-017600136a77		20	\N	\N	\N
979b38df-ebc9-4067-a5df-af34451f80f7	AN7154OI Несовершенный остеогенез такс (OI) Породы: Такса (все разновидности)	МойСклад	3331.00	30		t	2025-09-27 04:31:36.607918	2025-09-27 05:15:39.756	af5a2d04-9b35-11f0-0a80-01760013672f		20	\N	\N	\N
03488378-d2a9-4032-a1e9-93167932d38d	AN7155PLN Нефропатия с потерей белка (PLN) Породы: Ирландский мягкошёрстный пшеничный терьер	МойСклад	3331.00	30		t	2025-09-27 04:31:36.692142	2025-09-27 05:15:39.789	af6150e2-9b35-11f0-0a80-017600136734		20	\N	\N	\N
445d183e-1ef8-4382-986f-fa5ec5ab72bf	AN7156LP Паралич гортани бультерьеров (LP) Породы: Миниатюрный бультерьер, бультерьер	МойСклад	3331.00	30		t	2025-09-27 04:31:36.774642	2025-09-27 05:15:39.822	af680d5d-9b35-11f0-0a80-017600136739		20	\N	\N	\N
31ac20cb-c050-472d-b64e-59b7d1f759a8	AN7229PBFB Первичная открытоугольная глаукома рыжих бретонских бассетов (POAG BFB) Породы: Рыжий бретонский бассет	МойСклад	3331.00	30		t	2025-09-27 04:31:36.857116	2025-09-27 05:15:39.855	af6e93d3-9b35-11f0-0a80-01760013673e		20	\N	\N	\N
8e89734b-9148-40a5-8f3a-12e5e6ba01d0	AN7157POAG Первичная открытоугольная глаукома биглей (POAG Beagle) Породы: Бигль	МойСклад	3331.00	30		t	2025-09-27 04:31:36.941524	2025-09-27 05:15:39.889	af74f2c1-9b35-11f0-0a80-017600136743		20	\N	\N	\N
ffdad5ae-e0eb-4309-a25e-621e01533297	AN7159PELK Первичная открытоугольная глаукома Элкхаунд (POAG Elk) Породы: Норвежский элкхунд	МойСклад	3331.00	30		t	2025-09-27 04:31:37.10887	2025-09-27 05:15:39.957	af8245da-9b35-11f0-0a80-01760013674d		20	\N	\N	\N
37713076-0de3-4b84-99d0-539f86ba8512	AN7160CNGA Прогрессирующая атрофия сетчатки PRA-CNGA1 Породы: Шелти	МойСклад	3331.00	30		t	2025-09-27 04:31:37.196546	2025-09-27 05:15:39.99	af88d146-9b35-11f0-0a80-017600136752		20	\N	\N	\N
01e0f702-8868-4b04-bc7d-cad2feadda99	AN7161CRDS Прогрессирующая атрофия сетчатки CRD-SWD / PRA-cord2 Породы: Стандартная жесткошерстная такса, Миниатюрная жесткошерстная такса, Кроличья жесткошерстная такса	МойСклад	3331.00	30		t	2025-09-27 04:31:37.278061	2025-09-27 05:15:40.024	af8f6fba-9b35-11f0-0a80-017600136757		20	\N	\N	\N
7ed2e631-7ba6-4624-abb6-a363f3d2595a	AN7163PRA4 Прогрессирующая атрофия сетчатки PRA-rcd4 Породы: Австралийская пастушья собака, Австралийский лабрадудль, Берндудль, Кокапу, Английский сеттер, Ирландский красный сеттер, Ирландский красно-белый сеттер, Кокапу, Ллевеллин Сеттер,Миниатюрны	МойСклад	3331.00	30		t	2025-09-27 04:31:37.363718	2025-09-27 05:15:40.058	af95bc2a-9b35-11f0-0a80-01760013675c		20	\N	\N	\N
e935ab89-7d70-47f2-b73f-097ced31d033	AN7162PXL2 Прогрессирующая атрофия сетчатки цвергшнауцеров (PRA A, XLPRA2) Породы: Цвергшнауцер	МойСклад	3331.00	30		t	2025-09-27 04:31:37.443039	2025-09-27 05:15:40.091	af9ba2c0-9b35-11f0-0a80-017600136761		20	\N	\N	\N
55126fc4-652a-47cc-a47c-73c2c6f0dea6	AN7164FN Семейная нефропатия английских кокер спаниелей (FN) Породы: Английский кокер спаниель, Американский кокер спаниель	МойСклад	3331.00	30		t	2025-09-27 04:31:37.528151	2025-09-27 05:15:40.124	afa15abc-9b35-11f0-0a80-017600136766		20	\N	\N	\N
0a2b9101-45dc-4b6e-97ee-10a03c063b83	AN7165AMS Синдром акральной матуляции (AMS) Породы: Английский кокер спаниель, Английский спрингер спаниель, Английский пойнтер, Немецкий курцхаар (Немецкий короткошерстный пойнтер), Французский спаниель, Цвергшнауцер	МойСклад	3331.00	30		t	2025-09-27 04:31:37.608357	2025-09-27 05:15:40.158	afa7517b-9b35-11f0-0a80-01760013676b		20	\N	\N	\N
5d674e5d-5d24-4ea7-8450-98ecf3d09e26	AN7166MLS Синдром Мусладина-Люка / Синдром китайского бигля (MLS) Породы: Бигль	МойСклад	3331.00	30		t	2025-09-27 04:31:37.690193	2025-09-27 05:15:40.191	afad50de-9b35-11f0-0a80-017600136770		20	\N	\N	\N
7c6d4869-4649-49cd-9ced-df4897ee3708	AN7167CLAD Синдром недостаточной адгезии лейкоцитов (CLAD) Породы: Ирландский красный сеттер, Ирландский красно-белый сеттер	МойСклад	3331.00	30		t	2025-09-27 04:31:37.774661	2025-09-27 05:15:40.224	afb3a0bb-9b35-11f0-0a80-017600136775		20	\N	\N	\N
78f6b58d-81a4-4863-a5db-6aaa11ba8e0f	AN7168SCD Спондилокостальный дизостоз (SCD) Породы: Цвергшнауцер	МойСклад	3331.00	30		t	2025-09-27 04:31:37.858333	2025-09-27 05:15:40.259	afb9d373-9b35-11f0-0a80-01760013677a		20	\N	\N	\N
25c1b984-6489-44e5-bea1-2dc5e5361fc2	AN7169SCID Тяжелый комбинированный иммунодефицит, сцепленный с Х-хромосомой (X-SCID) Породы: Бассет хаунд, Вельш корги	МойСклад	3331.00	30		t	2025-09-27 04:31:37.941246	2025-09-27 05:15:40.292	afbfc578-9b35-11f0-0a80-01760013677f		20	\N	\N	\N
8c50813d-06ee-4e0f-95ae-12769264b963	AN7170CDDY Хондродистрофия с риском дегенерации межпозвоночных дисков (CDDY, IVDD) Породы: Бассет хаунд, Вандейский бассет-гриффон, Вельш корги кардиган, Вельш корги пемброк, Вест хайленд уайт терьер, Гаванский бишон, Денди динмонт терьер, Джек рассе	МойСклад	3331.00	30		t	2025-09-27 04:31:38.025495	2025-09-27 05:15:40.325	afc7e46c-9b35-11f0-0a80-017600136784		20	\N	\N	\N
f4f7668e-d7cc-459f-875a-bff1a4f81fe4	AN7171CDPA Хондродисплазия (CDPA) и хондродистрофия с риском дегенерации межпозвоночных дисков (CDDY, IVDD) Породы: Бассет хаунд, Вандейский бассет-гриффон, Вельш корги кардиган, Вельш корги пемброк, Вест хайленд уайт терьер, Гаванский бишон, Денди д	МойСклад	4927.00	30		t	2025-09-27 04:31:38.113122	2025-09-27 05:15:40.358	afcdff7d-9b35-11f0-0a80-017600136789		20	\N	\N	\N
9a9366ae-bbb7-45de-bd48-422c597b0134	AN7172CYSB Цистинурия бульдогов (Cys BD) Породы: Английский бульдог, Французский бульдог	МойСклад	3331.00	30		t	2025-09-27 04:31:38.196657	2025-09-27 05:15:40.391	afd3a82a-9b35-11f0-0a80-01760013678e		20	\N	\N	\N
336557cd-aa40-4576-90e5-55344345ab9e	AN7174BFJE Ювенильная идиопатическая эпилепсия (BFJE) Породы: Лаготто романьоло (Итальянская водяная собака)	МойСклад	3331.00	30		t	2025-09-27 04:31:38.368868	2025-09-27 05:15:40.466	afdef6ea-9b35-11f0-0a80-017600136798		20	\N	\N	\N
76420420-a1b7-4ddb-b65f-e611ecb7f047	AN7175KSR Курчавость селкирк-рексов Породы: Селкирк-рекс	МойСклад	2468.00	30		t	2025-09-27 04:31:38.448561	2025-09-27 05:15:40.5	afe4e668-9b35-11f0-0a80-01760013679d		20	\N	\N	\N
a2bc84a7-374e-4aa8-9e3b-949ea02467b7	AN7176FOLD Остеохондродисплазия кошек - вислоухость (Fold) Породы: Шотландская вислоухая	МойСклад	2468.00	30		t	2025-09-27 04:31:38.530486	2025-09-27 05:15:40.533	afebb4c8-9b35-11f0-0a80-0176001367a2		20	\N	\N	\N
8c2db9e7-1bb7-4878-bea3-bd9b4a95088a	AN7177ALPS Аутоиммунный лимфопролиферативный синдром кошек (ALPS, FALPS) Породы: Британская короткошерстная и кроссбридинговые породы	МойСклад	2468.00	30		t	2025-09-27 04:31:38.616666	2025-09-27 05:15:40.567	aff20f7d-9b35-11f0-0a80-0176001367a7		20	\N	\N	\N
12b189e2-f739-47d0-aad5-2c48a2683a3a	AN7179MPS Мукополисахаридоз VI (MPS VI) Породы: Сейшельская, Сиамская, Балийская (балинезийская, балинез), Домашняя короткошерстная, Ориентальная короткошерстная, Петерболд, Священная бирма, Тайская, Тонкинская, Яванез	МойСклад	2468.00	30		t	2025-09-27 04:31:38.781744	2025-09-27 05:15:40.635	affe2faa-9b35-11f0-0a80-0176001367b1		20	\N	\N	\N
040726f7-93ef-4247-8bea-40447a2487eb	AN7180PRDY Прогрессирующая атрофия сетчатки Rdy (PRA-Rdy) Породы: Абиссинская кошка, Оцикет, Сомали	МойСклад	2468.00	30		t	2025-09-27 04:31:38.861674	2025-09-27 05:15:40.668	b003b4a3-9b35-11f0-0a80-0176001367b6		20	\N	\N	\N
2823b238-93bb-4fa5-95dd-5068b38b7c3c	AN7181DS Дубликат сертификата	МойСклад	823.00	30		t	2025-09-27 04:31:38.94403	2025-09-27 05:15:40.701	b0096bc7-9b35-11f0-0a80-0176001367bb		20	\N	\N	\N
5cb6a2c3-7576-4162-b1c6-56f569275587	AN93CAT Определение группы крови (кошки), экспресс-тест	МойСклад	4441.00	30		t	2025-09-27 04:31:39.023972	2025-09-27 05:15:40.734	b00f70e2-9b35-11f0-0a80-0176001367c0		20	\N	\N	\N
9ad8fc55-9f99-40ad-a8f7-c24400241b3e	AN93DOG Определение группы крови (собаки), экспресс-тест	МойСклад	4441.00	30		t	2025-09-27 04:31:39.10379	2025-09-27 05:15:40.767	b015e84a-9b35-11f0-0a80-0176001367c5		20	\N	\N	\N
1272deba-c366-49e5-acff-ee6eb4efd2d4	AN9AST АСТ (аспартатаминотрансфераза)	МойСклад	149.00	30		t	2025-09-27 04:31:39.188073	2025-09-27 05:15:40.8	b01be0d9-9b35-11f0-0a80-0176001367ca		20	\N	\N	\N
8ad43ac7-84bd-4cff-8a05-8a6e18359522	AN8ALT АЛТ (аланинаминотрансфераза)	МойСклад	149.00	30		t	2025-09-27 04:31:39.271802	2025-09-27 05:15:40.833	b021bea7-9b35-11f0-0a80-0176001367cf		20	\N	\N	\N
340cf7ce-110d-4743-a957-5036d8019cf8	AN7ОБС Печеночный (АЛТ, альбумин, АСТ, белок общий, билирубин общий,  ГГТ, глюкоза, мочевина, холестерин, ЩФ) 10	МойСклад	1366.00	30		t	2025-09-27 04:31:39.355639	2025-09-27 05:15:40.867	b028470a-9b35-11f0-0a80-0176001367d4		20	\N	\N	\N
783f0e13-b9bd-493c-9c21-c385f7194869	AN8ОБС Печеночный расширенный (АЛТ, альбумин, АСТ, белок общий, билирубин общий, ГГТ, глюкоза, мочевина, холестерин, ЩФ) 10 + Желчные кислоты (проба натощак + проба после приема пищи)	МойСклад	2648.00	30		t	2025-09-27 04:31:39.446602	2025-09-27 05:15:40.9	b02e6018-9b35-11f0-0a80-0176001367d9		20	\N	\N	\N
1225721e-a4b3-461d-bfd1-a74e72298679	AN9ОБС Предоперационный (АЛТ, альбумин, АСТ, белок общий, билирубин общий, глюкоза, калий, креатинин, мочевина, натрий, хлор, ЩФ) 12	МойСклад	1589.00	30		t	2025-09-27 04:31:39.531212	2025-09-27 05:15:40.933	b03451c7-9b35-11f0-0a80-0176001367de		20	\N	\N	\N
2f3681fc-83e3-4a7c-8892-22d668b2efb0	AN928VD3 Исследование на уровень 25-ОН витамина D	МойСклад	2822.00	30		t	2025-09-27 04:31:39.611333	2025-09-27 05:15:40.966	b03a64d2-9b35-11f0-0a80-0176001367e3		20	\N	\N	\N
19324613-b131-4fe4-b70f-a2d388aaa3cd	AN88PHE Фенобарбитал	МойСклад	4573.00	30		t	2025-09-27 04:31:39.695749	2025-09-27 05:15:40.999	b040b17a-9b35-11f0-0a80-0176001367e8		20	\N	\N	\N
fca90569-3582-437a-b452-97d93d9d56bf	AN89PHNY Фенитоин	МойСклад	5740.00	30		t	2025-09-27 04:31:39.776313	2025-09-27 05:15:41.032	b0469e33-9b35-11f0-0a80-0176001367ed		20	\N	\N	\N
f4a81537-e21a-4453-92ba-c1f2f5290ccd	AN90VALP Вальпроевая кислота	МойСклад	2098.00	30		t	2025-09-27 04:31:39.857216	2025-09-27 05:15:41.065	b04ccc74-9b35-11f0-0a80-0176001367f2		20	\N	\N	\N
d7824dc7-4334-4fbb-9df8-6b505de8b3de	AN91CARB Карбамазепин	МойСклад	5881.00	30		t	2025-09-27 04:31:39.943453	2025-09-27 05:15:41.099	b052a336-9b35-11f0-0a80-0176001367f7		20	\N	\N	\N
684ba63a-a3b0-44c7-b517-0422a480ca6c	AN900LEV Лекарственный мониторинг вещества не входящего в перечень препаратов	МойСклад	5881.00	30		t	2025-09-27 04:31:40.02687	2025-09-27 05:15:41.132	b0592c47-9b35-11f0-0a80-0176001367fc		20	\N	\N	\N
ef63c9da-7c56-4200-9978-0f1ac3251c9b	AN89ОБС Желудочно-кишечный большой профиль (парвовирус собак (CPV 2), коронавирус собак энтеральный (CCoV 1), Аденовирус 1 типа (CAV 1), вирус чумы плотоядных (CDV), гиардиа (Giardia spp.), криптоспоридии (Cryptosporidium spp.)), ротавирус А (Rotavir	МойСклад	6901.00	30		t	2025-09-27 04:31:40.110713	2025-09-27 05:15:41.165	b05f7d72-9b35-11f0-0a80-017600136801		20	\N	\N	\N
201f4882-3df4-4bfc-979b-bdfc547b2419	AN90ОБС Желудочно-кишечный расширенный профиль собак  (парвовирус собак (CPV 2), коронавирус собак энтеральный  (CCoV 1), аденовирус 1 типа (CAV 1), вирус чумы плотоядных (CDV), гиардиа (Giardia spp.), криптоспоридии (Cryptosporidium spp.)), ротавиру	МойСклад	10196.00	30		t	2025-09-27 04:31:40.191963	2025-09-27 05:15:41.198	b066e18d-9b35-11f0-0a80-017600136806		20	\N	\N	\N
3856e9d7-bd35-461f-9974-d490a10c120e	AN79ОБС Хронические вирусные инфекции (вирус иммунодефицита (FIV, обнаружение провирусной ДНК),  вирус лейкемии (FeLV, обнаружение провирусной ДНК))	МойСклад	1556.00	30		t	2025-09-27 04:31:40.447151	2025-09-27 05:15:41.299	b07a92bb-9b35-11f0-0a80-017600136815		20	\N	\N	\N
27ab9e76-5962-41c4-a7f8-2c5b327387cd	AN94ОБС Стоматологический малый профиль  (вирус иммунодефицита (FIV, обнаружение провирусной ДНК), вирус лейкемии (FeLV, обнаружение провирусной ДНК), калицивирус (FCV))	МойСклад	2444.00	30		t	2025-09-27 04:31:40.534508	2025-09-27 05:15:41.332	b080a570-9b35-11f0-0a80-01760013681a		20	\N	\N	\N
63b383c0-ee0d-472c-9fa0-42f3082e0953	AN7601NA Изониазид (сыворотка)	МойСклад	2007.00	30		t	2025-09-27 04:31:40.618744	2025-09-27 05:15:41.365	b0873e37-9b35-11f0-0a80-01760013681f		20	\N	\N	\N
faf436cc-47c3-47f5-975b-2b1c4ed10903	Сканирование готового шестого стекла без заключения патолога"	МойСклад	955.00	30		t	2025-09-27 04:31:40.703715	2025-09-27 05:15:41.398	b08d8855-9b35-11f0-0a80-017600136824		20	\N	\N	\N
627c53c9-92a9-4385-9e40-3474b3177ec9	ANДОКР Дополнительное окрашивание гистосреза (изготовление стекла из блока + окрашивание)	МойСклад	36254.00	30		t	2025-09-27 04:31:40.78393	2025-09-27 05:15:41.431	b09332d2-9b35-11f0-0a80-017600136829		20	\N	\N	\N
d8d99c6a-ccdf-4471-b649-f2ef5adfaa75	ANКОСТЬ Декальцинация	МойСклад	42347.00	30		t	2025-09-27 04:31:40.86948	2025-09-27 05:15:41.464	b099558b-9b35-11f0-0a80-01760013682e		20	\N	\N	\N
5a381877-d38c-4140-80d3-aa4632b91c47	AN982ETU Этанол	МойСклад	4220.00	30		t	2025-09-27 04:31:40.951131	2025-09-27 05:15:41.497	b09fb265-9b35-11f0-0a80-017600136833		20	\N	\N	\N
58156f3a-9fbf-4e11-a719-f20f7661687f	AN983KSI Ксилол	МойСклад	4220.00	30		t	2025-09-27 04:31:41.038052	2025-09-27 05:15:41.53	b0a5b8fd-9b35-11f0-0a80-017600136838		20	\N	\N	\N
632d9b1d-792b-4336-b622-6d7c8f8a6626	AN984TOL Толуол	МойСклад	4220.00	30		t	2025-09-27 04:31:41.121943	2025-09-27 05:15:41.563	b0ac9fe2-9b35-11f0-0a80-01760013683d		20	\N	\N	\N
fba8b5ca-5319-46c5-8ff3-84e2eea831e7	AN985FE Фенол	МойСклад	6119.00	30		t	2025-09-27 04:31:41.205547	2025-09-27 05:15:41.596	b0b3100e-9b35-11f0-0a80-017600136842		20	\N	\N	\N
89faa08b-b316-4b25-b06d-b1095798a023	AN986FO Формальдегид	МойСклад	13156.00	30		t	2025-09-27 04:31:41.293528	2025-09-27 05:15:41.629	b0b8a3dd-9b35-11f0-0a80-017600136847		20	\N	\N	\N
09610fa8-6d27-4b8d-ad60-bfc4f6aa2d04	AN987MET Метанол	МойСклад	6448.00	30		t	2025-09-27 04:31:41.37846	2025-09-27 05:15:41.662	b0bf4f65-9b35-11f0-0a80-01760013684c		20	\N	\N	\N
9e17e4d2-5f4c-4410-893f-a5f8a694092d	AN988AC Ацетон	МойСклад	6448.00	30		t	2025-09-27 04:31:41.461167	2025-09-27 05:15:41.694	b0c5840c-9b35-11f0-0a80-017600136851		20	\N	\N	\N
a12f71c8-d756-41f9-971f-152107ac75a3	AN989IZ Изопропанол	МойСклад	7262.00	30		t	2025-09-27 04:31:41.548599	2025-09-27 05:15:41.733	b0cb00bd-9b35-11f0-0a80-017600136856		20	\N	\N	\N
da7d1428-cee8-4cc6-99cf-f18f8967db7d	AN990ETL Этиленгликоль	МойСклад	6357.00	30		t	2025-09-27 04:31:41.633197	2025-09-27 05:15:41.766	b0d1ec78-9b35-11f0-0a80-01760013685b		20	\N	\N	\N
548946c5-ef1c-4f18-a386-f4e870495c4f	AN7602NA Изониазид (моча)	МойСклад	14843.00	30		t	2025-09-27 04:31:41.713384	2025-09-27 05:15:41.799	b0d8ae2d-9b35-11f0-0a80-017600136860		20	\N	\N	\N
364cb87b-8724-464e-b155-80e9d9385e5a	Состав:	МойСклад	2007.00	30		t	2025-09-27 04:31:41.79642	2025-09-27 05:15:41.832	b0dea63b-9b35-11f0-0a80-017600136865		20	\N	\N	\N
fe912683-dae4-43c8-b1c8-f22b3f387db8	Сканирование готового второго стекла без заключения патолога	МойСклад	823.00	30		t	2025-09-27 04:31:41.875995	2025-09-27 05:15:41.865	b0e2d5da-9b35-11f0-0a80-01760013686a		20	\N	\N	\N
7e2df687-54d5-4f73-aad3-eccd6b95a9d2	Сканирование готового третьего стекла без заключения патолога	МойСклад	635.00	30		t	2025-09-27 04:31:41.959194	2025-09-27 05:15:41.898	b0e650ed-9b35-11f0-0a80-01760013686e		20	\N	\N	\N
d33d53b6-3437-48e3-b42b-dbde57859085	Сканирование готового четвертого стекла без заключения патолога	МойСклад	1243.00	30		t	2025-09-27 04:31:42.0443	2025-09-27 05:15:41.931	b0ea6624-9b35-11f0-0a80-017600136872		20	\N	\N	\N
c272509b-cb40-4fd2-83b5-b2b4bedf8886	Сканирование готового пятого стекла без заключения патолога	МойСклад	2197.00	30		t	2025-09-27 04:31:42.128745	2025-09-27 05:15:41.964	b0ede879-9b35-11f0-0a80-017600136876		20	\N	\N	\N
fc27b606-c8d2-480f-b5ac-1c6bf9f9eaa7	Так же встречается у Бишон Фризе, Ирландский терьер, Испанская водяная собака, Лаготто Романьоло, Муди, Стандартный пудель, Чесапик-бей-ретривер"	МойСклад	3331.00	30		t	2025-09-27 04:31:42.211251	2025-09-27 05:15:41.997	b0f4941b-9b35-11f0-0a80-01760013687a		20	\N	\N	\N
331d6bba-e2d7-4f0c-84f9-eb94ea8c432c	Ланкаширский хилер, Шотландский терьер"	МойСклад	3331.00	30		t	2025-09-27 04:31:42.292091	2025-09-27 05:15:42.03	b0fa8bda-9b35-11f0-0a80-01760013687f		20	\N	\N	\N
814967d1-f0e0-4e6d-8e33-4d33787532b8	Американский питбультерьер"	МойСклад	3331.00	30		t	2025-09-27 04:31:42.380897	2025-09-27 05:15:42.063	b1006d00-9b35-11f0-0a80-017600136884		20	\N	\N	\N
db3b23f5-ea54-4e0d-8a93-65a13888a640	AN7230PCDA Первичная цилиарная дискинезия (PCD AM) Аляскинских маламутов Породы: Аляскинский маламут	МойСклад	3331.00	30		t	2025-09-27 04:31:42.466853	2025-09-27 05:15:42.098	b1064273-9b35-11f0-0a80-017600136889		20	\N	\N	\N
c8224d56-6cb6-43ac-a852-91ab56c15a54	AN7231POMC Предрасположенность к ожирению (POMC / ADI) Породы: Лабрадор ретривер	МойСклад	3331.00	30		t	2025-09-27 04:31:42.548097	2025-09-27 05:15:42.131	b10cc41c-9b35-11f0-0a80-01760013688e		20	\N	\N	\N
5452d0e7-2142-4963-a928-76a38654522e	AN7232PB1 Прогрессирующая атрофия сетчатки цвергшнауцеров тип B1 (PRA B1) Породы: Цвергшнауцер	МойСклад	3331.00	30		t	2025-09-27 04:31:42.632592	2025-09-27 05:15:42.164	b112e62c-9b35-11f0-0a80-017600136893		20	\N	\N	\N
1b4537e6-bab2-4b73-aa94-9b8c12553f31	AN7233BBS4 Прогрессирующая атрофия сетчатки BBS4 / Синдром Барде-Бидля 4 (PRA-BBS4) Породы: Пули	МойСклад	3331.00	30		t	2025-09-27 04:31:42.715475	2025-09-27 05:15:42.197	b119a8e2-9b35-11f0-0a80-017600136898		20	\N	\N	\N
4b202cd7-a7c0-46c0-acbc-c68eaceab36c	AN7235GHPN Ранняя прогрессирующая полинейропатия Грейхаундов (GHPN) Породы: Грейхаунд	МойСклад	3331.00	30		t	2025-09-27 04:31:42.885634	2025-09-27 05:15:42.264	b125fb84-9b35-11f0-0a80-0176001368a2		20	\N	\N	\N
debdd224-4275-4439-bb4f-3d2fa62ee398	AN7236SAN Сенсорная атактическая нейропатия (SAN) Породы: Золотистый ретривер	МойСклад	3331.00	30		t	2025-09-27 04:31:42.968062	2025-09-27 05:15:42.297	b12cc5a8-9b35-11f0-0a80-0176001368a7		20	\N	\N	\N
f85b2bf7-ebaf-4a9d-a64e-53ff80f868e7	AN7237SN Сенсорная невропатия (SN) Породы: Бордер колли	МойСклад	3331.00	30		t	2025-09-27 04:31:43.048779	2025-09-27 05:15:42.332	b133f531-9b35-11f0-0a80-0176001368ac		20	\N	\N	\N
69bf49b5-2c8d-4782-9a53-9f82a87fa690	AN7238BBS2 Синдром Барде-Бидля 2 (BBS2) Породы: Шелти	МойСклад	3331.00	30		t	2025-09-27 04:31:43.13585	2025-09-27 05:15:42.365	b13a7626-9b35-11f0-0a80-0176001368b1		20	\N	\N	\N
a8831bbf-1527-4eae-a1d1-177c84a02c95	AN7239VDEG Синдром Ван ден Энде-Гупта (VDEGS) Породы: Фокстерьер	МойСклад	3331.00	30		t	2025-09-27 04:31:43.227704	2025-09-27 05:15:42.398	b1413a37-9b35-11f0-0a80-0176001368b6		20	\N	\N	\N
ae2de57c-c5ff-4b1e-8f53-e77cd4955708	AN7240GS1 Синдром Грисцелли (GS1) Породы: Миниатюрная такса	МойСклад	3331.00	30		t	2025-09-27 04:31:43.309798	2025-09-27 05:15:42.431	b148d3e1-9b35-11f0-0a80-0176001368bb		20	\N	\N	\N
7c530c45-2634-46fd-89fb-d9f8c77d1a8e	AN7241QT Синдром длинного интервала QT (LQT) Породы: Английский Спрингер спаниэль	МойСклад	3331.00	30		t	2025-09-27 04:31:43.394202	2025-09-27 05:15:42.464	b14fd5a9-9b35-11f0-0a80-0176001368c0		20	\N	\N	\N
f0822056-ed64-43f4-8cf2-7ca77866e079	AN7242TNS Синдром захваченных нейтрофилов (TNS) Породы: Бордер Колли	МойСклад	3331.00	30		t	2025-09-27 04:31:43.483507	2025-09-27 05:15:42.497	b1570fdd-9b35-11f0-0a80-0176001368c5		20	\N	\N	\N
d6939924-29b4-441a-b59a-0fdd2a934153	AN7243PMDS Синдром персистирующих мюллеровых протоков (PMDS) Породы: Цвергшнауцер	МойСклад	3331.00	30		t	2025-09-27 04:31:43.569973	2025-09-27 05:15:42.53	b15dbfff-9b35-11f0-0a80-0176001368ca		20	\N	\N	\N
cb7658f2-e415-4d6e-bc45-8554fcbc71bd	AN7244SD2 Скелетная дисплазия 2 (SD2) Породы: Лабрадор ретривер	МойСклад	3331.00	30		t	2025-09-27 04:31:43.658989	2025-09-27 05:15:42.563	b1644c39-9b35-11f0-0a80-0176001368cf		20	\N	\N	\N
4b407556-222e-45e7-97e9-5ef22ccd1323	AN7245SPD Спинальный дизрафизм веймаранеров (SpD) Породы: Веймаранер	МойСклад	3331.00	30		t	2025-09-27 04:31:43.742438	2025-09-27 05:15:42.596	b16ab76a-9b35-11f0-0a80-0176001368d4		20	\N	\N	\N
c9c6548c-c229-4a20-b228-959bff86dc38	AN7246MAC Устойчивость к микобактериозу (МАС) Породы: Цвергшнауцер	МойСклад	3331.00	30		t	2025-09-27 04:31:43.822999	2025-09-27 05:15:42.629	b1714740-9b35-11f0-0a80-0176001368d9		20	\N	\N	\N
b7f2d3b7-fe5d-40a2-ab28-4b5417c9d108	AN7247CY2A Цистинурия 2A типа (CYST2A) Породы: Австралийская пастушья собака	МойСклад	3331.00	30		t	2025-09-27 04:31:43.906218	2025-09-27 05:15:42.662	b177e742-9b35-11f0-0a80-0176001368de		20	\N	\N	\N
4364f333-2e26-4ba4-9565-df059fa11626	AN7248CY2B Цистинурия 2B типа (CYST2B) Породы: Карликовый пинчер	МойСклад	3331.00	30		t	2025-09-27 04:31:43.985932	2025-09-27 05:15:42.695	b181b8c5-9b35-11f0-0a80-0176001368e3		20	\N	\N	\N
e8772a81-3e2e-4b4d-a7aa-adc05a358384	ANБР2 Установление родства двух животных (щенок + кобель, мать бесплатно)	МойСклад	7236.00	30		t	2025-09-27 04:31:44.153956	2025-09-27 05:15:42.761	b18d73c4-9b35-11f0-0a80-0176001368ed		20	\N	\N	\N
26fc873a-d8ee-4659-8c44-12415d6e7509	ANБРДОП Дополнительная проба к п. AN БР2 (щенок, кобель, сука)	МойСклад	3192.00	30		t	2025-09-27 04:31:44.239478	2025-09-27 05:15:42.794	b19360c2-9b35-11f0-0a80-0176001368f2		20	\N	\N	\N
b1a90ba5-4a3a-41f7-839d-42cef42eb5b5	AN80ОБС Английский бульдог. Гиперурикозурия (HUU), Дегенеративная миелопатия (DM Ex2), Мультифокальная ретинопатия (CMR 1)	МойСклад	6514.00	30		t	2025-09-27 04:31:44.322975	2025-09-27 05:15:42.892	b199aefe-9b35-11f0-0a80-0176001368f7		20	\N	\N	\N
04459109-2755-47c3-a104-14c0e8f3f56a	AN93ОБС Басенджи. Прогрессирующая атрофия сетчатки басенджи (bas-PRA), Синдром Фанкони (FBS)	МойСклад	6514.00	30		t	2025-09-27 04:31:44.406667	2025-09-27 05:15:42.925	b19f544f-9b35-11f0-0a80-0176001368fc		20	\N	\N	\N
7fd6a0aa-1ad2-4088-9b65-16905c34ff20	AN95ОБС Ирландский волкодав.  Дилатационная кардиомиопатия ирландских волкодавов (DCM_iw), Длина шерсти	МойСклад	6514.00	30		t	2025-09-27 04:31:44.489318	2025-09-27 05:15:42.957	b1a520cf-9b35-11f0-0a80-017600136901		20	\N	\N	\N
086f7a85-41dc-4685-a79f-8905f740ec62	AN96ОБС Кавалер кинг чарльз спаниель.  Синдром эпизодического падения (EFS), Синдром сухого глаза и курчавошерстности (CKCID)	МойСклад	6514.00	30		t	2025-09-27 04:31:44.573311	2025-09-27 05:15:42.99	b1aacc9b-9b35-11f0-0a80-017600136906		20	\N	\N	\N
aaf8d06e-a2f0-42f2-99b7-37f5c386c5ba	AN98ОБС Керри-блю терьер. Болезнь фон Виллебранда I-го типа (vWD type I), Дегенеративная миелопатия (DM Ex2)	МойСклад	6514.00	30		t	2025-09-27 04:31:44.659264	2025-09-27 05:15:43.023	b1b07753-9b35-11f0-0a80-01760013690b		20	\N	\N	\N
76bdd4e1-d306-417c-8fdb-b455824f56b5	AN99ОБС Курчавошерстный ретривер. Гликогеноз IIIa, Коллапс, вызываемый физическими нагрузками (EIC), Прогрессирующая атрофия сетчатки PRA-cord1	МойСклад	9555.00	30		t	2025-09-27 04:31:44.746404	2025-09-27 05:15:43.056	b1b62a4f-9b35-11f0-0a80-017600136910		20	\N	\N	\N
4fd2737b-d043-426d-b07b-af918702d1c7	AN81ОБС Миниатюрный бультерьер. Первичный вывих хрусталика (PLL), Поликистоз почек бультерьеров	МойСклад	6514.00	30		t	2025-09-27 04:31:44.828424	2025-09-27 05:15:43.089	b1bd8592-9b35-11f0-0a80-017600136915		20	\N	\N	\N
fa7afe54-db09-486c-bc67-a62f37fc8d35	AN82ОБС Мопс. Дегенеративная миелопатия (DM Ex2), Наследственный энцефалит мопсов (NME), Первичный вывих хрусталика (PLL)	МойСклад	9555.00	30		t	2025-09-27 04:31:44.912121	2025-09-27 05:15:43.125	b1c2e239-9b35-11f0-0a80-01760013691a		20	\N	\N	\N
e78e80e0-70e7-4262-b98d-c6c4b7bf3a42	AN84ОБС Русский черный терьер (расширенный).  Гиперурикозурия (HUU), Дегенеративная миелопатия (DM Ex2), Ювенильный паралич гортани/Полинейропатия	МойСклад	9555.00	30		t	2025-09-27 04:31:45.084067	2025-09-27 05:15:43.191	b1ce6543-9b35-11f0-0a80-017600136924		20	\N	\N	\N
a3c3d523-ec5d-430e-ba19-75e0e11a955a	AN86ОБС Сибирский хаски. Дегенеративная миелопатия (DM Ex2), Прогрессирующая атрофия сетчатки XL-PRA1, Чувствительность к лекарственным препаратам (MDR 1)	МойСклад	9555.00	30		t	2025-09-27 04:31:45.166671	2025-09-27 05:15:43.224	b1d3b185-9b35-11f0-0a80-017600136929		20	\N	\N	\N
4b5834f6-bb39-4327-b330-b22d87ff6569	AN85ОБС Стаффордширский бультерьер. L-2-гидроксиглутаровая ацидурия Стаффордширских бультерьеров (L2HGA), Наследственная катаракта (HSF4)	МойСклад	6514.00	30		t	2025-09-27 04:31:45.252191	2025-09-27 05:15:43.258	b1d8d9e8-9b35-11f0-0a80-01760013692e		20	\N	\N	\N
5fee8921-2dd5-41bd-855c-33ee17c78cec	AN7249GWGL Локус W, белые перчатки (GL) Породы: Бирманская кошка	МойСклад	2468.00	30		t	2025-09-27 04:31:45.340479	2025-09-27 05:15:43.291	b1de7186-9b35-11f0-0a80-017600136933		20	\N	\N	\N
fe59afd8-70e9-4293-8010-363a247967d5	AN7250GOLD Псевдозолотистый окрас / солнечный / биметаллик биметаллик(Gold) Породы: Сибирская кошка	МойСклад	2468.00	30		t	2025-09-27 04:31:45.42457	2025-09-27 05:15:43.324	b1e44fd3-9b35-11f0-0a80-017600136938		20	\N	\N	\N
a5379e31-83d3-4f7a-b93b-33715533c940	AN7251GBD Голубой / Лиловый / Фавн (Локус B, Локус D) Породы: Все породы	МойСклад	4204.00	30		t	2025-09-27 04:31:45.504737	2025-09-27 05:15:43.357	b1e9f73f-9b35-11f0-0a80-01760013693d		20	\N	\N	\N
253acb66-373f-40e4-a748-cddf55b4bda1	AN7252KRDR Курчавость (KRT71 DR) Породы: Девон-рекс	МойСклад	2468.00	30		t	2025-09-27 04:31:45.591511	2025-09-27 05:15:43.391	b1f07987-9b35-11f0-0a80-017600136942		20	\N	\N	\N
58b4d719-f3d8-4d91-871a-b1f75009f0bc	AN7253HW Полидактилия, Hw аллель Породы: Мейн кун	МойСклад	2468.00	30		t	2025-09-27 04:31:45.685113	2025-09-27 05:15:43.424	b1f61839-9b35-11f0-0a80-017600136947		20	\N	\N	\N
2b96d44e-1aac-48da-b7a8-4cc949d1cd65	AN7254HCMS Гипертрофическая кардиомиопатия канадских сфинксов (HCM Sp) Породы: Канадский сфинкс	МойСклад	2468.00	30		t	2025-09-27 04:31:45.766838	2025-09-27 05:15:43.489	b1fc9619-9b35-11f0-0a80-01760013694c		20	\N	\N	\N
d9465cf3-ba72-4568-bc1e-0fc75f5eaeed	AN7255HC74 Гипертрофическая кардиомиопатия мейн-кунов 1 мутация, A74T (HCM A74T) Породы: Мейн-кун	МойСклад	2468.00	30		t	2025-09-27 04:31:45.859236	2025-09-27 05:15:43.522	b2025968-9b35-11f0-0a80-017600136951		20	\N	\N	\N
bd3e95ca-4901-4cb8-8b88-a749d084e603	AN7256OCA Глазной альбинизм донского сфинкса (OCA DC) Породы: Донский сфинкс	МойСклад	2468.00	30		t	2025-09-27 04:31:45.944119	2025-09-27 05:15:43.555	b2091482-9b35-11f0-0a80-017600136956		20	\N	\N	\N
3b250386-406e-41b6-b3e0-d2eeaf256749	AN7257MPS4 Мукополисахаридоз VII (MPSVII) Породы: Все породы	МойСклад	2468.00	30		t	2025-09-27 04:31:46.025808	2025-09-27 05:15:43.588	b20fc471-9b35-11f0-0a80-01760013695b		20	\N	\N	\N
a7a8fc96-b362-4047-8c23-7c354680ab98	AN7258MC Наследственная миотония (MC) Породы: Все породы	МойСклад	2468.00	30		t	2025-09-27 04:31:46.106463	2025-09-27 05:15:43.621	b2162b32-9b35-11f0-0a80-017600136960		20	\N	\N	\N
43f94577-9a4d-41c6-8303-5cce68e42acc	AN7259PRAB Прогрессирующая атрофия сетчатки бенгалов (PRA-b) Породы: Бенгальская, Саванна	МойСклад	2468.00	30		t	2025-09-27 04:31:46.19609	2025-09-27 05:15:43.654	b21c7e2b-9b35-11f0-0a80-017600136965		20	\N	\N	\N
a59d8a95-ebe2-4d4b-a597-e61f7563abaa	AN7260CYSB Цистинурия В (Cys B) Породы: Мейн кун, Сиамская, Сфинкс, Домашняя кошка	МойСклад	2468.00	30		t	2025-09-27 04:31:46.2777	2025-09-27 05:15:43.687	b222bd97-9b35-11f0-0a80-01760013696a		20	\N	\N	\N
ed20ca72-eb0b-466f-9806-efa1cae600a5	AN7261RC Установление родства 2 животных (котенок + кот, мать бесплатно)	МойСклад	7821.00	30		t	2025-09-27 04:31:46.362896	2025-09-27 05:15:43.72	b228ea43-9b35-11f0-0a80-01760013696f		20	\N	\N	\N
8cf410bd-8fa8-45e1-bef2-7ae8c5ce13c8	AN7262RCDP Дополнительная проба (котенок, кот, кошка)	МойСклад	3618.00	30		t	2025-09-27 04:31:46.44603	2025-09-27 05:15:43.754	b22f0564-9b35-11f0-0a80-017600136974		20	\N	\N	\N
d57126c1-4776-46f1-9bef-201a70b118db	AN88ОБС Мейн-кун расширенный.  Гипертрофическая кардиомиопатия мейн кунов 2 мутации: A31P, A47T(HCM), Дефицит пируваткиназы, Спинальная мышечная атрофия	МойСклад	7821.00	30		t	2025-09-27 04:31:46.535837	2025-09-27 05:15:43.788	b2354c14-9b35-11f0-0a80-017600136979		20	\N	\N	\N
97c37fe8-56e9-4b8a-8ef6-378625d52296	10.10 Вирусная лейкемия кошек (FelV РНК, FelV ДНК)	МойСклад	1342.00	30		t	2025-09-27 04:31:46.627313	2025-09-27 05:15:43.82	b23d8f57-9b35-11f0-0a80-017600136980		20	\N	\N	\N
28c3623e-e36b-419f-a0f8-c98e3b4e8526	10.11 Вирусная лейкемия кошек (FelV РНК) с вирусной нагрузкой	МойСклад	1716.00	30		t	2025-09-27 04:31:46.716353	2025-09-27 05:15:43.853	b243a7dc-9b35-11f0-0a80-017600136985		20	\N	\N	\N
5758bc83-eb46-408f-9e2e-d72c36d88a94	10.12 Вирусный гепатит собак (аденовироз) (CAdV - 1)	МойСклад	1089.00	30		t	2025-09-27 04:31:46.803865	2025-09-27 05:15:43.887	b24a14d3-9b35-11f0-0a80-01760013698a		20	\N	\N	\N
4c554c87-0a82-4d20-812f-318b9b581505	10.13 Вирусный перитонит (Коронавирусная инфекция кошек) (FCoV)	МойСклад	1089.00	30		t	2025-09-27 04:31:46.888882	2025-09-27 05:15:43.919	b2508572-9b35-11f0-0a80-01760013698f		20	\N	\N	\N
e3a53e35-5d7f-4ffd-8c20-222d1370159f	10.14 Гемотропные микоплазмы кошек (Mycoplasma haemofelis, Candidatus Mycoplasma haemominutum, Candidatus Mycoplasma turicensis)	МойСклад	2090.00	30		t	2025-09-27 04:31:46.983135	2025-09-27 05:15:43.953	b256c8cf-9b35-11f0-0a80-017600136994		20	\N	\N	\N
8761c1ab-2710-410e-8acd-a5643e17a57d	10.15 Гемотропные микоплазмы собак (Mycoplasma haemocanis)	МойСклад	1342.00	30		t	2025-09-27 04:31:47.07347	2025-09-27 05:15:43.985	b25cc8f3-9b35-11f0-0a80-017600136999		20	\N	\N	\N
25431443-1185-4c86-8c91-e70e197b6fa5	10.16 Гепатозооноз (Hepatozoon canis)	МойСклад	1089.00	30		t	2025-09-27 04:31:47.159497	2025-09-27 05:15:44.02	b262ac78-9b35-11f0-0a80-01760013699e		20	\N	\N	\N
f3603831-9d47-4fe5-a98e-b69da5dd56b7	1.27 Панкреатическая амилаза-(2ч)	МойСклад	1056.00	30		t	2025-09-27 04:31:47.601212	2025-09-27 05:15:44.187	b38b9643-9b35-11f0-0a80-017600136a81		20	\N	\N	\N
3adce7fc-2871-4052-b564-ea656c2ee3bb	1.28 Панкреатическая липаза специфическая (кошка)	МойСклад	4620.00	30		t	2025-09-27 04:31:47.690977	2025-09-27 05:15:44.22	b390e26d-9b35-11f0-0a80-017600136a86		20	\N	\N	\N
76486f88-8b85-4885-abd7-24d09adbaa8a	12.3 ГАСТРОЭНТЕРАЛЬНЫЙ большой	МойСклад	6578.00	30		t	2025-09-27 04:31:47.78322	2025-09-27 05:15:44.254	b396653d-9b35-11f0-0a80-017600136a8b		20	\N	\N	\N
a245ceff-83a3-4e35-a580-e5746e07f1d4	1.29 Панкреатическая липаза специфическая (собака)	МойСклад	4620.00	30		t	2025-09-27 04:31:47.86979	2025-09-27 05:15:44.287	b39cacf5-9b35-11f0-0a80-017600136a90		20	\N	\N	\N
dec44949-c30a-42ee-9c67-d2b4034cc647	1.30 Желчные кислоты, 1 проба	МойСклад	1518.00	30		t	2025-09-27 04:31:47.954302	2025-09-27 05:15:44.32	b3a3d8d2-9b35-11f0-0a80-017600136a95		20	\N	\N	\N
830df547-c85e-4416-8dde-b9ab5596d89f	1.31 Желчные кислоты, 2 пробы	МойСклад	3036.00	30		t	2025-09-27 04:31:48.039369	2025-09-27 05:15:44.353	b3aa4c26-9b35-11f0-0a80-017600136a9a		20	\N	\N	\N
76d8bcff-8f52-411a-af01-9eab815d3b65	1.32 Тропонин (кошка - собака)	МойСклад	5500.00	30		t	2025-09-27 04:31:48.125804	2025-09-27 05:15:44.387	b3b16cc3-9b35-11f0-0a80-017600136a9f		20	\N	\N	\N
62885f7d-5995-445f-a7cf-f0a98893821a	12.5 РЕПРОДУКТИВНЫЙ	МойСклад	4730.00	30		t	2025-09-27 04:31:48.210853	2025-09-27 05:15:44.42	b3b8006f-9b35-11f0-0a80-017600136aa4		20	\N	\N	\N
a9386731-26b3-49ab-b289-b1f3826e2d10	12.6 ГЕМОПАРАЗИТАРНЫЙ	МойСклад	7458.00	30		t	2025-09-27 04:31:48.293934	2025-09-27 05:15:44.453	b3be6b35-9b35-11f0-0a80-017600136aa9		20	\N	\N	\N
c875cf75-2fc6-419f-86f6-33739847e864	12.7 ИММУНОДЕФИЦИТНЫЙ	МойСклад	3278.00	30		t	2025-09-27 04:31:48.380692	2025-09-27 05:15:44.486	b3c4a1c5-9b35-11f0-0a80-017600136aae		20	\N	\N	\N
51ee0052-d0bc-436d-a3de-08ae9869fe7c	12.8 "БЕЗДОМНЫЙ" - NEW	МойСклад	2970.00	30		t	2025-09-27 04:31:48.465396	2025-09-27 05:15:44.518	b3cb0aa1-9b35-11f0-0a80-017600136ab3		20	\N	\N	\N
ec864a66-a1ab-46cc-aebc-6b7a2617649e	13.1 Грипп А - NEW	МойСклад	1089.00	30		t	2025-09-27 04:31:48.55317	2025-09-27 05:15:44.551	b3d14c02-9b35-11f0-0a80-017600136ab8		20	\N	\N	\N
75e91502-7058-41f9-8ec7-c1396c44a715	13.2 Кампилобактериоз (Campylobacter spp.)	МойСклад	1342.00	30		t	2025-09-27 04:31:48.634492	2025-09-27 05:15:44.584	b3d78ee5-9b35-11f0-0a80-017600136abd		20	\N	\N	\N
f31a63a5-fa62-4a4d-a189-642673a4758b	13.3 Криптоспоридиоз (Cryptosporidium spp.)	МойСклад	1089.00	30		t	2025-09-27 04:31:48.716887	2025-09-27 05:15:44.617	b3ddef94-9b35-11f0-0a80-017600136ac2		20	\N	\N	\N
68b2314f-33fc-4a83-a665-3777b3416167	13.4 Лямблиоз (Giardia spp.)	МойСклад	1089.00	30		t	2025-09-27 04:31:48.800931	2025-09-27 05:15:44.65	b3e41eaa-9b35-11f0-0a80-017600136ac7		20	\N	\N	\N
8dbbe354-91d3-4a07-8d23-4b03d5c02e23	13.5 НЬЮКАСЛА болезнь (Newcastle disease virus)	МойСклад	1342.00	30		t	2025-09-27 04:31:48.88563	2025-09-27 05:15:44.682	b3ea316d-9b35-11f0-0a80-017600136acc		20	\N	\N	\N
aaa93b3e-a73d-44ce-a951-f755ec52ce6c	13.6 Орнитоз (Chlamydophila psittaci)	МойСклад	1089.00	30		t	2025-09-27 04:31:48.96843	2025-09-27 05:15:44.716	b3f01e4e-9b35-11f0-0a80-017600136ad1		20	\N	\N	\N
6ad84bca-4f8b-4882-885c-dbbf37c45976	13.7 Микобактериоз (Micobacterium spp.)	МойСклад	1342.00	30		t	2025-09-27 04:31:49.057869	2025-09-27 05:15:44.749	b3f663f4-9b35-11f0-0a80-017600136ad6		20	\N	\N	\N
8f7cca74-153f-4413-95b0-65f55ea08ff3	12.4 ГАСТРОЭНТЕРАЛЬНЫЙ малый - NEW	МойСклад	2970.00	30		t	2025-09-27 04:31:49.146778	2025-09-27 05:15:44.782	b3fcee51-9b35-11f0-0a80-017600136adb		20	\N	\N	\N
973d9b67-2233-4a78-8048-7b512de2909a	10.20 Исследование из парафинового блока	МойСклад	4180.00	30		t	2025-09-27 04:31:49.230868	2025-09-27 05:15:44.815	b4031bec-9b35-11f0-0a80-017600136ae0		20	\N	\N	\N
17d2675b-fd4a-4426-ab34-237d92c47ab7	10.21 Калицивироз (FCV)	МойСклад	1089.00	30		t	2025-09-27 04:31:49.315078	2025-09-27 05:15:44.848	b4092a56-9b35-11f0-0a80-017600136ae5		20	\N	\N	\N
1721a413-a263-40d5-b065-2249dd83bcbc	10.22 Кампилобактериоз (Campylobacter spp.)	МойСклад	1342.00	30		t	2025-09-27 04:31:49.406662	2025-09-27 05:15:44.881	b4101410-9b35-11f0-0a80-017600136aea		20	\N	\N	\N
73a51a90-0d50-49d6-b9e4-703245ba813f	10.23 Кандидоз (Candida krusei/glabrata)	МойСклад	1342.00	30		t	2025-09-27 04:31:49.493853	2025-09-27 05:15:44.914	b416b3d0-9b35-11f0-0a80-017600136aef		20	\N	\N	\N
11ff364e-6f34-4474-b44c-5e54e2e7aebb	10.44 Трихомоноз (Trichomonas foetus)	МойСклад	1089.00	30		t	2025-09-27 04:31:49.580956	2025-09-27 05:15:44.947	b41d4d1b-9b35-11f0-0a80-017600136af4		20	\N	\N	\N
7ede12a0-4c67-4e41-9c81-94e9d913b5d9	10.45 Трихофития  (Trichophyton spp.)	МойСклад	1089.00	30		t	2025-09-27 04:31:49.668519	2025-09-27 05:15:44.98	b423e545-9b35-11f0-0a80-017600136af9		20	\N	\N	\N
0dbcf410-ba8f-4c1d-8297-ddca3974a0e2	10.46 Уреаплазмоз (Ureaplasma spp.)	МойСклад	1089.00	30		t	2025-09-27 04:31:49.75079	2025-09-27 05:15:45.013	b42b153a-9b35-11f0-0a80-017600136afe		20	\N	\N	\N
93dda903-6136-49fa-8815-457875798fe3	10.47 Хламидиоз (Chlamydia spp.)	МойСклад	1089.00	30		t	2025-09-27 04:31:49.839581	2025-09-27 05:15:45.046	b431d3ef-9b35-11f0-0a80-017600136b03		20	\N	\N	\N
f025650f-7cb6-41b9-a1b1-e05512bde996	10.48 Чума плотоядных (CDV)	МойСклад	1089.00	30		t	2025-09-27 04:31:49.927117	2025-09-27 05:15:45.078	b4389719-9b35-11f0-0a80-017600136b08		20	\N	\N	\N
32b6a599-ff9a-47df-9015-2aa829d03b8d	11.1 РЕСПИРАТОРНЫЙ большой	МойСклад	7590.00	30		t	2025-09-27 04:31:50.098701	2025-09-27 05:15:45.147	b445248f-9b35-11f0-0a80-017600136b12		20	\N	\N	\N
a1c135c9-cf0a-4471-8098-ca29a6c3e7bd	11.2 РЕСПИРАТОРНЫЙ малый - NEW	МойСклад	4070.00	30		t	2025-09-27 04:31:50.186706	2025-09-27 05:15:45.18	b44b0060-9b35-11f0-0a80-017600136b17		20	\N	\N	\N
327ce3df-837e-4c47-92df-bd18d1f89493	11.3 РЕПРОДУКТИВНЫЙ	МойСклад	4070.00	30		t	2025-09-27 04:31:50.27156	2025-09-27 05:15:45.213	b450dfb8-9b35-11f0-0a80-017600136b1c		20	\N	\N	\N
9781bc29-a575-4cd3-8946-e399f0c462da	11.4 ГАСТРОЭНТЕРАЛЬНЫЙ большой	МойСклад	8338.00	30		t	2025-09-27 04:31:50.355429	2025-09-27 05:15:45.247	b4572958-9b35-11f0-0a80-017600136b21		20	\N	\N	\N
8a9c9b63-09c9-4693-b841-521ce4ff6426	11.5 ГАСТРОЭНТЕРАЛЬНЫЙ малый - NEW	МойСклад	2970.00	30		t	2025-09-27 04:31:50.44087	2025-09-27 05:15:45.281	b45e015c-9b35-11f0-0a80-017600136b26		20	\N	\N	\N
881c0eec-0157-42ee-8af9-d8d2988211a2	11.6 ГЕМОПАРАЗИТАРНЫЙ	МойСклад	6820.00	30		t	2025-09-27 04:31:50.522615	2025-09-27 05:15:45.314	b46537d0-9b35-11f0-0a80-017600136b2b		20	\N	\N	\N
0d5215ee-8c17-4c2a-bf97-e5880ec3d0da	11.7 "БЕЗДОМНЫЙ" - NEW	МойСклад	2970.00	30		t	2025-09-27 04:31:50.608856	2025-09-27 05:15:45.347	b46d0b67-9b35-11f0-0a80-017600136b30		20	\N	\N	\N
11f72caf-ff36-4694-ac6f-7b2a1625f7a7	12.1 РЕСПИРАТОРНЫЙ большой	МойСклад	5676.00	30		t	2025-09-27 04:31:50.69792	2025-09-27 05:15:45.38	b47498e3-9b35-11f0-0a80-017600136b35		20	\N	\N	\N
29715733-b78a-46d3-8fd0-56d200475ade	1.26 Фруктозамин-(12ч.)	МойСклад	682.00	30		t	2025-09-27 04:31:50.86331	2025-09-27 05:15:45.446	b481f2c4-9b35-11f0-0a80-017600136b3f		20	\N	\N	\N
de2366e3-e826-4a1b-9f90-fcea5f80aad3	1.26 Фруктозамин-(2ч.)	МойСклад	1056.00	30		t	2025-09-27 04:31:50.949144	2025-09-27 05:15:45.48	b4884b6d-9b35-11f0-0a80-017600136b44		20	\N	\N	\N
03ad5586-4b8a-4483-a850-5e6419ea7451	1.1 Стандартная биохимия (15 показателей)-(12ч.)	МойСклад	1364.00	30		t	2025-09-27 04:31:51.039333	2025-09-27 05:15:45.513	b49136f2-9b35-11f0-0a80-017600136b49		20	\N	\N	\N
57cf57c3-5a4d-4ea6-bc14-99b75f5be17e	1.1 Стандартная биохимия (15 показателей)-(2ч.)	МойСклад	1848.00	30		t	2025-09-27 04:31:51.127027	2025-09-27 05:15:45.546	b496ea75-9b35-11f0-0a80-017600136b4e		20	\N	\N	\N
81ddbe95-99f4-49a6-a993-d4d5b832df04	1.2 Расширенная биохимия (32 показателя)-(12ч.)	МойСклад	3300.00	30		t	2025-09-27 04:31:51.217423	2025-09-27 05:15:45.579	b49d33a8-9b35-11f0-0a80-017600136b53		20	\N	\N	\N
93938eff-369d-4eb7-865c-ebb40cef03c0	1.2 Расширенная биохимия (32 показателя)-(2ч.)	МойСклад	4686.00	30		t	2025-09-27 04:31:51.300011	2025-09-27 05:15:45.612	b4a3b7a4-9b35-11f0-0a80-017600136b58		20	\N	\N	\N
91e2fe5e-59f2-4dab-8dbe-635550e28d65	1.3 - 1.24 Один биохимический показатель из основного списка-(12ч.)	МойСклад	154.00	30		t	2025-09-27 04:31:51.384683	2025-09-27 05:15:45.645	b4aa3c6c-9b35-11f0-0a80-017600136b5d		20	\N	\N	\N
7cdc6f56-112b-41aa-8763-25afcae6e9d1	1.3 - 1.24 Один биохимический показатель из основного списка-(2ч.)	МойСклад	220.00	30		t	2025-09-27 04:31:51.468268	2025-09-27 05:15:45.678	b4b09202-9b35-11f0-0a80-017600136b62		20	\N	\N	\N
4101006e-06a7-41e2-b35c-98432097853f	1.25 Соотношение альбумин/глобулин -(12ч)	МойСклад	462.00	30		t	2025-09-27 04:31:51.554232	2025-09-27 05:15:45.711	b4b6caa0-9b35-11f0-0a80-017600136b67		20	\N	\N	\N
cf09c77a-7660-4996-a2bb-f859f72845be	1.25 Соотношение альбумин/глобулин -(2ч)	МойСклад	638.00	30		t	2025-09-27 04:31:51.637646	2025-09-27 05:15:45.744	b4bd401e-9b35-11f0-0a80-017600136b6c		20	\N	\N	\N
98dc9906-1775-492b-b0c6-7d1b7084aca1	1.33 Печеночный профиль-(12ч.)	МойСклад	1518.00	30		t	2025-09-27 04:31:51.721665	2025-09-27 05:15:45.777	b4c468ce-9b35-11f0-0a80-017600136b71		20	\N	\N	\N
4c945497-84c5-4b34-a140-4081908a539d	1.33 Печеночный профиль-(2ч.)	МойСклад	2156.00	30		t	2025-09-27 04:31:51.806803	2025-09-27 05:15:45.81	b4cab3a8-9b35-11f0-0a80-017600136b76		20	\N	\N	\N
4cc7b69c-b8c9-4c36-984a-661614c8570e	1.34 Почечный профиль-(12ч.)	МойСклад	1650.00	30		t	2025-09-27 04:31:51.893391	2025-09-27 05:15:45.843	b4d0ded0-9b35-11f0-0a80-017600136b7b		20	\N	\N	\N
d01db58d-9864-48cb-a960-4ba985c252c2	1.34 Почечный профиль-(2ч.)	МойСклад	2354.00	30		t	2025-09-27 04:31:51.980347	2025-09-27 05:15:45.877	b4d7473a-9b35-11f0-0a80-017600136b80		20	\N	\N	\N
1c0d344d-7660-44e2-8a3b-1c861d951bf0	1.35 Диабетический профиль-(12ч.)	МойСклад	1650.00	30		t	2025-09-27 04:31:52.06894	2025-09-27 05:15:45.91	b4ddb0dc-9b35-11f0-0a80-017600136b85		20	\N	\N	\N
87bcd56f-63f6-49aa-94c1-d95e3603dd9c	1.35 Диабетический профиль-(2ч.)	МойСклад	2354.00	30		t	2025-09-27 04:31:52.160046	2025-09-27 05:15:45.944	b4e5d973-9b35-11f0-0a80-017600136b8a		20	\N	\N	\N
887625d9-0722-4320-9284-e062e404b514	1.36 Сердечный профиль-(12ч.)	МойСклад	1650.00	30		t	2025-09-27 04:31:52.248284	2025-09-27 05:15:45.977	b4ed0334-9b35-11f0-0a80-017600136b8f		20	\N	\N	\N
1768189c-24dd-49c6-be8c-e49dc07e8433	1.36 Сердечный профиль-(2ч.)	МойСклад	2354.00	30		t	2025-09-27 04:31:52.336487	2025-09-27 05:15:46.01	b4f496b9-9b35-11f0-0a80-017600136b94		20	\N	\N	\N
919170eb-b271-491c-abcc-8977caaa451c	1.37 Панкреатический профиль-(12ч.)	МойСклад	1518.00	30		t	2025-09-27 04:31:52.425132	2025-09-27 05:15:46.043	b4fb8ac0-9b35-11f0-0a80-017600136b99		20	\N	\N	\N
436e3961-6b07-4bde-afc9-b33b861aec30	1.37 Панкреатический профиль-(2ч.)	МойСклад	2156.00	30		t	2025-09-27 04:31:52.51411	2025-09-27 05:15:46.076	b501e959-9b35-11f0-0a80-017600136b9e		20	\N	\N	\N
7a14b8a4-a2bb-45c7-9629-910e80c2aa3e	1.38 Предоперационный профиль-(12ч.)	МойСклад	1518.00	30		t	2025-09-27 04:31:52.602521	2025-09-27 05:15:46.109	b5086a4b-9b35-11f0-0a80-017600136ba3		20	\N	\N	\N
1a26bb2d-246e-46dc-9c95-d6030e617b87	1.38 Предоперационный профиль-(2ч.)	МойСклад	2156.00	30		t	2025-09-27 04:31:52.690639	2025-09-27 05:15:46.143	b50e5c9a-9b35-11f0-0a80-017600136ba8		20	\N	\N	\N
e0942a96-36de-438f-a91b-560cb2e2022a	1.39 Судорожный синдром-(12ч.)	МойСклад	1650.00	30		t	2025-09-27 04:31:52.790461	2025-09-27 05:15:46.176	b514876a-9b35-11f0-0a80-017600136bad		20	\N	\N	\N
9a9d9476-99c7-4f00-abbe-25afb65b4ea9	1.39 Судорожный синдром-(2ч.)	МойСклад	2354.00	30		t	2025-09-27 04:31:52.873224	2025-09-27 05:15:46.209	b51aa857-9b35-11f0-0a80-017600136bb2		20	\N	\N	\N
8559361c-dcfd-4bf7-855e-ea05dd610053	1.40 Минеральный обмен-(12ч.)	МойСклад	1012.00	30		t	2025-09-27 04:31:52.961709	2025-09-27 05:15:46.243	b5205c8a-9b35-11f0-0a80-017600136bb7		20	\N	\N	\N
c7ee25e5-8af2-43f3-8ed1-8b122dff3343	1.40 Минеральный обмен-(2ч.)	МойСклад	1518.00	30		t	2025-09-27 04:31:53.049019	2025-09-27 05:15:46.276	b5262486-9b35-11f0-0a80-017600136bbc		20	\N	\N	\N
64da182f-3e11-4ced-9f66-09256bf9bf03	10.1 Аденовироз респираторный (CadV - 2)	МойСклад	1089.00	30		t	2025-09-27 04:31:53.137047	2025-09-27 05:15:46.309	b52bc0f9-9b35-11f0-0a80-017600136bc1		20	\N	\N	\N
a18d4bc3-095f-4e49-9422-131042a948e1	10.2 Анаплазмоз (Anaplasma platys/Anaplasma phagocytophilum)	МойСклад	1782.00	30		t	2025-09-27 04:31:53.250198	2025-09-27 05:15:46.342	b531739d-9b35-11f0-0a80-017600136bc6		20	\N	\N	\N
fddc4354-ca60-488a-9686-4d1df38a4031	10.3 Бабезиоз (Babesia spp.)	МойСклад	1089.00	30		t	2025-09-27 04:31:53.333445	2025-09-27 05:15:46.376	b537b0e7-9b35-11f0-0a80-017600136bcb		20	\N	\N	\N
b18d2ac0-ccf0-4458-ad7a-5897cf7801f3	10.4 Бабезиоз (Babesia canis)	МойСклад	1089.00	30		t	2025-09-27 04:31:53.422962	2025-09-27 05:15:46.409	b53e5d22-9b35-11f0-0a80-017600136bd0		20	\N	\N	\N
1e71acb9-26bb-4b32-9bda-774f2012cca9	10.5 Бабезиоз (Babesia gibsoni)	МойСклад	1089.00	30		t	2025-09-27 04:31:53.509093	2025-09-27 05:15:46.444	b544cdb5-9b35-11f0-0a80-017600136bd5		20	\N	\N	\N
adf088a0-721a-41c2-8ff5-38a52ef25052	10.6 Бартонеллез (Bartonella spp.)	МойСклад	1089.00	30		t	2025-09-27 04:31:53.596535	2025-09-27 05:15:46.477	b54b1462-9b35-11f0-0a80-017600136bda		20	\N	\N	\N
3623fdc9-e5fc-4b47-8cea-3043fd40e85d	10.7 Бордетеллез (Bordetella bronchisepta)	МойСклад	1089.00	30		t	2025-09-27 04:31:53.686225	2025-09-27 05:15:46.51	b5517002-9b35-11f0-0a80-017600136bdf		20	\N	\N	\N
1382c892-3c2e-424c-8648-b2db1d36154e	10.8 Боррелиоз (болезнь Лайма) (Borrelia burgdorferi)	МойСклад	1089.00	30		t	2025-09-27 04:31:53.776743	2025-09-27 05:15:46.543	b557ac85-9b35-11f0-0a80-017600136be4		20	\N	\N	\N
7d643c4d-c9fd-4526-b6ed-2dc943a3c483	10.9 Вирус иммунодефицита кошек (FIV)	МойСклад	1089.00	30		t	2025-09-27 04:31:53.864055	2025-09-27 05:15:46.577	b55e3054-9b35-11f0-0a80-017600136be9		20	\N	\N	\N
cab1088e-84ec-4c89-bcd8-3f7e4ae599dc	10.25 Коронавирус гастроэнтеральный (CCoV, FCoV)	МойСклад	1089.00	30		t	2025-09-27 04:31:54.03268	2025-09-27 05:15:46.644	b56bd3d3-9b35-11f0-0a80-017600136bf3		20	\N	\N	\N
4fb2dbff-b004-4992-87f5-a037172a8a4c	10.26 Криптоспоридиоз (Cryptosporidium spp.)	МойСклад	1089.00	30		t	2025-09-27 04:31:54.118275	2025-09-27 05:15:46.677	b57257d3-9b35-11f0-0a80-017600136bf8		20	\N	\N	\N
f05fdeee-2594-4078-bed1-c2db08249513	10.27 Лейшманиоз (Leishmania spp.)	МойСклад	1342.00	30		t	2025-09-27 04:31:54.208058	2025-09-27 05:15:46.71	b578bc65-9b35-11f0-0a80-017600136bfd		20	\N	\N	\N
86fff6d0-7539-4b8c-848c-b08bacde8e21	10.28 Листериоз (Listeria monocytogenes)	МойСклад	1342.00	30		t	2025-09-27 04:31:54.297647	2025-09-27 05:15:46.744	b57fc554-9b35-11f0-0a80-017600136c02		20	\N	\N	\N
5da5c5b9-a9a6-4f32-a60a-8be6b116a8e4	10.29 Лямблиоз (Giardia spp.)	МойСклад	1089.00	30		t	2025-09-27 04:31:54.381164	2025-09-27 05:15:46.777	b586aaf8-9b35-11f0-0a80-017600136c07		20	\N	\N	\N
30f0aed1-dcf3-486b-854a-4b76192fae54	10.30 Микобактериоз (Micobacterium spp.)	МойСклад	1342.00	30		t	2025-09-27 04:31:54.466193	2025-09-27 05:15:46.81	b58e5c34-9b35-11f0-0a80-017600136c0c		20	\N	\N	\N
00cad671-9311-4478-a16a-ac30a673aec5	10.31 Микоплазмоз (Mycoplasma spp.)	МойСклад	1089.00	30		t	2025-09-27 04:31:54.560118	2025-09-27 05:15:46.848	b5955249-9b35-11f0-0a80-017600136c11		20	\N	\N	\N
ea6f3206-bc0f-4363-944c-39bd2a66887e	10.32 Микоплазмоз (Mycoplasma felis)	МойСклад	1089.00	30		t	2025-09-27 04:31:54.667057	2025-09-27 05:15:46.881	b59c771a-9b35-11f0-0a80-017600136c16		20	\N	\N	\N
956ba408-b968-4f08-87d4-f442a25ac070	10.33 Микоплазмоз (Mycoplasma canis)	МойСклад	1089.00	30		t	2025-09-27 04:31:54.75249	2025-09-27 05:15:46.914	b5a34924-9b35-11f0-0a80-017600136c1b		20	\N	\N	\N
2c42f52f-9a06-4162-bc99-f2625e4c9478	10.34 Микоплазмоз (Mycoplasma cynos)	МойСклад	1089.00	30		t	2025-09-27 04:31:54.8407	2025-09-27 05:15:46.948	b5a98b56-9b35-11f0-0a80-017600136c20		20	\N	\N	\N
67a6d1db-dd05-4acf-b554-9cf39db9945c	10.35 Микроспория (Microsporum spp.)	МойСклад	1342.00	30		t	2025-09-27 04:31:54.926142	2025-09-27 05:15:46.982	b5b08ac0-9b35-11f0-0a80-017600136c25		20	\N	\N	\N
df9f9c45-0e25-4397-823b-917f1148b8f4	10.36 Орнитоз (Chlamydophila psittaci)	МойСклад	1089.00	30		t	2025-09-27 04:31:55.014622	2025-09-27 05:15:47.015	b5b66151-9b35-11f0-0a80-017600136c2a		20	\N	\N	\N
8845b235-1e6e-479f-95a4-c95cd2476ad4	10.37 Панлейкопения кошек (FPV)	МойСклад	1089.00	30		t	2025-09-27 04:31:55.103199	2025-09-27 05:15:47.048	b5bd1c60-9b35-11f0-0a80-017600136c2f		20	\N	\N	\N
552d87ad-2e5a-4f83-9c3f-99338688b50f	10.38 Парагрипп собак (CPIV)	МойСклад	1089.00	30		t	2025-09-27 04:31:55.189161	2025-09-27 05:15:47.082	b5c30f13-9b35-11f0-0a80-017600136c34		20	\N	\N	\N
5efba0e8-3d0d-41c3-b8ec-1327275db35d	10.39 Парвовироз собак (CPV)	МойСклад	1089.00	30		t	2025-09-27 04:31:55.274488	2025-09-27 05:15:47.115	b5c98135-9b35-11f0-0a80-017600136c39		20	\N	\N	\N
506ec9af-ae33-45d0-a9f3-9fbc4425b1cb	10.40 Пастереллез (Pasteurella multocida)	МойСклад	1089.00	30		t	2025-09-27 04:31:55.359534	2025-09-27 05:15:47.148	b5d06396-9b35-11f0-0a80-017600136c3e		20	\N	\N	\N
93641382-5ac1-47e4-9bb1-8c0080f29c0a	10.41 Ротавирусная инфекция (Rotavirus A)	МойСклад	1089.00	30		t	2025-09-27 04:31:55.445978	2025-09-27 05:15:47.182	b5d76630-9b35-11f0-0a80-017600136c43		20	\N	\N	\N
71dd869f-16d5-4086-ab61-88ddfd6c3069	10.42 Сальмонеллез (Salmonella spp.)	МойСклад	1089.00	30		t	2025-09-27 04:31:55.534192	2025-09-27 05:15:47.215	b5de2a15-9b35-11f0-0a80-017600136c48		20	\N	\N	\N
00c9d6f7-f12a-4aea-ab12-851a1e22d470	10.43 Токсоплазмоз (Toxoplasma gondii)	МойСклад	1089.00	30		t	2025-09-27 04:31:55.627233	2025-09-27 05:15:47.248	b5e77ed5-9b35-11f0-0a80-017600136c4d		20	\N	\N	\N
84017dd8-12bc-4b1e-8eec-dafb086f04db	13.8 Микоплазмоз птиц (Mycoplasma synoviae,Mycoplasma gallisepticum,Mycoplasma meleagridis) - NEW	МойСклад	1782.00	30		t	2025-09-27 04:31:55.712811	2025-09-27 05:15:47.287	b5ef0e8b-9b35-11f0-0a80-017600136c52		20	\N	\N	\N
399952cc-4377-424f-8b2c-9718fee7a1c0	13.9 Сальмонеллез (Salmonella spp.)	МойСклад	1089.00	30		t	2025-09-27 04:31:55.803545	2025-09-27 05:15:47.32	b5f55e6d-9b35-11f0-0a80-017600136c57		20	\N	\N	\N
71a7ea78-3300-47cd-a648-c00d57d0a115	2.5 Перекрестная проба (Тест на совместимость)	МойСклад	968.00	30		t	2025-09-27 04:31:55.893718	2025-09-27 05:15:47.353	b60ec590-9b35-11f0-0a80-017600136c75		20	\N	\N	\N
989d705b-50e4-4a6c-938f-b8872c5ac977	2.6 Определение группы крови у собаки	МойСклад	7260.00	30		t	2025-09-27 04:31:55.97724	2025-09-27 05:15:47.387	b614d2ff-9b35-11f0-0a80-017600136c7a		20	\N	\N	\N
ed16af68-47b8-4906-b09b-d929224fff90	2.7 Определение группы крови у кошки	МойСклад	7260.00	30		t	2025-09-27 04:31:56.062314	2025-09-27 05:15:47.42	b61acbd5-9b35-11f0-0a80-017600136c7f		20	\N	\N	\N
15352b23-5dea-4667-a3cb-6283a9e3a243	2.8 Ручной подсчет тромбоцитов	МойСклад	946.00	30		t	2025-09-27 04:31:56.151918	2025-09-27 05:15:47.453	b620a9e9-9b35-11f0-0a80-017600136c84		20	\N	\N	\N
0fb4936b-5451-4467-b3a0-7309afce8028	2.4 Ретикулоциты	МойСклад	704.00	30		t	2025-09-27 04:31:56.23762	2025-09-27 05:15:47.486	b629ece3-9b35-11f0-0a80-017600136c8e		20	\N	\N	\N
cc88cef2-c531-4c54-ba41-6dce84f85b49	1.46 Д-димер	МойСклад	3300.00	30		t	2025-09-27 04:31:56.327813	2025-09-27 05:15:47.52	b6308da7-9b35-11f0-0a80-017600136c93		20	\N	\N	\N
0fa0928a-999e-4e07-8329-22148d24c4ec	1.41 Минералы-(12ч.)	МойСклад	770.00	30		t	2025-09-27 04:31:56.419242	2025-09-27 05:15:47.553	b636de30-9b35-11f0-0a80-017600136c98		20	\N	\N	\N
050359f8-a0ea-4a93-84aa-a8e50541c957	1.41 Минералы-(2ч.)	МойСклад	1012.00	30		t	2025-09-27 04:31:56.509731	2025-09-27 05:15:47.587	b63d5c67-9b35-11f0-0a80-017600136c9d		20	\N	\N	\N
224d5e11-fa77-489c-a0b0-6b811774283e	1.42 SDMA тест	МойСклад	5390.00	30		t	2025-09-27 04:31:56.598888	2025-09-27 05:15:47.62	b643b850-9b35-11f0-0a80-017600136ca2		20	\N	\N	\N
d33fe733-deb8-40c8-992f-697aebaaa469	1.44 С-реактивный белок собак	МойСклад	3300.00	30		t	2025-09-27 04:31:56.784751	2025-09-27 05:15:47.686	b64fa0b6-9b35-11f0-0a80-017600136cac		20	\N	\N	\N
7be87b2e-d170-4a76-8f74-20977525a718	1.45 Гликированный гемоглобин HBA1C собак и кошек	МойСклад	3300.00	30		t	2025-09-27 04:31:56.878288	2025-09-27 05:15:47.719	b65899aa-9b35-11f0-0a80-017600136cb1		20	\N	\N	\N
2e03a525-4a3c-401f-9551-6ee93b08086c	1.47 Почечный профиль птиц - NEW -(12ч)	МойСклад	748.00	30		t	2025-09-27 04:31:56.967919	2025-09-27 05:15:47.752	b65f5c3c-9b35-11f0-0a80-017600136cb6		20	\N	\N	\N
20d01b67-767a-4c84-91dd-e1928a64b5f4	1.47 Почечный профиль птиц - NEW -(2ч)	МойСклад	1034.00	30		t	2025-09-27 04:31:57.055623	2025-09-27 05:15:47.785	b66639c8-9b35-11f0-0a80-017600136cbb		20	\N	\N	\N
90cbdcc9-af38-46a7-bd4e-e6f1749c7acb	1.48 Печеночный профиль птиц - NEW  -(12ч.)	МойСклад	2354.00	30		t	2025-09-27 04:31:57.15128	2025-09-27 05:15:47.818	b66c96ee-9b35-11f0-0a80-017600136cc0		20	\N	\N	\N
00b14d4c-16bc-4019-9152-d727d0ae8830	1.49 Панкреатический профиль птиц - NEW -(12ч.)	МойСклад	616.00	30		t	2025-09-27 04:31:57.332433	2025-09-27 05:15:47.884	b6797207-9b35-11f0-0a80-017600136cca		20	\N	\N	\N
bd357069-5633-4910-b7bf-4924bdbf15d2	1.49 Панкреатический профиль птиц - NEW -(2ч.)	МойСклад	836.00	30		t	2025-09-27 04:31:57.422556	2025-09-27 05:15:47.917	b67fb931-9b35-11f0-0a80-017600136ccf		20	\N	\N	\N
2251c5be-e0d9-430c-a49b-6825ef4d35b8	1.50 Сердечно-сосудистый профиль птиц - NEW -(2ч.)	МойСклад	1430.00	30		t	2025-09-27 04:31:57.602574	2025-09-27 05:15:47.984	b68bdc9f-9b35-11f0-0a80-017600136cd9		20	\N	\N	\N
a4808a08-a7f2-43ce-b38a-1cafe150fd8f	2.1 Общий анализ крови(без  лейкоформулы)-(12ч.)	МойСклад	792.00	30		t	2025-09-27 04:31:57.689276	2025-09-27 05:15:48.02	b691d604-9b35-11f0-0a80-017600136cde		20	\N	\N	\N
caf706f8-0a6b-4276-bd2e-7b1c009b8c2e	2.1 Общий анализ крови(без  лейкоформулы)-(2ч.)	МойСклад	1078.00	30		t	2025-09-27 04:31:57.778966	2025-09-27 05:15:48.053	b6979358-9b35-11f0-0a80-017600136ce3		20	\N	\N	\N
9836cea3-af83-4615-a2f5-fd2c3275f8a1	2.2 Общий анализ крови полный(включая  лейкоформулу, считается вручную)-(12ч.)	МойСклад	946.00	30		t	2025-09-27 04:31:57.867034	2025-09-27 05:15:48.087	b69d823a-9b35-11f0-0a80-017600136ce8		20	\N	\N	\N
5e710330-db49-45d1-b7a5-daca9e6084fb	2.2 Общий анализ крови полный(включая  лейкоформулу, считается вручную)-(2ч.)	МойСклад	1364.00	30		t	2025-09-27 04:31:57.95495	2025-09-27 05:15:48.12	b6a3a36c-9b35-11f0-0a80-017600136ced		20	\N	\N	\N
9635baa4-367d-4e53-8f00-de136e4ccd90	2.3 Определение СОЭ -(12ч.)	МойСклад	506.00	30		t	2025-09-27 04:31:58.046241	2025-09-27 05:15:48.153	b6a8ddc3-9b35-11f0-0a80-017600136cf2		20	\N	\N	\N
228814cb-b94f-4f6c-b40b-a55bbbda5c52	2.3 Определение СОЭ -(2ч.)	МойСклад	638.00	30		t	2025-09-27 04:31:58.134581	2025-09-27 05:15:48.186	b6ae2ad0-9b35-11f0-0a80-017600136cf7		20	\N	\N	\N
6354503d-9f40-4271-84b0-3c7eff903adf	2.9 Общий анализ крови птиц (эритроциты, гемоглобин, тромбоциты, лейкоциты), включая лейкоформулу ( считается вручную) - NEW	МойСклад	1430.00	30		t	2025-09-27 04:31:58.220857	2025-09-27 05:15:48.22	b6b3e9da-9b35-11f0-0a80-017600136cfc		20	\N	\N	\N
183f467e-65b8-428b-81b9-2dedada000fc	8.1 Онкологический	МойСклад	3410.00	30		t	2025-09-27 04:31:58.308406	2025-09-27 05:15:48.254	b98fdb5c-9b35-11f0-0a80-01760013702e		20	\N	\N	\N
c88026a0-8d7b-495f-9b12-b15b4e28a258	8.2 Почечный-(12ч.)	МойСклад	2002.00	30		t	2025-09-27 04:31:58.394365	2025-09-27 05:15:48.288	b995fc7a-9b35-11f0-0a80-017600137033		20	\N	\N	\N
8b5c805d-2021-4b9a-91fe-88fa070d41c5	8.2 Почечный-(2ч.)	МойСклад	2684.00	30		t	2025-09-27 04:31:58.480668	2025-09-27 05:15:48.324	b99c0197-9b35-11f0-0a80-017600137038		20	\N	\N	\N
b3bfa053-fb2b-4ef5-91a1-812470104d32	8.3 Печеночный-(12ч.)	МойСклад	2530.00	30		t	2025-09-27 04:31:58.566976	2025-09-27 05:15:48.358	b9a2599d-9b35-11f0-0a80-01760013703d		20	\N	\N	\N
3b4b1ae1-5b12-4cda-b724-7db7812a9b9d	8.3 Печеночный-(2ч.)	МойСклад	3586.00	30		t	2025-09-27 04:31:58.652726	2025-09-27 05:15:48.391	b9a94e74-9b35-11f0-0a80-017600137042		20	\N	\N	\N
49af790a-5212-44e1-a434-5383c008c02a	8.4 Гастроэнтеральный-(12ч.)	МойСклад	3366.00	30		t	2025-09-27 04:31:58.739707	2025-09-27 05:15:48.427	b9af773a-9b35-11f0-0a80-017600137047		20	\N	\N	\N
dc82b18c-c708-4330-89dc-a31a23445823	8.4 Гастроэнтеральный-(2ч.)	МойСклад	4620.00	30		t	2025-09-27 04:31:58.824962	2025-09-27 05:15:48.46	b9bc3d34-9b35-11f0-0a80-01760013704c		20	\N	\N	\N
6de16286-297e-4609-9436-178b5003bd75	9.1 Транссудаты и экссудаты	МойСклад	2860.00	30		t	2025-09-27 04:31:58.915454	2025-09-27 05:15:48.495	b9c292d4-9b35-11f0-0a80-017600137051		20	\N	\N	\N
2c018dae-a87e-4a8d-bbb9-8579c4502912	3.1 Полная коагулограмма	МойСклад	2640.00	30		t	2025-09-27 04:31:59.004822	2025-09-27 05:15:48.529	b9c8fefb-9b35-11f0-0a80-017600137056		20	\N	\N	\N
8828a2b2-4f9d-4db6-a5df-1c51c10bab11	4.1 Эктопаразиты	МойСклад	616.00	30		t	2025-09-27 04:31:59.090023	2025-09-27 05:15:48.562	b9cf3262-9b35-11f0-0a80-01760013705b		20	\N	\N	\N
2dba96b3-ed05-470e-8438-584e32ccb778	4.2 Дерматофиты	МойСклад	616.00	30		t	2025-09-27 04:31:59.188536	2025-09-27 05:15:48.595	b9d59606-9b35-11f0-0a80-017600137060		20	\N	\N	\N
9f87dcc1-619a-40a9-9da7-48f11a1b6bc5	4.3 Бабезиоз (Пироплазмоз)	МойСклад	616.00	30		t	2025-09-27 04:31:59.273888	2025-09-27 05:15:48.629	b9dbf64a-9b35-11f0-0a80-017600137065		20	\N	\N	\N
e196eb52-d57e-4285-bc21-f80013d859d3	4.4 Дирофиляриоз (метод Кнотта)	МойСклад	616.00	30		t	2025-09-27 04:31:59.357976	2025-09-27 05:15:48.662	b9e269d2-9b35-11f0-0a80-01760013706a		20	\N	\N	\N
cea0e4ca-2f0a-4a69-82db-db24d21f9527	4.5 Мазок-отпечаток с кожи	МойСклад	1210.00	30		t	2025-09-27 04:31:59.446966	2025-09-27 05:15:48.695	b9e97e54-9b35-11f0-0a80-01760013706f		20	\N	\N	\N
51e8475f-55be-4bf8-8cca-d9ece8383836	4.6 Мазок/соскоб  из уха	МойСклад	1210.00	30		t	2025-09-27 04:31:59.530809	2025-09-27 05:15:48.728	b9efc220-9b35-11f0-0a80-017600137074		20	\N	\N	\N
180e27fc-78d6-4b16-956e-45158430aaba	5.1 Полная биохимия мочи (13 показателей)	МойСклад	1870.00	30		t	2025-09-27 04:31:59.617416	2025-09-27 05:15:48.761	b9f5ce9a-9b35-11f0-0a80-017600137079		20	\N	\N	\N
60ae0cf5-e815-4dda-bdbd-b721859dd08f	5.2-5.9 Один биохимический показатель из списка	МойСклад	154.00	30		t	2025-09-27 04:31:59.7034	2025-09-27 05:15:48.795	b9fca23c-9b35-11f0-0a80-01760013707e		20	\N	\N	\N
81ee022b-6cac-4a9c-9a9f-4e375c310567	5.10 Микроальбумин	МойСклад	550.00	30		t	2025-09-27 04:31:59.789065	2025-09-27 05:15:48.827	ba0336e8-9b35-11f0-0a80-017600137083		20	\N	\N	\N
cd6af1be-d32b-4b8b-a120-3085c26532c6	6.1 Рак мочеполовой системы	МойСклад	2178.00	30		t	2025-09-27 04:31:59.876101	2025-09-27 05:15:48.86	ba0a53f0-9b35-11f0-0a80-017600137088		20	\N	\N	\N
4ee3efe8-29eb-4da3-b283-a878c0209daf	6.2 Общий клинический анализ мочи	МойСклад	638.00	30		t	2025-09-27 04:31:59.96882	2025-09-27 05:15:48.893	ba110b25-9b35-11f0-0a80-01760013708d		20	\N	\N	\N
6ef6f84c-1384-43d9-8c67-32d16a71bf7b	6.3 Соотношение белок/креатинин в моче	МойСклад	660.00	30		t	2025-09-27 04:32:00.053827	2025-09-27 05:15:48.926	ba17ecd1-9b35-11f0-0a80-017600137092		20	\N	\N	\N
2136241a-afe2-444f-9018-ffc12bede0ca	6.4 Исследование конкрементов (уролитов)	МойСклад	638.00	30		t	2025-09-27 04:32:00.140593	2025-09-27 05:15:48.961	ba1ebf35-9b35-11f0-0a80-017600137097		20	\N	\N	\N
2dd06e4c-9e3f-467d-b2d8-1482f96bf291	6.5 Определение стадии полового цикла	МойСклад	1364.00	30		t	2025-09-27 04:32:00.23073	2025-09-27 05:15:48.994	ba25a755-9b35-11f0-0a80-01760013709c		20	\N	\N	\N
6e65c42d-cc64-4a8e-acb2-6af06b1fb1a8	7.1 Общий анализ кала (Копрограмма)	МойСклад	968.00	30		t	2025-09-27 04:32:00.328116	2025-09-27 05:15:49.027	ba2c080a-9b35-11f0-0a80-0176001370a1		20	\N	\N	\N
0d6a0b55-f68a-4f8d-9d0c-b18bfbefc716	7.3 Яйца гельминтов и цисты простейших	МойСклад	616.00	30		t	2025-09-27 04:32:00.511561	2025-09-27 05:15:49.093	ba39f852-9b35-11f0-0a80-0176001370ab		20	\N	\N	\N
60475f43-c216-4f0a-8f1d-b24382e220e3	7.4 Определение вида гельминта	МойСклад	616.00	30		t	2025-09-27 04:32:00.596692	2025-09-27 05:15:49.126	ba40fc2c-9b35-11f0-0a80-0176001370b0		20	\N	\N	\N
1008d1a9-cb85-4af4-a3c2-d64c9996b7f3	9.2 Биохимическое исследование транссудатов и экссудатов	МойСклад	990.00	30		t	2025-09-27 04:32:00.688985	2025-09-27 05:15:49.16	ba47b8b7-9b35-11f0-0a80-0176001370b5		20	\N	\N	\N
cfcad38f-bd9e-4c68-bc98-6848d0c81727	9.3 Исследование спинномозговой жидкости	МойСклад	2310.00	30		t	2025-09-27 04:32:00.77397	2025-09-27 05:15:49.193	ba4efe28-9b35-11f0-0a80-0176001370ba		20	\N	\N	\N
de428a9a-9bc9-432e-9a13-a95c0a6ccb77	9.4 Цитология	МойСклад	1936.00	30		t	2025-09-27 04:32:00.860673	2025-09-27 05:15:49.226	ba562511-9b35-11f0-0a80-0176001370bf		20	\N	\N	\N
2b72a044-fde6-4074-a8bb-1317d6e48f17	9.5 Цитология - CITO - NEW	МойСклад	3872.00	30		t	2025-09-27 04:32:00.944917	2025-09-27 05:15:49.259	ba5c67e2-9b35-11f0-0a80-0176001370c4		20	\N	\N	\N
a3deb6ec-11a4-4134-922a-cc68430ca2dc	9.6 Цитология (окраска по Циль-Нильсену)	МойСклад	1870.00	30		t	2025-09-27 04:32:01.037932	2025-09-27 05:15:49.296	ba629dcb-9b35-11f0-0a80-0176001370c9		20	\N	\N	\N
9f2390b4-1424-4413-9b32-b6ef979666f6	9.7 Цитология крови	МойСклад	1540.00	30		t	2025-09-27 04:32:01.129135	2025-09-27 05:15:49.33	ba68d855-9b35-11f0-0a80-0176001370ce		20	\N	\N	\N
0cb5b977-81c5-4ed6-95b9-54757c1a0f45	9.8 Гистология (одно исследование)	МойСклад	4840.00	30		t	2025-09-27 04:32:01.220839	2025-09-27 05:15:49.362	ba6eda3d-9b35-11f0-0a80-0176001370d3		20	\N	\N	\N
f7882312-3d12-4a73-9b27-b781f9553ce6	9.9 Определение краев резекции *1	МойСклад	4840.00	30		t	2025-09-27 04:32:01.308302	2025-09-27 05:15:49.395	ba74ddbc-9b35-11f0-0a80-0176001370d8		20	\N	\N	\N
94aa771c-6ba9-4db7-bc1f-257a62c369f0	9.10 Иммуногистохимия, 6 антител	МойСклад	18040.00	30		t	2025-09-27 04:32:01.399284	2025-09-27 05:15:49.428	ba7b1340-9b35-11f0-0a80-0176001370dd		20	\N	\N	\N
43ead0a1-3a41-40eb-a568-af90111e6738	9.11 Иммуногистохимия, 4 антитела	МойСклад	12100.00	30		t	2025-09-27 04:32:01.485676	2025-09-27 05:15:49.462	ba820c2d-9b35-11f0-0a80-0176001370e2		20	\N	\N	\N
274a5c56-336f-43b7-86c7-26842b7e9198	9.12 Иммуногистохимия, 2 антитела	МойСклад	6160.00	30		t	2025-09-27 04:32:01.570524	2025-09-27 05:15:49.495	ba88f314-9b35-11f0-0a80-0176001370e7		20	\N	\N	\N
17807c02-e855-4125-b196-69a69a6fdd99	9.13 Иммуногистохимия	МойСклад	3190.00	30		t	2025-09-27 04:32:01.655073	2025-09-27 05:15:49.528	ba8fdd8c-9b35-11f0-0a80-0176001370ec		20	\N	\N	\N
57e34a52-c398-4f89-afa8-2c49b4e5407d	9.14 Комплексное гистологическое исследование сарком	МойСклад	19470.00	30		t	2025-09-27 04:32:01.747705	2025-09-27 05:15:49.561	ba969602-9b35-11f0-0a80-0176001370f1		20	\N	\N	\N
1c01a9d0-3d37-4a86-a535-5f8584c53d9a	9.15 Комплексное гистологическое исследование лимфом	МойСклад	18920.00	30		t	2025-09-27 04:32:01.830437	2025-09-27 05:15:49.598	ba9cedb4-9b35-11f0-0a80-0176001370f6		20	\N	\N	\N
cf52ff63-06df-434d-a2be-f4eccd14032b	9.16 Гистология	МойСклад	2860.00	30		t	2025-09-27 04:32:01.919682	2025-09-27 05:15:49.631	baa29154-9b35-11f0-0a80-0176001370fb		20	\N	\N	\N
d14343c6-699a-4e0b-9214-d1c7e9dca7e4	9.17 Исследование костного мозга	МойСклад	12210.00	30		t	2025-09-27 04:32:02.003607	2025-09-27 05:15:49.664	baa8234b-9b35-11f0-0a80-017600137100		20	\N	\N	\N
8e34b797-fabb-4f76-a6bc-4e04289a8993	Абдоминоцентез	МойСклад	2549.00	30	Абдоминоцентез	t	2025-09-27 04:32:02.091857	2025-09-27 05:15:49.697	bf18ade9-9b35-11f0-0a80-0176001376d4		20	\N	\N	\N
31ca0afc-a32b-4e45-b7b7-9baf55851302	+1 час операции 1 категории, более 30 кг.	МойСклад	12226.00	30	+1 час операции 1 категории, более 30 кг.	t	2025-09-27 04:32:02.185561	2025-09-27 05:15:49.73	bf1b8f42-9b35-11f0-0a80-0176001376d8		20	\N	\N	\N
b3711ca4-19e0-4dd4-8e9e-838549e5ab77	Ампутация конечности, от 11 до 30 кг	МойСклад	48897.00	30	Ампутация конечности, от 11 до 30 кг	t	2025-09-27 04:32:02.271706	2025-09-27 05:15:49.764	bf1e7049-9b35-11f0-0a80-0176001376dc		20	\N	\N	\N
1210fdca-e96e-419f-9f3f-1f3d67fd20c9	Ампутация конечности, более 30 кг	МойСклад	57046.00	30	Ампутация конечности, более 30 кг	t	2025-09-27 04:32:02.361499	2025-09-27 05:15:49.797	bf2158fb-9b35-11f0-0a80-0176001376e0		20	\N	\N	\N
3ec57b98-cf13-4d21-92e0-5daf41485b0d	+1 час операции 1 категории, от 11 до 30 кг.	МойСклад	8151.00	30	+1 час операции 1 категории, от 11 до 30 кг.	t	2025-09-27 04:32:02.455592	2025-09-27 05:15:49.83	bf242903-9b35-11f0-0a80-0176001376e4		20	\N	\N	\N
cdf3e9d6-4465-4647-bad9-ed7bb02b5de3	+1 час операции 1 категории, от 1 до 10 .	МойСклад	4077.00	30	+1 час операции 1 категории, от 1 до 10 .	t	2025-09-27 04:32:02.539031	2025-09-27 05:15:49.863	bf2768e7-9b35-11f0-0a80-0176001376e8		20	\N	\N	\N
016960c0-5900-46e6-92bf-e1e4774bb9c4	Адреналэктомия — 1 категории  Операция по удалению надпочечника (всё включено, кроме: анализов, обследований)	МойСклад	36603.00	30	Адреналэктомия — 1 категории  Операция по удалению надпочечника (всё включено, кроме: анализов, обследований)	t	2025-09-27 04:32:02.709957	2025-09-27 05:15:49.929	bf2d8d4a-9b35-11f0-0a80-0176001376f0		20	\N	\N	\N
09245d59-f29b-4984-84e7-b6a72615e7ea	Адреналэктомия — 2 категории  Операция по удалению надпочечника с инвазией в кровеносные сосуды	МойСклад	58564.00	30	Адреналэктомия — 2 категории  Операция по удалению надпочечника с инвазией в кровеносные сосуды	t	2025-09-27 04:32:02.794243	2025-09-27 05:15:49.962	bf307b6c-9b35-11f0-0a80-0176001376f4		20	\N	\N	\N
fc54d018-fea3-444b-bd26-7674fc66efa9	Ампутация конечности, от 1 до 10 кг;	МойСклад	40748.00	30	Ампутация конечности, от 1 до 10 кг;	t	2025-09-27 04:32:02.877123	2025-09-27 05:15:49.995	bf331f16-9b35-11f0-0a80-0176001376f8		20	\N	\N	\N
dd78007c-cbf0-4c6f-8ea1-2ae50206fa9c	Общий клинический осмотр	МойСклад	0.00	30	Полный осмотр животного с проверкой всех систем организма	t	2025-09-27 04:30:44.091808	2025-09-27 05:15:16.798	6ec7a18c-9b4b-11f0-0a80-0863002e82f5		20	\N	\N	\N
89fe0c1f-6bf9-404f-8f31-2b5a22d33c98	IDEXX анализ электролитов и газов крови (12 показателей)	МойСклад	1210.00	30	IDEXX анализ электролитов и газов крови (12 показателей)	t	2025-09-27 04:30:44.639651	2025-09-27 05:15:17.092	7ec1a20a-9b35-11f0-0a80-0176001334f4		20	\N	\N	\N
d11a6264-295c-449a-a8a9-9ffae1a242f0	Биохимическое исследование 1 показатель (Na)	МойСклад	230.00	30	Биохимическое исследование 1 показатель (Na)	t	2025-09-27 04:30:45.597819	2025-09-27 05:15:17.565	7eed1979-9b35-11f0-0a80-017600133536		20	\N	\N	\N
a4b9149f-2ac1-431d-bec5-7434043d6681	Посев на бактериальную микрофлору и грибы с определением чувствительности к антиб. и антимикот.	МойСклад	2449.00	30	Посев на бактериальную микрофлору и грибы с определением чувствительности к антиб. и антимикот.	t	2025-09-27 04:30:45.880361	2025-09-27 05:15:17.699	7ef763ee-9b35-11f0-0a80-017600133546		20	\N	\N	\N
c41b5c3f-00df-4ed7-8120-3dc9f2716e60	IDEXX Тест-система Snap для определения специфической панкреатической липазы у собак (Canine cPL) (экспресс)	МойСклад	2816.00	30	IDEXX Тест-система Snap для определения специфической панкреатической липазы у собак (Canine cPL) (экспресс)	t	2025-09-27 04:30:47.458878	2025-09-27 05:15:18.527	7fbea786-9b35-11f0-0a80-01760013365e		20	\N	\N	\N
5f1c2d78-45bd-4cae-a74f-b026d833684d	AN137ОБС Стандартный для кошек (АЛТ, альбумин, альбумин/глобулин соотношение, АСТ, белок общий, билирубин общий, ГГТ, глюкоза, кальций, креатинин, мочевина, фосфор, ЩФ + фруктозамин) 14	МойСклад	2739.00	30		t	2025-09-27 04:30:49.194572	2025-09-27 05:15:19.363	9da2568c-9b35-11f0-0a80-0176001358ce		20	\N	\N	\N
e6e41a2b-cdd3-4115-85cb-5690e086f6b6	AN12ОБС Неврологический профиль первичный (АЛТ, альбумин,  альбумин/глобулин соотношение, АСТ, белок общий, билирубин общий, глюкоза, желчные кислоты (проба натощак), калий, кальций, креатинин, магний, мочевина, натрий, Na/K соотношение, триглицериды	МойСклад	3783.00	30		t	2025-09-27 04:30:49.402522	2025-09-27 05:15:19.465	9db3806b-9b35-11f0-0a80-0176001358dd		20	\N	\N	\N
c7fc99b1-8b91-44b2-a60a-675c765fdb34	AN1040MT - Комплексное токсикологическое исследование (Микроэлементы и тяжелые металлы: Li, B, Na, Mg, Al, Be, K, Ca, P, Cr, Mn, Fe, Co, Ni, Cu, Zn, Ga, Ge, As, Se, Rb, Sr, Zr, Nb, Mo, Ag, Cd, Sn, Sb, Te, Cs, Ba, Ce, Pr, Sm, W, Hg, Tl, Pb, U, 40 пока	МойСклад	2007.00	30		t	2025-09-27 04:30:50.950462	2025-09-27 05:15:20.197	9e310447-9b35-11f0-0a80-01760013594b		20	\N	\N	\N
dacdcd1a-6c11-419e-90d3-019f8afc4e10	AN134ОБС Джек Рассел/Парсон Рассел Терьер  расширенный. Первичный вывих хрусталика (PLL), Поздняя мозжечковая атаксия (LOA), Спиноцеребеллярная атаксия с миокимией и/или судорогам (SCA)	МойСклад	9555.00	30		t	2025-09-27 04:30:51.795688	2025-09-27 05:15:20.599	9e74eb54-9b35-11f0-0a80-017600135987		20	\N	\N	\N
f47205c5-6213-4e32-97d6-371f219e4deb	AN19ОБС Коагулограмма (АЧТВ, протромбиновое время, тромбиновое время, фибриноген)	МойСклад	1622.00	30		t	2025-09-27 04:30:53.067936	2025-09-27 05:15:21.178	9ee0faa5-9b35-11f0-0a80-0176001359e1		20	\N	\N	\N
55450e3f-b8b4-4e9e-8bf8-13881e8541ff	AN20ОБС Комплексное паразитологическое исследование (флотация + Лямблиоз (Giardia lamblia spp.) (ПЦР) + Криптоспоридиоз (Cryptosporidium spp.) (ПЦР))	МойСклад	2352.00	30		t	2025-09-27 04:30:54.342826	2025-09-27 05:15:21.758	9f572fa5-9b35-11f0-0a80-017600135a3b		20	\N	\N	\N
41b293c2-73d5-41aa-839a-90c40da9abbf	AN217ОБС Желудочно-кишечный расширенный профиль собак  (парвовирус собак (CPV 2), коронавирус собак энтеральный  (CCoV 1), аденовирус 1 типа (CAV 1), вирус чумы плотоядных (CDV), гиардиа (Giardia spp.), криптоспоридии (Cryptosporidium spp.)), ротавир	МойСклад	10196.00	30		t	2025-09-27 04:30:55.059161	2025-09-27 05:15:22.095	9f973f60-9b35-11f0-0a80-017600135a6d		20	\N	\N	\N
1fd2dac0-4ba6-4571-86ea-1de968f0cefd	AN178ОБС Австралийская овчарка  (аусси). Аномалия глаз колли (CEA),  Дегенеративная миелопатия (DM Ex2), Наследственная катаракта (HC), Нейрональный цероидный липофусциноз 6-го типа (NCL6), Прогрессирующая атрофия сетчатки PRA-prcd, Чувствительность	МойСклад	17951.00	30		t	2025-09-27 04:30:55.490547	2025-09-27 05:15:22.296	9fbe3a2a-9b35-11f0-0a80-017600135a8b		20	\N	\N	\N
9a530544-fd47-426f-a36d-fc3c6ce4cf92	Ампутация пораженного опухолью пальца — собаки (всё включено, кроме: анализов, обследований)	МойСклад	29430.00	30	Ампутация пораженного опухолью пальца — собаки (всё включено, кроме: анализов, обследований)	t	2025-09-27 04:32:03.05401	2025-09-27 05:15:50.061	bf388578-9b35-11f0-0a80-017600137700		20	\N	\N	\N
bf2250dd-f4ec-4297-bb00-adc30a175cda	Ампутация рудиментарных пальцев у взрослых  (всё включено,кроме анализов и обследований)	МойСклад	5910.00	30	Ампутация рудиментарных пальцев у взрослых  (всё включено,кроме анализов и обследований)	t	2025-09-27 04:32:03.144297	2025-09-27 05:15:50.094	c02aa756-9b35-11f0-0a80-0176001377cd		20	\N	\N	\N
139b986a-13ca-4dae-909f-790cbc276726	Внутривенная установка катетера 1 кат-я.	МойСклад	1113.00	30	Внутривенная установка катетера 1 кат-я.	t	2025-09-27 04:32:03.245543	2025-09-27 05:15:50.127	c0d032fd-9b35-11f0-0a80-017600137895		20	\N	\N	\N
8a0a092f-8551-421a-a704-a836df5087fb	Взятие материала ( смыв).	МойСклад	593.00	30	Взятие материала ( смыв).	t	2025-09-27 04:32:03.332933	2025-09-27 05:15:50.16	c0d4470c-9b35-11f0-0a80-017600137899		20	\N	\N	\N
b19038d1-37df-4596-b5be-e63f81e13c35	AN185ОБС Бигль расширенный. Гипокаталазия, акаталазия (CAT), Мальабсорбция кишечного кобаламина, синдром Имерслунд-Гресбека биглей (IGS B, ICM B), Мозжечковая абиотрофия (NCCD), Недостаточность фактора VII (FVIID), Несовершенный остеогенез биглей (OI	МойСклад	17951.00	30		t	2025-09-27 04:30:56.223863	2025-09-27 05:15:22.638	9fff208b-9b35-11f0-0a80-017600135abd		20	\N	\N	\N
551bb6d0-ad8d-4a86-a48a-a90033c1d8f6	AN195ОБС Лабрадор ретривер расширенный. Ахроматопсия (дневная слепота, ACHM), Дефицит пируваткиназы (PKdef), Коллапс, вызываемый физическими нагрузками (EIC), Миотубулярная миопатия (MTM1, XL-MTM), Нарколепсия лабрадоров (NARC-lab), Наследственный но	МойСклад	27284.00	30		t	2025-09-27 04:30:57.33068	2025-09-27 05:15:23.137	a05b15e4-9b35-11f0-0a80-017600135b08		20	\N	\N	\N
58861c0e-9719-4aba-b186-e34d8fd9fe21	AN199ОБС Пудель общий. Болезнь фон Виллебранда I-го типа (vWD type I), Дегенеративная миелопатия (DM Ex2), Прогрессирующая атрофия сетчатки (PRA-prcd)	МойСклад	9555.00	30		t	2025-09-27 04:30:57.68624	2025-09-27 05:15:23.269	a072bcc0-9b35-11f0-0a80-017600135b1c		20	\N	\N	\N
fb1b2b00-96b8-44be-9ee6-af0e5c8b19fe	AN204ОБС Самоедская собака. Дегенеративная миелопатия (DM Ex2), Наследственный нефрит (HN), Несовершенный амелогенез, Наследственная гипоплазия эмали самоеда (ARAIS), Прогрессирующая атрофия сетчатки XL-PRA1 (XL-PRA1), Чувствительность к лекарственны	МойСклад	15344.00	30		t	2025-09-27 04:30:58.265059	2025-09-27 05:15:23.535	a09f34cc-9b35-11f0-0a80-017600135b44		20	\N	\N	\N
418f5ed8-7e00-44de-9cac-792058604d3f	AN212ОБС Шипперке. Локус K (доминантный черный), Мукополисахаридоз IIIB типа (MPS IIIB)	МойСклад	6514.00	30		t	2025-09-27 04:30:58.916008	2025-09-27 05:15:23.852	a0d373c0-9b35-11f0-0a80-017600135b71		20	\N	\N	\N
bdca4bdf-08f6-4ff8-83d2-4e64e8eb2a17	AN214ОБС Абиссинская кошка / Сомали расширенный. Группа крови кошек, Дефицит пируваткиназы (PKDef), Прогрессирующая атрофия сетчатки rdAc (PRA-rdAc), Прогрессирующая атрофия сетчатки Rdy (PRA-Rdy)	МойСклад	7821.00	30		t	2025-09-27 04:30:59.207175	2025-09-27 05:15:23.986	a0eb0006-9b35-11f0-0a80-017600135b85		20	\N	\N	\N
1a56760d-86a2-4082-b491-73e32c0d700c	AN303КР Бабезиоз (пироплазмоз) (Babesia spp.) (ПЦР)	МойСклад	849.00	30		t	2025-09-27 04:31:00.953904	2025-09-27 05:15:24.785	a2b91404-9b35-11f0-0a80-017600135cc6		20	\N	\N	\N
896ac599-2c49-4fef-b4ab-f259a23f030a	AN318ФК Парвовирусный энтерит (Canine рarvovirus) (ПЦР)	МойСклад	832.00	30		t	2025-09-27 04:31:03.048453	2025-09-27 05:15:25.719	a35dc171-9b35-11f0-0a80-017600135d52		20	\N	\N	\N
0e318978-6313-4f02-994d-2abae2e5bc7d	AN323БАЛ Хламидиоз (Chlamydia spp.) (ПЦР)	МойСклад	766.00	30		t	2025-09-27 04:31:03.710116	2025-09-27 05:15:26.023	a39805f5-9b35-11f0-0a80-017600135d7f		20	\N	\N	\N
b4781ac3-4eaa-429a-9993-a2fdfa26ad23	AN2ОБС Оптимальный (АЛТ, АСТ, альбумин, белок общий, альбумин/глобулин соотношение, билирубин общий, ГГТ, глюкоза, мочевина, креатинин, ЩФ) 11	МойСклад	1366.00	30		t	2025-09-27 04:31:05.038327	2025-09-27 05:15:26.62	a400ec32-9b35-11f0-0a80-017600135dd9		20	\N	\N	\N
6971bd20-d0f0-4726-817f-5e614c534b19	AN328ГЛЗ Герпесвирус кошек (инфекционный ринотрахеит, ИРТ) (Feline herpesvirus) (ПЦР)	МойСклад	741.00	30		t	2025-09-27 04:31:05.99092	2025-09-27 05:15:27.052	a44b0120-9b35-11f0-0a80-017600135e1a		20	\N	\N	\N
903ecf8d-aca8-438c-bdd0-f38675c31461	AN26ОБС Респираторный малый профиль (бордетелла (вordetella bronchiseptica), герпесвирус кошек (FHV-1), калицивирус (FCV))	МойСклад	2263.00	30		t	2025-09-27 04:31:06.367791	2025-09-27 05:15:27.217	a46a64b3-9b35-11f0-0a80-017600135e33		20	\N	\N	\N
ec2f8df1-6ad6-4cc4-a27f-2cedc60d94fb	AN333БТК Бруцеллез (ПЦР)	МойСклад	1119.00	30		t	2025-09-27 04:31:08.3223	2025-09-27 05:15:28.08	a504a88e-9b35-11f0-0a80-017600135eb5		20	\N	\N	\N
6e70aa13-ac89-4c65-a701-dbe1e1b35cca	AN372БАЛ Микобактериоз (Mycobacterium tuberculosis complex) (ПЦР)	МойСклад	1177.00	30		t	2025-09-27 04:31:09.233234	2025-09-27 05:15:28.476	a547bb24-9b35-11f0-0a80-017600135ef1		20	\N	\N	\N
e2b75091-7667-4fca-85ce-16a1a8534cb0	AN3ОБС Стандартный (АЛТ, альбумин, альбумин/глобулин соотношение, АСТ, белок общий, билирубин общий, ГГТ, глюкоза,  калий, кальций, креатинин, мочевина, натрий, фосфор, ЩФ, хлор) 16	МойСклад	1990.00	30		t	2025-09-27 04:31:10.854795	2025-09-27 05:15:29.175	a5c593f7-9b35-11f0-0a80-017600135f5a		20	\N	\N	\N
b605eea3-9fd8-4db9-8dd0-c4e54509fb73	AN408ЦИТ Вагинальная цитология (определение фазы эстрального цикла)	МойСклад	1144.00	30		t	2025-09-27 04:31:10.931738	2025-09-27 05:15:29.208	a5cb888e-9b35-11f0-0a80-017600135f5f		20	\N	\N	\N
e1c8b599-5b5c-4e66-ab91-0fc56808a835	AN441-А Посев мочи на микрофлору с определением чувствительности к антимикробным препаратам  (основной перечень антибиотиков)	МойСклад	1967.00	30		t	2025-09-27 04:31:11.994724	2025-09-27 05:15:29.671	a619846d-9b35-11f0-0a80-017600135fa5		20	\N	\N	\N
07164546-a671-41c3-b15c-7b22615c0c27	AN467-М Посев отделяемого верхних дыхательных путей на микрофлору с определением чувствительности к антимикробным препаратам (определение минимальной ингибирующей концентрации антибиотика)	МойСклад	3355.00	30		t	2025-09-27 04:31:12.828045	2025-09-27 05:15:30.039	a65c16db-9b35-11f0-0a80-017600135fdc		20	\N	\N	\N
12030c64-b64e-48d5-abd5-12ea3ac50239	AN41ОБС Восточноевропейская овчарка/Белая швейцарская овчарка/Немецкая овчарка.    Дегенеративная миелопатия (DM Ex2), Злокачественная гипертермия (MH), Чувствительность к лекарственным препаратам (MDR 1)	МойСклад	9555.00	30		t	2025-09-27 04:31:14.282954	2025-09-27 05:15:30.683	a6c8d578-9b35-11f0-0a80-01760013603b		20	\N	\N	\N
5424ea3d-6527-4666-8712-dfeec4294752	AN5ОБС Максимальный (АЛТ, альбумин, альбумин/глобулин соотношение, амилаза, АСТ, белок общий, билирубин общий, билирубин прямой, ГГТ, глюкоза, железо, калий, кальций, креатинин, КФК, ЛДГ, липаза, магний, мочевина, натрий, триглицериды, фосфор, хлор,	МойСклад	3421.00	30		t	2025-09-27 04:31:15.209653	2025-09-27 05:15:31.079	a81ef34a-9b35-11f0-0a80-01760013613f		20	\N	\N	\N
5319a699-6b38-49c1-9d83-0c502cbbb1c8	AN475-Р Посев желчи на микрофлору с определением чувствительности к антимикробным препаратам (дополнительный перечень антибиотиков)	МойСклад	3825.00	30		t	2025-09-27 04:31:16.290876	2025-09-27 05:15:31.542	a86b431e-9b35-11f0-0a80-017600136185		20	\N	\N	\N
48a9f89a-7698-47b7-a138-0d32cc78f595	AN477-Р Посев пункционной или аспирационной жидкости  на микрофлору с определением чувствительности к антимикробным препаратам  (дополнительный перечень антибиотиков)	МойСклад	3258.00	30		t	2025-09-27 04:31:16.519878	2025-09-27 05:15:31.641	a87c2aca-9b35-11f0-0a80-017600136194		20	\N	\N	\N
ab2e48cd-66da-4a99-b7b5-4cd95bdf32d8	AN518ГИИ Изготовление препарата до стекла с окрашиванием (до 6 блоков, до 6 стекол)	МойСклад	3027.00	30		t	2025-09-27 04:31:17.90806	2025-09-27 05:15:32.21	a8f7a617-9b35-11f0-0a80-0176001361ee		20	\N	\N	\N
20438c2f-6c58-4cc4-b9f6-c19271b0910a	AN503 Гистологическое заключение патолога (Европа, США, Канада) (приготовление препарата до 2 блоков, до 2 стекол + сканирование стекол + описательная часть)	МойСклад	10262.00	30		t	2025-09-27 04:31:18.063969	2025-09-27 05:15:32.306	a907b8c2-9b35-11f0-0a80-0176001361f8		20	\N	\N	\N
8d0fb420-5c51-4d41-982a-b1ce952fdcbd	AN6000NP - Комплексное токсикологическое исследование (наркотические и психоактивные вещества, более 6000 веществ)	МойСклад	2007.00	30		t	2025-09-27 04:31:19.872197	2025-09-27 05:15:33.041	a9a258fa-9b35-11f0-0a80-01760013626b		20	\N	\N	\N
3f6b68d6-2d10-40cc-9653-14317bb4f746	AN7009ШЕР Исследование генетики длины шерсти собак (мутация p.C95F (c.284G>T) (доминантная короткошерстность).  Породы:     Австралийская овчарка (Аусси), Австралийский шелковистый терьер, Аляскинский кли-кай, Аляскинский маламут, Аппенцеллер зенненх	МойСклад	3331.00	30		t	2025-09-27 04:31:20.422636	2025-09-27 05:15:33.264	a9cc3a60-9b35-11f0-0a80-01760013628e		20	\N	\N	\N
c5edbe2b-9318-4131-93b6-18ac5687b9a6	AN48ОБС Кокер спаниель.   Гиперурикозурия, Дегенеративная миелопатия (DM Ex2), Недостаточность фосфофруктокиназы, Прогрессирующая атрофия сетчатки PRA-prcd	МойСклад	12524.00	30		t	2025-09-27 04:31:21.635164	2025-09-27 05:15:33.741	aa1d772b-9b35-11f0-0a80-0176001362d9		20	\N	\N	\N
6fbf0ea7-56d6-49e2-9cb2-7aa74a04cfd5	AN50ОБС Лабрадор ретривер.  Коллапс, вызываемый физическими нагрузками (EIC), Наследственный носовой паракератоз ретриверов (HNPK), Прогрессирующая атрофия сетчатки PRA-prcd, Центроядерная миопатия (CNM)	МойСклад	12524.00	30		t	2025-09-27 04:31:21.800899	2025-09-27 05:15:33.805	aa281b64-9b35-11f0-0a80-0176001362e3		20	\N	\N	\N
cf03e50e-e0ae-48ba-adea-9679f920383e	AN7085FUR Длина шерсти на морде (furnishings). Породы: Австралийский лабрадудль (Коббердог), Брюссельский грифон, Венгерская выжла, Гаванский бишон (Хаванез), Гаванская болонка, Голдендудль, Джек-рассел-терьер, Дратхаар, Ирландский мягкошёрстный пшен	МойСклад	3331.00	30		t	2025-09-27 04:31:23.418896	2025-09-27 05:15:34.407	aa8dd740-9b35-11f0-0a80-017600136342		20	\N	\N	\N
36795eba-2b4f-4ba1-8dee-04379fa169cd	AN7025MYC Мукополисахаридоз IIIB типа (Mucopolysaccharidosis type IIIB, MPS-IIIB). Породы: шипперке.	МойСклад	3331.00	30		t	2025-09-27 04:31:25.194014	2025-09-27 05:15:35.109	ab0b3df6-9b35-11f0-0a80-0176001363b0		20	\N	\N	\N
b69e6d2d-efd3-44e3-bfea-f480b3b20e32	AN7026CMR1 Мультифокальная ретинопатия (Canine Multifocal Retinopathy 1, CMR1).  Породы: Австралийская овчарка (Аусси), Американский бульдог, Английский бульдог, Мастиф и родственные ему породы, Бурбуль, Канарский дог, Кане-корсо, Пиренейская горная	МойСклад	3331.00	30		t	2025-09-27 04:31:25.277361	2025-09-27 05:15:35.142	ab1081bd-9b35-11f0-0a80-0176001363b5		20	\N	\N	\N
8aa6549e-c318-43cf-9a90-b44877ff084d	AN7039PRAP Прогрессирующая атрофия сетчатки (Progressive Retinal Atrophy, PRA-prcd (Progressive Rod-Cone Degeneration)).      Породы: Австралийская овчарка (Аусси), Австралийский лабрадудль (Коббердог), Австралийская короткохвостая пастушья собака, А	МойСклад	3331.00	30		t	2025-09-27 04:31:26.857478	2025-09-27 05:15:35.75	ab769c62-9b35-11f0-0a80-017600136414		20	\N	\N	\N
5c3063cd-2eb1-479d-84a8-ea2f3ff9e218	AN7057ГС Локус C (колорпоинт): cb (бурманский); сs (сиамский) Породы: все.	МойСклад	2468.00	30		t	2025-09-27 04:31:28.604852	2025-09-27 05:15:36.423	abf26a7f-9b35-11f0-0a80-01760013647d		20	\N	\N	\N
397efab0-9f62-4526-93f0-e375ac9dc131	AN7115GW Доминантный белый и белая пятнистость, локус W:  N (отсутствие доминантного белого и белой пятнистости); W (доминантный белый); Ws (белая пятнистость). Аутосомно-доминантный тип наследования Породы: все.	МойСклад	2468.00	30		t	2025-09-27 04:31:28.920681	2025-09-27 05:15:36.557	ac0e8410-9b35-11f0-0a80-017600136491		20	\N	\N	\N
0394b138-0d71-4ff0-b13f-0a267ffddfd2	AN7068PRAR Прогрессирующая атрофия сетчатки rdAc (PRA rdAc) Породы: Абиссинская, Американская короткошерстная, Американский керл (длинношерстная и короткошерстная), Американский ваерхаер, Балийская (балинезийская, балинез), Бенгальская, Короткошерстн	МойСклад	2468.00	30		t	2025-09-27 04:31:30.373806	2025-09-27 05:15:37.173	ac7883d7-9b35-11f0-0a80-0176001364eb		20	\N	\N	\N
6b419f8d-2dae-40fc-a207-0f4615028f9e	AN7202GMTP Ганглиозидоз 2 той-пуделей (GM2-TP) Породы: Той-пудель	МойСклад	3331.00	30		t	2025-09-27 04:31:32.500911	2025-09-27 05:15:38.09	ae34e481-9b35-11f0-0a80-017600136635		20	\N	\N	\N
bb0b8e51-6229-4191-b545-02d25d9c5981	AN7212LEMR Лейкоэнцефаломиелопатия немецких догов и ротвейлеров (LEMP R) Породы: Немецкий дог, Ротвейлер	МойСклад	3331.00	30		t	2025-09-27 04:31:33.724446	2025-09-27 05:15:38.589	ae8fc127-9b35-11f0-0a80-017600136680		20	\N	\N	\N
60361279-a36b-4749-afe6-96947ad14700	AN7217CMR2 Мультифокальная ретинопатия 2 типа (CMR2) Породы: Котон-де-тулеар	МойСклад	3331.00	30		t	2025-09-27 04:31:34.629515	2025-09-27 05:15:38.954	aecd8347-9b35-11f0-0a80-0176001366b7		20	\N	\N	\N
b8452433-d696-4a9d-8837-2a6f11052b3a	AN7218CMR3 Мультифокальная ретинопатия 3 типа (CMR3) Породы: Лопарская оленегонная собака, Финский лаппхунд, Шведский лапхунд	МойСклад	3331.00	30		t	2025-09-27 04:31:34.709736	2025-09-27 05:15:38.988	aed33a3a-9b35-11f0-0a80-0176001366bc		20	\N	\N	\N
9b9d143d-fb03-459f-b3fe-0a10c944f4aa	AN7228OLB Несовершенный остеогенез биглей (OI b) Породы: Бигль	МойСклад	3331.00	30		t	2025-09-27 04:31:36.528	2025-09-27 05:15:39.721	af53216a-9b35-11f0-0a80-01760013672a		20	\N	\N	\N
38c4f731-f04e-44ed-b28f-6789b68c14a6	AN7158PPLL Первичная открытоугольная глаукома шарпеев - первичный вывих хрусталика (POAG-PLL Shar Pei) Породы: Шарпей	МойСклад	3331.00	30		t	2025-09-27 04:31:37.025673	2025-09-27 05:15:39.922	af7c1677-9b35-11f0-0a80-017600136748		20	\N	\N	\N
65db7a10-d36a-42fd-bc1c-33918de59271	AN7173MDR Чувствительность к фенобарбиталу (MDR ph) Породы: Бордер колли	МойСклад	3331.00	30		t	2025-09-27 04:31:38.286309	2025-09-27 05:15:40.424	afd93b51-9b35-11f0-0a80-017600136793		20	\N	\N	\N
6e8f571a-a90b-4ca8-9b7a-2dbef474766f	AN7178GM1 Ганглиозидоз GM1 Породы: Корат, СиамскаяВозможные породы, учитывая родственное происхождение:Ориентальная короткошерстная, Балийская (балинезийская, болинез), Гавана браун, Священная бирма, Бурманская кошка (бурма), Сингапурская кошка (синг	МойСклад	2468.00	30		t	2025-09-27 04:31:38.69604	2025-09-27 05:15:40.6	aff846e2-9b35-11f0-0a80-0176001367ac		20	\N	\N	\N
54b8c24e-b968-4278-80e7-1ffb4dc54768	AN91ОБС Глазной профиль (герпесвирус кошек (FHV-1), микоплазма (Mycoplasma felis), хламидия (Chlamydia felis))	МойСклад	2073.00	30		t	2025-09-27 04:31:40.278459	2025-09-27 05:15:41.231	b06e12b5-9b35-11f0-0a80-01760013680b		20	\N	\N	\N
ee43c2a6-002f-4e52-924d-7a52a2711d1c	AN92ОБС Желудочно-кишечный большой профиль (вирус панлейкопении (FPV), коронавирус кошек энтеральный (FCoV), токсоплазма (Toxoplasma gondii), гиардиа (Giardia spp.), криптоспоридии (Cryptosporidium spp.), трихомонада (тritrichomonas blagburni (foetus	МойСклад	4886.00	30		t	2025-09-27 04:31:40.360251	2025-09-27 05:15:41.266	b0745d9f-9b35-11f0-0a80-017600136810		20	\N	\N	\N
699b31fa-5991-4f89-be38-821d8d3cd11d	AN7234EAOD Ранняя глухота Бордер колли, EAOD (Linkage test) Породы:  Бордер колли	МойСклад	3331.00	30		t	2025-09-27 04:31:42.800538	2025-09-27 05:15:42.23	b11fca47-9b35-11f0-0a80-01760013689d		20	\N	\N	\N
e3492eab-ac5e-4367-ab7a-31bddf23886c	AN7272JBD Ювенильная энцефалопатия / Ювенильная эпилепсия (JBD) Породы: Джек Рассел терьер Парсон Рассел терьер	МойСклад	3331.00	30		t	2025-09-27 04:31:44.06685	2025-09-27 05:15:42.728	b1876d5e-9b35-11f0-0a80-0176001368e8		20	\N	\N	\N
312a9b48-207d-4925-90bc-5f3fcad73172	AN83ОБС Папийон/Фален.  Болезнь фон Виллебранда I-го типа (vWD type I), Нейроксальная дистрофия (NAD), Прогрессирующая атрофия сетчатки папильонов и фаленов pap-PRA	МойСклад	9555.00	30		t	2025-09-27 04:31:44.995028	2025-09-27 05:15:43.158	b1c8fa21-9b35-11f0-0a80-01760013691f		20	\N	\N	\N
3fa3abbc-96cb-410a-80c8-c3e8a0f4c8ba	1.27 Панкреатическая амилаза-(12ч)	МойСклад	704.00	30		t	2025-09-27 04:31:47.518473	2025-09-27 05:15:44.152	b385bae8-9b35-11f0-0a80-017600136a7c		20	\N	\N	\N
00b5bd14-47a7-446b-9b27-4880cae28a67	10.49 Эрлихиоз (Ehrlichia canis)	МойСклад	1089.00	30		t	2025-09-27 04:31:50.012566	2025-09-27 05:15:45.112	b43f09ff-9b35-11f0-0a80-017600136b0d		20	\N	\N	\N
9a1bfb6e-8d44-4c0d-9708-2a1b11bd72f1	12.2 РЕСПИРАТОРНЫЙ малый - NEW	МойСклад	2970.00	30		t	2025-09-27 04:31:50.781142	2025-09-27 05:15:45.413	b47b8544-9b35-11f0-0a80-017600136b3a		20	\N	\N	\N
97772e1d-25e3-4bab-a671-5ee2d1733d1d	10.24 Клостридиоз (Сlostridium difficile/ Clostridium perfringens/C. perfringens enterotoxin)	МойСклад	2090.00	30		t	2025-09-27 04:31:53.94774	2025-09-27 05:15:46.611	b564f62f-9b35-11f0-0a80-017600136bee		20	\N	\N	\N
c7223699-cf41-4bb9-8999-c3a22f17f2c9	1.43 Сывороточный А-амилоид (сывороточный амилоидный белок) кошек	МойСклад	3960.00	30		t	2025-09-27 04:31:56.690307	2025-09-27 05:15:47.653	b6496e36-9b35-11f0-0a80-017600136ca7		20	\N	\N	\N
040a7466-d904-4275-81a9-c3a44c2c764f	1.48 Печеночный профиль птиц - NEW  -(2ч.)	МойСклад	3234.00	30		t	2025-09-27 04:31:57.245718	2025-09-27 05:15:47.851	b673034b-9b35-11f0-0a80-017600136cc5		20	\N	\N	\N
1c0b35f1-46e8-4fc8-8428-00263f679ea0	1.50 Сердечно-сосудистый профиль птиц - NEW -(12ч.)	МойСклад	1034.00	30		t	2025-09-27 04:31:57.514463	2025-09-27 05:15:47.951	b685da32-9b35-11f0-0a80-017600136cd4		20	\N	\N	\N
f68adb7c-daf3-4da4-a164-38eaf57da3e9	7.2 Анализ кала на скрытую кровь	МойСклад	506.00	30		t	2025-09-27 04:32:00.419742	2025-09-27 05:15:49.06	ba32f040-9b35-11f0-0a80-0176001370a6		20	\N	\N	\N
982512fd-5339-448e-a695-5ce8c6c89257	Cкротуморхифуникулоэктомия. Операция по удалению яичка вместе с семенным канатом и мошонкой (всё включено, кроме: анализов, обследований)	МойСклад	27966.00	30	Cкротуморхифуникулоэктомия. Операция по удалению яичка вместе с семенным канатом и мошонкой (всё включено, кроме: анализов, обследований)	t	2025-09-27 04:32:02.626472	2025-09-27 05:15:49.896	bf2a7cfb-9b35-11f0-0a80-0176001376ec		20	\N	\N	\N
571eb54d-8645-44d6-af4e-56930534a282	Ампутация пораженного опухолью пальца — кошки (всё включено, кроме: анализов, обследований)	МойСклад	16838.00	30	Ампутация пораженного опухолью пальца — кошки (всё включено, кроме: анализов, обследований)	t	2025-09-27 04:32:02.969648	2025-09-27 05:15:50.028	bf35df7e-9b35-11f0-0a80-0176001376fc		20	\N	\N	\N
\.


--
-- Data for Name: sms_verification_codes; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.sms_verification_codes (id, user_id, phone, code_hash, purpose, expires_at, attempt_count, created_at) FROM stdin;
\.


--
-- Data for Name: system_settings; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.system_settings (id, key, value, description, category, is_active, created_at, updated_at) FROM stdin;
98ef3b52-7300-48e5-afe1-3c0f2a8949d1	fiscal_receipt_system	moysklad	Система печати фискальных чеков	fiscal_receipts	t	2025-09-25 13:11:51.515043	2025-09-25 13:11:51.515043
\.


--
-- Data for Name: user_role_assignments; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.user_role_assignments (id, user_id, role_id, branch_id, assigned_at, assigned_by) FROM stdin;
\.


--
-- Data for Name: user_roles; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.user_roles (id, name, description, permissions, is_active, created_at) FROM stdin;
\.


--
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.users (id, username, password, email, full_name, role, status, last_login, created_at, updated_at, phone, phone_verified, two_factor_enabled, two_factor_method, branch_id) FROM stdin;
d0ed0d6b-9812-4419-b3a6-d39a08ef6a8f	Serg	$2b$12$x7qilo.o.kg8sDTQtm2wOegqDc9qW5bqkX0g/dzY1cS1heC6bVQg.	s.mailbox@bk.ru	Сергей Савин	врач	active	\N	2025-09-23 09:07:27.794373	2025-09-23 09:07:27.794373	+77926894983	f	f	sms	f9c369e8-9f58-4195-bd8e-a5bc4a03a3ed
81be9b16-f825-4bc7-9ff6-7177d9d953e2	demo	$2b$12$OmjC/qk8cXP/LRh.49wM9.7tunJmhqkf0PVscgJoxgi6tnoLvqJX2	s.mailbox@bk.ru	Демо Пользователь	администратор	active	2025-09-28 10:24:47.771	2025-09-17 18:01:04.579589	2025-09-23 20:37:01.368	+79268949839	f	f	sms	\N
e2b1a026-8404-4938-969c-0c7a7684d645	testadmin	$2b$12$LyLPkRJpgLCXwgZjXvowxO7SX0J4t5l.YgJ6ZZl2RtQKwmJL2SqnC	test@admin.com	Тестовый Администратор	администратор	active	\N	2025-09-17 01:39:39.77831	2025-09-17 01:39:39.77831	\N	f	f	sms	4360ed52-9417-4ce1-b9ea-6543898d162a
1e62a7c8-b942-4506-bf1d-8e0385f632b2	admin	admin123	s.mailbox@bk.ru	Системный Администратор	администратор	active	2025-09-17 17:40:05.836	2025-09-17 00:09:11.195933	2025-09-17 00:41:15.076	+79268949839	f	f	disabled	f9c369e8-9f58-4195-bd8e-a5bc4a03a3ed
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
-- Name: cash_operations cash_operations_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.cash_operations
    ADD CONSTRAINT cash_operations_pkey PRIMARY KEY (id);


--
-- Name: cash_registers cash_registers_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.cash_registers
    ADD CONSTRAINT cash_registers_pkey PRIMARY KEY (id);


--
-- Name: cash_shifts cash_shifts_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.cash_shifts
    ADD CONSTRAINT cash_shifts_pkey PRIMARY KEY (id);


--
-- Name: catalog_item_markings catalog_item_markings_data_matrix_code_unique; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.catalog_item_markings
    ADD CONSTRAINT catalog_item_markings_data_matrix_code_unique UNIQUE (data_matrix_code);


--
-- Name: catalog_item_markings catalog_item_markings_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.catalog_item_markings
    ADD CONSTRAINT catalog_item_markings_pkey PRIMARY KEY (id);


--
-- Name: catalog_items catalog_items_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.catalog_items
    ADD CONSTRAINT catalog_items_pkey PRIMARY KEY (id);


--
-- Name: customers customers_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.customers
    ADD CONSTRAINT customers_pkey PRIMARY KEY (id);


--
-- Name: discount_rules discount_rules_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.discount_rules
    ADD CONSTRAINT discount_rules_pkey PRIMARY KEY (id);


--
-- Name: doctors doctors_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.doctors
    ADD CONSTRAINT doctors_pkey PRIMARY KEY (id);


--
-- Name: fiscal_receipts fiscal_receipts_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.fiscal_receipts
    ADD CONSTRAINT fiscal_receipts_pkey PRIMARY KEY (id);


--
-- Name: integration_accounts integration_accounts_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.integration_accounts
    ADD CONSTRAINT integration_accounts_pkey PRIMARY KEY (id);


--
-- Name: integration_jobs integration_jobs_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.integration_jobs
    ADD CONSTRAINT integration_jobs_pkey PRIMARY KEY (id);


--
-- Name: integration_logs integration_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.integration_logs
    ADD CONSTRAINT integration_logs_pkey PRIMARY KEY (id);


--
-- Name: integration_mappings integration_mappings_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.integration_mappings
    ADD CONSTRAINT integration_mappings_pkey PRIMARY KEY (id);


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
-- Name: payment_intents payment_intents_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.payment_intents
    ADD CONSTRAINT payment_intents_pkey PRIMARY KEY (id);


--
-- Name: payment_methods payment_methods_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.payment_methods
    ADD CONSTRAINT payment_methods_pkey PRIMARY KEY (id);


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
-- Name: sales_transaction_items sales_transaction_items_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.sales_transaction_items
    ADD CONSTRAINT sales_transaction_items_pkey PRIMARY KEY (id);


--
-- Name: sales_transactions sales_transactions_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.sales_transactions
    ADD CONSTRAINT sales_transactions_pkey PRIMARY KEY (id);


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
-- Name: system_settings system_settings_key_unique; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.system_settings
    ADD CONSTRAINT system_settings_key_unique UNIQUE (key);


--
-- Name: system_settings system_settings_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.system_settings
    ADD CONSTRAINT system_settings_pkey PRIMARY KEY (id);


--
-- Name: user_role_assignments user_role_assignments_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.user_role_assignments
    ADD CONSTRAINT user_role_assignments_pkey PRIMARY KEY (id);


--
-- Name: user_roles user_roles_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_pkey PRIMARY KEY (id);


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
-- Name: catalog_item_markings_catalog_item_id_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX catalog_item_markings_catalog_item_id_idx ON public.catalog_item_markings USING btree (catalog_item_id);


--
-- Name: catalog_item_markings_data_matrix_code_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX catalog_item_markings_data_matrix_code_idx ON public.catalog_item_markings USING btree (data_matrix_code);


--
-- Name: catalog_item_markings_gtin_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX catalog_item_markings_gtin_idx ON public.catalog_item_markings USING btree (gtin);


--
-- Name: catalog_item_markings_is_used_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX catalog_item_markings_is_used_idx ON public.catalog_item_markings USING btree (is_used);


--
-- Name: catalog_item_markings_validation_status_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX catalog_item_markings_validation_status_idx ON public.catalog_item_markings USING btree (validation_status);


--
-- Name: catalog_items_active_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX catalog_items_active_idx ON public.catalog_items USING btree (is_active);


--
-- Name: catalog_items_category_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX catalog_items_category_idx ON public.catalog_items USING btree (category);


--
-- Name: catalog_items_created_at_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX catalog_items_created_at_idx ON public.catalog_items USING btree (created_at);


--
-- Name: catalog_items_external_id_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX catalog_items_external_id_idx ON public.catalog_items USING btree (external_id);


--
-- Name: catalog_items_integration_source_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX catalog_items_integration_source_idx ON public.catalog_items USING btree (integration_source);


--
-- Name: catalog_items_name_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX catalog_items_name_idx ON public.catalog_items USING btree (name);


--
-- Name: catalog_items_type_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX catalog_items_type_idx ON public.catalog_items USING btree (type);


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
-- Name: fiscal_receipts_created_at_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX fiscal_receipts_created_at_idx ON public.fiscal_receipts USING btree (created_at);


--
-- Name: fiscal_receipts_external_receipt_id_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX fiscal_receipts_external_receipt_id_idx ON public.fiscal_receipts USING btree (external_receipt_id);


--
-- Name: fiscal_receipts_integration_account_id_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX fiscal_receipts_integration_account_id_idx ON public.fiscal_receipts USING btree (integration_account_id);


--
-- Name: fiscal_receipts_invoice_id_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX fiscal_receipts_invoice_id_idx ON public.fiscal_receipts USING btree (invoice_id);


--
-- Name: fiscal_receipts_local_print_requested_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX fiscal_receipts_local_print_requested_idx ON public.fiscal_receipts USING btree (local_print_requested);


--
-- Name: fiscal_receipts_local_print_status_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX fiscal_receipts_local_print_status_idx ON public.fiscal_receipts USING btree (local_print_status);


--
-- Name: fiscal_receipts_receipt_number_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX fiscal_receipts_receipt_number_idx ON public.fiscal_receipts USING btree (receipt_number);


--
-- Name: fiscal_receipts_status_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX fiscal_receipts_status_idx ON public.fiscal_receipts USING btree (status);


--
-- Name: integration_accounts_last_sync_at_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX integration_accounts_last_sync_at_idx ON public.integration_accounts USING btree (last_sync_at);


--
-- Name: integration_accounts_name_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX integration_accounts_name_idx ON public.integration_accounts USING btree (name);


--
-- Name: integration_accounts_status_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX integration_accounts_status_idx ON public.integration_accounts USING btree (status);


--
-- Name: integration_accounts_type_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX integration_accounts_type_idx ON public.integration_accounts USING btree (type);


--
-- Name: integration_jobs_created_at_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX integration_jobs_created_at_idx ON public.integration_jobs USING btree (created_at);


--
-- Name: integration_jobs_integration_account_id_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX integration_jobs_integration_account_id_idx ON public.integration_jobs USING btree (integration_account_id);


--
-- Name: integration_jobs_job_type_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX integration_jobs_job_type_idx ON public.integration_jobs USING btree (job_type);


--
-- Name: integration_jobs_next_attempt_at_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX integration_jobs_next_attempt_at_idx ON public.integration_jobs USING btree (next_attempt_at);


--
-- Name: integration_jobs_priority_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX integration_jobs_priority_idx ON public.integration_jobs USING btree (priority);


--
-- Name: integration_jobs_status_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX integration_jobs_status_idx ON public.integration_jobs USING btree (status);


--
-- Name: integration_logs_created_at_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX integration_logs_created_at_idx ON public.integration_logs USING btree (created_at);


--
-- Name: integration_logs_event_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX integration_logs_event_idx ON public.integration_logs USING btree (event);


--
-- Name: integration_logs_event_time_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX integration_logs_event_time_idx ON public.integration_logs USING btree (event, created_at);


--
-- Name: integration_logs_integration_account_id_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX integration_logs_integration_account_id_idx ON public.integration_logs USING btree (integration_account_id);


--
-- Name: integration_logs_job_id_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX integration_logs_job_id_idx ON public.integration_logs USING btree (job_id);


--
-- Name: integration_logs_level_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX integration_logs_level_idx ON public.integration_logs USING btree (level);


--
-- Name: integration_logs_user_id_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX integration_logs_user_id_idx ON public.integration_logs USING btree (user_id);


--
-- Name: integration_mappings_entity_type_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX integration_mappings_entity_type_idx ON public.integration_mappings USING btree (entity_type);


--
-- Name: integration_mappings_external_id_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX integration_mappings_external_id_idx ON public.integration_mappings USING btree (external_id);


--
-- Name: integration_mappings_integration_account_id_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX integration_mappings_integration_account_id_idx ON public.integration_mappings USING btree (integration_account_id);


--
-- Name: integration_mappings_internal_id_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX integration_mappings_internal_id_idx ON public.integration_mappings USING btree (internal_id);


--
-- Name: integration_mappings_unique_mapping_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX integration_mappings_unique_mapping_idx ON public.integration_mappings USING btree (integration_account_id, external_id, entity_type);


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
-- Name: payment_intents_created_at_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX payment_intents_created_at_idx ON public.payment_intents USING btree (created_at);


--
-- Name: payment_intents_external_payment_id_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX payment_intents_external_payment_id_idx ON public.payment_intents USING btree (external_payment_id);


--
-- Name: payment_intents_fiscal_receipt_id_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX payment_intents_fiscal_receipt_id_idx ON public.payment_intents USING btree (fiscal_receipt_id);


--
-- Name: payment_intents_integration_account_id_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX payment_intents_integration_account_id_idx ON public.payment_intents USING btree (integration_account_id);


--
-- Name: payment_intents_invoice_id_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX payment_intents_invoice_id_idx ON public.payment_intents USING btree (invoice_id);


--
-- Name: payment_intents_status_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX payment_intents_status_idx ON public.payment_intents USING btree (status);


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
-- Name: system_settings_active_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX system_settings_active_idx ON public.system_settings USING btree (is_active);


--
-- Name: system_settings_category_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX system_settings_category_idx ON public.system_settings USING btree (category);


--
-- Name: system_settings_key_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX system_settings_key_idx ON public.system_settings USING btree (key);


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
-- Name: cash_operations cash_operations_cashier_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.cash_operations
    ADD CONSTRAINT cash_operations_cashier_id_users_id_fk FOREIGN KEY (cashier_id) REFERENCES public.users(id);


--
-- Name: cash_operations cash_operations_register_id_cash_registers_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.cash_operations
    ADD CONSTRAINT cash_operations_register_id_cash_registers_id_fk FOREIGN KEY (register_id) REFERENCES public.cash_registers(id);


--
-- Name: cash_operations cash_operations_shift_id_cash_shifts_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.cash_operations
    ADD CONSTRAINT cash_operations_shift_id_cash_shifts_id_fk FOREIGN KEY (shift_id) REFERENCES public.cash_shifts(id);


--
-- Name: cash_registers cash_registers_branch_id_branches_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.cash_registers
    ADD CONSTRAINT cash_registers_branch_id_branches_id_fk FOREIGN KEY (branch_id) REFERENCES public.branches(id);


--
-- Name: cash_shifts cash_shifts_cashier_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.cash_shifts
    ADD CONSTRAINT cash_shifts_cashier_id_users_id_fk FOREIGN KEY (cashier_id) REFERENCES public.users(id);


--
-- Name: cash_shifts cash_shifts_register_id_cash_registers_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.cash_shifts
    ADD CONSTRAINT cash_shifts_register_id_cash_registers_id_fk FOREIGN KEY (register_id) REFERENCES public.cash_registers(id);


--
-- Name: catalog_item_markings catalog_item_markings_catalog_item_id_catalog_items_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.catalog_item_markings
    ADD CONSTRAINT catalog_item_markings_catalog_item_id_catalog_items_id_fk FOREIGN KEY (catalog_item_id) REFERENCES public.catalog_items(id);


--
-- Name: customers customers_branch_id_branches_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.customers
    ADD CONSTRAINT customers_branch_id_branches_id_fk FOREIGN KEY (branch_id) REFERENCES public.branches(id);


--
-- Name: discount_rules discount_rules_branch_id_branches_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.discount_rules
    ADD CONSTRAINT discount_rules_branch_id_branches_id_fk FOREIGN KEY (branch_id) REFERENCES public.branches(id);


--
-- Name: doctors doctors_branch_id_branches_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.doctors
    ADD CONSTRAINT doctors_branch_id_branches_id_fk FOREIGN KEY (branch_id) REFERENCES public.branches(id);


--
-- Name: fiscal_receipts fiscal_receipts_integration_account_id_integration_accounts_id_; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.fiscal_receipts
    ADD CONSTRAINT fiscal_receipts_integration_account_id_integration_accounts_id_ FOREIGN KEY (integration_account_id) REFERENCES public.integration_accounts(id);


--
-- Name: fiscal_receipts fiscal_receipts_invoice_id_invoices_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.fiscal_receipts
    ADD CONSTRAINT fiscal_receipts_invoice_id_invoices_id_fk FOREIGN KEY (invoice_id) REFERENCES public.invoices(id) ON DELETE CASCADE;


--
-- Name: integration_jobs integration_jobs_integration_account_id_integration_accounts_id; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.integration_jobs
    ADD CONSTRAINT integration_jobs_integration_account_id_integration_accounts_id FOREIGN KEY (integration_account_id) REFERENCES public.integration_accounts(id);


--
-- Name: integration_logs integration_logs_integration_account_id_integration_accounts_id; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.integration_logs
    ADD CONSTRAINT integration_logs_integration_account_id_integration_accounts_id FOREIGN KEY (integration_account_id) REFERENCES public.integration_accounts(id);


--
-- Name: integration_logs integration_logs_job_id_integration_jobs_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.integration_logs
    ADD CONSTRAINT integration_logs_job_id_integration_jobs_id_fk FOREIGN KEY (job_id) REFERENCES public.integration_jobs(id);


--
-- Name: integration_logs integration_logs_user_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.integration_logs
    ADD CONSTRAINT integration_logs_user_id_users_id_fk FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: integration_mappings integration_mappings_integration_account_id_integration_account; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.integration_mappings
    ADD CONSTRAINT integration_mappings_integration_account_id_integration_account FOREIGN KEY (integration_account_id) REFERENCES public.integration_accounts(id);


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
-- Name: payment_intents payment_intents_fiscal_receipt_id_fiscal_receipts_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.payment_intents
    ADD CONSTRAINT payment_intents_fiscal_receipt_id_fiscal_receipts_id_fk FOREIGN KEY (fiscal_receipt_id) REFERENCES public.fiscal_receipts(id);


--
-- Name: payment_intents payment_intents_integration_account_id_integration_accounts_id_; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.payment_intents
    ADD CONSTRAINT payment_intents_integration_account_id_integration_accounts_id_ FOREIGN KEY (integration_account_id) REFERENCES public.integration_accounts(id);


--
-- Name: payment_intents payment_intents_invoice_id_invoices_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.payment_intents
    ADD CONSTRAINT payment_intents_invoice_id_invoices_id_fk FOREIGN KEY (invoice_id) REFERENCES public.invoices(id);


--
-- Name: payment_methods payment_methods_branch_id_branches_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.payment_methods
    ADD CONSTRAINT payment_methods_branch_id_branches_id_fk FOREIGN KEY (branch_id) REFERENCES public.branches(id);


--
-- Name: reference_ranges reference_ranges_parameter_id_lab_parameters_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.reference_ranges
    ADD CONSTRAINT reference_ranges_parameter_id_lab_parameters_id_fk FOREIGN KEY (parameter_id) REFERENCES public.lab_parameters(id);


--
-- Name: sales_transaction_items sales_transaction_items_product_id_products_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.sales_transaction_items
    ADD CONSTRAINT sales_transaction_items_product_id_products_id_fk FOREIGN KEY (product_id) REFERENCES public.products(id);


--
-- Name: sales_transaction_items sales_transaction_items_service_id_services_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.sales_transaction_items
    ADD CONSTRAINT sales_transaction_items_service_id_services_id_fk FOREIGN KEY (service_id) REFERENCES public.services(id);


--
-- Name: sales_transaction_items sales_transaction_items_transaction_id_sales_transactions_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.sales_transaction_items
    ADD CONSTRAINT sales_transaction_items_transaction_id_sales_transactions_id_fk FOREIGN KEY (transaction_id) REFERENCES public.sales_transactions(id);


--
-- Name: sales_transactions sales_transactions_cashier_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.sales_transactions
    ADD CONSTRAINT sales_transactions_cashier_id_users_id_fk FOREIGN KEY (cashier_id) REFERENCES public.users(id);


--
-- Name: sales_transactions sales_transactions_customer_id_customers_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.sales_transactions
    ADD CONSTRAINT sales_transactions_customer_id_customers_id_fk FOREIGN KEY (customer_id) REFERENCES public.customers(id);


--
-- Name: sales_transactions sales_transactions_invoice_id_invoices_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.sales_transactions
    ADD CONSTRAINT sales_transactions_invoice_id_invoices_id_fk FOREIGN KEY (invoice_id) REFERENCES public.invoices(id);


--
-- Name: sales_transactions sales_transactions_payment_method_id_payment_methods_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.sales_transactions
    ADD CONSTRAINT sales_transactions_payment_method_id_payment_methods_id_fk FOREIGN KEY (payment_method_id) REFERENCES public.payment_methods(id);


--
-- Name: sales_transactions sales_transactions_register_id_cash_registers_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.sales_transactions
    ADD CONSTRAINT sales_transactions_register_id_cash_registers_id_fk FOREIGN KEY (register_id) REFERENCES public.cash_registers(id);


--
-- Name: sales_transactions sales_transactions_shift_id_cash_shifts_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.sales_transactions
    ADD CONSTRAINT sales_transactions_shift_id_cash_shifts_id_fk FOREIGN KEY (shift_id) REFERENCES public.cash_shifts(id);


--
-- Name: sms_verification_codes sms_verification_codes_user_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.sms_verification_codes
    ADD CONSTRAINT sms_verification_codes_user_id_users_id_fk FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: user_role_assignments user_role_assignments_assigned_by_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.user_role_assignments
    ADD CONSTRAINT user_role_assignments_assigned_by_users_id_fk FOREIGN KEY (assigned_by) REFERENCES public.users(id);


--
-- Name: user_role_assignments user_role_assignments_branch_id_branches_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.user_role_assignments
    ADD CONSTRAINT user_role_assignments_branch_id_branches_id_fk FOREIGN KEY (branch_id) REFERENCES public.branches(id);


--
-- Name: user_role_assignments user_role_assignments_role_id_user_roles_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.user_role_assignments
    ADD CONSTRAINT user_role_assignments_role_id_user_roles_id_fk FOREIGN KEY (role_id) REFERENCES public.user_roles(id);


--
-- Name: user_role_assignments user_role_assignments_user_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.user_role_assignments
    ADD CONSTRAINT user_role_assignments_user_id_users_id_fk FOREIGN KEY (user_id) REFERENCES public.users(id);


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

