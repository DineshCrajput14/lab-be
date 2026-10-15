
import { pgPool } from "../config/database";

export interface ControlPanelSettingsData {
  tenantRegistrationNumberAuto: boolean;
  nextNumberTenant?: number | string;
  nextNumberReceipt?: number | string;
}

export async function getControlPanelSettings(): Promise<{
  controlPanelSetting: { tenantRegistrationNumberAuto: boolean };
  nextNumber: {
    nextNumberTenant: number | string;
    nextNumberReceipt?: number | string;
  };
}> {
  const result = await pgPool.query(
    `SELECT
       tenant_registration_number_auto,
       next_number_tenant,
       next_number_receipt
     FROM control_panel_settings
     ORDER BY id ASC
     LIMIT 1`,
  );

  const rows = result.rows;

  if (rows.length === 0) {
    return {
      controlPanelSetting: {
        tenantRegistrationNumberAuto: true,
      },
      nextNumber: {
        nextNumberTenant: 1,
        nextNumberReceipt: 101,
      },
    };
  }

  return {
    controlPanelSetting: {
      tenantRegistrationNumberAuto: Boolean(
        rows[0].tenant_registration_number_auto,
      ),
    },
    nextNumber: {
      nextNumberTenant: rows[0].next_number_tenant ?? 1,
      nextNumberReceipt: rows[0].next_number_receipt ?? 101,
    },
  };
}

export async function saveControlPanelSettings(
  data: ControlPanelSettingsData,
): Promise<boolean> {
  const result = await pgPool.query(
    `SELECT id
     FROM control_panel_settings
     ORDER BY id ASC
     LIMIT 1`,
  );

  const rows = result.rows;

  const autoFlag = data.tenantRegistrationNumberAuto;

  const nextNum =
    data.nextNumberTenant !== undefined &&
    data.nextNumberTenant !== null &&
    data.nextNumberTenant !== ""
      ? parseInt(String(data.nextNumberTenant), 10) || 1
      : null;

  const nextReceiptNum =
    data.nextNumberReceipt !== undefined &&
    data.nextNumberReceipt !== null &&
    data.nextNumberReceipt !== ""
      ? parseInt(String(data.nextNumberReceipt), 10) || 101
      : null;

  if (rows.length > 0) {
    const id = rows[0].id;

    const setClauses = [
      "tenant_registration_number_auto = $1",
    ];
    const params: any[] = [autoFlag];

    if (nextNum !== null) {
      params.push(nextNum);
      setClauses.push(`next_number_tenant = $${params.length}`);
    }

    if (nextReceiptNum !== null) {
      params.push(nextReceiptNum);
      setClauses.push(`next_number_receipt = $${params.length}`);
    }

    params.push(id);

    const updateResult = await pgPool.query(
      `UPDATE control_panel_settings
       SET ${setClauses.join(", ")}
       WHERE id = $${params.length}`,
      params,
    );

    return (updateResult.rowCount ?? 0) > 0;
  }

  const insertResult = await pgPool.query(
    `INSERT INTO control_panel_settings
       (id, tenant_registration_number_auto,
        next_number_tenant, next_number_receipt)
     VALUES (1, $1, $2, $3)
     RETURNING id`,
    [autoFlag, nextNum ?? 1, nextReceiptNum ?? 101],
  );

  return insertResult.rows.length > 0;
}

export async function getNextTenantNumberAndIncrement(
  usedNumber?: number | string,
): Promise<string> {
  const result = await pgPool.query(
    `SELECT
       id,
       tenant_registration_number_auto,
       next_number_tenant
     FROM control_panel_settings
     ORDER BY id ASC
     LIMIT 1`,
  );

  const rows = result.rows;

  if (rows.length === 0) {
    const num =
      usedNumber !== undefined && usedNumber !== null
        ? parseInt(String(usedNumber), 10) || 1
        : 1;

    await pgPool.query(
      `INSERT INTO control_panel_settings
         (id, tenant_registration_number_auto,
          next_number_tenant, next_number_receipt)
       VALUES (1, TRUE, $1, 101)`,
      [num + 1],
    );

    return String(num);
  }

  const currentNext = Number(rows[0].next_number_tenant) || 1;
  const id = rows[0].id;

  let newNext = currentNext + 1;

  if (usedNumber !== undefined && usedNumber !== null) {
    const parsed = parseInt(String(usedNumber), 10);

    if (!isNaN(parsed) && parsed >= currentNext) {
      newNext = parsed + 1;
    }
  }

  await pgPool.query(
    `UPDATE control_panel_settings
     SET next_number_tenant = $1
     WHERE id = $2`,
    [newNext, id],
  );

  return String(currentNext);
}

export async function getNextReceiptNumberAndIncrement(
  connection?: any,
  usedNumber?: number | string,
): Promise<string> {
  const db = connection || pgPool;

  const result = await db.query(
    `SELECT id, next_number_receipt
     FROM control_panel_settings
     ORDER BY id ASC
     LIMIT 1
     FOR UPDATE`,
  );

  const rows = result.rows;

  if (rows.length === 0) {
    const num =
      usedNumber !== undefined && usedNumber !== null
        ? parseInt(String(usedNumber), 10) || 101
        : 101;

    await db.query(
      `INSERT INTO control_panel_settings
         (id, tenant_registration_number_auto,
          next_number_tenant, next_number_receipt)
       VALUES (1, TRUE, 1, $1)`,
      [num + 1],
    );

    return String(num);
  }

  const currentNext =
    rows[0].next_number_receipt !== undefined &&
    rows[0].next_number_receipt !== null
      ? Number(rows[0].next_number_receipt)
      : 101;

  const id = rows[0].id;

  let newNext = currentNext + 1;

  if (usedNumber !== undefined && usedNumber !== null) {
    const parsed = parseInt(String(usedNumber), 10);

    if (!isNaN(parsed) && parsed >= currentNext) {
      newNext = parsed + 1;
    }
  }

  await db.query(
    `UPDATE control_panel_settings
     SET next_number_receipt = $1
     WHERE id = $2`,
    [newNext, id],
  );

  return String(currentNext);
}
