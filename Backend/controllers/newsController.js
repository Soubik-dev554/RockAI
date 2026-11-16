import { getLatestNews } from "../Services/newsService.js";

export const fetchLatestNews = async (req, res) => {
    try {
        const {
            topic = "India",
            timespan = "24h",
            limit = 5
        } = req.query;

        const news = await getLatestNews({
            topic,
            timespan,
            limit
        });

        if (!news.success) {
            return res.status(500).json(news);
        }

        return res.status(200).json(news);

    } catch (error) {
        console.error("News Controller Error:", error);

        return res.status(500).json({
            success: false,
            error: "Unable to fetch latest news."
        });
    }
};