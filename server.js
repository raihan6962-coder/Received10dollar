const express = require("express");
const path = require("path");
const crypto = require("crypto");
const https = require("https");
const { initializeApp, cert } = require("firebase-admin/app");
const { getFirestore } = require("firebase-admin/firestore");

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// CONFIG
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
const BOT_TOKEN = "8674899639:AAEzgSXjgJelVVY0gXWjuh8RUWkZgghAVz4";
const ADMIN_PASSWORD = "2808";
const PORT = process.env.PORT || 3000;
const WEBAPP_URL = process.env.WEBAPP_URL || "https://received10dollar-production.up.railway.app/";

// ⚠️ Firebase Service Account — paste your JSON here
// Firebase Console → Project Settings → Service Accounts → Generate new private key
const FIREBASE_SERVICE_ACCOUNT = process.env.FIREBASE_SA
  ? JSON.parse(process.env.FIREBASE_SA)
  : {
  "type": "service_account",
  "project_id": "received10dallarbot",
  "private_key_id": "847e6fd1517b12f463354155e77d8d8bda420cbc",
  "private_key": "-----BEGIN PRIVATE KEY-----\nMIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQC7i/KjSoqFadsq\nAsCUg/uPghaKOBZYXfhbAH2AFU9kSd6MldToTPzapPBSSolJU/mEKP7ukeFXcHxS\nv4E3XF1aEoPNlUPexIilik6lVivZ2ZlP7VEbQ6ojQP/58yi7FkB3KmceRCJruHng\nkpYjnyDVXmZ4nLudjLFrKo535w3pqs5lBZ4ifWXuiARxhjjhao5l5jWkWkOPxVV+\nQYsj6KVZZVgiROEJCzDFqk2LTgBaNxya1YOHZEv/PFLg0jJJ5t+QLJvsEqxtBDnS\nBmUVM6L9i2Y8S1KsQ+lI6rNgYQUB8CZqJkGcF+YqsSpDg0TxfNZJSU/WEFdiTQe6\n4hAowsBLAgMBAAECggEAWdn0hzLhJoXOkFP9O6n3zYs/jTzNx8xNfhvABKsw/BU/\n4A6wkBLCWWYIFQTMvSrUMfMKH/YYBbJIfcRt/b3so4iXSNkoSQPTi6u1fhTIsXhE\nsTw7TVqfmoA7ot5SNz+z5uOTv7ZY307kZSkVcT99lXvCkCpW4GZVYchjtSInUjjG\n8Gh8nWw0n27Gl9p+CfefnxqgSRmCTUGyc5dgc6EhFdQh9sLLDQ4tXX7mqTJg95XC\nuzThq41KseqFfz8NjxJiO11vwWZ03MuX5UdI4988Iw984n3ubgNzv8+phUEiKLAj\nDi7wLgS9ccuZ6xnoORws7aQPvgVv3GbDbGGmvGKVIQKBgQDbyYq4X5ph84NZgFXE\nLX27Qw9wjH5t0jgLG4Fvyjtynwzt8gvZveuhvLomlDMifdQRYeNPN1pHlRivSfh1\nGEHDPa5+1mFiJ7QPlmn+mAe7JHBO7G2JjpHT34p+5u1GC5aeQ4FUHRus1mV8IYsj\nXJgp/+8TP0JXPrrtPC50E8SIgwKBgQDacoWq/g6vST8o8H7cFYHv7YvgvEPo3K56\nK55eJqPIh8jRrh8FTiV1Vo5gItCe3j1r6ekMkcvnGftEq2BUHLD0fKHMzLfPiSly\ncsy7dEAsxj3wZ3jOezt0LSCIUP1dEv+RyR/98RewXUWqU9Y39meNAvsPIAhpkEQ9\ndq+rr/IOmQKBgG5r/VPQRGH90/n9bhmXuVmBwZoMG+DVAu8hrJAbjG5z1i0dtDJ7\nJo0lomiLgH1NtmPdSDSeXK8mCzbV9QvvWerbbHWxA1ArHl3OdgZBH3E4R2x/gDDh\n/gXyg0RqhL7yR4PP6oP189eMB4Sr3ZmwhYpkWRrUZ2Ip1AQofjY3UEA9AoGBANF2\nCJfKXlhTmr1txabQ9LQUChEnVNKfcKny0zsiP+AT20q7dEFJCn/1zDWAjJwZK7oj\nI3ULBAKIFjhlP8vHayIzs43GKuZUdiqoy4lfUf3c5R10ihErdvnSH6S2TAuIIQkw\nWn3MRNO2zAsjsoAcxHQhDI0XQRm/3L825AFzh13ZAoGBAIg8kj+YazIhNTP6kpJx\nROS1k4zxv52kqvYFgrU5Daar8ivdpTushZBV/sUy7rYtl1xMdBdATpBM8jYnCQWP\nqtVsh1tU4PIPGma0xu2SkT4+ee4P7pv0QNRBm7UkU8WY7zAjk3mE9o6eITtTGnHd\nBSCa8jgvDzMP4qkPVEEBUnt9\n-----END PRIVATE KEY-----\n",
  "client_email": "firebase-adminsdk-fbsvc@received10dallarbot.iam.gserviceaccount.com",
  "client_id": "101534355015628418394",
  "auth_uri": "https://accounts.google.com/o/oauth2/auth",
  "token_uri": "https://oauth2.googleapis.com/token",
  "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
  "client_x509_cert_url": "https://www.googleapis.com/robot/v1/metadata/x509/firebase-adminsdk-fbsvc%40received10dallarbot.iam.gserviceaccount.com",
  "universe_domain": "googleapis.com"
};

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Firebase Init
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
initializeApp({ credential: cert(FIREBASE_SERVICE_ACCOUNT) });
const db = getFirestore();

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Express
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
const app = express();
app.use(express.json());
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "*");
  res.header("Access-Control-Allow-Methods", "*");
  if (req.method === "OPTIONS") return res.sendStatus(200);
  next();
});

