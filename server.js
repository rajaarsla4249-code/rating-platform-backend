/**
 * server.js
 * Backend with admin endpoints
 *
 * - Public endpoints:
 *   GET  /load/:userId
 *   POST /rating
 *   POST /withdraw
 *   POST /bank
 *
 * - Admin endpoints (need valid admin token in header "x-admin-token"):
 *   POST /admin/login        -> { username, password }  (returns token)
 *   GET  /admin/users        -> returns all users
 *   POST /admin/addAmount    -> { userId, amount } (adds to user)
 *   POST /admin/setCanRate   -> { userId, canRate } (true/false)
 *   POST /admin/resetRatings -> { }  (resets ratingsDone for all users)
 *   GET  /admin/ratings      -> returns all ratings across users
 *   GET  /admin/withdraws    -> returns withdraw requests (pendingWithdraw > 0)
 *   POST /admin/processWithdraw -> { userId } (mark pending withdraw as processed)
 *
 * Security: simple token stored in database.json. Change admin password ASAP.
 */

const express = require("express");
const fs = require("fs");
const path = require("path");
const cors = require("cors");
const crypto = require("crypto");

const app = express();
app.use(cors());
app.use(express.json());

// TEST ROUTE
app.get("/test", (req, res) => {
 res.send({ status: "ok" });
});

// Serve Admin Panel
app.use("/admin", express.static(path.join(__dirname, "admin")));

const DB_FILE = path.join(__dirname, "database.json");
const PORT = process.env.PORT || 5001;

// --- DB helpers ---
function ensureDB() {
  if (!fs.existsSync(DB_FILE)) {
    fs.writeFileSync(DB_FILE, JSON.stringify({ admin: { username: "admin", password: "admin123", token: null }, users: {} }, null, 2));
  }
}
function loadDB() {
  ensureDB();
  return JSON.parse(fs.readFileSync(DB_FILE));
}
function saveDB(db) {
  fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2));
}

function createUserIfMissing(db, userId) {
  if (!db.users[userId]) {
    db.users[userId] = {
      totalEarned: 0,
      ratingsDone: 0,
      history: [],
      pendingWithdraw: 0,
      bankDetails: {},
      balance: 9000,
      canRate: true
    };
  }
}

// --- Admin auth middleware ---
function verifyAdminToken(req, res, next) {
  const token = req.headers["x-admin-token"] || req.query.token || req.body.token;
  if (!token) return res.status(401).json({ success: false, message: "Missing admin token" });

  const db = loadDB();
  if (!db.admin || db.admin.token !== token) {
    return res.status(401).json({ success: false, message: "Invalid or expired token" });
  }
  // token ok
  next();
}

/* ------------------------
   Public API routes
   ------------------------*/

// Load user data
app.get("/load/:userId", (req, res) => {
  const db = loadDB();
  const userId = req.params.userId;
  createUserIfMissing(db, userId);
  saveDB(db);
  res.json({ success: true, data: db.users[userId] });
});

// Save rating
app.post("/rating", (req, res) => {
  const { userId, commission, stars, hotel } = req.body;
  if (!userId) return res.status(400).json({ success: false, message: "Missing userId" });

  const db = loadDB();
  createUserIfMissing(db, userId);
  const user = db.users[userId];

  if (!user.canRate) return res.json({ success: false, message: "Rating disabled by admin" });
  if (user.ratingsDone >= 25) return res.json({ success: false, message: "Max 25 ratings done today" });
  if (user.balance < 8500) return res.json({ success: false, message: "Balance must be ≥ ₹8500 to give ratings" });

  const c = parseInt(commission) || 0;
  user.totalEarned += c;
  user.ratingsDone += 1;
  user.balance += c;

  const entry = {
    time: new Date().toLocaleString(),
    hotel: hotel || "Unknown",
    stars: parseInt(stars) || 0,
    amount: c,
    type: "rating"
  };
  user.history.push(entry);

  saveDB(db);

  res.json({ success: true, newTotalEarned: user.totalEarned, newRatingsDone: user.ratingsDone, data: user });
});

// Withdraw
app.post("/withdraw", (req, res) => {
  const { userId, amount } = req.body;
  if (!userId || typeof amount === "undefined") return res.status(400).json({ success: false, message: "Missing params" });

  const db = loadDB();
  createUserIfMissing(db, userId);
  const user = db.users[userId];

  const amt = parseInt(amount);
  if (amt <= 0) return res.json({ success: false, message: "Invalid amount" });
  if (amt > user.totalEarned) return res.json({ success: false, message: "Not enough earnings" });

  user.totalEarned -= amt;
  user.pendingWithdraw += amt;
  user.history.push({ time: new Date().toLocaleString(), type: "withdraw_request", amount: amt });

  saveDB(db);
  res.json({ success: true });
});

