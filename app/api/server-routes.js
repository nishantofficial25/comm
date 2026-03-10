/**
 * StudyVoid — New Backend Routes (add to your existing server.js)
 *
 * npm install jsonwebtoken google-auth-library
 * .env: GOOGLE_CLIENT_ID=xxx  JWT_SECRET=yyy
 */
const jwt = require("jsonwebtoken");
const { OAuth2Client } = require("google-auth-library");

const gClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
const JWT_SECRET = process.env.JWT_SECRET || "studyvoid_secret_change_me";

function authMiddleware(req, res, next) {
  const auth = req.headers.authorization;
  if (!auth?.startsWith("Bearer "))
    return res.status(401).json({ error: "Unauthorized" });
  try {
    req.user = jwt.verify(auth.slice(7), JWT_SECRET);
    next();
  } catch {
    return res.status(401).json({ error: "Invalid token" });
  }
}

// ── Google sign-in ─────────────────────────────────────────────
app.post("/api/void/auth/google", async (req, res) => {
  const { credential } = req.body;
  if (!credential) return res.status(400).json({ error: "No credential" });
  let client;
  try {
    const ticket = await gClient.verifyIdToken({
      idToken: credential,
      audience: process.env.GOOGLE_CLIENT_ID,
    });
    const p = ticket.getPayload();
    const { sub: uid, email, name: googleName, picture } = p;
    client = new MongoClient(MONGO_URI);
    await client.connect();
    const users = client.db(DB_NAME).collection("svUsers");
    const existing = await users.findOne({ uid });
    if (existing) {
      await users.updateOne(
        { uid },
        { $set: { picture, email, updatedAt: new Date() } },
      );
      const token = jwt.sign(
        { uid, displayName: existing.displayName, email },
        JWT_SECRET,
        { expiresIn: "30d" },
      );
      return res.json({ token, isNew: false });
    }
    const setupToken = jwt.sign(
      { uid, email, googleName, picture, isSetup: true },
      JWT_SECRET,
      { expiresIn: "1h" },
    );
    return res.json({ isNew: true, setupToken, googleName, picture });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  } finally {
    if (client) await client.close();
  }
});

// ── Complete account setup ─────────────────────────────────────
app.post("/api/void/auth/complete-setup", async (req, res) => {
  const { setupToken, displayName } = req.body;
  if (!setupToken || !displayName?.trim())
    return res.status(400).json({ error: "Missing fields" });
  let client;
  try {
    const p = jwt.verify(setupToken, JWT_SECRET);
    if (!p.isSetup) return res.status(400).json({ error: "Invalid token" });
    const { uid, email, googleName, picture } = p;
    client = new MongoClient(MONGO_URI);
    await client.connect();
    await client
      .db(DB_NAME)
      .collection("svUsers")
      .updateOne(
        { uid },
        {
          $setOnInsert: {
            uid,
            email,
            googleName,
            picture,
            createdAt: new Date(),
          },
          $set: { displayName: displayName.trim(), updatedAt: new Date() },
        },
        { upsert: true },
      );
    await client
      .db(DB_NAME)
      .collection("svStudyData")
      .updateOne(
        { uid },
        {
          $setOnInsert: {
            uid,
            dailySecs: {},
            todoLists: [
              { id: "default", name: "General", color: "#a855f7", items: [] },
            ],
            topics: {},
            pomodoroSettings: { focus: 25, shortBreak: 5, longBreak: 15 },
            pomodoroSessions: {},
            goalHrs: 8,
            createdAt: new Date(),
          },
        },
        { upsert: true },
      );
    const token = jwt.sign(
      { uid, displayName: displayName.trim(), email },
      JWT_SECRET,
      { expiresIn: "30d" },
    );
    return res.json({ token });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  } finally {
    if (client) await client.close();
  }
});

