import 'dotenv/config';
import { Pool as NeonPool, neonConfig } from '@neondatabase/serverless';
import pg from 'pg';
import ws from "ws";

const { Pool: PgPool } = pg;

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

const isNeon = process.env.DATABASE_URL.includes('neon.tech');

let pool: NeonPool | PgPool;

if (isNeon) {
  // Configure WebSocket transport for Neon
  neonConfig.webSocketConstructor = ws;
  pool = new NeonPool({ connectionString: process.env.DATABASE_URL });
} else {
  // Local/Postgres via node-postgres
  pool = new PgPool({ connectionString: process.env.DATABASE_URL });
}

/**
 * Script to clear all data from the database except the users table.
 * This script deletes data in the correct order to respect foreign key constraints.
 */
async function clearAllDataExceptUsers() {
  // Use query method directly on pool for both Neon and PgPool
  const query = isNeon 
    ? (sql: string) => (pool as NeonPool).query(sql)
    : async (sql: string) => {
        const client = await (pool as PgPool).connect();
        try {
          return await client.query(sql);
        } finally {
          client.release();
        }
      };
  
  try {
    await query("BEGIN");
    
    console.log("Starting to clear all data except users table...");
    
    // Use TRUNCATE CASCADE for faster deletion and automatic FK handling
    const tablesToClear = [
      "analytics",
      "version_history",
      "deployments",
      "release_order_items",
      "release_orders",
      "activity_logs",
      "invoices",
      "work_order_items",
      "work_orders",
      "notifications",
      "proposals",
      "installments",
      "payments",
      "approvals",
      "banners",
      "bookings",
      "slots",
      "otp_codes",
    ];
    
    for (const table of tablesToClear) {
      const result = await query(`TRUNCATE TABLE ${table} CASCADE`);
      console.log(`✓ Cleared table: ${table}`);
    }
    
    // Reset sequences (except users_id_seq since users are kept)
    const sequencesToReset = [
      "analytics_id_seq",
      "version_history_id_seq",
      "deployments_id_seq",
      "release_order_items_id_seq",
      "release_orders_id_seq",
      "activity_logs_id_seq",
      "invoices_id_seq",
      "work_order_items_id_seq",
      "work_orders_id_seq",
      "notifications_id_seq",
      "proposals_id_seq",
      "installments_id_seq",
      "payments_id_seq",
      "approvals_id_seq",
      "banners_id_seq",
      "bookings_id_seq",
      "slots_id_seq",
      "otp_codes_id_seq",
    ];
    
    for (const sequence of sequencesToReset) {
      try {
        await query(`ALTER SEQUENCE ${sequence} RESTART WITH 1`);
        console.log(`✓ Reset sequence: ${sequence}`);
      } catch (err: any) {
        // Sequence might not exist, skip it
        if (!err.message.includes('does not exist')) {
          console.warn(`⚠ Warning resetting sequence ${sequence}:`, err.message);
        }
      }
    }
    
    // Verify users table still has data
    const usersResult = await query("SELECT COUNT(*) FROM users");
    const userCount = parseInt(usersResult.rows[0].count);
    console.log(`\n✓ Users table still contains ${userCount} user(s)`);
    
    await query("COMMIT");
    console.log("\n✅ Successfully cleared all data except users table!");
    
  } catch (error: any) {
    await query("ROLLBACK");
    console.error("❌ Error clearing data:", error.message);
    throw error;
  }
}

// Run the script when executed directly
clearAllDataExceptUsers()
  .then(() => {
    console.log("\nScript completed successfully.");
    process.exit(0);
  })
  .catch((error) => {
    console.error("\nScript failed:", error);
    process.exit(1);
  });

export { clearAllDataExceptUsers };

