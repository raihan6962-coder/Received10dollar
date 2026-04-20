const express = require("express");
const path = require("path");
const crypto = require("crypto");
const https = require("https");
const { initializeApp, cert } = require("firebase-admin/app");
const { getFirestore } = require("firebase-admin/firestore");

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 🔧 CONFIG — সব কিছু এখানে
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
const BOT_TOKEN = "8674899639:AAEzgSXjgJelVVY0gXWjuh8RUWkZgghAVz4";
const ADMIN_PASSWORD = "2808";
const PORT = process.env.PORT || 3000;

// ⚠️ এই WEBAPP_URL টা Railway deploy করার পরে তোমার Railway URL দিয়ে বদলাও
// যেমন: https://received10bot.up.railway.app
const WEBAPP_URL = process.env.WEBAPP_URL || "https://your-app.up.railway.app";

// Firebase Service Account — Firebase Console থেকে নামানো JSON এর ভেতরের জিনিস
// Project Settings → Service Accounts → Generate new private key → সেই JSON এর content
const FIREBASE_SERVICE_ACCOUNT = {
  // ⚠️ এখানে তোমার Firebase Service Account JSON paste করো
  // নিচে example দেওয়া আছে — এটা replace করতে হবে
  "type": "service_account",
  "project_id": "received10dallarbot",
  "private_key_id": "YOUR_PRIVATE_KEY_ID",
  "private_key": "-----BEGIN RSA PRIVATE KEY-----\nYOUR_PRIVATE_KEY_HERE\n-----END RSA PRIVATE KEY-----\n",
  "client_email": "firebase-adminsdk-xxxxx@received10dallarbot.iam.gserviceaccount.com",
  "client_id": "YOUR_CLIENT_ID",
  "auth_uri": "https://accounts.google.com/o/oauth2/auth",
  "token_uri": "https://oauth2.googleapis.com/token",
  "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
  "client_x509_cert_url": "YOUR_CERT_URL"
};

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 🔥 Firebase Init
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
initializeApp({ credential: cert(FIREBASE_SERVICE_ACCOUNT) });
const db = getFirestore();

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 🚀 Express App
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
const app = express();
app.use(express.json());
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "*");
  res.header("Access-Control-Allow-Methods", "*");
  next();
});

// WebApp HTML serve করবে
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});
app.get("/admin", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 🔐 Telegram initData Validation
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
function validateTelegram(initData) {
  if (!initData) return null;
  try {
    const params = new URLSearchParams(initData);
    const hash = params.get("hash");
    if (!hash) return null;
    params.delete("hash");
    const dataStr = [...params.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, v]) => `${k}=${v}`)
      .join("\n");
    const secret = crypto.createHmac("sha256", "WebAppData").update(BOT_TOKEN).digest();
    const expected = crypto.createHmac("sha256", secret).update(dataStr).digest("hex");
    if (expected !== hash) return null;
    const user = params.get("user");
    return user ? JSON.parse(decodeURIComponent(user)) : null;
  } catch { return null; }
}

function authMiddleware(req, res, next) {
  const initData = req.headers["x-telegram-init-data"];
  const user = validateTelegram(initData);
  if (!user) return res.status(401).json({ error: "Unauthorized" });
  req.tgUser = user;
  next();
}

