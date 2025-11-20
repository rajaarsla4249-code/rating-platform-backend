const express = require("express");
const cors = require("cors");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 5001;

app.use(cors({ origin: "*" }));
app.use(express.json());

/* ============================================
   SIMPLE IN-MEMORY DATABASE
   (Render resets when sleeping)
=============================================== */

let SETTINGS = {
    ratingEnabled: true,
    withdrawEnabled: true
};

let USERS = {
    "User123": {
        balance: 9000,
        ratingCount: 0,
        totalEarned: 0,
        records: []
    }
};

/* ============================================
   FRONTEND API (USER)
=============================================== */

// Load user
app.get("/api/user/:id", (req, res) => {
    const id = req.params.id;

    if (!USERS[id]) {
        USERS[id] = {
            balance: 9000,
            ratingCount: 0,
            totalEarned: 0,
            records: []
        };
    }

    res.json({
        success: true,
        user: USERS[id]
    });
});

// User submits rating
app.post("/api/update-ratings", (req, res) => {
    const { userId, commission, stars, hotel } = req.body;

    if (!SETTINGS.ratingEnabled) {
        return res.json({ success: false, message: "Ratings are disabled by admin." });
    }

    if (!USERS[userId]) return res.json({ success: false, message: "User not found" });

    USERS[userId].ratingCount += 1;
    USERS[userId].totalEarned += commission;

    USERS[userId].records.push({
        commission,
        stars,
        hotel,
        time: new Date().toLocaleString()
    });

    res.json({ success: true, user: USERS[userId] });
});

// Withdraw
app.post("/api/withdraw", (req, res) => {
    const { userId } = req.body;

    if (!SETTINGS.withdrawEnabled) {
        return res.json({ success: false, message: "Withdraw disabled by admin" });
    }

    if (!USERS[userId]) return res.json({ success: false, message: "User not found" });

    USERS[userId].totalEarned = 0;

    res.json({
        success: true,
        message: "Withdraw successful"
    });
});

/* ============================================
   ADMIN API (Dashboard)
=============================================== */

app.get("/admin/stats", (req, res) => {
    let totalUsers = Object.keys(USERS).length;
    let totalRatings = 0;
    let totalEarnings = 0;

    Object.values(USERS).forEach(u => {
        totalRatings += u.ratingCount;
        totalEarnings += u.totalEarned;
    });

    res.json({
        totalUsers,
        totalRatings,
        totalTasks: totalRatings,
        totalEarnings
    });
});

app.get("/admin/users", (req, res) => {
    res.json(USERS);
});

// Add Amount
app.post("/admin/addAmount", (req, res) => {
    const { userId, amount } = req.body;

    if (!USERS[userId]) USERS[userId] = { balance: 0, ratingCount: 0, totalEarned: 0, records: [] };

    USERS[userId].balance += amount;

    res.json({ success: true });
});

// Cut Amount
app.post("/admin/cutAmount", (req, res) => {
    const { userId, amount } = req.body;

    if (!USERS[userId]) USERS[userId] = { balance: 0, ratingCount: 0, totalEarned: 0, records: [] };

    USERS[userId].balance -= amount;
    if (USERS[userId].balance < 0) USERS[userId].balance = 0;

    res.json({ success: true });
});

// Get settings
app.get("/admin/settings", (req, res) => {
    res.json(SETTINGS);
});

// Toggle Rating
app.post("/admin/toggleRating", (req, res) => {
    SETTINGS.ratingEnabled = !SETTINGS.ratingEnabled;
    res.json({ success: true });
});

// Toggle Withdraw
app.post("/admin/toggleWithdraw", (req, res) => {
    SETTINGS.withdrawEnabled = !SETTINGS.withdrawEnabled;
    res.json({ success: true });
});

// Reset Ratings
app.post("/admin/resetRatings", (req, res) => {
    Object.values(USERS).forEach(u => {
        u.ratingCount = 0;
    });

    res.json({ success: true });
});

/* ============================================
   ADMIN STATIC UI
=============================================== */

app.use("/admin", express.static(path.join(__dirname, "admin")));
app.get("/admin/*", (req, res) => {
    res.sendFile(path.join(__dirname, "admin", "index.html"));
});

/* ============================================
   ROOT
=============================================== */

app.get("/", (req, res) => {
    res.send("Backend is running ✔️");
});

/* ============================================
   START SERVER (Render requirement)
=============================================== */

app.listen(PORT, "0.0.0.0", () => {
    console.log(`Backend running on ${PORT}`);
});
