import{Router}from"express";import{detail,list}from"../controllers/importers.controller";const r=Router();r.get("/",list);r.get("/:id",detail);export default r;
