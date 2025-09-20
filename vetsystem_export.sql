-- VetSystem Database Export for Migration to Ubuntu Server
-- Created: $(date)
-- Database: neondb
-- Tables: 20

-- Disable foreign key checks and triggers during import
SET session_replication_role = replica;

-- Drop existing tables if they exist (for clean import)
DROP TABLE IF EXISTS appointments CASCADE;
DROP TABLE IF EXISTS branches CASCADE;
DROP TABLE IF EXISTS doctors CASCADE;
DROP TABLE IF EXISTS invoice_items CASCADE;
DROP TABLE IF EXISTS invoices CASCADE;
DROP TABLE IF EXISTS lab_orders CASCADE;
DROP TABLE IF EXISTS lab_parameters CASCADE;
DROP TABLE IF EXISTS lab_result_details CASCADE;
DROP TABLE IF EXISTS lab_results CASCADE;
DROP TABLE IF EXISTS lab_studies CASCADE;
DROP TABLE IF EXISTS medical_records CASCADE;
DROP TABLE IF EXISTS medications CASCADE;
DROP TABLE IF EXISTS owners CASCADE;
DROP TABLE IF EXISTS patient_files CASCADE;
DROP TABLE IF EXISTS patients CASCADE;
DROP TABLE IF EXISTS products CASCADE;
DROP TABLE IF EXISTS reference_ranges CASCADE;
DROP TABLE IF EXISTS services CASCADE;
DROP TABLE IF EXISTS sms_verification_codes CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- Will add CREATE TABLE statements and data below