// ── Get current user ───────────────────────────────────────────
app.get("/api/void/auth/me", authMiddleware, async (req, res) => {
  let client;
  try {
    client = new MongoClient(MONGO_URI);
    await client.connect();
    const user = await client
      .db(DB_NAME)
      .collection("svUsers")
      .findOne({ uid: req.user.uid });
    if (!user) return res.status(404).json({ error: "User not found" });
    res.json({
      user: {
        uid: user.uid,
        email: user.email,
        googleName: user.googleName,
        displayName: user.displayName,
        picture: user.picture,
        createdAt: user.createdAt,
      },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  } finally {
    if (client) await client.close();
  }
});

// ── Update display name ────────────────────────────────────────
app.patch("/api/void/auth/profile", authMiddleware, async (req, res) => {
  const { displayName } = req.body;
  if (!displayName?.trim())
    return res.status(400).json({ error: "displayName required" });
  let client;
  try {
    client = new MongoClient(MONGO_URI);
    await client.connect();
    await client
      .db(DB_NAME)
      .collection("svUsers")
      .updateOne(
        { uid: req.user.uid },
        { $set: { displayName: displayName.trim(), updatedAt: new Date() } },
      );
    const user = await client
      .db(DB_NAME)
      .collection("svUsers")
      .findOne({ uid: req.user.uid });
    res.json({
      user: {
        uid: user.uid,
        email: user.email,
        googleName: user.googleName,
        displayName: user.displayName,
        picture: user.picture,
      },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  } finally {
    if (client) await client.close();
  }
});

// ── Get study data ─────────────────────────────────────────────
app.get("/api/void/study/me", authMiddleware, async (req, res) => {
  let client;
  try {
    client = new MongoClient(MONGO_URI);
    await client.connect();
    const data = await client
      .db(DB_NAME)
      .collection("svStudyData")
      .findOne({ uid: req.user.uid });
    res.json({ data: data || null });
  } catch (err) {
    res.status(500).json({ error: err.message });
  } finally {
    if (client) await client.close();
  }
});

// ── Sync study data (partial update) ──────────────────────────
// Body may include any of: dailySecsIncrement:{date,secs}, todoLists, topics:{date:[...]}, pomodoroSettings, pomodoroSessionIncrement, goalHrs
app.post("/api/void/study/sync", authMiddleware, async (req, res) => {
  const {
    dailySecsIncrement,
    todoLists,
    topics,
    pomodoroSettings,
    pomodoroSessionIncrement,
    goalHrs,
  } = req.body;
  const uid = req.user.uid;
  let client;
  try {
    client = new MongoClient(MONGO_URI);
    await client.connect();
    const $set = { updatedAt: new Date() };
    const $inc = {};
    if (todoLists !== undefined) $set.todoLists = todoLists;
    if (pomodoroSettings) $set.pomodoroSettings = pomodoroSettings;
    if (goalHrs !== undefined) $set.goalHrs = goalHrs;
    if (topics)
      Object.entries(topics).forEach(([date, tArr]) => {
        $set[`topics.${date}`] = tArr;
      });
    if (dailySecsIncrement) {
      const { date, secs } = dailySecsIncrement;
      if (date && secs > 0) $inc[`dailySecs.${date}`] = secs;
    }
    if (pomodoroSessionIncrement) {
      const today = new Date().toISOString().split("T")[0];
      $inc[`pomodoroSessions.${today}`] = 1;
    }
    await client
      .db(DB_NAME)
      .collection("svStudyData")
      .updateOne(
        { uid },
        { $set, ...(Object.keys($inc).length ? { $inc } : {}) },
        { upsert: true },
      );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  } finally {
    if (client) await client.close();
  }
});

// ── Leaderboard ────────────────────────────────────────────────
app.get("/api/void/leaderboard", authMiddleware, async (req, res) => {
  const targetDate =
    req.query.date ||
    new Date(Date.now() - 86400000).toISOString().split("T")[0];
  const myUid = req.user.uid;
  let client;
  try {
    client = new MongoClient(MONGO_URI);
    await client.connect();
    const db2 = client.db(DB_NAME);
    const field = `dailySecs.${targetDate}`;
    const docs = await db2
      .collection("svStudyData")
      .find({ [field]: { $gt: 0 } })
      .sort({ [field]: -1 })
      .limit(50)
      .toArray();
    if (!docs.length) return res.json({ entries: [] });
    const uids = docs.map((d) => d.uid);
    const users = await db2
      .collection("svUsers")
      .find({ uid: { $in: uids } })
      .project({ uid: 1, displayName: 1, picture: 1 })
      .toArray();
    const userMap = {};
    users.forEach((u) => {
      userMap[u.uid] = u;
    });
    const entries = docs.map((d, i) => {
      const u = userMap[d.uid] || {};
      return {
        uid: d.uid,
        displayName: u.displayName || "Anonymous",
        picture: u.picture || null,
        secs: d.dailySecs?.[targetDate] || 0,
        rank: i + 1,
        isMe: d.uid === myUid,
      };
    });
    // Ensure current user included even if outside top 50
    if (!entries.find((e) => e.isMe)) {
      const myDoc = await db2.collection("svStudyData").findOne({ uid: myUid });
      const mySecs = myDoc?.dailySecs?.[targetDate] || 0;
      if (mySecs > 0) {
        const myRank =
          (await db2
            .collection("svStudyData")
            .countDocuments({ [field]: { $gt: mySecs } })) + 1;
        const myUser = await db2.collection("svUsers").findOne({ uid: myUid });
        entries.push({
          uid: myUid,
          displayName: myUser?.displayName || "You",
          picture: myUser?.picture || null,
          secs: mySecs,
          rank: myRank,
          isMe: true,
        });
      }
    }
    res.json({ entries });
  } catch (err) {
    res.status(500).json({ error: err.message });
  } finally {
    if (client) await client.close();
  }
});
