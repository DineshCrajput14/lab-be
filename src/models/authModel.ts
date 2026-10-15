
import { pgPool } from "../config/database";

export async function findUserByUsernameOrEmail(identifier: string) {
  const result = await pgPool.query(
    `SELECT
       id,
       name,
       username,
       email,
       password,
       phone,
       userrolecode AS "userRoleCode",
       status,
       imageurl AS "imageUrl"
     FROM users
     WHERE username = $1 OR email = $1
     LIMIT 1`,
    [identifier],
  );

  return result.rows.length > 0 ? result.rows[0] : null;
}

export async function findUserByEmail(email: string) {
  return findUserByUsernameOrEmail(email);
}

export async function findUserById(id: number) {
  const result = await pgPool.query(
    `SELECT
       id,
       name,
       username,
       email,
       phone,
       userrolecode AS "userRoleCode",
       status,
       imageurl AS "imageUrl"
     FROM users
     WHERE id = $1`,
    [id],
  );

  return result.rows.length > 0 ? result.rows[0] : null;
}

export async function createUser(userData: {
  name: string;
  username?: string;
  email: string;
  passwordHash: string;
  phone?: string;
  userRoleCode?: string;
}) {
  const username = userData.username || userData.email.split("@")[0];

  const result = await pgPool.query(
    `INSERT INTO users
       (name, username, email, password, phone, userrolecode)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING id`,
    [
      userData.name,
      username,
      userData.email,
      userData.passwordHash,
      userData.phone || null,
      userData.userRoleCode || null,
    ],
  );

  return result.rows[0].id;
}
