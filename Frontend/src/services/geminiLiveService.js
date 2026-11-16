import { GoogleGenAI, Modality } from "@google/genai";
import { createVoiceToken } from "./voiceService";

const MODEL = "gemini-3.8-live";

// Tools available to Gemini Live
const availableTools = [
    {
        functionDeclarations: [
            {
                name: "get_current_location",
                description:
                    "Gets the user's current geographical location when requested.",
                parameters: {
                    type: "OBJECT",
                    properties: {},
                    required: []
                }
            },
            {
                name: "get_current_weather",
                description:
                    "Gets current weather conditions and today's forecast using the user's current location.",
                parameters: {
                    type: "OBJECT",
                    properties: {},
                    required: []
                }
            },
            {
                name: "get_weather_by_city",
                description:
                    "Get current weather and today's forecast for a specific city or location mentioned by the user.",
                parameters: {
                    type: "OBJECT",
                    properties: {
                        city: {
                            type: "STRING",
                            description: "The city or location name provided by the user."
                        }
                    },
                    required: ["city"]
                }
            },
            {
                name: "get_latest_news",
                description:
                    "Fetch recent news articles based on the user's requested country, region, or topic. Supports Indian news, international news, politics, business, technology, AI, sports, and science.",
                parameters: {
                    type: "OBJECT",
                    properties: {
                        topic: {
                            type: "STRING",
                            description:
                                "The country, region, or news topic requested by the user. Examples: India, World, West Bengal, Artificial Intelligence, Technology."
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

export const connectGeminiLive = async ({
    onOpen,
    onMessage,
    onAudio,
    onTranscript,
    onInterrupted,
    onError,
    onClose,
    onToolCall
}) => {
    try {
        // Get temporary token from RockAI backend
        const token = await createVoiceToken();

        // Initialize Gemini using temporary token
        const ai = new GoogleGenAI({
            apiKey: token,
            httpOptions: {
                apiVersion: "v1alpha"
            }
        });

        // Establish Gemini Live connection
        const session = await ai.live.connect({
            model: MODEL,

            config: {
                responseModalities: [Modality.AUDIO],
                inputAudioTranscription: {},
                outputAudioTranscription: {},
                sessionResumption: {},
                tools: availableTools
            },

            callbacks: {
                onopen: () => {
                    onOpen?.();
                },

                onmessage: (message) => {
                    const content = message.serverContent;

                    // Handle Gemini interruption
                    if (content?.interrupted) {
                        onInterrupted?.();
                    }

                    // Handle Gemini function calls
                    if (message.toolCall?.functionCalls?.length) {
                        try {
                            onToolCall?.(message.toolCall, session);
                        } catch (error) {
                            console.error(
                                "Gemini tool execution error:",
                                error
                            );

                            onError?.(error);
                        }
                    }

                    // Handle generated audio chunks
                    const parts = content?.modelTurn?.parts || [];

                    for (const part of parts) {
                        if (part.inlineData?.data) {
                            const audioData = part.inlineData.data;

                            const mimeType =
                                part.inlineData.mimeType || "";

                            if (mimeType.startsWith("audio/pcm")) {
                                onAudio?.(audioData);
                            }
                        }
                    }

                    // Handle user's speech transcription
                    const userText =
                        content?.inputTranscription?.text;

                    if (userText) {
                        onTranscript?.({
                            role: "user",
                            text: userText
                        });
                    }

                    // Handle Gemini's response transcription
                    const assistantText =
                        content?.outputTranscription?.text;

                    if (assistantText) {
                        onTranscript?.({
                            role: "assistant",
                            text: assistantText
                        });
                    }

                    // Forward complete message
                    onMessage?.(message);
                },

                onerror: (error) => {
                    console.error("Gemini Live error:", error);

                    onError?.(error);
                },

                onclose: (event) => {
                    onClose?.(event);
                }
            }
        });

        return session;

    } catch (error) {
        console.error("Gemini connection failed:", error);

        throw error;
    }
};
