/**
 * memory.js - سیستم حافظه دائمی
 * 
 * یادگیری‌ها رو روی فایل ذخیره میکنه
 * بعد از ری‌استارت هم باقی میمونه
 */

const fs = require("fs");
const path = require("path");

const DB_PATH = path.join(__dirname, "data");
const USERS_FILE = path.join(DB_PATH, "users.json");
const JOKES_FILE = path.join(DB_PATH, "jokes.json");

// ساخت پوشه data اگه نبود
if (!fs.existsSync(DB_PATH)) fs.mkdirSync(DB_PATH);

// ══════════════════════════════════════════
//  توابع پایه خواندن/نوشتن
// ══════════════════════════════════════════
function readJSON(filePath, defaultVal) {
  try {
    if (!fs.existsSync(filePath)) return defaultVal;
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch {
    return defaultVal;
  }
}

function writeJSON(filePath, data) {
  try {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), "utf8");
    return true;
  } catch (e) {
    console.error("Memory write error:", e.message);
    return false;
  }
}

// ══════════════════════════════════════════
//  مدیریت پروفایل کاربر
// ══════════════════════════════════════════
function loadUser(userId) {
  const users = readJSON(USERS_FILE, {});
  return users[userId] || {
    userId,
    count: 0,
    wordFreq: {},
    topics: {},
    style: { informal:0, avgLen:0, emojiAvg:0, questionRatio:0 },
    personality: { angryLevel:0, friendLevel:0 },
    usedJokes: [],
    history: [],
    createdAt: Date.now(),
    lastSeen: Date.now(),
  };
}

function saveUser(userId, data) {
  const users = readJSON(USERS_FILE, {});
  users[userId] = {
    ...data,
    lastSeen: Date.now(),
    // تاریخچه رو کوتاه نگه دار
    history: (data.history || []).slice(-20),
    // jokes رو هم محدود کن
    usedJokes: (data.usedJokes || []).slice(-50),
  };
  writeJSON(USERS_FILE, users);
}

// ══════════════════════════════════════════
//  آمار کلی
// ══════════════════════════════════════════
function getStats() {
  const users = readJSON(USERS_FILE, {});
  const ids = Object.keys(users);
  const totalMessages = ids.reduce((s, id) => s + (users[id].count || 0), 0);
  return {
    totalUsers: ids.length,
    totalMessages,
    mostActive: ids.sort((a,b) => (users[b].count||0) - (users[a].count||0))[0],
  };
}

// ══════════════════════════════════════════
//  ذخیره جوک‌های جدید (یادگیری جمعی)
// ══════════════════════════════════════════
function learnJoke(joke) {
  const jokes = readJSON(JOKES_FILE, []);
  if (!jokes.includes(joke)) {
    jokes.push(joke);
    if (jokes.length > 500) jokes.splice(0, 100); // حذف قدیمی‌ها
    writeJSON(JOKES_FILE, jokes);
  }
}

function getLearnedJokes() {
  return readJSON(JOKES_FILE, []);
}

// ══════════════════════════════════════════
//  همگام‌سازی Learner با حافظه
// ══════════════════════════════════════════
function syncLearnerToMemory(userId, learner, history) {
  saveUser(userId, {
    userId,
    count: learner.count,
    wordFreq: learner.wordFreq,
    topics: learner.topics,
    style: learner.style,
    personality: learner.personality,
    patterns: (learner.patterns || []).slice(-30),
    usedJokes: [...(learner.usedJokes || new Set())],
    history: history || [],
  });
}

function loadLearnerFromMemory(userId, Learner) {
  const data = loadUser(userId);
  const learner = new Learner();

  // بازیابی داده‌های قبلی
  learner.count       = data.count || 0;
  learner.wordFreq    = data.wordFreq || {};
  learner.topics      = data.topics || {};
  learner.style       = data.style || learner.style;
  learner.personality = data.personality || learner.personality;
  learner.patterns    = data.patterns || [];
  learner.usedJokes   = new Set(data.usedJokes || []);

  return { learner, history: data.history || [] };
}

module.exports = {
  loadUser,
  saveUser,
  getStats,
  learnJoke,
  getLearnedJokes,
  syncLearnerToMemory,
  loadLearnerFromMemory,
};