function adminMiddleware(req, res, next) {
  const pw = req.headers["x-admin-pw"];
  if (pw !== ADMIN_PASSWORD) return res.status(403).json({ error: "Forbidden" });
  next();
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 📡 API Routes — User
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
app.get("/api/me", authMiddleware, async (req, res) => {
  const uid = req.tgUser.id.toString();
  const snap = await db.collection("users").doc(uid).get();
  if (!snap.exists) return res.status(404).json({ error: "User not found" });
  res.json(snap.data());
});

app.get("/api/referral-link", authMiddleware, async (req, res) => {
  const uid = req.tgUser.id.toString();
  // Bot username বের করো
  const botInfo = await telegramRequest("getMe");
  res.json({ link: `https://t.me/${botInfo.result.username}?start=ref_${uid}` });
});

app.post("/api/watch-ad", authMiddleware, async (req, res) => {
  const uid = req.tgUser.id.toString();
  const { adId } = req.body;
  if (!adId) return res.status(400).json({ error: "adId required" });

  try {
    const result = await db.runTransaction(async (t) => {
      const userRef = db.collection("users").doc(uid);
      const adRef = userRef.collection("adLogs").doc(adId);
      const [uSnap, aSnap] = await Promise.all([t.get(userRef), t.get(adRef)]);

      if (!uSnap.exists) throw new Error("User not found");
      if (aSnap.exists) throw new Error("Already watched");
      const u = uSnap.data();
      if ((u.adsWatched || 0) >= 5) throw new Error("Max ads reached");

      const newAds = (u.adsWatched || 0) + 1;
      const newBal = parseFloat(((u.balance || 0) + 2).toFixed(2));
      t.update(userRef, { adsWatched: newAds, balance: newBal });
      t.set(adRef, { at: new Date().toISOString() });
      return { adsWatched: newAds, balance: newBal };
    });
    res.json({ ok: true, ...result });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

app.post("/api/withdraw", authMiddleware, async (req, res) => {
  const uid = req.tgUser.id.toString();
  const { method, account } = req.body;
  if (!method || !account) return res.status(400).json({ error: "Missing fields" });

  const snap = await db.collection("users").doc(uid).get();
  if (!snap.exists) return res.status(404).json({ error: "User not found" });
  const u = snap.data();

  if (u.balance < 10) return res.status(400).json({ error: "Balance কম" });
  if (u.referralCount < 3) return res.status(400).json({ error: "৩ জন referral দরকার" });
  if (u.withdrawStatus === "pending") return res.status(400).json({ error: "Already pending" });
  if (u.withdrawStatus === "completed") return res.status(400).json({ error: "Already done" });

  const wid = `${uid}_${Date.now()}`;
  const batch = db.batch();
  batch.set(db.collection("withdrawals").doc(wid), {
    userId: uid, method, account,
    amount: u.balance, status: "pending",
    createdAt: new Date().toISOString()
  });
  batch.update(db.collection("users").doc(uid), { withdrawStatus: "pending" });
  await batch.commit();
  res.json({ ok: true });
});

app.get("/api/ads", authMiddleware, async (req, res) => {
  const snap = await db.collection("ads").where("active", "==", true).get();
  res.json(snap.docs.map(d => ({ id: d.id, ...d.data() })));
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 🔑 API Routes — Admin
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
app.get("/api/admin/users", adminMiddleware, async (req, res) => {
  const snap = await db.collection("users").get();
  res.json(snap.docs.map(d => d.data()));
});

app.get("/api/admin/analytics", adminMiddleware, async (req, res) => {
  const [u, w] = await Promise.all([db.collection("users").get(), db.collection("withdrawals").get()]);
  let balance = 0, ads = 0, pending = 0, done = 0;
  u.forEach(d => { const x = d.data(); balance += x.balance || 0; ads += x.adsWatched || 0; });
  w.forEach(d => { if (d.data().status === "pending") pending++; else if (d.data().status === "completed") done++; });
  res.json({ totalUsers: u.size, totalBalance: balance.toFixed(2), totalAds: ads, pendingWithdraws: pending, completedWithdraws: done });
});

app.get("/api/admin/ads", adminMiddleware, async (req, res) => {
  const snap = await db.collection("ads").get();
  res.json(snap.docs.map(d => ({ id: d.id, ...d.data() })));
});

app.post("/api/admin/ads", adminMiddleware, async (req, res) => {
  const { name, script } = req.body;
  if (!name || !script) return res.status(400).json({ error: "name & script required" });
  const ref = await db.collection("ads").add({ name, script, active: true, createdAt: new Date().toISOString() });
  res.json({ id: ref.id });
});

app.put("/api/admin/ads/:id", adminMiddleware, async (req, res) => {
  await db.collection("ads").doc(req.params.id).update(req.body);
  res.json({ ok: true });
});

app.delete("/api/admin/ads/:id", adminMiddleware, async (req, res) => {
  await db.collection("ads").doc(req.params.id).delete();
  res.json({ ok: true });
});

app.get("/api/admin/withdrawals", adminMiddleware, async (req, res) => {
  const snap = await db.collection("withdrawals").get();
  res.json(snap.docs.map(d => ({ id: d.id, ...d.data() })));
});

app.put("/api/admin/withdrawals/:id", adminMiddleware, async (req, res) => {
  const { status } = req.body;
  const wSnap = await db.collection("withdrawals").doc(req.params.id).get();
  if (!wSnap.exists) return res.status(404).json({ error: "Not found" });
  const batch = db.batch();
  batch.update(db.collection("withdrawals").doc(req.params.id), { status });
  batch.update(db.collection("users").doc(wSnap.data().userId), { withdrawStatus: status });
  await batch.commit();
  res.json({ ok: true });
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 🤖 Telegram Bot — Webhook
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
function telegramRequest(method, body = {}) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(body);
    const options = {
      hostname: "api.telegram.org",
      path: `/bot${BOT_TOKEN}/${method}`,
      method: "POST",
      headers: { "Content-Type": "application/json", "Content-Length": Buffer.byteLength(data) }
    };
    const req = https.request(options, (res) => {
      let raw = "";
      res.on("data", d => raw += d);
      res.on("end", () => resolve(JSON.parse(raw)));
    });
    req.on("error", reject);
    req.write(data);
    req.end();
  });
}

// Telegram bot webhook endpoint
app.post(`/webhook/${BOT_TOKEN}`, async (req, res) => {
  res.sendStatus(200);
  const msg = req.body.message;
  if (!msg || !msg.text) return;

  const chatId = msg.chat.id;
  const userId = msg.from.id.toString();
  const text = msg.text;

  if (text.startsWith("/start")) {
    const param = text.replace("/start", "").trim();
    const referrerId = param.startsWith("ref_") ? param.slice(4) : null;

    // User upsert
    const userRef = db.collection("users").doc(userId);
    const snap = await userRef.get();

    if (!snap.exists) {
      await userRef.set({
        telegramId: userId,
        firstName: msg.from.first_name || "",
        username: msg.from.username || "",
        balance: 0, adsWatched: 0, referralCount: 0,
        referredBy: referrerId, withdrawStatus: "none",
        createdAt: new Date().toISOString()
      });

      // Referral credit
      if (referrerId && referrerId !== userId) {
        const refRef = db.collection("users").doc(referrerId);
        const rSnap = await refRef.get();
        if (rSnap.exists) {
          const newCount = (rSnap.data().referralCount || 0) + 1;
          await refRef.update({ referralCount: newCount });
          telegramRequest("sendMessage", {
            chat_id: referrerId,
            text: `🎉 নতুন referral! তোমার count: *${newCount}/3*`,
            parse_mode: "Markdown"
          });
        }
      }
    }

    const botInfo = await telegramRequest("getMe");
    const botUsername = botInfo.result.username;

    await telegramRequest("sendMessage", {
      chat_id: chatId,
      text: `👋 *${msg.from.first_name}*, স্বাগতম!\n\n💰 ৫টা ad দেখে *$10* আয় করো!\n\nনিচের বাটনে ক্লিক করো:`,
      parse_mode: "Markdown",
      reply_markup: {
        inline_keyboard: [
          [{ text: "🚀 App খোলো — $10 নাও", web_app: { url: WEBAPP_URL } }],
          [{ text: "🔗 বন্ধুদের invite করো", url: `https://t.me/share/url?url=https://t.me/${botUsername}?start=ref_${userId}&text=🎁 Join করো, FREE $10 পাও!` }]
        ]
      }
    });
  }
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 🏁 Start Server + Set Webhook
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
app.listen(PORT, async () => {
  console.log(`✅ Server running on port ${PORT}`);
  // Webhook set করো
  const webhookUrl = `${WEBAPP_URL}/webhook/${BOT_TOKEN}`;
  const result = await telegramRequest("setWebhook", { url: webhookUrl });
  console.log("Webhook set:", result.ok ? "✅ Success" : "❌ " + result.description);
});
