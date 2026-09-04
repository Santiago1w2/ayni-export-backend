import { randomInt } from "crypto";
import bcrypt from "bcrypt";
import jwt, { SignOptions } from "jsonwebtoken";
import { AccountStatus, UserRole } from "@prisma/client";
import { prisma } from "../config/prisma";
import { env } from "../config/env";
import { AppError } from "../utils/errors";
import { sendVerificationEmail } from "./email.service";

const publicUser = { id:true,email:true,role:true,isActive:true,accountStatus:true,emailVerified:true,lastLoginAt:true,createdAt:true,updatedAt:true } as const;
const MAX_VERIFICATION_ATTEMPTS = 5;
const RESEND_COOLDOWN_MS = 60_000;
const VERIFICATION_EXPIRATION_MS = 10 * 60_000;
const INVALID_VERIFICATION_ERROR = "Verification code expired or invalid";

async function issueCode(userId:string,email:string){
  const latest=await prisma.emailVerification.findFirst({where:{userId,usedAt:null},orderBy:{createdAt:"desc"}});
  if(latest&&Date.now()-latest.createdAt.getTime()<RESEND_COOLDOWN_MS)throw new AppError("Please wait before requesting another code",429);
  const code=String(randomInt(0,1_000_000)).padStart(6,"0");
  const verification=await prisma.emailVerification.create({data:{userId,codeHash:await bcrypt.hash(code,10),expiresAt:new Date(Date.now()+VERIFICATION_EXPIRATION_MS)}});
  try{await sendVerificationEmail(email,code)}catch(error){
    await prisma.emailVerification.delete({where:{id:verification.id}}).catch(cleanupError=>console.error("[Email] Could not remove undelivered verification",cleanupError));
    throw error;
  }
  await prisma.emailVerification.updateMany({
    where: { userId, usedAt: null, id: { not: verification.id } },
    data: { usedAt: new Date() },
  });
}

export async function registerUser(email:string,password:string,role:UserRole){
  if(role===UserRole.ADMIN)throw new AppError("Admin accounts are created through the seed",403);
  if(await prisma.user.findUnique({where:{email}}))throw new AppError("email already registered",409);
  const user=await prisma.user.create({data:{email,passwordHash:await bcrypt.hash(password,12),role},select:publicUser});
  try{
    await issueCode(user.id,user.email);
    return{message:"Account created. Verification email sent.",requiresEmailVerification:true,emailSent:true,user};
  }catch(error){
    console.error("[Email] Account created but verification delivery failed",{userId:user.id,error});
    return{message:"Account created, but the verification email could not be sent. Log in and try resending it.",requiresEmailVerification:true,emailSent:false,user};
  }
}

export async function loginUser(email:string,password:string){
  const user=await prisma.user.findUnique({where:{email}});
  if(!user||!(await bcrypt.compare(password,user.passwordHash)))throw new AppError("invalid credentials",401);
  if(user.accountStatus===AccountStatus.BLOCKED)throw new AppError("Account blocked",403);
  if(user.accountStatus===AccountStatus.SUSPENDED)throw new AppError("Account suspended",403);
  if(!user.isActive)throw new AppError("Account blocked",403);
  if(!user.emailVerified)throw new AppError("Email verification required",403,{requiresEmailVerification:true});
  const updated=await prisma.user.update({where:{id:user.id},data:{lastLoginAt:new Date()},select:publicUser});
  const token=jwt.sign({userId:user.id,role:user.role},env.jwtSecret,{expiresIn:env.jwtExpiresIn as SignOptions["expiresIn"]});
  return{token,user:updated};
}

export const getMe=(userId:string)=>prisma.user.findUnique({where:{id:userId},select:{...publicUser,company:true}});
export async function verifyEmail(email:string,code:string){
  const user=await prisma.user.findUnique({where:{email},select:{id:true,emailVerified:true}});
  if(!user)throw new AppError(INVALID_VERIFICATION_ERROR,400);
  if(user.emailVerified)return{message:"Email already verified"};
  const userId=user.id;
  const verification=await prisma.emailVerification.findFirst({where:{userId,usedAt:null},orderBy:{createdAt:"desc"}});
  if(!verification)throw new AppError(INVALID_VERIFICATION_ERROR,400);
  if(verification.expiresAt<=new Date())throw new AppError("Verification code expired",400);
  if(verification.attempts>=MAX_VERIFICATION_ATTEMPTS)throw new AppError("Maximum verification attempts exceeded",429);
  if(!(await bcrypt.compare(code,verification.codeHash))){
    await prisma.emailVerification.update({where:{id:verification.id},data:{attempts:{increment:1}}});
    throw new AppError(INVALID_VERIFICATION_ERROR,400);
  }
  await prisma.$transaction(async(tx)=>{
    const consumed=await tx.emailVerification.updateMany({where:{id:verification.id,usedAt:null},data:{usedAt:new Date()}});
    if(consumed.count!==1)throw new AppError(INVALID_VERIFICATION_ERROR,400);
    await tx.user.update({where:{id:userId},data:{emailVerified:true}});
  });
  return{message:"Email verified successfully"};
}
export async function resendVerification(email:string){
  const user=await prisma.user.findUnique({where:{email},select:{id:true,email:true,emailVerified:true}});
  if(!user)return{message:"Verification email sent"};
  if(user.emailVerified)return{message:"Email already verified"};
  await issueCode(user.id,user.email);
  return{message:"Verification email sent"};
}
