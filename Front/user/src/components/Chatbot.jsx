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
      maxWidth: 400, margin: "2rem auto", border: "1px solid #eee",
      borderRadius: 12, padding: 16, background: "#fafbfc"
    }}>
      <h3 style={{ textAlign: "center" }}>Chatbot IA</h3>
      <div style={{ minHeight: 120, marginBottom: 12 }}>
        {messages.map((msg, i) => (
          <div key={i} style={{
            textAlign: msg.from === "user" ? "right" : "left",
            margin: "6px 0"
          }}>
            <span style={{
              display: "inline-block",
              background: msg.from === "user" ? "#d1e7dd" : "#e9ecef",
              borderRadius: 8,
              padding: "6px 12px"
            }}>
              {msg.text}
            </span>
          </div>
        ))}
        {loading && <div style={{ color: "#888" }}>Le bot réfléchit...</div>}
      </div>
      <div style={{ display: "flex", gap: 8 }}>
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === "Enter" && sendMessage()}
          style={{ flex: 1, borderRadius: 6, border: "1px solid #ccc", padding: 8 }}
          placeholder="Votre question..."
        />
        <button
          onClick={sendMessage}
          disabled={loading}
          style={{
            background: "#0d6efd", color: "#fff", border: "none",
            borderRadius: 6, padding: "8px 16px", fontWeight: "bold"
          }}
        >
          Envoyer
        </button>
      </div>
    </div>
  );
} 