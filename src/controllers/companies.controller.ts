import { NextFunction, Request, Response } from "express";
import { z } from "zod";
import * as companies from "../services/companies.service";
import { verifyMyCompany } from "../services/verification.service";
import { parseBody } from "../utils/validation";
const schema = z.object({ legalName: z.string().min(2), tradeName: z.string().optional(), countryCode: z.string().length(2), taxId: z.string().min(3), phone: z.string().optional(), contactEmail: z.email(), description: z.string().optional(), logoUrl: z.url().optional() }).strict();
export async function create(req: Request,res:Response,next:NextFunction){try{res.status(201).json(await companies.createCompany(req.auth!.userId,parseBody(schema,req.body)));}catch(e){next(e)}}
export async function mine(req:Request,res:Response,next:NextFunction){try{res.json(await companies.myCompany(req.auth!.userId));}catch(e){next(e)}}
export async function update(req:Request,res:Response,next:NextFunction){try{res.json(await companies.updateCompany(req.auth!.userId,parseBody(schema.partial(),req.body)));}catch(e){next(e)}}
export async function publicOne(req:Request,res:Response,next:NextFunction){try{res.json(await companies.publicCompany(String(req.params.id)));}catch(e){next(e)}}
export async function verify(req:Request,res:Response,next:NextFunction){try{res.json(await verifyMyCompany(req.auth!.userId));}catch(e){next(e)}}

