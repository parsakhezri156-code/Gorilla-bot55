/**
 * brain.js - موتور پردازش زبانی
 * این فایل خروجی ربات رو قبل از ارسال پردازش میکنه
 * 
 * وظایف:
 * 1. تکمیل جملات ناقص
 * 2. اصلاح گرامر فارسی
 * 3. هماهنگی لحن با شخصیت
 * 4. غنی‌سازی جمله‌ها
 */

// ══════════════════════════════════════════
//  قوانین گرامری فارسی
// ══════════════════════════════════════════
const GRAMMAR_RULES = [
  // فاصله قبل از نشانه‌گذاری
  { find: /\s+([،؟!،.])/g,       replace: "$1" },
  // فاصله بعد از نشانه‌گذاری
  { find: /([،؟!،.])(\S)/g,      replace: "$1 $2" },
  // حذف فاصله‌های اضافی
  { find: /\s{2,}/g,             replace: " " },
  // اصلاح "می " به "می‌"
  { find: /می ([a-zA-Z\u0600-\u06FF])/g, replace: "می‌$1" },
  // اصلاح نیم‌فاصله رایج
  { find: /ها ([^\u0600-\u06FF])/g, replace: "ها $1" },
];

// ══════════════════════════════════════════
//  تشخیص جمله ناقص
// ══════════════════════════════════════════
const INCOMPLETE_PATTERNS = [
  /که$/,         // جمله با "که" تموم شده
  /و$/,          // جمله با "و" تموم شده
  /اما$/,        // جمله با "اما" تموم شده
  /ولی$/,        // جمله با "ولی" تموم شده
  /چون$/,        // جمله با "چون" تموم شده
  /اگر$/,        // جمله با "اگر" تموم شده
  /وقتی$/,       // جمله با "وقتی" تموم شده
];

function isIncomplete(text) {
  const trimmed = text.trim();
  return INCOMPLETE_PATTERNS.some(p => p.test(trimmed));
}

// ══════════════════════════════════════════
//  تکمیل‌کننده جملات ناقص
// ══════════════════════════════════════════
const COMPLETIONS = {
  "که": [
    "که خودت بهتر میدونی!",
    "که اصلاً مهم نیست 🗿",
    "که بعداً بهت میگم 💀",
    "که فعلاً ولش کن",
  ],
  "و": [
    "و بقیه‌اش رو خودت حدس بزن 💀",
    "و اینکه دیگه ادامه نمیدم 🗿",
    "و همین کافیه",
  ],
  "اما": [
    "اما مهم نیست 🗿",
    "اما خودت میدونی",
    "اما بیخیال 💀",
  ],
  "ولی": [
    "ولی مهم نیست 🗿",
    "ولی بیخیال 💀",
    "ولی الان وقتش نیست",
  ],
};

function completeIfNeeded(text) {
  if (!isIncomplete(text)) return text;
  
  const lastWord = text.trim().split(/\s+/).pop();
  const options = COMPLETIONS[lastWord];
  if (options) {
    const pick = options[Math.floor(Math.random() * options.length)];
    return text.trim() + " " + pick;
  }
  return text + " 🗿";
}

// ══════════════════════════════════════════
//  غنی‌سازی لحن بر اساس شخصیت
// ══════════════════════════════════════════
const PERSONALITY_ENHANCERS = {
  // وقتی ربات تلخه
  angry: {
    prefixes: ["خب،","بسیار خب،","اوکی،","جالبه،"],
    suffixes: ["... هرجور راحتی 🗿","... به من چه 💀","... خودت بدون"],
  },
  // وقتی ربات مهربونه  
  friendly: {
    prefixes: ["آره جانم،","خوشحالم که پرسیدی،","راستش،"],
    suffixes: ["😊","! موفق باشی","! هر سوالی داشتی بگو"],
  },
  // وقتی دیوونه‌ست
  crazy: {
    prefixes: ["هههه،","بپا،","گوش کن،","ببین،"],
    suffixes: ["💀😂","🗿💀","... اینطوریاس دیگه 🦍","😭💀"],
  },
};

function enhanceTone(text, personality) {
  // خیلی کوتاهه؟ یه چیزی اضافه کن
  if (text.length < 20) {
    if (personality === "crazy") {
      const suffixes = PERSONALITY_ENHANCERS.crazy.suffixes;
      text += " " + suffixes[Math.floor(Math.random() * suffixes.length)];
    }
  }
  return text;
}

// ══════════════════════════════════════════
//  تشخیص و اصلاح تکرار
// ══════════════════════════════════════════
function removeDuplication(text) {
  const sentences = text.split(/[.!؟\n]+/).filter(s => s.trim().length > 5);
  const unique = [];
  const seen = new Set();

  for (const s of sentences) {
    const normalized = s.trim().replace(/\s+/g, " ");
    // اگه جمله خیلی شبیه یه جمله قبلی بود، حذف کن
    let isDuplicate = false;
    for (const u of seen) {
      const similarity = getSimilarity(normalized, u);
      if (similarity > 0.7) { isDuplicate = true; break; }
    }
    if (!isDuplicate) {
      unique.push(normalized);
      seen.add(normalized);
    }
  }

  return unique.join(". ").trim();
}

function getSimilarity(a, b) {
  const wordsA = new Set(a.split(/\s+/));
  const wordsB = new Set(b.split(/\s+/));
  let common = 0;
  for (const w of wordsA) if (wordsB.has(w)) common++;
  return common / Math.max(wordsA.size, wordsB.size);
}

// ══════════════════════════════════════════
//  اصلاح گرامر
// ══════════════════════════════════════════
function applyGrammar(text) {
  let result = text;
  for (const rule of GRAMMAR_RULES) {
    result = result.replace(rule.find, rule.replace);
  }
  return result.trim();
}

// ══════════════════════════════════════════
//  پردازش نهایی - تابع اصلی
// ══════════════════════════════════════════
function process(text, options = {}) {
  const {
    personality = "normal",  // normal | angry | friendly | crazy
    level = 0,               // سطح دیوونگی (0-20+)
  } = options;

  let result = text;

  // ۱. حذف تکرار
  result = removeDuplication(result);

  // ۲. تکمیل جملات ناقص
  result = completeIfNeeded(result);

  // ۳. اصلاح گرامر
  result = applyGrammar(result);

  // ۴. غنی‌سازی لحن
  const tone = level >= 20 ? "crazy" : 
               level >= 8  ? "crazy" :
               personality === "angry" ? "angry" :
               personality === "friendly" ? "friendly" : "normal";
  
  result = enhanceTone(result, tone);

  return result;
}

module.exports = { process, isIncomplete, applyGrammar, removeDuplication };
