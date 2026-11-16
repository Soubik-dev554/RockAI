import express from "express";
import authMiddleware from "../Middlewares/authMiddleware.js";
import { fetchLatestNews } from "../controllers/newsController.js";

const router = express.Router();

router.get("/latest", authMiddleware, fetchLatestNews);

export default router;