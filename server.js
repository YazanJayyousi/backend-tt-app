const express = require("express");
const cors = require("cors");

const app = express();
app.use(express.json());
app.use(cors());

// --- In-Memory Database (later we move to real DB) ---
let queue = [];            // students waiting
let currentMatch = null;   // { player1, player2 }
let leaderboard = {};      // { studentID: { wins, losses } }

// --- Helper Function ---
function recordResult(winner, loser) {
    if (!leaderboard[winner]) leaderboard[winner] = { wins: 0, losses: 0 };
    if (!leaderboard[loser]) leaderboard[loser] = { wins: 0, losses: 0 };
    leaderboard[winner].wins++;
    leaderboard[loser].losses++;
}

// --- API ROUTES ---

// Login (temporary simple example)
app.post("/login", (req, res) => {
    const { studentID } = req.body;

    if (!studentID) return res.status(400).json({ error: "Student ID required" });

    return res.json({ message: "Logged in", studentID });
});

// Join queue
app.post("/queue/join", (req, res) => {
    const { studentID } = req.body;

    if (queue.includes(studentID))
        return res.status(400).json({ error: "Already in queue" });

    queue.push(studentID);
    return res.json({ queue });
});

// Leave queue manually
app.post("/queue/leave", (req, res) => {
    const { studentID } = req.body;

    queue = queue.filter(id => id !== studentID);
    return res.json({ queue });
});

// Get current queue + match
app.get("/status", (req, res) => {
    return res.json({
        currentMatch,
        queue,
        leaderboard
    });
});

// Start match (only if table empty)
app.post("/match/start", (req, res) => {
    if (currentMatch)
        return res.status(400).json({ error: "Match already running" });

    if (queue.length < 2)
        return res.status(400).json({ error: "Not enough players" });

    const player1 = queue.shift();
    const player2 = queue.shift();

    currentMatch = { player1, player2 };
    return res.json({ currentMatch });
});

// Submit match result
app.post("/match/finish", (req, res) => {
    const { winner } = req.body;

    if (!currentMatch)
        return res.status(400).json({ error: "No match running" });

    const { player1, player2 } = currentMatch;
    const loser = winner === player1 ? player2 : player1;

    recordResult(winner, loser);

    // Winner stays → becomes player1 in next match
    currentMatch = null;

    // Winner goes to queue front
    queue.unshift(winner);

    return res.json({ message: "Match recorded", leaderboard });
});

// Leaderboard
app.get("/leaderboard", (req, res) => {
    return res.json({ leaderboard });
});

// Clear everything (admin)
app.post("/reset", (req, res) => {
    queue = [];
    currentMatch = null;
    leaderboard = {};
    res.json({ message: "Reset complete" });
});

// --- Start ---
app.listen(10000, () => console.log("Backend running on port 10000"));

