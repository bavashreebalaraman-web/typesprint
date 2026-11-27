const passages = [
  "Learning a new skill takes patience, focus, and consistent practice. Small improvements made every day can lead to impressive results over time.",
  "Technology connects people and ideas across the world. It helps us solve problems, share knowledge, and create useful tools for everyday life.",
  "Good communication is more than speaking clearly. It also means listening carefully, asking thoughtful questions, and respecting different points of view.",
  "The best way to build confidence is to keep trying. Every mistake gives us information that can help us make a better attempt next time.",
  "A computer follows instructions to process information. Programs are created by writing clear steps that tell the machine what action to perform."
];

const promptEl = document.getElementById("prompt");
const inputEl = document.getElementById("typingInput");
const timeEl = document.getElementById("time");
const wpmEl = document.getElementById("wpm");
const accuracyEl = document.getElementById("accuracy");
const errorsEl = document.getElementById("errors");
const progressEl = document.getElementById("progressBar");
const messageEl = document.getElementById("testMessage");
const resultPanel = document.getElementById("resultPanel");

let duration = 30;
let remaining = duration;
let timerId = null;
let started = false;
let finished = false;
let targetText = "";

function choosePassage() {
  const previous = targetText;
  let next = passages[Math.floor(Math.random() * passages.length)];
  if (passages.length > 1 && next === previous) {
    next = passages[(passages.indexOf(next) + 1) % passages.length];
  }
  return next;
}

function renderPrompt() {
  promptEl.innerHTML = "";
  [...targetText].forEach((character, index) => {
    const span = document.createElement("span");
    span.textContent = character;
    if (index === 0) span.classList.add("current");
    promptEl.appendChild(span);
  });
}

function resetTest() {
  clearInterval(timerId);
  timerId = null;
  remaining = duration;
  started = false;
  finished = false;
  targetText = choosePassage();
  inputEl.value = "";
  inputEl.disabled = false;
  resultPanel.classList.add("hidden");
  document.getElementById("saveMessage").textContent = "";
  document.getElementById("saveScoreBtn").disabled = false;
  document.getElementById("saveScoreBtn").textContent = "Save score";
  timeEl.innerHTML = `${remaining}<span>s</span>`;
  wpmEl.textContent = "0";
  accuracyEl.innerHTML = "100<span>%</span>";
  errorsEl.textContent = "0";
  progressEl.style.width = "0%";
  messageEl.textContent = "Choose a duration, then start typing.";
  renderPrompt();
}

function getStats() {
  const typed = inputEl.value;
  let correct = 0;
  let errors = 0;
  for (let i = 0; i < typed.length; i++) {
    if (typed[i] === targetText[i]) correct++;
    else errors++;
  }
  const elapsed = Math.max(1, duration - remaining);
  const wpm = Math.round((correct / 5) / (elapsed / 60));
  const accuracy = typed.length ? Math.round((correct / typed.length) * 100) : 100;
  return { typed, correct, errors, wpm, accuracy };
}

function updatePrompt() {
  const spans = promptEl.querySelectorAll("span");
  const typed = inputEl.value;
  spans.forEach((span, index) => {
    span.classList.remove("correct", "incorrect", "current");
    if (index < typed.length) {
      span.classList.add(typed[index] === targetText[index] ? "correct" : "incorrect");
    } else if (index === typed.length) {
      span.classList.add("current");
    }
  });
  const current = spans[Math.min(typed.length, spans.length - 1)];
  if (current) current.scrollIntoView({ block: "nearest", inline: "nearest" });
}

function updateStats() {
  const stats = getStats();
  wpmEl.textContent = stats.wpm;
  accuracyEl.innerHTML = `${stats.accuracy}<span>%</span>`;
  errorsEl.textContent = stats.errors;
  progressEl.style.width = `${((duration - remaining) / duration) * 100}%`;
  updatePrompt();
  return stats;
}

function startTimer() {
  if (started || finished) return;
  started = true;
  messageEl.textContent = "Keep going — you're doing great.";
  timerId = setInterval(() => {
    remaining--;
    timeEl.innerHTML = `${remaining}<span>s</span>`;
    updateStats();
    if (remaining <= 0) finishTest();
  }, 1000);
}

function finishTest() {
  clearInterval(timerId);
  timerId = null;
  finished = true;
  inputEl.disabled = true;
  const stats = updateStats();
  messageEl.textContent = "Time is up. Review your result below.";
  document.getElementById("finalWpm").textContent = stats.wpm;
  document.getElementById("finalAccuracy").textContent = `${stats.accuracy}%`;
  resultPanel.classList.remove("hidden");
  resultPanel.scrollIntoView({ behavior: "smooth", block: "nearest" });
}

inputEl.addEventListener("input", () => {
  if (finished) return;
  if (!started && inputEl.value.length) startTimer();
  const stats = updateStats();
  if (inputEl.value.length >= targetText.length) finishTest();
});

document.querySelectorAll(".duration").forEach(button => {
  button.addEventListener("click", () => {
    duration = Number(button.dataset.duration);
    document.querySelectorAll(".duration").forEach(item => item.classList.remove("active"));
    button.classList.add("active");
    resetTest();
  });
});

document.getElementById("restartBtn").addEventListener("click", resetTest);

async function loadLeaderboard() {
  const leaderboard = document.getElementById("leaderboard");
  try {
    const response = await fetch("/api/scores");
    if (!response.ok) throw new Error("Could not load scores");
    const scores = await response.json();
    leaderboard.innerHTML = "";
    if (!scores.length) {
      leaderboard.innerHTML = '<p class="empty-state">No scores yet. Complete a test and save your score!</p>';
      return;
    }
    scores.forEach((score, index) => {
      const row = document.createElement("div");
      row.className = "score-row";
      const rank = document.createElement("span");
      rank.className = "rank";
      rank.textContent = `#${index + 1}`;
      const player = document.createElement("span");
      player.className = "player";
      player.textContent = score.name;
      const wpm = document.createElement("span");
      wpm.className = "score-value";
      wpm.textContent = `${score.wpm} `;
      const wpmLabel = document.createElement("small");
      wpmLabel.textContent = "WPM";
      wpm.appendChild(wpmLabel);
      const accuracy = document.createElement("span");
      accuracy.className = "score-value";
      accuracy.textContent = `${score.accuracy}%`;
      row.append(rank, player, wpm, accuracy);
      leaderboard.appendChild(row);
    });
  } catch (error) {
    leaderboard.innerHTML = '<p class="empty-state">Leaderboard is unavailable. Make sure the Node.js server is running.</p>';
  }
}

document.getElementById("saveScoreBtn").addEventListener("click", async () => {
  const nameInput = document.getElementById("playerName");
  const saveMessage = document.getElementById("saveMessage");
  const name = nameInput.value.trim();
  if (!name) {
    saveMessage.style.color = "#d45b65";
    saveMessage.textContent = "Please enter your name first.";
    nameInput.focus();
    return;
  }
  const stats = getStats();
  const button = document.getElementById("saveScoreBtn");
  button.disabled = true;
  button.textContent = "Saving...";
  try {
    const response = await fetch("/api/scores", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, wpm: stats.wpm, accuracy: stats.accuracy, duration })
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || "Could not save score");
    saveMessage.style.color = "#1a9b76";
    saveMessage.textContent = "Score saved to the leaderboard!";
    button.textContent = "Saved";
    await loadLeaderboard();
  } catch (error) {
    saveMessage.style.color = "#d45b65";
    saveMessage.textContent = error.message;
    button.disabled = false;
    button.textContent = "Save score";
  }
});

resetTest();
loadLeaderboard();
