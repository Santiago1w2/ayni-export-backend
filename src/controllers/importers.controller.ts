import {NextFunction,Request,Response} from "express";import * as s from "../services/importers.service";
export async function list(req:Request,res:Response,next:NextFunction){try{res.json(await s.listImporters(req.query));}catch(e){next(e)}} export async function detail(req:Request,res:Response,next:NextFunction){try{res.json(await s.importerDetail(String(req.params.id)));}catch(e){next(e)}}

