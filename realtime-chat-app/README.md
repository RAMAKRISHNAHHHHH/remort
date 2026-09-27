# Realtime Chat App

A full-stack, production-style real-time chat and one-to-one video/audio calling web application, built with the MERN stack + Socket.IO + WebRTC.

## 1. Project Description

This app lets two or more registered users:
- Sign up and log in securely (JWT + bcrypt).
- See who else is registered and who is currently online.
- Chat one-to-one in real time, with typing indicators and delivery/read receipts.
- Make one-to-one audio or video calls directly in the browser using WebRTC.

It is designed to be run and developed entirely from VS Code, with the frontend and backend as two separate npm projects inside one repository.

## 2. Features

**Authentication**
- Register / Login / Logout
- Passwords hashed with bcrypt
- JWT-based session, stored in `localStorage`
- Protected REST routes and protected React routes

**Chat**
- Searchable user list with online/offline status
- One-to-one private conversations
- Real-time message delivery via Socket.IO (private rooms, never broadcast)
- Message timestamps
- Typing indicator ("typing...")
- Delivered (✓) and Read (✓✓) receipts
- Auto-scroll to the latest message
- Delete your own messages
- Empty states (no users found / no messages yet)
- Chat history persisted in MongoDB

**Video/Audio Calling (WebRTC)**
- Start a video or audio call from the chat header
- Incoming call popup with Accept / Reject
- Local + remote video preview
- Mute/unmute microphone, enable/disable camera
- Call duration timer
- Connection status: Calling... / Connecting... / Connected / Call Ended
- Graceful handling of rejected calls, ended calls, and disconnects
- Uses a public STUN server for development; structured so a TURN server can be added later with a one-line change

**UI**
- WhatsApp/Telegram-inspired two-pane layout
- Responsive: on narrow screens, the sidebar and chat window swap with a back button
- Light and dark mode toggle

## 3. Technology Stack

| Layer          | Technology                          |
|----------------|--------------------------------------|
| Frontend       | React 18, Vite, JavaScript, CSS3     |
| Backend        | Node.js, Express.js                  |
| Real-time      | Socket.IO                            |
| Database       | MongoDB + Mongoose                   |
| Auth           | JWT, bcryptjs                        |
| Calling        | WebRTC (RTCPeerConnection) + STUN    |

## 4. Architecture

```
Browser (React + Vite)  <---- HTTP (REST/JWT) ---->  Express API  <---->  MongoDB
        |                                                  |
        |  <--------------- Socket.IO (WebSocket) -------->|
        |                                                  |
        |  <------ WebRTC media (peer-to-peer, via STUN) ->|  (other browser)
```

- **REST API** handles authentication, fetching the user list, and fetching/deleting chat history.
- **Socket.IO** handles everything that needs to happen instantly: presence, live messages, typing indicators, and WebRTC signaling (offer/answer/ICE candidates). Every connected user joins a **private room named after their own user ID**, so events are always sent to one specific user — private messages and call signals are never broadcast to everyone.
- **WebRTC** is used only to negotiate and carry the actual audio/video stream directly between the two browsers (peer-to-peer). Socket.IO is only the "messenger" that helps the two browsers find and set up that direct connection.

## 5. Folder Structure

```
realtime-chat-app/
├── client/                    # React + Vite frontend
│   ├── src/
│   │   ├── components/        # Sidebar, ChatWindow, Message, MessageInput,
│   │   │                      # VideoCall, IncomingCall, Profile, ProtectedRoute
│   │   ├── pages/              # Login, Register, Chat
│   │   ├── services/           # api.js (REST), socket.js (Socket.IO client)
│   │   ├── context/             # AuthContext, SocketContext
│   │   ├── App.jsx, main.jsx, index.css
│   ├── index.html
│   ├── vite.config.js
│   ├── .env.example
│   └── package.json
│
├── server/                     # Node + Express backend
│   ├── config/db.js            # MongoDB connection
│   ├── models/                 # User.js, Message.js (Mongoose schemas)
│   ├── controllers/            # authController, userController, messageController
│   ├── routes/                 # authRoutes, userRoutes, messageRoutes
│   ├── middleware/authMiddleware.js
│   ├── socket/socketHandler.js  # All Socket.IO + WebRTC signaling logic
│   ├── server.js                # App entry point
│   ├── .env.example
│   └── package.json
│
├── README.md
└── .gitignore
```

## 6. Prerequisites

