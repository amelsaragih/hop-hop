# Hop Hop — AI English Learning Agent

Hop Hop is an AI English-learning web app that evolved from a normal Gemini chatbot into an **AI learning agent**.

## What changed

- Gemini function calling is used as the agent's action layer.
- The agent can save new English mistakes to MySQL.
- The agent can read the user's learning profile and weakness categories.
- The agent can use previous mistakes when answering progress/review questions.
- Adaptive quiz generation is based on the user's own unreviewed mistakes.
- Quiz results are stored in MySQL.
- A progress dashboard visualizes mistakes, review status, weakness categories, and quiz history.
- Hop Hop's Pals now have explicit learning roles: Grammar, Daily Practice, Vocabulary, Conversation, Confidence, and Challenge.
- Existing login/session flow and avatar assets are retained.

## Architecture

`User → Frontend → /api/chat → Gemini Agent → Function Calling → MySQL → Gemini → User`

For adaptive practice:

`User → /api/quiz/start → MySQL learning memory → Gemini → quiz JSON → Frontend`

## Run locally

1. Install Node.js and MySQL.
2. Create the database named `english_chatbot` (or use the value in `.env`).
3. Copy `.env.example` to `.env` and fill in `GEMINI_API_KEY` and database credentials.
4. Run `npm install` if `node_modules` is not present.
5. Run `npm start`.
6. Open `http://localhost:3000`.

Tables are created/upgraded automatically when the backend starts.

## Important

The distributed project intentionally does **not** include `.env` secrets or `node_modules`. Put your own `.env` back in the project before running it.
