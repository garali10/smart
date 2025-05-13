import React, { useState } from "react";
import axios from "axios";

export default function Chatbot() {
  const [messages, setMessages] = useState([
    { from: "bot", text: "Bonjour ! Posez-moi votre question." }
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  const sendMessage = async () => {
    if (!input.trim()) return;
    const userMsg = { from: "user", text: input };
    setMessages((msgs) => [...msgs, userMsg]);
    setInput("");
    setLoading(true);

    try {
      const res = await axios.post("/api/chat", { message: input });
      setMessages((msgs) => [
        ...msgs,
        { from: "bot", text: res.data.reply }
      ]);
    } catch (err) {
      setMessages((msgs) => [
        ...msgs,
        { from: "bot", text: "Erreur lors de la réponse du bot." }
      ]);
    }
    setLoading(false);
  };

  return (
    <div style={{
      maxWidth: 600, 
      width: "90%", 
      margin: "2rem auto", 
      border: "2px solid #800000",
      borderRadius: 16, 
      padding: 24, 
      background: "#ffffff",
      boxShadow: "0 4px 12px rgba(128,0,0,0.1)"
    }}>
      <h3 style={{ textAlign: "center", fontSize: "1.5rem", marginBottom: "1.5rem", color: "#800000" }}>Chatbot IA</h3>
      <div style={{ minHeight: 250, maxHeight: 400, overflowY: "auto", marginBottom: 20, padding: "0 10px" }}>
        {messages.map((msg, i) => (
          <div key={i} style={{
            textAlign: msg.from === "user" ? "right" : "left",
            margin: "10px 0"
          }}>
            <span style={{
              display: "inline-block",
              background: msg.from === "user" ? "#800000" : "#e9ecef",
              color: msg.from === "user" ? "#ffffff" : "#000000",
              borderRadius: 16,
              padding: "10px 16px",
              maxWidth: "80%",
              wordWrap: "break-word"
            }}>
              {msg.text}
            </span>
          </div>
        ))}
        {loading && <div style={{ color: "#888", padding: "10px 0", fontStyle: "italic" }}>Le bot réfléchit...</div>}
      </div>
      <div style={{ display: "flex", gap: 10 }}>
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === "Enter" && sendMessage()}
          style={{ 
            flex: 1, 
            borderRadius: 12, 
            border: "1px solid #800000", 
            padding: "12px 16px",
            fontSize: "1rem",
            backgroundColor: "#ffffff",
            color: "#000000"
          }}
          placeholder="Votre question..."
        />
        <button
          onClick={sendMessage}
          disabled={loading}
          style={{
            background: "#800000", 
            color: "#fff", 
            border: "none",
            borderRadius: "50%", 
            width: "48px",
            height: "48px",
            minWidth: "auto",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
            transition: "background-color 0.2s"
          }}
          title="Envoyer"
        >
          {loading ? (
            <span style={{ fontSize: "18px" }}>...</span>
          ) : (
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M22 2L11 13"
                stroke="white"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M22 2L15 22L11 13L2 9L22 2Z"
                stroke="white"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                fill="white"
              />
            </svg>
          )}
        </button>
      </div>
    </div>
  );
} 