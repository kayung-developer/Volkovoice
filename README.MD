# Volkovoice: AI-Powered Real-Time Dialogue Translator

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![Technology](https://img.shields.io/badge/Technology-Python%20%7C%20React%20%7C%20React%20Native-brightgreen)](https://react.dev/)

**Volkovoice is a full-stack, multi-platform, AI-powered application designed to break down language barriers through seamless, real-time voice and text translation.**

This repository contains the complete source code for the entire Volkovoice ecosystem, including:
*   A powerful **Python (FastAPI) Backend** for AI processing and real-time communication.
*   A feature-rich **React (Vite) Web Application** for desktop users.
*   A fully native **React Native Mobile Application** for both iOS and Android.

## ✨ Core Features

Volkovoice is more than just a translator; it's an intelligent communication suite built with a production-grade architecture and a high-end user experience.

| Feature                      | Description                                                                                                                                                             | Status       |
| ---------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------ |
| **Real-Time Voice Translation** | Engage in natural, bidirectional voice conversations. The AI listens, transcribes, translates, and speaks in real-time.                                                    | ✅ **Done**    |
| **State-of-the-Art Voice Cloning** | Clone your voice from a short audio sample. The AI will use your own vocal identity for translated audio output, providing a personalized experience.                 | ✅ **Done**    |
| **Real-Time Text Chat Mode**     | Communicate via a text-based chat interface with instant, bidirectional translation, perfect for noisy environments or users who prefer typing.                        | ✅ **Done**    |
| **AI-Powered Emotion Control**   | Influence the synthesized voice's delivery. Choose between neutral, excited, or calm tones to add an expressive layer to your translated speech.                        | ✅ **Done**    |
| **Intelligent Topic Recognition**| As the conversation progresses, an AI model identifies key topics and keywords, displaying them as interactive tags for instant contextual research.                    | ✅ **Done**    |
| **Conversation Summarization** | At the end of a session, generate a concise summary and a list of action items using a Large Language Model (LLM), transforming conversations into records.          | ✅ **Done**    |
| **Immersive 3D Avatars**         | Create a personal 3D avatar with Ready Player Me. The avatar features real-time, expressive lip-syncing and procedural idle animations on the web platform.              | ✅ **Done**    |
| **User-Managed Voice Studio**  | A dedicated interface to create, rename, preview, and delete your personal voice clones, giving you full control over your vocal identity.                             | ✅ **Done**    |
| **Multi-Platform Support**       | Access the full power of Volkovoice on the web or on the go with a fully native iOS and Android application.                                                           | ✅ **Done**    |
| **Augmented Reality (AR) Mode**  | (Future) A "moonshot" feature to overlay translated subtitles directly onto people in the real world through a device's camera.                                        | 🏗️ **Architected** |

## 🚀 Tech Stack

This project uses a modern, robust, and scalable technology stack.

**Backend:**
*   **Framework:** Python 3.10+ with FastAPI
*   **Real-Time:** WebSockets
*   **AI Models:**
    *   **Voice Cloning & TTS:** Coqui XTTSv2
    *   **Speech-to-Text (STT):** OpenAI Whisper
    *   **Translation:** Helsinki-NLP Opus-MT
    *   **Topic Recognition:** KeyBERT with Sentence-Transformers
    *   **Summarization:** OpenAI GPT-4 API
*   **Authentication:** Firebase Admin SDK
*   **Database:** SQLAlchemy with aiosqlite (dev) & PostgreSQL (prod-ready)

**Web Frontend:**
*   **Framework:** React 18 with Vite
*   **Styling:** Tailwind CSS with Dark Mode
*   **State Management:** SWR for data fetching, React Context for global state
*   **3D Rendering:** Three.js for the avatar
*   **Animations:** Framer Motion

**Mobile Frontend:**
*   **Framework:** React Native (TypeScript)
*   **Navigation:** React Navigation (Native Stack & Bottom Tabs)
*   **Styling:** Native StyleSheet with theme-aware design
*   **State Management:** SWR & React Context
*   **Animations:** React Native Reanimated
*   **Authentication:** React Native Firebase

## ⚙️ Getting Started & Setup

To get the full Volkovoice ecosystem running locally, you will need to set up the backend, web frontend, and mobile app.

### Prerequisites

*   **Node.js (v18+)**
*   **Python (v3.10+)**
*   **React Native CLI Development Environment:** Follow the official "React Native CLI Quickstart" guide for your OS.
*   **Firebase Project:** A Firebase project is required for authentication.
*   **API Keys:** You will need API keys for OpenAI.

### 1. Backend Setup

The backend powers all platforms. It must be running for the web and mobile apps to function.

```bash
# 1. Clone the repository
git clone https://github.com/your-username/volkovoice-project.git
cd volkovoice-project/backend

# 2. Install Python dependencies
pip install -r requirements.txt

# 3. Set up your environment variables
#    - Create a `.env` file and populate it with your Firebase service account key,
#      OpenAI API key, and other secrets as per the template.
cp .env.example .env

# 4. Download and place the XTTSv2 model files in `backend/models/xtts_v2/`

# 5. Run the server
uvicorn main:app --reload --port 8000
```
> The backend will be running at `http://localhost:8000`.

### 2. Web Frontend Setup

```bash
# 1. Navigate to the frontend directory
cd ../frontend

# 2. Install Node.js dependencies
npm install

# 3. Set up your environment variables
#    - Create a `.env.local` file and populate it with your client-side
#      Firebase configuration keys.
cp .env.local.example .env.local

# 4. Run the development server
npm run dev
```
> The web app will be running at `http://localhost:5173`.

### 3. Mobile App Setup

```bash
# 1. Navigate to the mobile app directory
cd ../VolkovoiceMobile

# 2. Install Node.js dependencies
npm install

# 3. Complete native Firebase setup
#    - Android: Place `google-services.json` in `android/app/`.
#    - iOS: Add `GoogleService-Info.plist` to your project in Xcode.

# 4. Install native dependencies (iOS)
cd ios && pod install && cd ..

# 5. Run the application
#    - Make sure you have an emulator running or a device connected.
#    - Ensure the backend server from step 1 is still running.

# For Android
npx react-native run-android

# For iOS (on macOS)
npx react-native run-ios
```

## 📜 License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.