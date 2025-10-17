const express = require("express");
const fs = require("fs");
const path = require("path");
const app = express();

app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

const levelsFile = path.join(__dirname, "levels.json");

// Fetch all levels
app.get("/api/levels", (req, res) => {
  fs.readFile(levelsFile, "utf8", (err, data) => {
    if (err) {
      console.error("Error reading levels.json:", err);
      return res.status(500).json({ error: "Failed to read levels file" });
    }
    try {
      res.json(JSON.parse(data));
    } catch (parseErr) {
      console.error("Error parsing levels.json:", parseErr);
      res.status(500).json({ error: "Invalid JSON in levels file" });
    }
  });
});

// Save updated levels
app.post("/api/levels", (req, res) => {
  fs.writeFile(levelsFile, JSON.stringify(req.body, null, 2), (err) => {
    if (err) {
      console.error("Error writing levels.json:", err);
      return res.status(500).json({ error: "Failed to save levels" });
    }
    console.log("✅ Levels saved successfully!");
    res.json({ success: true });
  });
});

const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`🚀 Server running on port ${port}`));
