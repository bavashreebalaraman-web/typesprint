const express = require("express");
const path = require("path");
const fs = require("fs");

const app = express();
const PORT = process.env.PORT || 3000;
const SCORES_FILE = path.join(__dirname, "scores.json");

app.use(express.json({ limit: "20kb" }));
app.use(express.static(path.join(__dirname, "public")));

function readScores() {
  try {
    if (!fs.existsSync(SCORES_FILE)) return [];
    return JSON.parse(fs.readFileSync(SCORES_FILE, "utf8"));
  } catch (error) {
    console.error("Could not read scores:", error);
    return [];
  }
}

function saveScores(scores) {
  fs.writeFileSync(SCORES_FILE, JSON.stringify(scores, null, 2));
}

app.get("/api/scores", (req, res) => {
  const scores = readScores()
    .sort((a, b) => b.wpm - a.wpm || b.accuracy - a.accuracy)
    .slice(0, 10);
  res.json(scores);
});

app.post("/api/scores", (req, res) => {
  const { name, wpm, accuracy, duration } = req.body || {};
  const safeName = typeof name === "string" ? name.trim().slice(0, 18) : "";

  if (!safeName || !Number.isFinite(wpm) || !Number.isFinite(accuracy) ||
      !Number.isFinite(duration) || wpm < 0 || wpm > 300 ||
      accuracy < 0 || accuracy > 100 || ![15, 30, 60].includes(duration)) {
    return res.status(400).json({ error: "Please provide valid score details." });
  }

  const scores = readScores();
  scores.push({
    name: safeName,
    wpm: Math.round(wpm),
    accuracy: Math.round(accuracy),
    duration,
    date: new Date().toISOString()
  });
  saveScores(scores);
  const newLocal = res.status(201).json({ message: "Score saved successfully." });
});

app.listen(PORT, () => {
  console.log(`Typing Speed Test is running at http://localhost:${PORT}`);
});
