# Pathfinder

> An AI-powered career and major exploration tool for students and career changers. Built for hackathons, demos, and real-world impact.

## 🚀 What is Pathfinder?

Pathfinder is an interactive web app that helps users discover the best college majors and career paths for their unique interests, strengths, and values. It uses AI to guide users through a conversational journey, analyzes their responses, and matches them to real-world careers and majors using the RIASEC personality model and live labor market data.

## 🧠 How It Works

1. **Conversational Intake:** Pathfinder asks users about their interests, strengths, and values in a friendly chat interface (voice or text).
2. **RIASEC Scoring:** User responses are analyzed to generate a RIASEC (Holland Code) profile.
3. **Personalized Matching:** The app matches users to careers and majors using the RIASEC profile and a database of real SOC (Standard Occupational Classification) and CIP (Classification of Instructional Programs) data.
4. **Career & Major Exploration:** Users can explore top career matches, see which majors lead to those careers, and get actionable next steps.
5. **AI-Powered Guidance:** All suggestions and summaries are generated with the help of OpenAI.

## ✨ Features

- Natural language chat interface (voice or text)
- RIASEC personality scoring
- Real-time career and major matching
- Explore career details and related majors
- Voice selection (powered by ElevenLabs)
- "Skip to Demo" for instant sample results
- Built with React, Vite, Supabase, and OpenAI

## 🛠️ Tech Stack

- **Frontend:** React + TypeScript + Vite + TailwindCSS
- **Backend:** Supabase (Postgres, Auth, RPC)
- **AI:** OpenAI GPT (for chat and suggestions)
- **Voice:** ElevenLabs API

## 🏁 Getting Started

1. **Clone the repo:**
   ```sh
   git clone https://github.com/your-username/pathfinder.git
   cd pathfinder
   ```
2. **Install dependencies:**
   ```sh
   npm install
   ```
3. **Set up environment variables:**
   - Copy `.env.example` to `.env` and fill in your Supabase, OpenAI, and ElevenLabs keys.
4. **Load the database:**
   - Make sure your Supabase project is set up and tables are created (see `supabase/migrations/`).
   - Load data:
     ```sh
     node load-soc-data.mjs
     node load-cip-majors.mjs
     ```
5. **Run the app:**
   ```sh
   npm run dev
   ```

## 🧩 Project Structure

- `src/` — React components, hooks, and services
- `supabase/` — SQL migrations and data
- `load-*.mjs` — Scripts to load SOC/CIP data into Supabase

## 🙋‍♂️ Why Pathfinder?

- Makes career exploration fun, fast, and personalized
- Built for hackathons: quick setup, easy demo, real data
- Extensible for schools, counselors, or job platforms

## 🏆 Hackathon Ready

- Demo mode for instant results
- Modern, beautiful UI
- Real-world data and AI

## 📄 License

MIT
