import { pgPool as pool } from "../config/database";

export interface PropertyData {
  id?: number;
  name: string;
  address?: string;
  countryId?: number;
  stateId?: number;
  cityId?: number;
  ownerName: string;
  description?: string;
}

// Postgres lowercases unquoted aliases, so camelCase aliases must be double-quoted.
const PROPERTY_SELECT = `
  SELECT
    p.id,
    p.name,
    p.address,
    p.country_id AS "countryId",
    p.state_id AS "stateId",
    p.city_id AS "cityId",
    p.owner_name AS "ownerName",
    p.description,
    COALESCE(c.name, '') AS "cityName",
    COALESCE(s.name, '') AS "stateName",
    COALESCE(co.name, '') AS "countryName"
  FROM properties p
  LEFT JOIN cities c ON p.city_id = c.id
  LEFT JOIN states s ON p.state_id = s.id
  LEFT JOIN countries co ON p.country_id = co.id
`;

export async function getAllProperties(): Promise<any[]> {
  const result = await pool.query(`${PROPERTY_SELECT} ORDER BY p.id DESC;`);
  return result.rows;
}

export async function getPropertyById(id: number): Promise<any | null> {
  const result = await pool.query(`${PROPERTY_SELECT} WHERE p.id = $1;`, [id]);
  return result.rows[0] ?? null;
}

export async function checkDuplicatePropertyName(
  name: string,
  excludeId?: number,
): Promise<boolean> {
  let query = `SELECT id FROM properties WHERE LOWER(TRIM(name)) = LOWER(TRIM($1))`;
  const params: any[] = [name.trim()];
  if (excludeId) {
    query += ` AND id != $2`;
    params.push(excludeId);
  }
  const result = await pool.query(query, params);
  return result.rows.length > 0;
}

export async function checkPropertyInUse(
  id: number,
): Promise<{ inUse: boolean; table?: string }> {
  // Fixed whitelist, so interpolating the table name is safe.
  const tablesToCheck = [
    "buildings",
    "units",
    "allotments",
    "tenants",
    "rent_receipts",
    "release_rooms",
  ];
  for (const table of tablesToCheck) {
    try {
      const result = await pool.query(
        `SELECT 1 FROM "${table}" WHERE property_id = $1 LIMIT 1`,
        [id],
      );
      if (result.rows.length > 0) {
        return { inUse: true, table };
      }
    } catch (e) {
      // Table may not exist yet; log instead of silently swallowing.
      console.error(`checkPropertyInUse: query on "${table}" failed:`, e);
    }
  }
  return { inUse: false };
}

export async function createProperty(data: PropertyData): Promise<number> {
  const query = `
    INSERT INTO properties (name, address, country_id, state_id, city_id, owner_name, description)
    VALUES ($1, $2, $3, $4, $5, $6, $7)
    RETURNING id;
  `;
  const values = [
    data.name,
    data.address ?? null,
    data.countryId ?? null,
    data.stateId ?? null,
    data.cityId ?? null,
    data.ownerName,
    data.description ?? null,
  ];
  const result = await pool.query(query, values);
  return result.rows[0].id;
}

export async function updateProperty(
  id: number,
  data: PropertyData,
): Promise<boolean> {
  const query = `
    UPDATE properties
    SET
      name = $1,
      address = $2,
      country_id = $3,
      state_id = $4,
      city_id = $5,
      owner_name = $6,
      description = $7
    WHERE id = $8;
  `;
  const values = [
    data.name,
    data.address ?? null,
    data.countryId ?? null,
    data.stateId ?? null,
    data.cityId ?? null,
    data.ownerName,
    data.description ?? null,
    id,
  ];
  const result = await pool.query(query, values);
  return (result.rowCount ?? 0) > 0;
}

export async function deleteProperty(id: number): Promise<boolean> {
  const result = await pool.query(`DELETE FROM properties WHERE id = $1;`, [id]);
  return (result.rowCount ?? 0) > 0;
}