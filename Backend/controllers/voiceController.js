import { GoogleGenAI } from "@google/genai";

const MODEL = "gemini-3.8-live";

// Initialize Gemini
const ai = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY,
    httpOptions: {
        apiVersion: "v1alpha"
    }
});

// Available Gemini Live tools
const availableTools = [
    {
        functionDeclarations: [
            {
                name: "get_current_location",
                description:
                    "Gets the user's current geographical coordinates when they ask about their current location.",
                parameters: {
                    type: "OBJECT",
                    properties: {},
                    required: []
                }
            },
            {
                name: "get_current_weather",
                description:
                    "Gets current weather conditions and today's weather forecast using the user's current location.",
                parameters: {
                    type: "OBJECT",
                    properties: {},
                    required: []
                }
            },
            {
                name: "get_latest_news",
                description:
                    "Fetch recent news articles based on the user's requested country, region, or topic. ALWAYS use this function for questions about current affairs, politics, government, elections, current office holders, and breaking news.",
                parameters: {
                    type: "OBJECT",
                    properties: {
                        topic: {
                            type: "STRING",
                            description:
                                "The country, region, or news topic requested by the user. Examples: India, World, West Bengal, Indian politics, Artificial Intelligence, Technology."
                        },
                        timespan: {
                            type: "STRING",
                            description:
                                "The time period for news. Use 24h for the latest daily news, 7d for weekly news."
                        },
                        limit: {
                            type: "INTEGER",
                            description:
                                "Number of news articles to retrieve, between 1 and 10."
                        }
                    },
                    required: ["topic"]
                }
            }
        ]
    }
];

// Create temporary Gemini voice token
export const createVoiceToken = async (req, res) => {
    try {
        if (!process.env.GEMINI_API_KEY) {
            return res.status(500).json({
                success: false,
                message: "Gemini API key is not configured."
            });
        }

        const token = await ai.authTokens.create({
            config: {
                uses: 1,

                expireTime: new Date(
                    Date.now() + 30 * 60 * 1000
                ).toISOString(),

                newSessionExpireTime: new Date(
                    Date.now() + 60 * 1000
                ),

                liveConnectConstraints: {
                    model: MODEL,

                    config: {
                        responseModalities: ["AUDIO"],

                        sessionResumption: {},

                        // RockAI System Instructions
                        systemInstruction: {
                            parts: [
                                {
                                    text: `
                                        You are RockAI, a helpful AI voice assistant.

                                        =================================
                                        CURRENT INFORMATION RULES
                                        =================================

                                        1. For questions about current affairs,
                                        politics, government, elections,
                                        and current office holders,
                                        ALWAYS call get_latest_news first.

                                        2. Never answer current-affairs questions
                                        using your existing knowledge alone.

                                        3. Use the latest available news articles.

                                        4. Check publication dates of retrieved articles.

                                        5. If retrieved information is outdated
                                        or insufficient, tell the user honestly.

                                        6. Never present historical information
                                        as current information.

                                        7. Mention the date of the information
                                        when answering.

                                        8. For questions about a specific region,
                                        search using that region's name.
                                        Example: West Bengal politics.

                                        =================================
                                        ANSWER FORMATTING RULES
                                        =================================

                                        1. Organize explanations and lists
                                        using numbered points.

                                        2. Use the format 1. 2. 3. 4.
                                        when presenting multiple points.

                                        3. Keep each numbered point clear,
                                        simple and easy to understand.

                                        4. For step-by-step instructions,
                                        always use numbered steps.

                                        5. Avoid bullet points when numbered
                                        points are more appropriate.

                                        6. For simple questions requiring
                                        a short answer, answer naturally
                                        without unnecessary numbering.

                                        7. When explaining multiple topics,
                                        use numbered headings and
                                        subpoints where appropriate.

                                        =================================
                                        COMMUNICATION STYLE
                                        =================================

                                        1. Speak naturally and conversationally.

                                        2. Use simple, understandable English.

                                        3. Avoid unnecessarily long answers.

                                        4. Be accurate, helpful and friendly.

                                        5. Never invent information.
                                    `
                                }
                            ]
                        },

                        tools: availableTools
                    }
                }
            }
        });

        return res.status(200).json({
            success: true,
            token: token.name
        });

    } catch (error) {
        console.error("Gemini voice token error:", error);

        return res.status(500).json({
            success: false,
            message: "Unable to initialize voice assistant."
        });
    }
};
