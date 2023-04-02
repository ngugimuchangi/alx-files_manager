import crypto from 'node:crypto';
import dbClient from '../utils/db';

/**
 * Controller for endpoint POST /users for creating new users
 * @param {object} req - request object
 * @param {object} res - response object
 */
export default async function postNew(req, res) {
  const { email, password } = req.body;
  const usersCollection = dbClient.db.collection('users');
  res.statusCode = 400;
  if (email === undefined) res.send('Missing email');
  else if (password === undefined) res.send('Missing password');
  else if (await usersCollection.findOne({ email })) res.send('Already exists');
  else {
    const hashedPassword = crypto.createHash('sha1').update(password).digest('hex');
    const newUser = { email, password: hashedPassword };
    const commandResult = await usersCollection.insertOne(newUser);
    res.statusCode = 200;
    res.send({ id: commandResult.insertedId, email });
  }
}
