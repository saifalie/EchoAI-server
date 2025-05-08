import { Router } from "express";
import { getUser, handleLogin, handleRegister } from "../controllers/login.controller.js";
import auth from "../middlewares/authentication.js";


const authRoutes = Router()

authRoutes.route('/login').post(handleLogin)
authRoutes.route('/register').post(handleRegister);
authRoutes.route('/me').get(auth,getUser)
export default authRoutes