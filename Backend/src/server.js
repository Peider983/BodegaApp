import express from "express";
import cors from "cors";
import session from "express-session";
import pg from "pg";
import connectPgSimple from "connect-pg-simple";
import dotenv from "dotenv";

dotenv.config();

const app = express();
app.use(express.json());

// CORS para Vite (local)
app.use(
  cors({
    origin: "http://localhost:5173",
    credentials: true, // IMPORTANTE para cookies de sesión
  })
);

const PgSession = connectPgSimple(session);
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });

app.use(
  session({
    store: new PgSession({ pool, tableName: "session" }),
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      sameSite: "lax",
      secure: false, // local http
      maxAge: 1000 * 60 * 60 * 8, // 8 horas
    },
  })
);

app.get("/health", (req, res) => res.json({ ok: true }));

app.listen(process.env.PORT || 4000, () => {
  console.log("API running on http://localhost:" + (process.env.PORT || 4000));
});
