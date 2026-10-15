import { Pool } from "pg";
import { env } from "./env.config";

// PostgreSQL connection
export const isPostgres = true;

export const pgPool = new Pool({
  host: env.DB.HOST,
  port: env.DB.PORT,
  user: env.DB.USER,
  password: env.DB.PASSWORD,
  database: env.DB.NAME,
  max: env.DB.CONNECTION_LIMIT,
  ssl: env.DB.SSL
    ? { rejectUnauthorized: false }
    : undefined,
});

// Main database pool
export const pool = pgPool;

// Root connection
export const dbRootConnection = new Pool({
  host: env.DB.HOST,
  port: env.DB.PORT,
  user: env.DB.USER,
  password: env.DB.PASSWORD,
  max: 5,
  ssl: env.DB.SSL
    ? { rejectUnauthorized: false }
    : undefined,
});

// Test PostgreSQL connection
pgPool
  .query(
    "SELECT current_database() AS database, NOW() AS server_time"
  )
  .then((result) => {
    console.log("PostgreSQL Connected Successfully");
    console.log("Database:", result.rows[0].database);
    console.log("Server Time:", result.rows[0].server_time);
  })
  .catch((err: Error) => {
    console.error(
      "PostgreSQL Connection Failed:",
      err.message
    );
  });
