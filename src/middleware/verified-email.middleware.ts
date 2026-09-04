import{NextFunction,Request,Response}from"express";
import{prisma}from"../config/prisma";
import{AppError}from"../utils/errors";

export async function requireVerifiedEmail(req:Request,_res:Response,next:NextFunction):Promise<void>{
  try{if(!req.auth)throw new AppError("authentication required",401);const user=await prisma.user.findUnique({where:{id:req.auth.userId},select:{emailVerified:true}});if(!user?.emailVerified)throw new AppError("Email verification required",403);next()}catch(error){next(error)}
}
