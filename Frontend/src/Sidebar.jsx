import "./Sidebar.css";
import logo from "./assets/RockAI.logo.png";
import { SquarePen, Trash2, X } from "lucide-react";
import { useContext, useEffect, useCallback } from "react";
import { MyContext } from "./MyContext";
import { v1 as uuidv1 } from "uuid";

function Sidebar() {
    const {
        allThreads,
        setAllThreads,
        currThreadId,
        setNewChat,
        setPrompt,
        setReply,
        setCurrThreadId,
        setPrevChats,
        setAnimatedMessage,
        sidebarOpen,
        setSidebarOpen
    } = useContext(MyContext);

    // Get the JWT from localStorage and prepare the request headers.
    const getAuthHeaders = () => {
        const token = localStorage.getItem("token");

        return token
            ? { Authorization: `Bearer ${token}` }
            : {};
    };

    // Fetch all conversations belonging to the authenticated user.
    const getAllThreads = useCallback(async () => {
        try {
            const response = await fetch(
                "https://3-104-229-106.sslip.io/api/thread",
                {
                    headers: getAuthHeaders()
                }
            );

            const res = await response.json();

            if (!response.ok) {
                throw new Error(
                    res.message || "Failed to fetch conversations"
                );
            }

            // Accept an array directly or an object containing threads.
            const threads = Array.isArray(res)
                ? res
                : res.threads;

            if (!Array.isArray(threads)) {
                throw new Error("Unexpected thread response format");
            }

            const filterData = threads.map((thread) => ({
                threadId: thread.threadId,
                title: thread.title
            }));

            setAllThreads(filterData);
        } catch (err) {
            console.error("Error fetching threads:", err.message);
        }
    }, [setAllThreads]);

    useEffect(() => {
        getAllThreads();
    }, [currThreadId, getAllThreads]);

    // Start a new conversation.
    const createNewChat = () => {
        setNewChat(true);
        setPrompt("");
        setReply([]);
        setAnimatedMessage(null);
        setCurrThreadId(uuidv1());
        setPrevChats([]);
        setSidebarOpen(false);

    };

    // Open an existing conversation.
    const changeThread = async (newThreadId) => {
        setCurrThreadId(newThreadId);
        setAnimatedMessage(null);

        try {
            const response = await fetch(
                `https://3-104-229-106.sslip.io/api/thread/${newThreadId}`,
                {
                    headers: getAuthHeaders()
                }
            );

            const res = await response.json();

            if (!response.ok) {
                throw new Error(
                    res.message || "Failed to load conversation"
                );
            }

            // Support either an array or an object containing messages.
            const messages = Array.isArray(res)
                ? res
                : res.messages;

            if (!Array.isArray(messages)) {
                throw new Error("Unexpected conversation response format");
            }

            setPrevChats(messages);
            setNewChat(false);
            setReply(null);
            setSidebarOpen(false);
        } catch (err) {
            console.error("Error loading thread:", err.message);
        }
    };

    // Delete a conversation.
    const deleteThread = async (threadId) => {
        try {
            const response = await fetch(
                `https://3-104-229-106.sslip.io/api/thread/${threadId}`,
                {
                    method: "DELETE",
                    headers: getAuthHeaders()
                }
            );

            const res = await response.json();

            if (!response.ok) {
                throw new Error(
                    res.message || "Failed to delete conversation"
                );
            }

            setAllThreads((prev) =>
                prev.filter((thread) => thread.threadId !== threadId)
            );

            if (threadId === currThreadId) {
                createNewChat();
            }
        } catch (err) {
            console.error("Error deleting thread:", err.message);
        }
    };

    return (
        <section className={`Sidebar ${sidebarOpen ? "open" : ""}`}>
            <button
                className="mobile-sidebar-close"
                onClick={() => setSidebarOpen(false)}
                aria-label="Close sidebar"
            >
                <X size={22} />
            </button>
            <button
                className="button"
                onClick={createNewChat}
            >
                <img
                    src={logo}
                    alt="AI Logo"
                    className="logo"
                />
                <SquarePen
                    className="new-chat-icon"
                    size={21}
                />
            </button>

            <ul className="history">
                {allThreads?.map((thread) => (
                    <li
                        key={thread.threadId}
                        className={`history-item ${currThreadId === thread.threadId
                            ? "active"
                            : ""
                            }`}
                    >
                        <span
                            className="history-title"
                            onClick={() => changeThread(thread.threadId)}
                            title={thread.title}
                        >
                            {thread.title}
                        </span>

                        <button
                            className="delete-chat-btn"
                            title="Delete chat"
                            aria-label={`Delete ${thread.title}`}
                            onClick={(e) => {
                                e.stopPropagation();
                                deleteThread(thread.threadId);
                            }}
                        >
                            <Trash2 size={16} />
                        </button>
                    </li>
                ))}
            </ul>

            <div className="sign">
                <p>By SoubikJana &hearts;</p>
            </div>
        </section>
    );
}

export default Sidebar;