import express from 'express'
import pg from "pg"
import dotenv from 'dotenv'

dotenv.config();

const app = express()
const {Pool} = pg;

const pool = new Pool({
  user:process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_DATABASE,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT
})

app.use(express.json())

app.get('/players-scores', async(req, res) => {
  const players = `
  SELECT players.name, games.title, scores.score
  FROM scores
  JOIN players ON scores.player_id = players.id
  JOIN games ON scores.game_id = games.id
  `
  try{
    const result = await pool.query(players)
    res.json(result.rows)
  } catch (err){
    res.status(500).send(err.message)
  }
})

app.get('/top-players', async(req, res) => {
  const highestScore = `
  SELECT players.name, SUM(scores.score) AS total_score
  FROM players
  JOIN scores ON players.id = scores.player_id
  GROUP BY players.name
  ORDER BY total_score DESC
  LIMIT 3
  `
  try{
    const result = await pool.query(highestScore)
    res.json(result.rows)
  } catch (err){
    res.status(500).send(err.message)
  }
})

app.get('/inactive-players', async(req, res) => {
  const inactivePlayers = `
  SELECT players.name
  FROM players
  LEFT JOIN scores ON players.id = scores.player_id
  WHERE scores.id IS NULL
  `
  try{
    const result = await pool.query(inactivePlayers)
    res.json(result.rows)
  } catch (err){
    res.status(500).send(err.message)
  }
})

app.get('/popular-genres', async(req, res) => {
  const popularGames = `
  SELECT games.genre, COUNT(scores.id) AS total_games
  FROM games
  JOIN scores ON games.id = scores.game_id
  GROUP BY games.genre
  ORDER BY total_games DESC
  `
  try{
    const result = await pool.query(popularGames)
    res.json(result.rows)
  } catch (err){
    res.status(500).send(err.message)
  }
})

app.get('/recent-players', async(req, res) => {
  const recentPlayers = `
  SELECT *
  FROM players
  WHERE join_date >= NOW() - INTERVAL '30 days'
  `
  try{
    const result = await pool.query(recentPlayers)
    res.json(result.rows)
  } catch (err){
    res.status(500).send(err.message)
  }
})

app.listen(4000, ()=> {
  console.log(`Server is runnin on port 4000`)
})