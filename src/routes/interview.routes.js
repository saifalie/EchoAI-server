import { Router } from "express";
import auth from "../middlewares/authentication.js";
import { handleQnaUpload, prepareInterviewQuestions } from "../controllers/interview.controller.js";

import multer from "multer";


const interviewRoutes = Router()

const storage = multer.memoryStorage();
const upload = multer({ 
  storage,
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});


interviewRoutes.route('/questions').post(auth,prepareInterviewQuestions)
interviewRoutes.post(
    '/submit', 
    auth, 
    upload.array('answers', 10), // Allow up to 10 files with field name 'answers'
    handleQnaUpload
  );

export default interviewRoutes