import{UserRole}from"@prisma/client";
import{NextFunction,Request,Response}from"express";
import{AppError}from"../utils/errors";
export function requireAdmin(req:Request,_res:Response,next:NextFunction):void{if(req.auth?.role!==UserRole.ADMIN)return next(new AppError("forbidden",403));next()}
