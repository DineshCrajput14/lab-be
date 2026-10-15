import { Request, Response } from "express";
import {
  getAllPatientTitles,
  getPatientTitleById,
  checkDuplicatePatientTitle,
  checkPatientTitleInUse,
  createPatientTitle,
  updatePatientTitle,
  deletePatientTitle,
} from "../models/patientTitleModel";
import { sendError } from "../utils/apiResponse";
import { HTTP_STATUS } from "../config/constants";

export async function getPatientTitlesList(req: Request, res: Response) {
  try {
    const patientTitles = await getAllPatientTitles();
    return res.status(HTTP_STATUS.OK).json({ patientTitles });
  } catch (error: any) {
    return sendError(
      res,
      HTTP_STATUS.INTERNAL_SERVER_ERROR,
      "Failed to fetch patient titles",
      error.message,
    );
  }
}

export async function getPatientTitleDetail(req: Request, res: Response) {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      return sendError(res, HTTP_STATUS.BAD_REQUEST, "Invalid Patient Title ID");
    }
    const patientTitle = await getPatientTitleById(id);
    if (!patientTitle) {
      return sendError(res, HTTP_STATUS.NOT_FOUND, "Patient title not found");
    }
    return res.status(HTTP_STATUS.OK).json({ patientTitle, ...patientTitle });
  } catch (error: any) {
    return sendError(
      res,
      HTTP_STATUS.INTERNAL_SERVER_ERROR,
      "Failed to fetch patient title detail",
      error.message,
    );
  }
}

export async function createNewPatientTitle(req: Request, res: Response) {
  try {
    const { patienttitle } = req.body;

    if (!patienttitle || !String(patienttitle).trim()) {
      return sendError(
        res,
        HTTP_STATUS.BAD_REQUEST,
        "Patient title is required",
      );
    }

    const trimmedTitle = String(patienttitle).trim();
    const isDuplicate = await checkDuplicatePatientTitle(trimmedTitle);
    if (isDuplicate) {
      return sendError(
        res,
        HTTP_STATUS.BAD_REQUEST,
        `Patient title "${trimmedTitle}" already exists`,
      );
    }

    const patienttitleid = await createPatientTitle({
      patienttitle: trimmedTitle,
    });

    return res.status(HTTP_STATUS.CREATED).json({
      message: "Patient Title Created Successfully",
      id: patienttitleid,
    });
  } catch (error: any) {
    // 23505 = unique_violation (race condition on a unique constraint)
    if (error && error.code === "23505") {
      return sendError(
        res,
        HTTP_STATUS.BAD_REQUEST,
        "Patient title already exists",
      );
    }
    return sendError(
      res,
      HTTP_STATUS.INTERNAL_SERVER_ERROR,
      "Failed to create patient title",
      error.message,
    );
  }
}

export async function editPatientTitle(req: Request, res: Response) {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      return sendError(res, HTTP_STATUS.BAD_REQUEST, "Invalid Patient Title ID");
    }

    const { patienttitle } = req.body;

    if (!patienttitle || !String(patienttitle).trim()) {
      return sendError(
        res,
        HTTP_STATUS.BAD_REQUEST,
        "Patient title is required",
      );
    }

    const trimmedTitle = String(patienttitle).trim();
    const isDuplicate = await checkDuplicatePatientTitle(trimmedTitle, id);
    if (isDuplicate) {
      return sendError(
        res,
        HTTP_STATUS.BAD_REQUEST,
        `Patient title "${trimmedTitle}" already exists`,
      );
    }

    const success = await updatePatientTitle(id, {
      patienttitle: trimmedTitle,
    });

    if (!success) {
      return sendError(res, HTTP_STATUS.NOT_FOUND, "Patient title not found");
    }

    return res.status(HTTP_STATUS.OK).json({
      message: "Patient Title Updated Successfully",
      id,
    });
  } catch (error: any) {
    if (error && error.code === "23505") {
      return sendError(
        res,
        HTTP_STATUS.BAD_REQUEST,
        "Patient title already exists",
      );
    }
    return sendError(
      res,
      HTTP_STATUS.INTERNAL_SERVER_ERROR,
      "Failed to update patient title",
      error.message,
    );
  }
}

export async function removePatientTitle(req: Request, res: Response) {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      return sendError(res, HTTP_STATUS.BAD_REQUEST, "Invalid Patient Title ID");
    }

    const usageCheck = await checkPatientTitleInUse(id);
    if (usageCheck.inUse) {
      return sendError(
        res,
        HTTP_STATUS.BAD_REQUEST,
        "This patient title is in use. Cannot be deleted.",
      );
    }

    const success = await deletePatientTitle(id);
    if (!success) {
      return sendError(res, HTTP_STATUS.NOT_FOUND, "Patient title not found");
    }

    return res.status(HTTP_STATUS.OK).json({
      message: "Patient Title Deleted Successfully",
    });
  } catch (error: any) {
    // PostgreSQL 23503 = foreign_key_violation (replaces MySQL ER_ROW_IS_REFERENCED / 1451)
    if (error && error.code === "23503") {
      return sendError(
        res,
        HTTP_STATUS.BAD_REQUEST,
        "This patient title is in use. Cannot be deleted.",
      );
    }
    return sendError(
      res,
      HTTP_STATUS.INTERNAL_SERVER_ERROR,
      "Failed to delete patient title",
      error.message,
    );
  }
}