import crypto from 'crypto';
import { v4 } from 'uuid';
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
  // Get base64 authentication parameters and decrypt to ascii
  const b64Credentials = Buffer.from(authParams.replace('Basic', ''), 'base64');
  const decryptedCredentials = b64Credentials.toString('ascii');
  const credentials = decryptedCredentials.split(':');
  const email = credentials[0] || '';
  const password = credentials[1] || '';
  // Check if user exists
  const userCollection = dbClient.db.collection('users');
  const user = await userCollection.findOne({ email });
  if (!user) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }
  // Check if passwords match
  const hashedPassword = crypto.createHash('SHA1').update(password).digest('hex');
  if (user.password !== hashedPassword) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }
  const token = v4();
  await redisClient.set(`auth_${token}`, user._id.toString(), 60 * 60 * 24);
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
  if (!await redisClient.get(`auth_${token}`)) {
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
  const userId = await redisClient.get(`auth_${token}`);
  if (!userId) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }
  const userCollection = dbClient.db.collection('users');
  const user = await userCollection.findOne({ _id: new ObjectId(userId) });
  res.status(200).json({ id: userId, email: user.email });
}
