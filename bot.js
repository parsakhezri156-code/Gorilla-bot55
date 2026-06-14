/**
 * خرHوش مصنوعی - نسخه ۳
 * نصب: npm install node-telegram-bot-api axios
 * اجرا: node bot.js
 */

const TelegramBot = require("node-telegram-bot-api");
const axios = require("axios");

const TELEGRAM_TOKEN = "8940656901:AAHMFWZELR_Ve3kkE7YVX_q4WQjozRsP7uM";
const GROQ_KEY       = "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";
const GROQ_MODEL     = "llama-3.1-8b-instant";

// ══════════════════════════════════════════
//  موتور شوخی پیشرفته
// ══════════════════════════════════════════
const JOKE_ENGINE = {
  subjects: ["پدرت","مادرت","داداشت","عموت","خاله‌ات","ننه‌ات","باباجانت","اجدادت"],
  verbs:    ["بردم","فرستادم","دیدم","پیدا کردم","گم کردم","اجاره دادم","فروختم"],
  places:   ["اهرام مصر","قطب جنوب","ماه","مریخ","ته دریا","داخل آتشفشان",
             "موزه دایناسور","کانال فاضلاب پاریس","باغ‌وحش تایلند","زیر پل ونیز",
             "دانشگاه مورچه‌ها","کارخونه سوسک","پارلمان کبوترا","بیمارستان مارمولک"],
  actions:  [
    "داره با کبوترا فلسفه بحث میکنه",
    "شاگرد اول مورچه‌هاست",
    "رئیس اتحادیه سوسک‌هاست",
    "داره به پنگوئن‌ها شنا یاد میده",
    "مربی کروکودیل شده",
    "دیپلم گرفت از دانشگاه بزها",
    "داره با یه مارمولک ازدواج میکنه",
    "رکورد جهانی کلاغ‌پر زده",
    "استاد دانشگاه الاغه",
    "نخست‌وزیر مگس‌هاست",
    "داره کتاب مینویسه برای کرم‌ها",
    "قهرمان ملی گاو شده",
  ],
  endings: ["💀","😭💀","💀😂","🗿💀","☠️😂","💀🦍","😭🦧💀","🗿😭","💀💀💀"],

  contextMap: {
    "فناوری": ["CTO شرکت مورچه‌هاست","داره به روبات‌ها درس میده","هوش مصنوعی ازش یاد میگیره"],
    "تحصیل": ["قبول شد دانشگاه زنبورا","داره پایان‌نامه کلاغ مینویسه","استاد راهنماش یه خرسه"],
    "کار":   ["مدیرعامل شرکت موش‌هاست","حقوقش رو با پنیر میگیره","ترفیع گرفت شد رئیس گله"],
    "روابط": ["عاشق یه اسب آبی شده","دارن نامزد میکنن با یه اردک","ولنتاین رو با یه شتر گذروند"],
    "غذا":  ["داره برای لاک‌پشت‌ها آشپزی میکنه","سرآشپز رستوران مار شده","داره کباب ملخ درست میکنه"],
  },

  pick: (arr) => arr[Math.floor(Math.random() * arr.length)],

  // ✨ شوخی با کلمات خود کاربر
  generateWithUserWords(userKeywords) {
    const s = this.pick(this.subjects);
    const v = this.pick(this.verbs);
    const p = this.pick(this.places);
    const e = this.pick(this.endings);
    // اگه کلمه‌ای از کاربر داریم، توی جمله استفاده کن
    if (userKeywords && userKeywords.length > 0) {
      const kw = userKeywords[Math.floor(Math.random() * userKeywords.length)];
      const templates = [
        `${s} رو ${v} ${p}، الان داره درباره "${kw}" با یه بزغاله بحث میکنه ${e}`,
        `${s} رو ${v} ${p} بخاطر "${kw}"، الان پشیمونه ${e}`,
        `${s} گفت "${kw}"، منم ${v}ش ${p} ${e}`,
      ];
      return this.pick(templates);
    }
    return `${s} رو ${v} ${p}، الان ${this.pick(this.actions)} ${e}`;
  },

  // شوخی مرتبط با موضوع
  generateContextual(topic, userKeywords) {
    const actions = this.contextMap[topic] || this.actions;
    const s = this.pick(this.subjects);
    const v = this.pick(this.verbs);
    const p = this.pick(this.places);
    const a = this.pick(actions);
    const e = this.pick(this.endings);
    if (userKeywords?.length > 0 && Math.random() > 0.5) {
      return this.generateWithUserWords(userKeywords);
    }
    return `${s} رو ${v} ${p}، الان ${a} ${e}`;
  },

  generate() {
    return this.generateContextual(null, null);
  }
};

