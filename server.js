const express = require("express");
const cors = require("cors");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 5001;

// Allow Netlify Frontend
app.use(cors({
  origin: "*"
}));

app.use(express.json());

/* ===================================================
   USER DATA STORAGE (simple example)
=================================================== */
let USERS = {
  "User123": {
    totalEarned: 0,
    ratingsDone: 0,
    vipLevel: "Bronze",
    records: []
  }
};

/* ===================================================
   REQUIRED API ROUTES FOR FRONTEND
=================================================== */

// Load User Info
app.get("/api/user/:id", (req, res) => {
  const id = req.params.id;
  const user = USERS[id];

  if (!user) {
    USERS[id] = {
      totalEarned: 0,
      ratingsDone: 0,
      vipLevel: "Bronze",
      records: []
    };
  }

  res.json({
    success: true,
    user: USERS[id]
  });
});

// Update Ratings
app.post("/api/update-ratings", (req, res) => {
  const { userId, commission, stars, hotel } = req.body;

  USERS[userId].ratingsDone++;
  USERS[userId].totalEarned += commission;

  USERS[userId].records.push({
    commission,
    stars,
    hotel,
    time: new Date()
  });

  res.json({
    success: true,
    message: "Rating updated.",
    user: USERS[userId]
  });
});

// Withdraw
app.post("/api/withdraw", (req, res) => {
  const { userId } = req.body;

  USERS[userId].totalEarned = 0;

  res.json({
    success: true,
    message: "Withdraw successful.",
    amount: 0
  });
});

// Get Rating Records
app.get("/api/get-records/:id", (req, res) => {
  const id = req.params.id;

  res.json({
    success: true,
    records: USERS[id]?.records || []
  });
});

/* ===================================================
   ADMIN PANEL
=================================================== */
app.use("/admin", express.static(path.join(__dirname, "admin")));

app.get("/admin/*", (req, res) => {
  res.sendFile(path.join(__dirname, "admin", "index.html"));
});

/* ===================================================
   ROOT ENDPOINT
=================================================== */
app.get("/", (req, res) => {
  res.send("Backend is running ✔ on Render");
});

/* ===================================================
   START SERVER (REQUIRED FOR RENDER)
=================================================== */
app.listen(PORT, "0.0.0.0", () => {
  console.log(`Backend running on ${PORT}`);
});
