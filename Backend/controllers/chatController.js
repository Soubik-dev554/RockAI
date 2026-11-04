import Thread from "../Models/Thread.js";
import getOpenAIAPIResponse from "../utls/openai.js";

// 1. Test route controller
export const testThread = async (req, res) => {
    try {
        const thread = new Thread({
            threadId: "xyz",
            title: "My First Thread"
        });

        const savedThread = await thread.save();

        res.send(savedThread);
    } catch (err) {
        console.log(err);

        res.status(500).json({
            error: "Failed to create thread",
            message: err.message
        });
    }
};


// 2. Get all threads
export const getThreads = async (req, res) => {
    try {
        const threads = await Thread.find({ userId: req.user.userId })
            .sort({ updatedAt: -1 });

        res.status(200).json(threads);
    } catch (err) {
        console.log(err);

        res.status(500).json({
            error: "Failed to fetch threads",
            message: err.message
        });
    }
};


// 3. Get a specific thread
export const getThreadById = async (req, res) => {
    const { threadId } = req.params;

    try {
        const thread = await Thread.findOne({ threadId, userId: req.user.userId });

        if (thread) {
            return res.status(200).json(thread.message);
        }

        return res.status(404).json({
            error: "Thread not found"
        });
    } catch (err) {
        console.error("Get thread error", err);

        res.status(500).json({
            error: "Failed to fetch thread"
        });
    }
};


// 4. Delete a thread
export const deleteThread = async (req, res) => {
    const { threadId } = req.params;

    try {
        const deletedThread = await Thread.findOneAndDelete({
            threadId, userId: req.user.userId
        });

        if (deletedThread) {
            return res.status(200).json({
                success: "Thread deleted successfully."
            });
        }

        return res.status(404).json({
            error: "Thread not found"
        });
    } catch (err) {
        console.error("Delete thread error", err);

        res.status(500).json({
            error: "Failed to delete thread"
        });
    }
};


// 5. Chat controller
export const sendMessage = async (req, res) => {
    try {
        const { threadId, message } = req.body ?? {};

        // Validate input
        if (
            typeof threadId !== "string" ||
            typeof message !== "string" ||
            !threadId.trim() ||
            !message.trim()
        ) {
            return res.status(400).json({
                error: "Thread ID and message are required."
            });
        }

        const ThreadId = threadId.trim();
        const Message = message.trim();
        const userId = req.user.userId;

        // Find the thread using the correct field names
        let thread = await Thread.findOne({
            threadId: ThreadId,
            userId: userId
        });

        // Create a new thread if it doesn't exist for this user
        if (!thread) {
            // Don't create a duplicate if this ID belongs to another user
            const existingThread = await Thread.findOne({
                threadId: ThreadId
            });

            if (existingThread) {
                return res.status(404).json({
                    error: "Thread not found."
                });
            }

            thread = new Thread({
                threadId: ThreadId,
                title: Message,
                userId: userId,
                message: [
                    {
                        role: "user",
                        content: Message
                    }
                ]
            });
        } else {
            // Add the user's message to the existing thread
            thread.message.push({
                role: "user",
                content: Message
            });
        }

        // Generate the AI response
        const recentMessages = thread.message.slice(-20);
        const assistantReply = await getOpenAIAPIResponse(recentMessages);

        // Save the assistant's response
        thread.message.push({
            role: "assistant",
            content: assistantReply
        });

        thread.updatedAt = new Date();

        // Save the thread
        await thread.save();

        return res.status(200).json(assistantReply);

    } catch (err) {
        console.error("Chat error:", err);

        if (err.code === 11000) {
            return res.status(409).json({
                error: "This thread already exists. Please retry."
            });
        }

        return res.status(500).json({
            error: "Failed to save chat."
        });
    }
};