// ══════════════════════════════════════════
//  سیستم یادگیری
// ══════════════════════════════════════════
class Learner {
  constructor() {
    this.wordFreq  = {};
    this.topics    = {};
    this.patterns  = [];
    this.style     = { informal:0, avgLen:0, emojiAvg:0, questionRatio:0 };
    this.count     = 0;
    // ✨ حافظه شوخی - جلوی تکرار رو میگیره
    this.usedJokes = new Set();
    // ✨ شخصیت‌پردازی
    this.personality = {
      angryLevel: 0,    // هرچی بیشتر فحش بخوره، تلخ‌تر میشه
      friendLevel: 0,   // هرچی بیشتر محبت ببینه، مهربون‌تر میشه
      crazyLevel: 0,    // با تعداد پیام بالا میره
    };
  }

  analyze(text) {
    this.count++;
    const n = this.count;
    const stop = new Set(["که","در","به","از","این","آن","با","را","هم","یک","تا","است","بود"]);
    text.replace(/[^\u0600-\u06FFa-zA-Z0-9\s]/g," ")
        .split(/\s+/).filter(w=>w.length>1&&!stop.has(w))
        .forEach(w=>this.wordFreq[w]=(this.wordFreq[w]||0)+1);

    const informal=(text.match(/میخوام|میگم|نمیدونم|چیه|داری|داره|خب|آره|ببین/gi)||[]).length;
    const emojis=(text.match(/\p{Emoji}/gu)||[]).length;
    const isQ=/[؟?]/.test(text)?1:0;
    this.style.informal=(this.style.informal*(n-1)+Math.min(informal,3))/n;
    this.style.avgLen=(this.style.avgLen*(n-1)+text.length)/n;
    this.style.emojiAvg=(this.style.emojiAvg*(n-1)+Math.min(emojis,5))/n;
    this.style.questionRatio=(this.style.questionRatio*(n-1)+isQ)/n;

    const topicMap={
      "فناوری":["هوش مصنوعی","کد","برنامه","گوشی","اینترنت","ربات"],
      "روابط": ["دوست","خانواده","پدر","مادر","ازدواج","عشق"],
      "شوخی":  ["جوک","مسخره","دیوونه","خنده","💀","😂"],
      "کار":   ["کار","پول","حقوق","بیکار","شغل"],
      "تحصیل":["درس","دانشگاه","امتحان","استاد","کنکور"],
      "غذا":  ["غذا","خوردن","رستوران","پیتزا","ناهار"],
    };
    Object.entries(topicMap).forEach(([t,kws])=>{
      const h=kws.filter(k=>text.includes(k)).length;
      if(h) this.topics[t]=(this.topics[t]||0)+h;
    });

    this.patterns.push({isQ:!!isQ,short:text.length<40});
    if(this.patterns.length>30) this.patterns.shift();

    // ✨ آپدیت شخصیت
    this.personality.crazyLevel = Math.min(this.count / 20, 1);
    if (/خوب|ممنون|مرسی|عالی|دمت|آفرین/i.test(text)) this.personality.friendLevel = Math.min(this.personality.friendLevel + 0.1, 1);
    if (/بد|احمق|مزخرف|گند|خر|الاغ/i.test(text)) this.personality.angryLevel = Math.min(this.personality.angryLevel + 0.1, 1);
  }

  topKeywords(n=6){
    return Object.entries(this.wordFreq).sort((a,b)=>b[1]-a[1])
      .slice(0,n).map(([w,f])=>w);
  }

  dominantTopic(){
    const e=Object.entries(this.topics);
    return e.length?e.sort((a,b)=>b[1]-a[1])[0][0]:null;
  }

  // ✨ شخصیت فعلی ربات
  getPersonalityDesc() {
    const p = this.personality;
    if (p.crazyLevel > 0.8) return "کاملاً دیوونه و غیرقابل پیش‌بینی";
    if (p.angryLevel > p.friendLevel) return "یکم تلخ و گزنده";
    if (p.friendLevel > 0.5) return "گرم و شوخ‌طبع";
    return "معمولی";
  }

  // ✨ شوخی یونیک - تکرار نمیشه
  getUniqueJoke(topic, keywords) {
    let joke, attempts = 0;
    do {
      joke = topic
        ? JOKE_ENGINE.generateContextual(topic, keywords)
        : JOKE_ENGINE.generateWithUserWords(keywords);
      attempts++;
    } while (this.usedJokes.has(joke) && attempts < 10);

    this.usedJokes.add(joke);
    if (this.usedJokes.size > 50) {
      // پاک کردن قدیمی‌ترین‌ها
      const arr = [...this.usedJokes];
      this.usedJokes = new Set(arr.slice(-25));
    }
    return joke;
  }

  summary(){
    if(!this.count) return "هنوز اطلاعات کافی ندارم";
    const kw=this.topKeywords(5).join(", ");
    const topic=this.dominantTopic();
    const shortPct=this.patterns.filter(p=>p.short).length/(this.patterns.length||1);
    return [
      kw?`واژگان پرکاربرد: ${kw}`:"",
      topic?`موضوع غالب: ${topic}`:"",
      `سبک: ${this.style.informal>1?"محاوره‌ای":"معمولی"} | ${shortPct>0.5?"کوتاه":"متوسط"}`,
    ].filter(Boolean).join("\n");
  }
}