- **Node.js** v18 or later ([nodejs.org](https://nodejs.org))
- **MongoDB** running locally, or a free [MongoDB Atlas](https://www.mongodb.com/atlas) cluster
- **VS Code** (or any editor) and two modern browsers (or two browser profiles/windows) for testing

## 7. Installation (Windows PowerShell)

Open **two separate PowerShell terminals** in VS Code (Terminal → Split Terminal): one for the backend, one for the frontend.

### 7.1 Backend setup

```powershell
cd realtime-chat-app\server
copy .env.example .env
npm install
```

Open the new `.env` file and fill in your own values:

```
MONGO_URI=mongodb://127.0.0.1:27017/realtime-chat-app
JWT_SECRET=replace_this_with_a_long_random_secret_string
PORT=5000
CLIENT_URL=http://localhost:5173
```

> Generate a strong random `JWT_SECRET`, for example by running:
> `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"`

Start the backend (uses nodemon, auto-restarts on file changes):

```powershell
npm run dev
```

You should see:
```
MongoDB connected: 127.0.0.1
Server running on http://localhost:5000
```

### 7.2 Frontend setup

In the second terminal:

```powershell
cd realtime-chat-app\client
copy .env.example .env
npm install
npm run dev
```

Vite will print a local URL — open **http://localhost:5173** in your browser.

## 8. MongoDB Configuration

**Option A — Local MongoDB**
1. Install MongoDB Community Server for Windows.
2. Make sure the `MongoDB` service is running (Services app, or `net start MongoDB` in an elevated PowerShell).
3. Use `MONGO_URI=mongodb://127.0.0.1:27017/realtime-chat-app` (database `realtime-chat-app` is created automatically on first write).

**Option B — MongoDB Atlas (cloud, free tier)**
1. Create a free cluster at mongodb.com/atlas.
2. Add your IP to the Atlas Network Access list (or allow access from anywhere for local dev).
3. Create a database user and copy the provided connection string into `MONGO_URI`, e.g.:
   `mongodb+srv://<user>:<password>@cluster0.xxxxx.mongodb.net/realtime-chat-app`

## 9. Environment Variables

**server/.env**
| Variable      | Description                                      |
|---------------|---------------------------------------------------|
| `MONGO_URI`   | MongoDB connection string                         |
| `JWT_SECRET`  | Long random string used to sign/verify JWTs       |
| `PORT`        | Port the Express + Socket.IO server listens on    |
| `CLIENT_URL`  | Frontend origin, used for CORS                    |

**client/.env**
| Variable        | Description                        |
|-----------------|-------------------------------------|
| `VITE_API_URL`  | Base URL of the backend, e.g. `http://localhost:5000` |

Never commit real `.env` files — only the `.env.example` templates are tracked in git.

## 10. How to Test the Chat

1. Make sure both the backend (`http://localhost:5000`) and frontend (`http://localhost:5173`) are running.
2. Open **two different browsers**, or one normal window + one incognito/private window (so they don't share `localStorage`).
3. In window A, register **User A**. In window B, register **User B**.
4. In each window, the other user should appear in the sidebar with an "Online" status.
5. Click on the other user and send messages back and forth — they should appear instantly, with delivered/read ticks and a typing indicator when the other person is typing.
6. Close one window and confirm the other shows that user going "Offline".

## 11. How to Test Video Calling

1. With both User A and User B logged in (in two separate browser windows), open a chat between them.
2. In window A, click the 📹 (video) or 📞 (audio) icon in the message input bar.
3. Window B should show an **incoming call** popup with Accept/Reject.
4. Click **Accept** — both windows should show local + remote video (or the audio call screen) and a running call timer.
5. Test the mute (🎤) and camera (📹) toggle buttons during the call.
6. Click the red end-call button (📞) in either window to hang up; both sides should return to the chat screen.
7. To test rejection, click **Reject** instead of Accept in step 4.

> Your browser will ask for camera/microphone permission the first time — you must allow it for the call to work. If you deny it, the app will show a friendly error instead of crashing.

## 12. Troubleshooting

| Problem | Likely cause / fix |
|---|---|
| `MongoDB connection failed` on server start | MongoDB isn't running, or `MONGO_URI` is wrong. Check the service / Atlas connection string. |
| Frontend can't reach the backend / CORS errors | Confirm `CLIENT_URL` in `server/.env` matches the URL the frontend actually runs on, and `VITE_API_URL` in `client/.env` matches the backend port. |
| "Not authorized" errors right after logging in | The JWT may not be reaching the server. Check that `server/.env` has `JWT_SECRET` set and restart the server after changing `.env`. |
| Messages don't arrive in real time | Confirm the Socket.IO connection succeeded (check the browser console for `Socket connected` logs from the server terminal). Make sure both users are using the correct `VITE_API_URL`. |
| Video call shows a black screen | The browser may have blocked camera/mic access. Check the browser's site permissions and reload. |
| Call connects but no video/audio arrives | This can happen on strict corporate/school networks or symmetric NAT — a STUN server alone can't traverse it. See "Future Improvements" for adding a TURN server. |
| "Port already in use" | Another process is using port 5000 or 5173. Stop it, or change `PORT` / Vite's port in `vite.config.js`. |

## 13. Future Improvements

- Add a TURN server (e.g. coturn, or a managed service) to `ICE_SERVERS` in `client/src/components/VideoCall.jsx` for reliable calling across restrictive networks.
- Group chats and group video calls.
- Message attachments (images/files) with cloud storage.
- Push notifications for messages received while the app is closed.
- Message search and pagination for very long conversations.
- Move the in-memory "online users" map in `socketHandler.js` to Redis for multi-server/horizontal scaling.
- End-to-end encryption of messages.

## 14. Security Notes

- Passwords are hashed with bcrypt (never stored or returned in plain text).
- JWTs are required for every protected REST route and for the Socket.IO handshake.
- CORS is restricted to `CLIENT_URL`.
- Basic rate limiting is applied to all `/api` routes.
- All secrets (DB connection string, JWT secret) live in `.env`, which is git-ignored.
