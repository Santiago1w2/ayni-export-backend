import { NextFunction, Request, Response } from "express";
import { generateAgreementPdf } from "../services/pdf.service";
import { Agreement, Company } from "../types/agreement.types";
import { AppError } from "../utils/errors";
import { z } from "zod";
import * as agreements from "../services/agreements.service";
import { parseBody } from "../utils/validation";

function isCompany(value: unknown): value is Company {
  if (!value || typeof value !== "object") return false;
  const company = value as Record<string, unknown>;
  return typeof company.name === "string" && Boolean(company.name.trim()) && typeof company.country === "string" && Boolean(company.country.trim());
}

export async function createAgreementPdf(request: Request<object, object, Agreement>, response: Response, next: NextFunction): Promise<void> {
  try {
    const agreement = request.body;
    if (typeof agreement.agreementId !== "string" || !agreement.agreementId.trim()) throw new AppError("agreementId es obligatorio");
    if (!isCompany(agreement.exporter)) throw new AppError("exporter debe incluir name y country");
    if (!isCompany(agreement.importer)) throw new AppError("importer debe incluir name y country");
    if (typeof agreement.product !== "string" || !agreement.product.trim()) throw new AppError("product es obligatorio");
    if (!Number.isFinite(agreement.quantityTonnes) || agreement.quantityTonnes <= 0) throw new AppError("quantityTonnes debe ser mayor que 0");
    if (!Number.isFinite(agreement.pricePerKg) || agreement.pricePerKg < 0) throw new AppError("pricePerKg debe ser mayor o igual que 0");
    if (typeof agreement.currency !== "string" || !agreement.currency.trim()) throw new AppError("currency es obligatorio");

    const pdf = await generateAgreementPdf(agreement);
    const safeId = agreement.agreementId.replace(/[^a-zA-Z0-9_-]/g, "-");
    response.setHeader("Content-Type", "application/pdf");
    response.setHeader("Content-Disposition", `attachment; filename="ayni-${safeId}.pdf"`);
    response.send(Buffer.from(pdf));
  } catch (error) { next(error); }
}

const agreementSchema=z.object({finalQuantityTons:z.number().positive(),pricePerKg:z.number().nonnegative(),currency:z.string().length(3),incoterm:z.string().min(2),destination:z.string().min(2),estimatedDelivery:z.coerce.date().optional(),notes:z.string().optional()});
export async function createStoredAgreement(req:Request,res:Response,next:NextFunction){try{res.status(201).json(await agreements.create(req.auth!.userId,String(req.params.id),parseBody(agreementSchema,req.body)))}catch(e){next(e)}}
export async function storedPdf(req:Request,res:Response,next:NextFunction){try{const result=await agreements.pdf(req.auth!.userId,String(req.params.id));res.type("application/pdf").attachment(`ayni-${result.code}.pdf`).send(Buffer.from(result.bytes))}catch(e){next(e)}}
export async function complete(req:Request,res:Response,next:NextFunction){try{res.json(await agreements.complete(req.auth!.userId,String(req.params.id)))}catch(e){next(e)}}
export async function completionPdf(req:Request,res:Response,next:NextFunction){try{const result=await agreements.completionPdf(req.auth!.userId,String(req.params.id));res.type("application/pdf").attachment(`ayni-completion-${result.code}.pdf`).send(Buffer.from(result.bytes))}catch(e){next(e)}}