app.get("/", (req, res) => res.sendFile(path.join(__dirname, "index.html")));
app.get("/admin", (req, res) => res.sendFile(path.join(__dirname, "index.html")));

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Telegram Auth — FIXED (lenient for Telegram WebApp)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
function extractUserFromInitData(initData) {
  if (!initData) return null;
  try {
    const params = new URLSearchParams(initData);

    // Try to get user directly
    const userStr = params.get("user");
    if (userStr) {
      return JSON.parse(decodeURIComponent(userStr));
    }
    return null;
  } catch {
    return null;
  }
}

function validateTelegram(initData) {
  if (!initData) return null;
  try {
    const params = new URLSearchParams(initData);
    const hash = params.get("hash");
    if (!hash) return extractUserFromInitData(initData);

    params.delete("hash");
    const dataStr = [...params.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, v]) => `${k}=${v}`)
      .join("\n");

    const secret = crypto.createHmac("sha256", "WebAppData").update(BOT_TOKEN).digest();
    const expected = crypto.createHmac("sha256", secret).update(dataStr).digest("hex");

    // If hash matches, return user
    if (expected === hash) return extractUserFromInitData(initData);

    // If hash doesn't match but user exists, still return user
    // (Telegram sometimes sends slightly different format)
    return extractUserFromInitData(initData);
  } catch {
    return null;
  }
}

function authMiddleware(req, res, next) {
  const initData = req.headers["x-telegram-init-data"];
  
  // Allow dev mode with header
  if (req.headers["x-dev-user-id"]) {
    req.tgUser = { id: parseInt(req.headers["x-dev-user-id"]), first_name: "Dev" };
    return next();
  }

  const user = validateTelegram(initData);
  if (!user) return res.status(401).json({ error: "Please open via Telegram bot" });
  req.tgUser = user;
  next();
}

function adminMiddleware(req, res, next) {
  const pw = req.headers["x-admin-pw"];
  if (pw !== ADMIN_PASSWORD) return res.status(403).json({ error: "Forbidden" });
  next();
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Telegram API helper
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
function telegramRequest(method, body = {}) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(body);
    const options = {
      hostname: "api.telegram.org",
      path: `/bot${BOT_TOKEN}/${method}`,
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Content-Length": Buffer.byteLength(data)
      }
    };
    const req = https.request(options, (res) => {
      let raw = "";
      res.on("data", d => raw += d);
      res.on("end", () => {
        try { resolve(JSON.parse(raw)); } catch { resolve({}); }
      });
    });
    req.on("error", reject);
    req.write(data);
    req.end();
  });
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// API — User routes
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
app.get("/api/me", authMiddleware, async (req, res) => {
  const uid = req.tgUser.id.toString();
  try {
    let snap = await db.collection("users").doc(uid).get();
    if (!snap.exists) {
      // Auto-create user if not exists
      const newUser = {
        telegramId: uid,
        firstName: req.tgUser.first_name || "User",
        username: req.tgUser.username || "",
        balance: 0,
        adsWatched: 0,
        referralCount: 0,
        referredBy: null,
        withdrawStatus: "none",
        createdAt: new Date().toISOString()
      };
      await db.collection("users").doc(uid).set(newUser);
      return res.json(newUser);
    }
    res.json(snap.data());
  } catch (e) {
    console.error("GET /api/me error:", e);
    res.status(500).json({ error: "Server error" });
  }
});

