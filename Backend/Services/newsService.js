const NEWS_API = "https://newsapi.org/v2/everything";

export const getLatestNews = async ({
    topic = "India",
    timespan = "24h",
    limit = 5
} = {}) => {
    try {
        if (!process.env.NEWS_API_KEY) {
            throw new Error("NEWS_API_KEY is missing from backend .env");
        }

        const searchTopic = String(topic).trim();

        if (!searchTopic || searchTopic.length > 100) {
            throw new Error("Please provide a valid news topic.");
        }

        const safeLimit = Math.min(
            Math.max(Number(limit) || 5, 1),
            10
        );

        const params = new URLSearchParams({
            q: searchTopic,
            sortBy: "publishedAt",
            pageSize: String(safeLimit),
            language: "en"
        });

        // Set search period
        if (timespan === "7d") {
            const date = new Date();
            date.setDate(date.getDate() - 7);

            params.set("from", date.toISOString().split("T")[0]);
        }

        const response = await fetch(
            `${NEWS_API}?${params.toString()}`,
            {
                method: "GET",
                headers: {
                    "X-Api-Key": process.env.NEWS_API_KEY
                }
            }
        );

        const data = await response.json();

        if (!response.ok || data.status !== "ok") {
            throw new Error(
                data.message || `News API error: ${response.status}`
            );
        }

        const articles = (data.articles || []).map(article => ({
            title: article.title,
            description: article.description,
            source: article.source?.name || "Unknown source",
            url: article.url,
            image: article.urlToImage,
            publishedAt: article.publishedAt
        }));

        return {
            success: true,
            topic: searchTopic,
            totalResults: data.totalResults,
            articles
        };

    } catch (error) {
        console.error("News Service Error:", error);

        return {
            success: false,
            error: error.message
        };
    }
};