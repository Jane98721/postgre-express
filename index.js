import express from "express";
import pg from "pg";
import dotenv from "dotenv";
import { z } from "zod";

dotenv.config();

const { Pool } = pg;
const app = express();

const envSchema = z.object({
  DB_USER: z.string(),
  DB_HOST: z.string(),
  DB_DATABASE: z.string(),
  DB_PASSWORD: z.string(),
  DB_PORT: z.string().optional()
});

const validatedEnv = envSchema.safeParse(process.env);
if(!validatedEnv.success){
  console.error("Invalid environment variables:", 
    z.treeifyError(validatedEnv.error));
  process.exit(1);
}; 

const { DB_USER, DB_HOST, DB_DATABASE, DB_PASSWORD, DB_PORT } 
= validatedEnv.data;

const pool = new Pool({
  user:DB_USER,
  host:DB_HOST,
  database: DB_DATABASE,
  password: DB_PASSWORD,
  port: DB_PORT
});

const playersSchema = z.object({
  name: z
    .string()
    .min(2, { message: "Your name needs to include at least 2 characters" })
    .max(50, { message: "Your name needs to include at most 20 characters" }),
});

/*game: z.string().min(2).max(20),
score: z.number().min(8).max(50) */

app.use(express.json());

app.get("/players-scores", async(req, res) => {
  const players = `
  SELECT players.name, games.title, scores.score
  FROM scores
  JOIN players ON scores.player_id = players.id
  JOIN games ON scores.game_id = games.id
  `;
  try{
    const result = await pool.query(players);
    res.json(result.rows);
  } catch (err){
    res.status(500).send(err.message);
  }
});

app.get("/top-players", async(req, res) => {
  const highestScore = `
  SELECT players.name, SUM(scores.score) AS total_score
  FROM players
  JOIN scores ON players.id = scores.player_id
  GROUP BY players.name
  ORDER BY total_score DESC
  LIMIT 3
  `;
  try{
    const result = await pool.query(highestScore);
    res.json(result.rows);
  } catch (err) {
    if(err instanceof Error) {
      res.status(500).send(err.message);
    } else {
      res.status(500).send("Unknown error");
    }
  }
});

app.get("/inactive-players", async(req, res) => {
  const inactivePlayers = `
  SELECT players.name
  FROM players
  LEFT JOIN scores ON players.id = scores.player_id
  WHERE scores.id IS NULL
  `;
  try{
    const result = await pool.query(inactivePlayers);
    res.json(result.rows);
  } catch (err) {
    if(err instanceof Error) {
      res.status(500).send(err.message);
    } else {
      res.status(500).send("Unknown error");
    }
  }
});

app.get("/popular-genres", async(req, res) => {
  const popularGames = `
  SELECT games.genre, COUNT(scores.id) AS total_games
  FROM games
  JOIN scores ON games.id = scores.game_id
  GROUP BY games.genre
  ORDER BY total_games DESC
  `;
  try{
    const result = await pool.query(popularGames);
    res.json(result.rows);
  } catch (err) {
    if(err instanceof Error) {
      res.status(500).send(err.message);
    } else {
      res.status(500).send("Unknown error");
    }
  }
});

app.get("/recent-players", async(req, res) => {
  const recentPlayers = `
  SELECT *
  FROM players
  WHERE join_date >= NOW() - INTERVAL '30 days'
  `;
  try{
    const result = await pool.query(recentPlayers);
    res.json(result.rows);
  } catch (err) {
    if(err instanceof Error) {
      res.status(500).send(err.message);
    } else {
      res.status(500).send("Unknown error");
    }
  }
});

app.post("/players", async(req,res) => {
  const validatedPlayer = playersSchema.safeParse(req.body);
  if(!validatedPlayer.success){
    return res.status(400).json({ errors: validatedPlayer.error });
  }
  //console.log(validatedPlayer.data)
  const { name } = validatedPlayer.data;
  try{
    const result = await pool.query(
      "INSERT INTO players (name) VALUES ($1) RETURNING *",
      [name]
    );
    res.json(result.rows[0]);
  } catch (err) {
    if(err instanceof Error) {
      res.status(500).send(err.message);
    } else {
      res.status(500).send("Unknown error");
    }
  }
});

app.put("/players/:id", async (req, res) => {
  const validatedPlayer = playersSchema.safeParse(req.body);
  if(!validatedPlayer.success){
    return res.status(400).json({ errors: validatedPlayer.error });
  }
  //console.log(validatedPlayer.data)
  const { name } = validatedPlayer.data;
  try{
    const result = await pool.query(
      "UPDATE players SET name =  $1 WHERE id = $2 RETURNING *",
      [name]
    );
    if(result.rows.length === 0){
      return res.status(404).send("Player not found");
    }
    res.json(result.rows[0]);
  } catch (err) {
    if(err instanceof Error) {
      res.status(500).send(err.message);
    } else {
      res.status(500).send("Unknown error");
    }
  }
});

app.listen(4000, ()=> {
  console.log("Server is runnin on port 4000");
});