import { apiRequest } from "./api";

export const getLatestNews = async ({
    topic = "India",
    timespan = "24h",
    limit = 5
} = {}) => {
    try {
        const params = new URLSearchParams({
            topic,
            timespan,
            limit: String(limit)
        });

        const data = await apiRequest(
            `/news/latest?${params.toString()}`,
            {
                method: "GET"
            }
        );

        if (!data.success) {
            throw new Error(data.error || "Unable to fetch latest news.");
        }

        return data;

    } catch (error) {
        console.error("News Service Error:", error);
        throw error;
    }
};