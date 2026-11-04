# 🤖 RockAI – AI-Powered Chatbot

RockAI is a full-stack AI chatbot application built using the MERN stack and OpenAI API. It provides an interactive conversational experience with user authentication, chat history management, and email-based password recovery.

## ✨ Features

* AI-powered conversations using OpenAI API.
* User registration and login.
* JWT-based authentication.
* Create and manage multiple conversations.
* Persistent chat history using MongoDB.
* Delete conversations.
* Forgot password and reset password functionality.
* Email integration using Brevo.
* Responsive user interface.

## 🛠️ Tech Stack

### Frontend

* React.js
* Vite
* JavaScript
* CSS

### Backend

* Node.js
* Express.js
* MongoDB
* Mongoose
* JWT Authentication

### External Services

* OpenAI API
* Brevo Email API
* MongoDB Atlas

## 📁 Project Structure

```text
RockAI/
├── Backend/
│   ├── config/
│   ├── controllers/
│   ├── Middlewares/
│   ├── Models/
│   ├── routes/
│   ├── Services/
│   ├── utils/
│   ├── server.js
│   └── package.json
│
├── Frontend/
│   ├── public/
│   ├── src/
│   ├── package.json
│   └── vite.config.js
│
└── README.md
```

## ⚙️ Installation and Setup

### 1. Clone the repository

```bash
git clone https://github.com/Soubik-dev554/RockAI.git
cd RockAI
```

### 2. Setup Backend

```bash
cd Backend
npm install
```

Create a `.env` file inside the Backend folder and configure:

```env
OPENAI_API_KEY=
MONGO_URI=
JWT_SECRET=
BREVO_API_KEY=
BREVO_SENDER_EMAIL=
FRONTEND_URL=
```

Add your own credentials locally. Never upload actual secrets to GitHub.

Start the backend using the development or start script defined in `Backend/package.json`.

### 3. Setup Frontend

Open another terminal:

```bash
cd Frontend
npm install
```

Create a `.env` file:

```env
VITE_API_URL=
```

Set this to your local backend URL during development.

Start the frontend using:

```bash
npm run dev
```

## 🔐 Security

* API keys and database credentials are stored in environment variables.
* Environment files containing secrets are excluded from Git.
* Authentication is handled using JWT.

## 🚀 Future Improvements

* Voice-based interaction.
* Conversation summarization.
* Improved chat experience.

## 👨‍💻 Developer

### Soubik Jana

GitHub: <https://github.com/Soubik-dev554>

---

⭐ If you find this project interesting, consider giving it a star!
