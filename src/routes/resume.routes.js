import { Router } from "express";
import upload from "../config/multer.js";
import {  handleResumeUploadAndAnalyzation } from "../controllers/resume.controller.js";
import auth from "../middlewares/authentication.js";

const resumeRoutes =  Router()

resumeRoutes.route('/').post(upload.single('resume'),auth,handleResumeUploadAndAnalyzation)

export default resumeRoutes