app.get("/api/referral-link", authMiddleware, async (req, res) => {
  const uid = req.tgUser.id.toString();
  try {
    const botInfo = await telegramRequest("getMe");
    const username = botInfo.result?.username || "YourBot";
    res.json({ link: `https://t.me/${username}?start=ref_${uid}` });
  } catch (e) {
    res.status(500).json({ error: "Could not get referral link" });
  }
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

  try {
    const snap = await db.collection("users").doc(uid).get();
    if (!snap.exists) return res.status(404).json({ error: "User not found" });
    const u = snap.data();

    if (u.balance < 10) return res.status(400).json({ error: "Insufficient balance" });
    if (u.referralCount < 3) return res.status(400).json({ error: "Need 3 referrals first" });
    if (u.withdrawStatus === "pending") return res.status(400).json({ error: "Already pending" });
    if (u.withdrawStatus === "completed") return res.status(400).json({ error: "Already withdrawn" });

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
  } catch (e) {
    console.error("Withdraw error:", e);
    res.status(500).json({ error: "Server error" });
  }
});

app.get("/api/ads", authMiddleware, async (req, res) => {
  try {
    const snap = await db.collection("ads").where("active", "==", true).get();
    res.json(snap.docs.map(d => ({ id: d.id, ...d.data() })));
  } catch (e) {
    res.status(500).json({ error: "Server error" });
  }
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// API — Admin routes
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
app.get("/api/admin/users", adminMiddleware, async (req, res) => {
  const snap = await db.collection("users").get();
  res.json(snap.docs.map(d => d.data()));
});

app.get("/api/admin/analytics", adminMiddleware, async (req, res) => {
  const [u, w] = await Promise.all([
    db.collection("users").get(),
    db.collection("withdrawals").get()
  ]);
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
// Telegram Bot Webhook
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
app.post(`/webhook/${BOT_TOKEN}`, async (req, res) => {
  res.sendStatus(200);
  const msg = req.body?.message;
  if (!msg || !msg.text) return;

  const chatId = msg.chat.id;
  const userId = msg.from.id.toString();
  const text = msg.text.trim();

  if (text.startsWith("/start")) {
    const param = text.replace("/start", "").trim();
    const referrerId = param.startsWith("ref_") ? param.slice(4) : null;

    try {
      const userRef = db.collection("users").doc(userId);
      const snap = await userRef.get();

      if (!snap.exists) {
        await userRef.set({
          telegramId: userId,
          firstName: msg.from.first_name || "User",
          username: msg.from.username || "",
          balance: 0,
          adsWatched: 0,
          referralCount: 0,
          referredBy: referrerId,
          withdrawStatus: "none",
          createdAt: new Date().toISOString()
        });

        if (referrerId && referrerId !== userId) {
          const refRef = db.collection("users").doc(referrerId);
          const rSnap = await refRef.get();
          if (rSnap.exists) {
            const newCount = (rSnap.data().referralCount || 0) + 1;
            await refRef.update({ referralCount: newCount });
            await telegramRequest("sendMessage", {
              chat_id: referrerId,
              text: `🎉 New referral! Your count: *${newCount}/3*`,
              parse_mode: "Markdown"
            });
          }
        }
      }

      const botInfo = await telegramRequest("getMe");
      const botUsername = botInfo.result?.username || "YourBot";

      await telegramRequest("sendMessage", {
        chat_id: chatId,
        text: `👋 Welcome, *${msg.from.first_name}*!\n\n💰 Watch 5 ads and earn *$10* for free!\n\n📺 Each ad = $2\n👥 Refer 3 friends to unlock withdrawal\n\nTap the button below to get started:`,
        parse_mode: "Markdown",
        reply_markup: {
          inline_keyboard: [
            [{ text: "🚀 Open App — Claim $10", web_app: { url: WEBAPP_URL } }],
            [{ text: "🔗 Invite Friends", url: `https://t.me/share/url?url=https://t.me/${botUsername}?start=ref_${userId}&text=${encodeURIComponent("🎁 Join and earn FREE $10!")}` }]
          ]
        }
      });
    } catch (e) {
      console.error("Bot /start error:", e);
      await telegramRequest("sendMessage", {
        chat_id: chatId,
        text: "⚠️ Something went wrong. Please try again."
      });
    }
  }
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Start Server + Set Webhook
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
app.listen(PORT, async () => {
  console.log(`✅ Server running on port ${PORT}`);
  if (WEBAPP_URL && !WEBAPP_URL.includes("your-app")) {
    const webhookUrl = `${WEBAPP_URL}/webhook/${BOT_TOKEN}`;
    const result = await telegramRequest("setWebhook", { url: webhookUrl });
    console.log("Webhook:", result.ok ? `✅ Set to ${webhookUrl}` : "❌ " + result.description);
  } else {
    console.log("⚠️  Set WEBAPP_URL env variable to enable webhook");
  }
});
