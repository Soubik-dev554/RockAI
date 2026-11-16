import { apiRequest } from "./api";

// Generate temporary Gemini Live token
export const createVoiceToken = async () => {
    try {
        const data = await apiRequest("/voice/token", {
            method: "POST"
        });

        if (!data.success || !data.token) {
            throw new Error("Unable to generate voice session token.");
        }

        return data.token;

    } catch (error) {
        console.error("Voice token request failed:", error);
        throw error;
    }
};


// Create a new voice conversation
export const createVoiceConversation = async () => {
    const data = await apiRequest("/voice/conversations", {
        method: "POST"
    });

    if (!data.success || !data.conversation?._id) {
        throw new Error("Unable to create voice conversation.");
    }

    return data.conversation;
};


// Save a voice message
export const saveVoiceMessage = async (
    conversationId,
    role,
    text
) => {
    if (!conversationId || !text?.trim()) {
        return;
    }

    return await apiRequest("/voice/conversations/message", {
        method: "POST",
        body: JSON.stringify({
            conversationId,
            role,
            text: text.trim()
        })
    });
};


// Get all voice conversations
export const getVoiceConversations = async () => {
    return await apiRequest("/voice/conversations", {
        method: "GET"
    });
};


// Get a specific voice conversation
export const getVoiceConversation = async (conversationId) => {
    return await apiRequest(
        `/voice/conversations/${conversationId}`,
        {
            method: "GET"
        }
    );
};


// Delete a voice conversation
export const deleteVoiceConversation = async (conversationId) => {
    return await apiRequest(
        `/voice/conversations/${conversationId}`,
        {
            method: "DELETE"
        }
    );
};