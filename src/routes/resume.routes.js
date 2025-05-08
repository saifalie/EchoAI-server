import { Router } from "express";
import upload from "../config/multer.js";
import {  handleResumeUploadAndAnalyzation } from "../controllers/resume.controller.js";

const resumeRoutes =  Router()

resumeRoutes.route('/').post(upload.single('resume'),handleResumeUploadAndAnalyzation)

export default resumeRoutes