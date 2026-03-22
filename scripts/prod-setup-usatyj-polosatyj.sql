-- ============================================================
-- PROD SETUP: Усатый Полосатый
-- Запуск: sudo -u postgres psql -d vetsystem -f /var/www/vetsystem/scripts/prod-setup-usatyj-polosatyj.sql
-- ============================================================

-- 1. Тенант
INSERT INTO tenants (id, name, slug, status, created_at, updated_at)
VALUES (
  '06d235e4-e7ba-4b2c-87a2-77afc72c4358',
  'Усатый Полосатый',
  'usatyj-polosatyj',
  'active',
  NOW(),
  NOW()
)
ON CONFLICT (id) DO NOTHING;

-- 2. Филиалы
INSERT INTO branches (id, tenant_id, name, address, city, phone, status, vetais_clinic_id, created_at, updated_at)
VALUES 
  (
    'fde48131-9495-478f-806b-274fa1fcbdba',
    '06d235e4-e7ba-4b2c-87a2-77afc72c4358',
    'Усатый Полосатый Дрожжино',
    'Новое шоссе д. 15',
    'Дрожжино',
    '+74950857792',
    'active',
    10000,
    NOW(),
    NOW()
  ),
  (
    '7b46d4f5-7cb3-404c-8642-e3d025a281b8',
    '06d235e4-e7ba-4b2c-87a2-77afc72c4358',
    'Усатый Полосатый Остафьево',
    'Остафьевское шоссе 14к2',
    'Остафьево',
    '+74951064575',
    'active',
    10001,
    NOW(),
    NOW()
  )
ON CONFLICT (id) DO NOTHING;

-- 3. Администратор (пароль: admin123)
INSERT INTO users (id, tenant_id, branch_id, username, password, full_name, role, status, created_at, updated_at)
VALUES (
  gen_random_uuid(),
  '06d235e4-e7ba-4b2c-87a2-77afc72c4358',
  'fde48131-9495-478f-806b-274fa1fcbdba',
  'admin_up',
  '$2b$12$l3eG5rhBsHaReDD/qM7.fuv63it6RmMlxRL.UnX/KO0SBmIgPJnzq',
  'Администратор',
  'admin',
  'active',
  NOW(),
  NOW()
)
ON CONFLICT DO NOTHING;

-- Проверка
SELECT 'Тенант:' AS что, name AS значение FROM tenants WHERE id = '06d235e4-e7ba-4b2c-87a2-77afc72c4358'
UNION ALL
SELECT 'Филиал 1:', name FROM branches WHERE id = 'fde48131-9495-478f-806b-274fa1fcbdba'
UNION ALL
SELECT 'Филиал 2:', name FROM branches WHERE id = '7b46d4f5-7cb3-404c-8642-e3d025a281b8'
UNION ALL
SELECT 'Пользователь:', username FROM users WHERE username = 'admin_up' AND tenant_id = '06d235e4-e7ba-4b2c-87a2-77afc72c4358';