// Save bank details
app.post("/bank", (req, res) => {
  const { userId, bankName, accountHolder, accountNumber, ifsc } = req.body;
  if (!userId) return res.status(400).json({ success: false, message: "Missing userId" });

  const db = loadDB();
  createUserIfMissing(db, userId);
  db.users[userId].bankDetails = { bankName, accountHolder, accountNumber, ifsc };
  saveDB(db);
  res.json({ success: true });
});

/* ------------------------
   Admin API routes
   ------------------------*/

// Admin login -> returns token
app.post("/admin/login", (req, res) => {
  const { username, password } = req.body;
  const db = loadDB();
  if (!db.admin) return res.status(500).json({ success: false, message: "Admin not set" });

  if (username === db.admin.username && password === db.admin.password) {
    // generate token
    const token = crypto.randomBytes(24).toString("hex");
    db.admin.token = token;
    saveDB(db);
    return res.json({ success: true, token });
  } else {
    return res.status(401).json({ success: false, message: "Invalid credentials" });
  }
});

// Admin logout (invalidate token)
app.post("/admin/logout", verifyAdminToken, (req, res) => {
  const db = loadDB();
  db.admin.token = null;
  saveDB(db);
  res.json({ success: true });
});

// Get all users
app.get("/admin/users", verifyAdminToken, (req, res) => {
  const db = loadDB();
  res.json({ success: true, users: db.users });
});

// Add amount to user
app.post("/admin/addAmount", verifyAdminToken, (req, res) => {
  const { userId, amount } = req.body;
  if (!userId || typeof amount === "undefined") return res.status(400).json({ success: false, message: "Missing params" });

  const db = loadDB();
  createUserIfMissing(db, userId);
  const user = db.users[userId];
  const amt = parseInt(amount);

  user.totalEarned += amt;
  user.balance += amt;
  user.history.push({ time: new Date().toLocaleString(), type: "admin_add", amount: amt, note: "Added by admin" });

  saveDB(db);
  res.json({ success: true, user });
});

// Enable/Disable rating for a user
app.post("/admin/setCanRate", verifyAdminToken, (req, res) => {
  const { userId, canRate } = req.body;
  if (!userId || typeof canRate === "undefined") return res.status(400).json({ success: false, message: "Missing params" });

  const db = loadDB();
  createUserIfMissing(db, userId);
  db.users[userId].canRate = !!canRate;
  saveDB(db);
  res.json({ success: true, user: db.users[userId] });
});

// Reset ratingsDone for all users
app.post("/admin/resetRatings", verifyAdminToken, (req, res) => {
  const db = loadDB();
  for (const uid in db.users) {
    db.users[uid].ratingsDone = 0;
  }
  saveDB(db);
  res.json({ success: true });
});

// Get all ratings (history across users)
app.get("/admin/ratings", verifyAdminToken, (req, res) => {
  const db = loadDB();
  const all = [];
  for (const uid in db.users) {
    const user = db.users[uid];
    (user.history || []).forEach(h => {
      if (h.type === "rating" || h.type === "admin_add") {
        all.push({ userId: uid, ...h });
      }
    });
  }
  res.json({ success: true, ratings: all });
});

// Get withdraw requests (pendingWithdraw > 0)
app.get("/admin/withdraws", verifyAdminToken, (req, res) => {
  const db = loadDB();
  const reqs = [];
  for (const uid in db.users) {
    const u = db.users[uid];
    if (u.pendingWithdraw && u.pendingWithdraw > 0) {
      reqs.push({ userId: uid, pendingWithdraw: u.pendingWithdraw, bank: u.bankDetails || null });
    }
  }
  res.json({ success: true, withdraws: reqs });
});

// Process withdraw: mark pending as processed (admin pays offline)
app.post("/admin/processWithdraw", verifyAdminToken, (req, res) => {
  const { userId } = req.body;
  if (!userId) return res.status(400).json({ success: false, message: "Missing userId" });

  const db = loadDB();
  if (!db.users[userId]) return res.status(404).json({ success: false, message: "User not found" });

  const user = db.users[userId];
  const amt = user.pendingWithdraw || 0;
  if (amt <= 0) return res.json({ success: false, message: "No pending withdraw for user" });

  // Mark processed (we keep record in history)
  user.history.push({ time: new Date().toLocaleString(), type: "withdraw_processed", amount: amt, note: "Processed by admin" });
  user.pendingWithdraw = 0;
  saveDB(db);
  res.json({ success: true, user });
});
// Admin Stats API
app.get("/admin/stats", (req, res) => {
    const dbFile = path.join(__dirname, "admin", "database.json");
    const db = JSON.parse(fs.readFileSync(dbFile, "utf8"));

    const totalUsers = db.users ? db.users.length : 0;
    const totalRatings = db.ratings ? db.ratings.length : 0;
    const totalEarnings = db.earnings
        ? db.earnings.reduce((sum, e) => sum + (e.amount || 0), 0)
        : 0;

    res.json({
        totalUsers,
        totalRatings,
        totalEarnings
    });
});

/* ------------------------
   Start server
   ------------------------*/
app.listen(PORT, () => {
  console.log(`Backend running on http://localhost:${PORT}`);
});
