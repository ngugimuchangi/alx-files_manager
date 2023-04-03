import crypto from 'node:crypto';
import uuid from 'uuid';
import { ObjectId } from 'mongodb';
import dbClient from '../utils/db';
import redisClient from '../utils/redis';

/**
 * Controller for GET /connect endpoint for authorizing users
 * using Basic Auth scheme
 * @param {Object} req - request object
 * @param {Object} res - response object
 * @returns {void}
 */
export async function getConnect(req, res) {
  const authParams = req.get('Authorization');
  if (!authParams) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }
  const credentials = authParams.split(' ', 1)[1];
  const [email, password] = credentials.split(':', 1);
  const userCollection = dbClient.db.collection('users');
  const user = userCollection.findOne({ email });
  if (!user) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }
  const hashedPassword = crypto.createHash('SHA1').update(password).digest('hex');
  if (user.password !== hashedPassword) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }
  const token = uuid.v4();
  await redisClient.set(`aut_${token}`, user._id.toString(), 60 * 60 * 24);
  res.status(200).json({ token });
}

/**
 * Controller for GET /disconnect endpoint that logs out user
 * if they were logged in.
 * @param {Object} req - request object
 * @param {Object} res - response object
 * @returns {void}
 */
export async function getDisconnect(req, res) {
  const token = req.get('X-Token');
  if (!token) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }
  if (!await redisClient.get(token)) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }
  redisClient.del(token);
  res.status(204);
}

/**
 * Controller for GET /users/me endpoint that retrieves information
 * about a logged in user
 * @param {Object} req - request object
 * @param {Object} res - response object
 * @returns {void}
 */
export async function getMe(req, res) {
  const token = req.get('X-Token');
  if (!token) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }
  const userId = await redisClient.get(token);
  if (!userId) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }
  const userCollection = dbClient.db.collection('users');
  const user = userCollection.findOne({ _id: new ObjectId(userId) });
  res.status(200).json({ id: userId, email: user.email });
}
