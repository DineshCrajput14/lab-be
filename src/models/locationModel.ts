
import { pool } from "../config/database";

export interface Country {
  id: number;
  name: string;
}

export interface State {
  id: number;
  countryId: number;
  name: string;
}

export interface City {
  id: number;
  stateId: number;
  name: string;
}

export async function getCountries(): Promise<Country[]> {
  const result = await pool.query(
    "SELECT id, name FROM countries ORDER BY name ASC",
  );
  return result.rows;
}

export async function getStatesByCountryId(
  countryId: number,
): Promise<State[]> {
  const result = await pool.query(
    `SELECT id, country_id AS "countryId", name
     FROM states
     WHERE country_id = $1
     ORDER BY name ASC`,
    [countryId],
  );
  return result.rows;
}

export async function getCitiesByStateId(
  stateId: number,
): Promise<City[]> {
  const result = await pool.query(
    `SELECT id, state_id AS "stateId", name
     FROM cities
     WHERE state_id = $1
     ORDER BY name ASC`,
    [stateId],
  );
  return result.rows;
}

export async function getAllCities(): Promise<City[]> {
  const result = await pool.query(
    `SELECT id, state_id AS "stateId", name
     FROM cities
     ORDER BY name ASC`,
  );
  return result.rows;
}

export async function getCityById(id: number): Promise<City | null> {
  const result = await pool.query(
    `SELECT id, state_id AS "stateId", name
     FROM cities
     WHERE id = $1`,
    [id],
  );
  return result.rows[0] ?? null;
}

export async function createCity(
  stateId: number,
  name: string,
): Promise<number> {
  const result = await pool.query(
    `INSERT INTO cities (state_id, name)
     VALUES ($1, $2)
     RETURNING id`,
    [stateId, name],
  );
  return result.rows[0].id;
}

export async function updateCity(
  id: number,
  name: string,
  stateId?: number,
): Promise<boolean> {
  let result;

  if (stateId) {
    result = await pool.query(
      `UPDATE cities
       SET name = $1, state_id = $2
       WHERE id = $3`,
      [name, stateId, id],
    );
  } else {
    result = await pool.query(
      `UPDATE cities
       SET name = $1
       WHERE id = $2`,
      [name, id],
    );
  }

  return (result.rowCount ?? 0) > 0;
}

export async function checkCityInUse(
  id: number,
): Promise<{ inUse: boolean; table?: string }> {
  const tablesToCheck = ["properties", "tenants"];

  for (const table of tablesToCheck) {
    try {
      const result = await pool.query(
        `SELECT 1 FROM "${table}" WHERE city_id = $1 LIMIT 1`,
        [id],
      );

      if (result.rows.length > 0) {
        return { inUse: true, table };
      }
    } catch (error) {
      console.error(
        `checkCityInUse: query on "${table}" failed:`,
        error,
      );
    }
  }

  return { inUse: false };
}

export async function deleteCity(id: number): Promise<boolean> {
  const result = await pool.query(
    "DELETE FROM cities WHERE id = $1",
    [id],
  );

  return (result.rowCount ?? 0) > 0;
}