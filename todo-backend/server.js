const express = require("express");
const cors = require("cors");
const { Pool } = require("pg");

const app = express();
const PORT = process.env.PORT || 3000;

const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const JWT_SECRET = process.env.JWT_SECRET || "temporary_secret_key";
const multer = require("multer");
const path = require("path");

const OpenAI = require("openai");

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});


require("dotenv").config();

const { TranslationServiceClient } =
  require("@google-cloud/translate").v3;

const translationClient = new TranslationServiceClient();

// Middleware
app.use(cors());
app.use(express.json());

app.use("/uploads", express.static("uploads"));

const storage = multer.diskStorage({
  destination: "uploads/",
  filename: (req, file, cb) => {
    cb(null, `user-${Date.now()}${path.extname(file.originalname)}`);
  }
});

const upload = multer({ storage });
const pool = new Pool({
  user: process.env.DB_USER || "postgres",
  host: process.env.DB_HOST || "host.docker.internal",
  database: process.env.DB_NAME || "todolist",
  password: process.env.DB_PASSWORD || "postgres",
  port: process.env.DB_PORT || 5432,
});

pool.query(`
  CREATE TABLE IF NOT EXISTS entries (
    id SERIAL PRIMARY KEY,
    what_to_do TEXT NOT NULL,
    due_date TEXT,
    status TEXT DEFAULT 'pending'
  );
`);

pool.query(`
  CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    username TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL
  );
`);



app.get("/api/profile", authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, username, preferred_language, profile_image
       FROM users
       WHERE id = $1`,
      [req.user.userId]
    );

    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


app.put("/api/profile/language", authenticateToken, async (req, res) => {
  const { preferred_language } = req.body;

  try {
    const result = await pool.query(
      `UPDATE users
       SET preferred_language = $1
       WHERE id = $2
       RETURNING id, username, preferred_language, profile_image`,
      [preferred_language, req.user.userId]
    );

    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


app.post(
  "/api/profile/image",
  authenticateToken,
  upload.single("image"),
  async (req, res) => {
    try {
      const imagePath = `http://34.134.224.128:3000/uploads/${req.file.filename}`;

      const result = await pool.query(
        `UPDATE users
         SET profile_image = $1
         WHERE id = $2
         RETURNING id, username, preferred_language, profile_image`,
        [imagePath, req.user.userId]
      );

      res.json(result.rows[0]);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }
);


app.get("/api/leaderboard", authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        users.username,
        users.profile_image,
        COUNT(entries.id) AS completed_tasks
      FROM users
      LEFT JOIN entries 
        ON users.id = entries.user_id
        AND entries.status = 'done'
      GROUP BY users.id
      ORDER BY completed_tasks DESC
      LIMIT 10
    `);

    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/items", authenticateToken, async (req, res) => {
  try {
const result = await pool.query(
  "SELECT * FROM entries WHERE user_id = $1 ORDER BY id DESC",
  [req.user.userId]
);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/items", authenticateToken, async (req, res) => {
  const { what_to_do, due_date, priority, category } = req.body;

  try {
    const result = await pool.query(
      `INSERT INTO entries 
       (what_to_do, due_date, status, priority, category, user_id)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [
        what_to_do,
        due_date || "",
        "pending",
        priority || "Medium",
        category || "General",
        req.user.userId
      ]
    );

    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put("/api/items/:id", authenticateToken, async (req, res) => {
  const { id } = req.params;

  try {
    const result = await pool.query(
      `UPDATE entries
       SET status = $1, completed_at = NOW()
       WHERE id = $2 AND user_id = $3
       RETURNING *`,
      ["done", id, req.user.userId]
    );

    res.json(result.rows[0]);
  } catch (err) {
    console.error("Mark done failed:", err);
    res.status(500).json({ error: err.message });
  }
});

