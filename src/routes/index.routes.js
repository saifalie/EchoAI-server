import { Router } from "express";
import resumeRoutes from "./resume.routes.js";
import authRoutes from "./auth.routes.js";
import interviewRoutes from "./interview.routes.js";


const rootRouter = Router()

rootRouter.use('/auth',authRoutes)
rootRouter.use('/resume',resumeRoutes)
rootRouter.use('/interview',interviewRoutes)


export default rootRouter