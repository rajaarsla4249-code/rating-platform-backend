const express = require("express");
const cors = require("cors");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 5001;

// --------------------
// Middleware
// --------------------
app.use(cors());
app.use(express.json());

// --------------------
// Root Route (REQUIRED FOR RENDER)
// --------------------
app.get("/", (req, res) => {
  res.send("Backend is running ✔ on Render");
});

// --------------------
// Serve Admin Panel
// --------------------
app.use("/admin", express.static(path.join(__dirname, "admin")));

app.get("/admin/*", (req, res) => {
  res.sendFile(path.join(__dirname, "admin", "index.html"));
});

// --------------------
// API Example Routes
// (You can replace these with your real rating routes)
// --------------------
app.get("/load/:userId", (req, res) => {
  res.json({
    success: true,
    message: "User loaded successfully from backend ✔",
    userId: req.params.userId
  });
});

app.post("/rating", (req, res) => {
  const { userId, commission, stars, hotel } = req.body;
  res.json({
    success: true,
    message: "Rating saved ✔",
    data: { userId, commission, stars, hotel }
  });
});

// --------------------
// Start Server (REQUIRED FOR RENDER)
// --------------------
app.listen(PORT, "0.0.0.0", () => {
  console.log(`Backend running on port ${PORT}`);
});