app.delete("/api/items/:id", authenticateToken, async (req, res) => {
  const { id } = req.params;

  try {
    await pool.query(
      "DELETE FROM entries WHERE id = $1 AND user_id = $2",
      [id, req.user.userId]
    );

    res.json({ result: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


app.post("/api/translate", async (req, res) => {
  const { text, targetLanguage } = req.body;

  try {
    const projectId = process.env.GOOGLE_CLOUD_PROJECT_ID;

    const request = {
      parent: `projects/${projectId}/locations/global`,
      contents: [text],
      mimeType: "text/plain",
      targetLanguageCode: targetLanguage || "mk"
    };

    const [response] = await translationClient.translateText(request);

    res.json({
      original: text,
      translated: response.translations[0].translatedText
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Translation failed" });
  }
});

app.post("/api/enhance-task", async (req, res) => {
  const { task } = req.body;

  try {

    const response = await openai.responses.create({
      model: "gpt-4.1-mini",
      input: `
You are a task assistant.

Improve the task text and classify it.

Return ONLY valid JSON.

Format:
{
  "improved_task": "",
  "priority": "Low | Medium | High",
  "category": "School | Work | Personal | General"
}

Task:
${task}
`
    });

    const raw = response.output_text
      .replace(/```json/g, '')
      .replace(/```/g, '')
      .trim();

    const parsed = JSON.parse(raw);

    res.json(parsed);

  } catch (err) {

    console.error(err);

    res.status(500).json({
      error: "AI enhancement failed"
    });
  }
});

app.listen(PORT, () => {
  console.log(`Backend running on http://34.134.224.128:${PORT}`);
});

app.post("/api/register", async (req, res) => {
  const { username, password } = req.body;

  try {
    const hashedPassword = await bcrypt.hash(password, 10);

    const result = await pool.query(
      "INSERT INTO users (username, password) VALUES ($1, $2) RETURNING id, username",
      [username, hashedPassword]
    );

    res.json({
      message: "User registered successfully",
      user: result.rows[0]
    });
  } catch (err) {
    res.status(400).json({ error: "Username already exists or invalid data" });
  }
});


app.post("/api/login", async (req, res) => {
  const { username, password } = req.body;

  try {
    const result = await pool.query(
      "SELECT * FROM users WHERE username = $1",
      [username]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: "Invalid username or password" });
    }

    const user = result.rows[0];
    const validPassword = await bcrypt.compare(password, user.password);

    if (!validPassword) {
      return res.status(401).json({ error: "Invalid username or password" });
    }

    const token = jwt.sign(
      { userId: user.id, username: user.username },
      JWT_SECRET,
      { expiresIn: "2h" }
    );

    res.json({
      message: "Login successful",
      token,
      username: user.username
    });
  } catch (err) {
    res.status(500).json({ error: "Login failed" });
  }
});


function authenticateToken(req, res, next) {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) {
    return res.status(401).json({ error: "Access denied" });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: "Invalid token" });
    }

    req.user = user;
    next();
  });
}

app.post("/api/translate", async (req, res) => {
  const { text, targetLanguage } = req.body;

  try {
    const projectId = process.env.GOOGLE_CLOUD_PROJECT_ID;

    const request = {
      parent: `projects/${projectId}/locations/global`,
      contents: [text],
      mimeType: "text/plain",
      targetLanguageCode: targetLanguage || "mk",
    };

    const [response] =
      await translationClient.translateText(request);

    res.json({
      original: text,
      translated: response.translations[0].translatedText,
    });

  } catch (err) {
    console.error(err);

    res.status(500).json({
      error: "Translation failed",
    });
  }
});

app.post("/api/enhance-task", async (req, res) => {
  const { task } = req.body;

  try {

    const response = await openai.responses.create({
      model: "gpt-5.5-mini",
      input: `
You are a task assistant.

Improve the task text and classify it.

Return ONLY valid JSON in this exact format:

{
  "improved_task": "",
  "priority": "Low | Medium | High",
  "category": "School | Work | Personal | General"
}

Task:
${task}
`
    });

    const raw = response.output_text;

    const parsed = JSON.parse(raw);

    res.json(parsed);

  } catch (err) {
    console.error(err);

    res.status(500).json({
      error: "AI enhancement failed"
    });
  }
});
