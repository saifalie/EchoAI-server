import { Router } from "express";
import resumeRoutes from "./resume.routes.js";
import authRoutes from "./auth.routes.js";


const rootRouter = Router()

rootRouter.use('/auth',authRoutes)
rootRouter.use('/resume',resumeRoutes)
// rootRouter.use('/interview')


export default rootRouter