// ══════════════════════════════════════════
//  سطوح دیوونگی
// ══════════════════════════════════════════
const LEVELS=[
  {min:0,  label:"نرمال 🧠"},
  {min:4,  label:"کمی شیطون 😏"},
  {min:8,  label:"خر شده 🫏"},
  {min:14, label:"الاغ فلسفی 🐴💀"},
  {min:20, label:"بیمارستانی 🚨"},
];
function getLevel(n){for(let i=LEVELS.length-1;i>=0;i--)if(n>=LEVELS[i].min)return LEVELS[i];return LEVELS[0];}

// ══════════════════════════════════════════
//  ناظر خروجی محلی
// ══════════════════════════════════════════
function postProcess(text, session) {
  const count  = session.count;
  const topic  = session.learner.dominantTopic();
  const kwList = session.learner.topKeywords(4);
  let result   = text;

  if (count >= 8 && Math.random() > 0.35) {
    const joke = session.learner.getUniqueJoke(topic, kwList);
    result += `\n\n${joke}`;
  }

  if (count >= 14 && Math.random() > 0.5) {
    const joke2 = session.learner.getUniqueJoke(null, kwList);
    result += `\n${joke2}`;
  }

  if (count >= 20) {
    const j1 = session.learner.getUniqueJoke(topic, kwList);
    const j2 = session.learner.getUniqueJoke(null, kwList);
    result = `${text}\n\n${j1}\n${j2}\n\nبه سلامتی 🗿`;
  }

  return result;
}

// ══════════════════════════════════════════
//  ارسال به Groq
// ══════════════════════════════════════════
async function askGroq(session, userText) {
  const lv = getLevel(session.count);
  const personality = session.learner.getPersonalityDesc();

  const system = `تو یک هوش مصنوعی فارسی هستی.

پروفایل کاربر:
${session.learner.summary()}

شخصیت فعلی تو: ${personality}
سطح: ${lv.label} — پیام ${session.count}

قوانین:
1. جوابت به حرف کاربر ربط داشته باشه
2. شخصیتت رو حفظ کن: ${personality}
3. حداکثر ۲-۳ جمله. فارسی.`;

  const messages=[
    {role:"system",content:system},
    ...session.history.slice(-10),
    {role:"user",content:userText},
  ];

  const res=await axios.post(
    "https://api.groq.com/openai/v1/chat/completions",
    {model:GROQ_MODEL,messages,max_tokens:200,temperature:0.85},
    {headers:{"Authorization":`Bearer ${GROQ_KEY}`,"Content-Type":"application/json"}}
  );

  const raw = res.data.choices[0].message.content;
  return postProcess(raw, session);
}

// ══════════════════════════════════════════
//  ربات
// ══════════════════════════════════════════
const bot=new TelegramBot(TELEGRAM_TOKEN,{polling:true});
const sessions={};
function getSession(id){
  if(!sessions[id]) sessions[id]={learner:new Learner(),history:[],count:0};
  return sessions[id];
}

bot.on("message",async(msg)=>{
  const id=msg.chat.id;
  const text=msg.text;
  if(!text) return;

  if(text==="/start") return bot.sendMessage(id,
    "سلام! 🫏\nمن خرHوش مصنوعی‌ام!\n\n/joke — شوخی رندوم\n/status — وضعیتم\n/reset — پاک کردن حافظه"
  );

  if(text==="/reset"){delete sessions[id];return bot.sendMessage(id,"مغزم پاک شد 🧠");}

  if(text==="/joke"){
    const s=getSession(id);
    const kw=s.learner.topKeywords(4);
    const topic=s.learner.dominantTopic();
    return bot.sendMessage(id, s.learner.getUniqueJoke(topic, kw));
  }

  if(text==="/status"){
    const s=getSession(id);
    return bot.sendMessage(id,
      `📊 وضعیت:\nسطح: ${getLevel(s.count).label}\nشخصیت: ${s.learner.getPersonalityDesc()}\nپیام‌ها: ${s.count}\n\n${s.learner.summary()}`
    );
  }

  const s=getSession(id);
  bot.sendChatAction(id,"typing");

  try{
    s.learner.analyze(text);
    s.count++;
    const reply=await askGroq(s,text);
    s.history.push({role:"user",content:text},{role:"assistant",content:reply});
    if(s.history.length>16) s.history=s.history.slice(-16);
    await bot.sendMessage(id,reply);
    if(s.count%5===0) await bot.sendMessage(id,`⚡ سطح جدید: ${getLevel(s.count).label}`);
  }catch(e){
    console.error(e.response?.data||e.message);
    bot.sendMessage(id,"یه چیزی خراب شد 💀");
  }
});

bot.on("polling_error",e=>console.error(e.message));
console.log("🫏 ربات روشنه...");
