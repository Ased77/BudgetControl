// Re-insert corrupted test rows so the BOOT repair has something to fix.
import pg from 'pg';

const client = new pg.Client({
  host: 'localhost', port: 55432, user: 'csr_app',
  password: '8d3172bed5c9aee4eec42325b86b9bda378c6bda1097ad9e', database: 'csr_budgeting',
});
await client.connect();

const TEST_ID = '00000000-0000-4000-8000-00000000aaaa';
const BAD = '???? ????? ????????';
const sysActor = '00000000-0000-4000-8000-000000000001';

await client.query(
  `INSERT INTO auth_users (id, mobile, password_hash, display_name, role, is_active, is_test_user)
   VALUES ($1, '09990009999', 'scrypt$disabled', $2, 'SYSTEM_ADMIN', false, true)
   ON CONFLICT (id) DO UPDATE SET display_name = $2`,
  [TEST_ID, BAD],
);
await client.query(
  `INSERT INTO users (id, name, role, role_fa, role_title_fa, avatar, organization)
   VALUES ($1, $2, 'SYSTEM_ADMIN', 'مدیر سامانه', 'مدیر سامانه', '', 'سطح ملی')
   ON CONFLICT (id) DO UPDATE SET name = $2`,
  [TEST_ID, BAD],
);
await client.query(
  `INSERT INTO audit_logs (id, timestamp, actor_user_id, user_name, user_role, action_type, target_priority_title, old_value, new_value, rationale)
   VALUES ('audit-test-encoding', '۱۴۰۵/۸/۴ - ۰۹:۱۴', $1, $2, 'SYSTEM_ADMIN', 'LOGOUT', 'خروج از سامانه', 'مدیر سامانه', '-', $3)
   ON CONFLICT (id) DO UPDATE SET user_name = $2, rationale = $3`,
  [TEST_ID, BAD, `خروج ${BAD} از سامانه مدیریت توسعه`],
);
console.log('corrupted test rows inserted');
await client.end();
