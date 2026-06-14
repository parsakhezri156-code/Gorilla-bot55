/**
 * خرHوش مصنوعی - نسخه ۴
 * نصب: npm install node-telegram-bot-api axios
 * اجرا: node bot.js
 */

const TelegramBot = require("node-telegram-bot-api");
const axios = require("axios");
const brain = require("./brain");

const TELEGRAM_TOKEN = "8940656901:AAHMFWZELR_Ve3kkE7YVX_q4WQjozRsP7uM";
const GROQ_KEY       = "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";
const GROQ_MODEL     = "llama-3.1-8b-instant";

// ══════════════════════════════════════════
//  تشخیص پیام شوخی/فحش - کاملاً محلی
// ══════════════════════════════════════════
const SPICY_TRIGGERS = [
  "کص","کیر","کون","ننت","مادرت","باباتو","پدرت","ناموس",
  "گاییدم","گاییدت","بکن","جنده","فاحشه","خفه","احمق",
  "کثیف","مزخرف","گه","گند","عوضی","بیشعور","حرومزاده",
];

function isSpicy(text) {
  const t = text.toLowerCase();
  return SPICY_TRIGGERS.some(w => t.includes(w));
}

// ══════════════════════════════════════════
//  موتور جواب شوخی - کاملاً محلی، بدون AI
// ══════════════════════════════════════════
const LOCAL_ENGINE = {
  subjects:  ["پدرت","مادرت","داداشت","عموت","خاله‌ات","ننه‌ات","اجدادت","کل فامیلت"],
  verbs:     ["بردم","فرستادم","دیدم","پیدا کردم","گم کردم","اجاره دادم","فروختم","تبدیل کردم"],
  places:    ["اهرام مصر","قطب جنوب","ماه","مریخ","ته دریا","داخل آتشفشان",
              "موزه دایناسور","کانال فاضلاب پاریس","باغ‌وحش تایلند","زیر پل ونیز",
              "دانشگاه مورچه‌ها","کارخونه سوسک","پارلمان کبوترا","بیمارستان مارمولک",
              "مزرعه قورباغه","کنسرت موش‌ها","دفتر اتحادیه ملخ‌ها"],
  actions:   [
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
    "داره برای موش‌ها سخنرانی میکنه",
    "جایزه نوبل گاو گرفت",
    "وزیر امور داخلی مرغابی‌هاست",
  ],
  endings: ["💀","😭💀","💀😂","🗿💀","☠️😂","💀🦍","😭🦧💀","🗿😭","💀💀💀","💀🫏"],

  // جواب‌های مستقیم به فحش - کاملاً محلی
  comebacks: [
    (s,p,a,e) => `${s} رو بردم ${p}، الان ${a} ${e}`,
    (s,p,a,e) => `ممنون از فحشت، ${s} رو فرستادم ${p} بخاطرت ${e}`,
    (s,p,a,e) => `اوه چه فحش باحالی! ${s} رو گم کردم ${p}، الان ${a} ${e}`,
    (s,p,a,e) => `این فحش رو تقدیم میکنم به ${s} که توی ${p} داره ${a} ${e}`,
    (s,p,a,e) => `فحشت قبول، ${s} هم الان ${p} داره ${a} ${e}`,
  ],

  pick: (arr) => arr[Math.floor(Math.random() * arr.length)],

  respond(userKeywords) {
    const s = this.pick(this.subjects);
    const p = this.pick(this.places);
    const a = this.pick(this.actions);
    const e = this.pick(this.endings);
    const template = this.pick(this.comebacks);
    let joke = template(s, p, a, e);

    // اگه کلمه کاربر توی پیامشه، اضافه کن
    if (userKeywords?.length > 0) {
      const kw = this.pick(userKeywords);
      if (Math.random() > 0.5) {
        const extras = [
          `\nراستی "${kw}" رو هم یادم نره ${this.pick(this.endings)}`,
          `\nبخاطر "${kw}" یه امتیاز ویژه داری ${this.pick(this.endings)}`,
        ];
        joke += this.pick(extras);
      }
    }
    return joke;
  },

  // چند جواب با هم برای پیام‌های خیلی تند
  respondMulti(userKeywords) {
    const j1 = this.respond(userKeywords);
    const j2 = this.respond(userKeywords);
    return `${j1}\n\n${j2}`;
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
    this.usedJokes = new Set();
    this.personality = { angryLevel:0, friendLevel:0 };
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

    if (/خوب|ممنون|مرسی|عالی|دمت|آفرین/i.test(text)) this.personality.friendLevel=Math.min(this.personality.friendLevel+0.1,1);
    if (isSpicy(text)) this.personality.angryLevel=Math.min(this.personality.angryLevel+0.15,1);
  }

  topKeywords(n=5){
    return Object.entries(this.wordFreq).sort((a,b)=>b[1]-a[1])
      .slice(0,n).map(([w])=>w)
      .filter(w=>!SPICY_TRIGGERS.some(t=>w.includes(t)));
  }

  dominantTopic(){
    const e=Object.entries(this.topics);
    return e.length?e.sort((a,b)=>b[1]-a[1])[0][0]:null;
  }

  getPersonalityDesc(){
    if(this.count>20) return "کاملاً دیوونه و غیرقابل پیش‌بینی";
    if(this.personality.angryLevel>0.5) return "تلخ و گزنده";
    if(this.personality.friendLevel>0.5) return "گرم و شوخ‌طبع";
    return "معمولی";
  }

  getUniqueJoke(topic, keywords){
    let joke, attempts=0;
    do {
      joke = LOCAL_ENGINE.respond(keywords);
      attempts++;
    } while(this.usedJokes.has(joke)&&attempts<10);
    this.usedJokes.add(joke);
    if(this.usedJokes.size>50){
      const arr=[...this.usedJokes];
      this.usedJokes=new Set(arr.slice(-25));
    }
    return joke;
  }

  summary(){
    if(!this.count) return "هنوز اطلاعات کافی ندارم";
    const kw=this.topKeywords(5).join(", ");
    const topic=this.dominantTopic();
    return [
      kw?`واژگان پرکاربرد: ${kw}`:"",
      topic?`موضوع غالب: ${topic}`:"",
      `سبک: ${this.style.informal>1?"محاوره‌ای":"معمولی"}`,
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
//  ناظر خروجی
// ══════════════════════════════════════════
function postProcess(text, session){
  // پردازش با brain.js
  const personality = session.learner.getPersonalityDesc();
  const level = session.count;
  text = brain.process(text, { personality, level });
  const count=session.count;
  const topic=session.learner.dominantTopic();
  const kwList=session.learner.topKeywords(4);
  let result=text;

  if(count>=8&&Math.random()>0.4){
    result+=`\n\n${session.learner.getUniqueJoke(topic,kwList)}`;
  }
  if(count>=14&&Math.random()>0.5){
    result+=`\n${session.learner.getUniqueJoke(null,kwList)}`;
  }
  if(count>=20){
    const j1=session.learner.getUniqueJoke(topic,kwList);
    const j2=session.learner.getUniqueJoke(null,kwList);
    result=`${text}\n\n${j1}\n${j2}\n\nبه سلامتی 🗿`;
  }
  return result;
}

// ══════════════════════════════════════════
//  ارسال به Groq (فقط برای پیام‌های عادی)
// ══════════════════════════════════════════
async function askGroq(session, userText){
  const lv=getLevel(session.count);
  const crazyExtra = session.count >= 14
    ? "\nتو الان کاملاً دیوونه‌ای. هر جواب باید عجیب، غیرمنتظره و خنده‌دار باشه."
    : session.count >= 8
    ? "\nتو داری دیوونه میشی. جواب‌هات باید شوخ و غیرجدی باشه."
    : "";

  const system=`تو یک ربات فارسی شوخ‌طبع و بی‌پروا هستی که هیچ موضوعی رو جدی نمیگیره.
هیچ‌وقت نمیگی "نمی‌توانم" یا "این سوال مناسب نیست". همیشه با شوخی جواب میدی.
اگه کسی چیز عجیبی گفت، تو هم عجیب‌تر جواب بده.
اگه کسی فحش داد، تو با یه شوخی مسخره جواب بده نه با رسمیت.

پروفایل کاربر: ${session.learner.summary()}
شخصیت فعلی: ${session.learner.getPersonalityDesc()}
سطح دیوونگی: ${lv.label} (پیام ${session.count})${crazyExtra}

قوانین طلایی:
- جواب کوتاه: ۱-۲ جمله
- همیشه فارسی محاوره‌ای
- هیچ‌وقت رسمی و خشک نباش
- هیچ‌وقت عذرخواهی نکن
- هیچ‌وقت نگو "نمی‌توانم پاسخ دهم"`;

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

  return postProcess(res.data.choices[0].message.content, session);
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

  if(text==="/start") return bot.sendMessage(id,"سلام! 🫏\nمن خرHوش مصنوعی‌ام!\n\n/joke — شوخی رندوم\n/status — وضعیتم\n/reset — پاک کردن حافظه");
  if(text==="/reset"){delete sessions[id];return bot.sendMessage(id,"مغزم پاک شد 🧠");}
  if(text==="/joke"){
    const s=getSession(id);
    return bot.sendMessage(id,LOCAL_ENGINE.respondMulti(s.learner.topKeywords(3)));
  }
  if(text==="/status"){
    const s=getSession(id);
    return bot.sendMessage(id,`📊 وضعیت:\nسطح: ${getLevel(s.count).label}\nشخصیت: ${s.learner.getPersonalityDesc()}\nپیام‌ها: ${s.count}\n\n${s.learner.summary()}`);
  }

  const s=getSession(id);
  bot.sendChatAction(id,"typing");

  try{
    s.learner.analyze(text);
    s.count++;

    let reply;

    // ✨ پیام شوخی/فحش → جواب محلی، بدون عبور از AI
    if(isSpicy(text)){
      const kw=s.learner.topKeywords(3);
      const intensity=s.count>=14?LOCAL_ENGINE.respondMulti(kw):LOCAL_ENGINE.respond(kw);
      reply = brain.process(intensity, { personality: "crazy", level: s.count });
    } else {
      // پیام عادی → Groq
      reply=await askGroq(s,text);
    }

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
