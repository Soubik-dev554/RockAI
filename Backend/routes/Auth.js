import express from "express";
import { register } from "../controllers/authcontroller.js";
import {login} from "../controllers/LoginControler.js";
import {forgotPassword, resetPassword} from "../controllers/passwordController.js";

const router = express.Router();

router.post("/register", register);
router.post("/login", login);
router.post("/forgot-password", forgotPassword);
router.post("/reset-password", resetPassword);

export default router;