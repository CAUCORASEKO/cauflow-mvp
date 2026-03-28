import { pool } from "./db.js";

const testConnection = async () => {
  try {
    const result = await pool.query("SELECT NOW()");
    console.log("PostgreSQL connected ✅");
    console.log(result.rows[0]);
  } catch (error) {
    console.error("PostgreSQL connection error ❌");
    console.error(error.message);
  } finally {
    await pool.end();
  }
};

testConnection();