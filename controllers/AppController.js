import dbClient from '../utils/db';
import redisClient from '../utils/redis';

/**
 * Controller for endpoint GET /status
 * @param {object} _req - requests object
 * @param {object} res  - response object
 */
export function getStatus(_req, res) {
  if (dbClient.isAlive() && redisClient.isAlive()) {
    res.status(200).json({ redis: true, db: true });
  }
}

/**
 * Controller for endpoint GET /stats
 * @param {object} _req - requests object
 * @param {object} res  - response object
 */
export async function getStats(_req, res) {
  const users = await dbClient.nbUsers();
  const files = await dbClient.nbFiles();
  res.status(200).json({ users, files });
}
