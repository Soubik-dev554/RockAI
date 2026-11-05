import "./Chatwindow.css";
import { ChevronDown, Menu } from "lucide-react";
import { useContext, useState, useEffect, useRef, useCallback } from "react";
import { MyContext } from "./MyContext";
import { ScaleLoader } from "react-spinners";
import Chat from "./Chat.jsx"
import UserProfile from "./Components/Userprofile.jsx";
import useAuth from "./context/useAuth.jsx";
// const token = localStorage.getItem("token");



function Chatwindow() {
    const{token} = useAuth();
    const {
        prompt,
        setPrompt,
        reply,
        setReply,
        currThreadId,
        setCurrThreadId,
        prevChats,
        setPrevChats,
        newChat,
        setNewChat,
        animatedMessage,
        setAnimatedMessage,
        sidebarOpen,
        setSidebarOpen,
    } = useContext(MyContext);

    const chatMessagesRef = useRef(null);
    const [loading, setLoading] = useState(false);
    const getReply = async () => {
        if (!prompt.trim() || loading) return;

        const userMessage = prompt.trim();

        // Hide the welcome heading
        setNewChat(false);

        // Display the user's message
        setPrevChats((prev) => [
            ...prev,
            { role: "user", content: userMessage },
        ]);

        setPrompt("");
        setLoading(true);

        try {
            const options = {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({
                    message: userMessage,
                    threadId: currThreadId,
                }),
            };

            const response = await fetch(
                "https://15-135-87-77.sslip.io/api/chat",
                options
            );

            const data = await response.json();

            if (!response.ok) {
                throw new Error(
                    typeof data === "object"
                        ? data.error || "Request failed"
                        : "Request failed"
                );
            }

            // Handle both string and object responses
            const assistantReply =
                typeof data === "string" ? data : data.reply;

            if (typeof assistantReply !== "string") {
                throw new Error("Invalid AI response format");
            }

            console.log("AI reply:", assistantReply);

            // Display the AI response only once
            const assistantMessage = {
                role: "assistant",
                content: assistantReply,
            };

            setAnimatedMessage(assistantMessage);
            setPrevChats((prev) => [...prev, assistantMessage]);
            setReply(assistantReply);

        } catch (err) {
            console.error("Chat error:", err);
        } finally {
            setLoading(false);
        }
    };
    const scrollToBottom = useCallback(() => {
        requestAnimationFrame(() => {
            const container = chatMessagesRef.current;

            if (container) {
                container.scrollTo({
                    top: container.scrollHeight,
                    behavior: "auto",
                });
            }
        });
    }, []);


    return (
        <div className="chatWindow">
            <div className="navbar">
                <div className="navbar-left">
                    <button
                        className="mobile-menu-btn"
                        type="button"
                        onClick={() => setSidebarOpen(!sidebarOpen)}
                        aria-label={sidebarOpen ? "Close menu" : "Open menu"}
                    >
                        <Menu size={22} />
                    </button>

                    <button className="brand-btn" type="button">
                        <span>RockAI</span>
                        <ChevronDown size={18} className="drop-down" />
                    </button>
                </div>

                <div className="user-icon" aria-label="User profile">
                    <UserProfile />
                </div>
            </div>
            <div className="chat-messages" ref={chatMessagesRef}>
                <Chat onContentChange={scrollToBottom}
                    animatedMessage={animatedMessage}
                />
                {loading && (
                    <div className="ScaleLoder">
                        <ScaleLoader color="#ffffff" />
                    </div>
                )}
            </div>

            {/* <ScaleLoader color="#fff"></ScaleLoader> */}
            <div className="chatInput">
                <div className="userInput">
                    <input
                        type="text"
                        placeholder="Ask anything"
                        value={prompt}
                        onChange={(e) => setPrompt(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === "Enter") {
                                e.preventDefault();
                                getReply();
                            }
                        }}>

                    </input>

                    <button id="submit" type="button" aria-label="Send prompt" onClick={getReply}>
                        <i className="fa-solid fa-arrow-up"></i>
                    </button>
                </div>

                <p className="info">
                    RockAI can make mistakes. Check important info.
                </p>
            </div>
        </div>
    );
}


export default Chatwindow;