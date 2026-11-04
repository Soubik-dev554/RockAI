import "./Chat.css";
import { useContext, useEffect, useState } from "react";
import { MyContext } from "./MyContext";
import ReactMarkdown from "react-markdown";
import rehypeHighlight from "rehype-highlight";
import "highlight.js/styles/github-dark.css";

// Typing effect component
function TypingMessage({ content, animate, onTypingUpdate }) {
  const [typing, setTyping] = useState({
    content: null,
    text: "",
  });

  const displayedText = animate
    ? typing.content === content
      ? typing.text
      : ""
    : content;

  useEffect(() => {
    if (!animate) {
      return;
    }

    const words = content.split(/(\s+)/);
    let index = 0;

    const interval = setInterval(() => {
      index++;

      setTyping({
        content,
        text: words.slice(0, index).join(""),
      });

      // Automatically scroll while the AI types
      onTypingUpdate?.();

      if (index >= words.length) {
        clearInterval(interval);
      }
    }, 35);

    return () => clearInterval(interval);
  }, [content, animate, onTypingUpdate]);

  return (
    <ReactMarkdown rehypePlugins={[rehypeHighlight]}>
      {displayedText}
    </ReactMarkdown>
  );
}

function Chat({ onContentChange, animatedMessage }) {
  const { newChat, prevChats } = useContext(MyContext);

  // Find the most recent assistant message
  // const lastAssistantIndex = prevChats
  //   ? prevChats.reduce(
  //     (lastIndex, chat, index) =>
  //       chat.role === "assistant" ? index : lastIndex,
  //     -1
  //   )
  //   : -1;

  // Scroll when messages are added
  useEffect(() => {
    onContentChange?.();
  }, [prevChats, onContentChange]);

  return (
    <div className="chat-content">

      {/* Welcome message */}
      {newChat && prevChats?.length === 0 && (
        <div className="welcome-message">
          <h1>Welcome to RockAI.</h1>
          <p>What can I help you discover today?</p>
        </div>
      )}

      {/* Chat messages */}
      <div className="chats">
        {prevChats?.map((chat, index) => (
          <div
            key={index}
            className={
              chat.role === "user"
                ? "userDiv"
                : "aiDiv"
            }
          >
            {chat.role === "user" ? (
              <p className="userMessage">
                {chat.content}
              </p>
            ) : (
              <div className="aiMessage">
                <TypingMessage
                  content={chat.content}
                  animate={
                    chat === animatedMessage 
                    // (
                    //   chat.role === "assistant" &&
                    //   chat.content === animatedMessage?.content &&
                    //   index === prevChats.length - 1
                    // )
                  }
                  onTypingUpdate={onContentChange}
                />
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export default Chat;