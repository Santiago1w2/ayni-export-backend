import { NextFunction, Request, Response } from "express";
import { z } from "zod";
import * as service from "../services/offers.service";
import { getOfferMatches } from "../services/match.service";
import { parseBody } from "../utils/validation";

const schema = z.object({
  productName: z.string().min(2),
  category: z.string().trim().min(1).max(100).optional(),
  description: z.string().optional(),
  quantityTons: z.number().positive(),
  pricePerKg: z.number().nonnegative(),
  currency: z.string().length(3),
  certifications: z.array(z.string()),
  preferredRegion: z.string().optional(),
  preferredCountries: z.array(z.string()).default([]),
  availabilityDate: z.coerce.date().optional(),
  status: z.enum(["ACTIVE", "INACTIVE", "CLOSED"]).optional(),
});

export async function create(req: Request, res: Response, next: NextFunction) { try { res.status(201).json(await service.createOffer(req.auth!.userId, parseBody(schema, req.body))); } catch (error) { next(error); } }
export async function mine(req: Request, res: Response, next: NextFunction) { try { res.json(await service.mine(req.auth!.userId)); } catch (error) { next(error); } }
export async function one(req: Request, res: Response, next: NextFunction) { try { res.json(await service.one(String(req.params.id))); } catch (error) { next(error); } }
export async function update(req: Request, res: Response, next: NextFunction) { try { res.json(await service.update(req.auth!.userId, String(req.params.id), parseBody(schema.partial(), req.body))); } catch (error) { next(error); } }
export async function remove(req: Request, res: Response, next: NextFunction) { try { await service.remove(req.auth!.userId, String(req.params.id)); res.status(204).send(); } catch (error) { next(error); } }
export async function matches(req: Request, res: Response, next: NextFunction) { try { res.json(await getOfferMatches(req.auth!.userId, String(req.params.id))); } catch (error) { next(error); } }
