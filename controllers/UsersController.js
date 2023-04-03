import crypto from 'crypto';
import dbClient from '../utils/db';

/**
 * Controller for endpoint POST /users for creating new users
 * @param {Object} req - request object
 * @param {Object} res - response object
 */
export default async function postNew(req, res) {
  const { email, password } = req.body;
  const usersCollection = dbClient.db.collection('users');
  if (email === undefined) {
    res.status(400).json({ error: 'Missing email' });
  } else if (password === undefined) {
    res.status(400).json({ error: 'Missing password' });
  } else if (await usersCollection.findOne({ email })) {
    res.status(400).json({ error: 'Already exists' });
  } else {
    const hashedPassword = crypto.createHash('sha1').update(password).digest('hex');
    const newUser = { email, password: hashedPassword };
    const commandResult = await usersCollection.insertOne(newUser);
    res.status(200).json({ id: commandResult.insertedId, email });
  }
}
