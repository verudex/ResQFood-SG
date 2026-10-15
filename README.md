# 🍱 ResQFood-SG

ResQFood-SG helps NGOs and volunteers redistribute surplus food safely in Singapore 🇸🇬. Donors can paste a plain-text message, and the app turns it into a structured, verified donation record. Volunteers can ask food-safety questions and get answers drawn from an SFA compliance manual.

🌐 **Live demo:** https://resqfood-sg.vercel.app

> ⏳ The backend may take 30-60 seconds to respond to the first request after a period of inactivity while the server wakes up.

## ✨ Features

- 🔐 **Singpass identity check (mock):** a "Verify Identity via Singpass" button that simulates a GovTech Singpass login and shows the verified name.
- 📝 **Donation parser:** paste a WhatsApp-style message (for example, "20 packets of chicken bento at 560212, expires in 2 hours") and the app extracts the item, quantity, unit, location and expiry.
  - 📍 The pickup location must include a Singapore postal code, which is verified against OneMap.
  - ⚠️ Missing or unclear details are flagged for correction instead of being guessed, and incomplete donations are never saved.
  - ⏰ Priority (low, medium, high) is calculated from how soon the food expires, and expired donations are removed automatically.
- 🤖 **SFA Compliance Assistant:** ask a question in plain language and get an answer grounded in the SFA manual, with the source page numbers shown. If the manual doesn't cover something, it says so.

## ⚙️ How it works

1. 🖥️ The React frontend sends requests to the Express API.
2. 🧠 Donation messages are read by an OpenAI model, then validated and verified on the server before being saved to MongoDB.
3. 📚 Manual questions are matched to the most relevant manual pages using local embeddings, and the answer is generated from those pages only.

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| 🎨 Frontend | React 19, Vite, Tailwind CSS |
| 🟢 Backend | Node.js, Express |
| 🗄️ Database | MongoDB with Mongoose |
| 🤖 AI | OpenAI `gpt-4o-mini` (donation parsing and answers) |
| 🧬 Embeddings | Hugging Face Transformers (`Xenova/all-MiniLM-L6-v2`, runs locally) |
| 📍 Address verification | OneMap API |
| 🛡️ Security | Helmet, CORS allowlist, input validation |
| 🧪 Testing | Vitest, mongodb-memory-server |
| ☁️ Hosting | Vercel (frontend), Render (backend) |
