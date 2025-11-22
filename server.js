// server.js
const express = require("express");
const cors = require("cors");

const app = express();
app.use(express.json());

// Allow frontend to connect
app.use(cors({
  origin: "http://localhost:5173", // frontend URL
  credentials: true
}));

// --- In-Memory Database ---
let queue = [];            // students waiting
let currentMatch = null;   // { player1, player2 }
let leaderboard = {};      // { studentID: { wins, losses } }

// --- Helper Functions ---
function recordResult(winner, loser) {
  if (!leaderboard[winner]) leaderboard[winner] = { wins: 0, losses: 0 };
  if (!leaderboard[loser]) leaderboard[loser] = { wins: 0, losses: 0 };
  leaderboard[winner].wins++;
  leaderboard[loser].losses++;
}

// --- API ROUTES ---

// Login (temporary example)
app.post("/login", (req, res) => {
  const { studentID } = req.body;
  if (!studentID) return res.status(400).json({ error: "Student ID required" });
  return res.json({ message: "Logged in", studentID });
});

// Get current match
app.get("/match/current", (req, res) => {
  res.json(currentMatch || {});
});

// Get current queue
app.get("/queue", (req, res) => {
  res.json(queue.map(studentID => ({ studentID })));
});

// Join queue
app.post("/queue/join", (req, res) => {
  const { studentID } = req.body;
  if (!studentID) return res.status(400).json({ error: "Student ID required" });
  if (queue.includes(studentID) || (currentMatch && (studentID === currentMatch.player1 || studentID === currentMatch.player2)))
    return res.status(400).json({ error: "Already in queue or playing" });
  queue.push(studentID);
  res.json(queue.map(studentID => ({ studentID })));
});

// Leave table (for player/winner)
app.post("/match/leave", (req, res) => {
  const { studentID } = req.body;
  if (!currentMatch) return res.status(400).json({ error: "No match running" });

  const { player1, player2 } = currentMatch;
  if (studentID !== player1 && studentID !== player2)
    return res.status(400).json({ error: "You are not in the current match" });

  // Remove current match
  currentMatch = null;

  // Put loser back to queue if exists
  const loser = studentID === player1 ? player2 : player1;
  if (loser) queue.unshift(loser);

  res.json({ message: "Left table", queue });
});

// Finish match
app.post("/match/finish", (req, res) => {
  const { winner } = req.body;
  if (!currentMatch) return res.status(400).json({ error: "No match running" });

  const { player1, player2 } = currentMatch;
  const loser = winner === player1 ? player2 : player1;

  recordResult(winner, loser);

  // Remove match from table
  currentMatch = null;

  // Winner goes to front of queue
  queue.unshift(winner);

  res.json({ message: "Match recorded", leaderboard });
});

// Leaderboard
app.get("/leaderboard", (req, res) => {
  const lbArray = Object.entries(leaderboard).map(([studentID, stats]) => ({ studentID, ...stats }));
  res.json(lbArray);
});

// Admin reset
app.post("/reset", (req, res) => {
  queue = [];
  currentMatch = null;
  leaderboard = {};
  res.json({ message: "Reset complete" });
});

// --- Start Server ---
const PORT = 10000;
app.listen(PORT, () => console.log(`Backend running on port ${PORT}`));
