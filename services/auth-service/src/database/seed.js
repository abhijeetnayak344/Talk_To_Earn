const { Pool } = require('pg');
const bcrypt = require('bcrypt');
require('dotenv').config();

async function seedDatabase() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL
  });

  try {
    console.log('Seeding database with test data...');

    // Create test users
    const password = await bcrypt.hash('Test123!', 12);

    const users = [
      { username: 'alice', email: 'alice@test.com', phone: '+1234567890', name: 'Alice Johnson' },
      { username: 'bob', email: 'bob@test.com', phone: '+1234567891', name: 'Bob Smith' },
      { username: 'charlie', email: 'charlie@test.com', phone: '+1234567892', name: 'Charlie Brown' }
    ];

    for (const user of users) {
      const result = await pool.query(
        `INSERT INTO users (username, email, phone_number, password_hash, display_name)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (username) DO NOTHING
         RETURNING id`,
        [user.username, user.email, user.phone, password, user.name]
      );

      if (result.rows.length > 0) {
        const userId = result.rows[0].id;
        
        // Create point account
        await pool.query(
          `INSERT INTO point_accounts (user_id, account_type, balance)
           VALUES ($1, 'personal', 1000)
           ON CONFLICT (user_id) DO NOTHING`,
          [userId]
        );

        console.log(`✓ Created user: ${user.username}`);
      }
    }

    // Create a test conversation
    const aliceId = await pool.query(`SELECT id FROM users WHERE username = 'alice'`);
    const bobId = await pool.query(`SELECT id FROM users WHERE username = 'bob'`);

    if (aliceId.rows.length > 0 && bobId.rows.length > 0) {
      const convResult = await pool.query(
        `INSERT INTO conversations (type, created_by)
         VALUES ('direct', $1)
         RETURNING id`,
        [aliceId.rows[0].id]
      );

      const conversationId = convResult.rows[0].id;

      // Add members
      await pool.query(
        `INSERT INTO conversation_members (conversation_id, user_id)
         VALUES ($1, $2), ($1, $3)
         ON CONFLICT DO NOTHING`,
        [conversationId, aliceId.rows[0].id, bobId.rows[0].id]
      );

      console.log('✓ Created test conversation between Alice and Bob');
    }

    console.log('\n✓ Database seeded successfully!');
    console.log('\nTest users created:');
    console.log('  username: alice, password: Test123!');
    console.log('  username: bob, password: Test123!');
    console.log('  username: charlie, password: Test123!');

    process.exit(0);
  } catch (error) {
    console.error('✗ Seeding failed:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

seedDatabase();
