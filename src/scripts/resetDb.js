import dotenv from 'dotenv';
dotenv.config();

import crypto from 'crypto';
import { Sequelize } from 'sequelize';

const permissionsList = [
  { name: 'user.view', description: 'View users' },
  { name: 'user.create', description: 'Create user' },
  { name: 'user.update', description: 'Update user' },
  { name: 'user.delete', description: 'Delete user' },
  { name: 'role.view', description: 'View roles' },
  { name: 'role.create', description: 'Create role' },
  { name: 'role.update', description: 'Update role' },
  { name: 'role.delete', description: 'Delete role' },
  { name: 'role.assign', description: 'Assign role to user' },
  { name: 'permission.view', description: 'View permissions' },
  { name: 'permission.assign', description: 'Assign permission to role' },
  { name: 'whatsapp.view', description: 'View WhatsApp status & QR' },
  { name: 'whatsapp.connect', description: 'Connect WhatsApp' },
  { name: 'whatsapp.disconnect', description: 'Disconnect WhatsApp' },
  { name: 'whatsapp.sync', description: 'Sync WhatsApp messages' },
  { name: 'whatsapp.message.view', description: 'View WhatsApp messages & chats' },
  { name: 'summary.view', description: 'View daily summaries' },
  { name: 'summary.generate', description: 'Generate daily summary' },
  { name: 'todo.view', description: 'View daily todos' },
  { name: 'todo.update', description: 'Update daily todos' }
];

const whatsappSummaryPermissions = [
  'whatsapp.view',
  'whatsapp.connect',
  'whatsapp.disconnect',
  'whatsapp.sync',
  'whatsapp.message.view',
  'summary.view',
  'summary.generate',
  'todo.view',
  'todo.update'
];

async function resetDatabase() {
  console.log('\n========================================');
  console.log('  [ProjectT] Resetting Database...      ');
  console.log('========================================\n');

  const sequelize = new Sequelize(
    process.env.DB_DATABASE || 'projectt',
    process.env.DB_USERNAME || 'projectt',
    process.env.DB_PASSWORD || 'ProjectT_Passw0rd!',
    {
      host: process.env.DB_HOST || '127.0.0.1',
      port: process.env.DB_PORT || 3306,
      dialect: 'mysql',
      logging: false
    }
  );

  try {
    await sequelize.authenticate();
    console.log('[ResetDB] Connected to MySQL database successfully.');

    // 1. Disable Foreign Key Checks
    await sequelize.query('SET FOREIGN_KEY_CHECKS = 0;');

    // 2. Truncate all dynamic data tables
    console.log('[ResetDB] Truncating dynamic data tables...');
    const tablesToTruncate = [
      'daily_todos',
      'daily_summaries',
      'whatsapp_messages',
      'whatsapp_chats',
      'whatsapp_sessions',
      'user_roles',
      'role_permissions',
      'users',
      'roles',
      'permissions'
    ];

    for (const table of tablesToTruncate) {
      await sequelize.query(`TRUNCATE TABLE \`${table}\`;`);
    }

    // 3. Re-enable Foreign Key Checks
    await sequelize.query('SET FOREIGN_KEY_CHECKS = 1;');
    console.log('[ResetDB] Tables truncated and auto-increments reset.');

    const now = new Date();

    // 4. Seed Permissions
    console.log('[ResetDB] Seeding permissions...');
    for (const p of permissionsList) {
      await sequelize.query(
        'INSERT INTO `permissions` (`name`, `description`, `created_at`, `updated_at`) VALUES (?, ?, ?, ?);',
        { replacements: [p.name, p.description, now, now] }
      );
    }

    // 5. Seed Roles
    console.log('[ResetDB] Seeding roles (admin, whatsapp-summary)...');
    await sequelize.query(
      'INSERT INTO `roles` (`id`, `name`, `description`, `created_at`, `updated_at`) VALUES (1, "admin", "Administrator with full access", ?, ?), (2, "whatsapp-summary", "WhatsApp Summary Viewer & Operator", ?, ?);',
      { replacements: [now, now, now, now] }
    );

    // 6. Assign permissions to roles
    const [dbPermissions] = await sequelize.query('SELECT id, name FROM `permissions`;');
    for (const perm of dbPermissions) {
      // Role 1 (admin) gets all permissions
      await sequelize.query(
        'INSERT INTO `role_permissions` (`role_id`, `permission_id`, `created_at`, `updated_at`) VALUES (1, ?, ?, ?);',
        { replacements: [perm.id, now, now] }
      );

      // Role 2 (whatsapp-summary) gets specific permissions
      if (whatsappSummaryPermissions.includes(perm.name)) {
        await sequelize.query(
          'INSERT INTO `role_permissions` (`role_id`, `permission_id`, `created_at`, `updated_at`) VALUES (2, ?, ?, ?);',
          { replacements: [perm.id, now, now] }
        );
      }
    }

    // 7. Seed default Admin User
    console.log('[ResetDB] Seeding default Admin user...');
    const salt = process.env.HASH_SALT_PASSWORD || 'projectt_salt';
    const passwordHash = crypto.createHash('sha256').update('admin123' + (salt ? '-' + salt : '')).digest('hex');

    await sequelize.query(
      'INSERT INTO `users` (`id`, `name`, `username`, `password`, `created_at`, `updated_at`) VALUES (1, "Administrator", "admin", ?, ?, ?);',
      { replacements: [passwordHash, now, now] }
    );

    // 8. Assign admin role to admin user
    await sequelize.query(
      'INSERT INTO `user_roles` (`user_id`, `role_id`, `created_at`, `updated_at`) VALUES (1, 1, ?, ?);',
      { replacements: [now, now] }
    );

    console.log('\n======================================================');
    console.log('  [SUCCESS] Database reset complete!                  ');
    console.log('  - All WhatsApp chats & messages removed.            ');
    console.log('  - All Daily Summaries & Todos removed.              ');
    console.log('  - Extra users removed.                              ');
    console.log('  - Default Admin account: admin / admin123           ');
    console.log('======================================================\n');

    await sequelize.close();
    process.exit(0);
  } catch (error) {
    console.error('\n[ResetDB Error]:', error.message);
    await sequelize.close();
    process.exit(1);
  }
}

resetDatabase();
