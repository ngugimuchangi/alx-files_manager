import sha1 from 'sha1';
import Queue from 'bull';
import dbClient from '../utils/db';

// User welcome email queue
const userQueue = Queue('send welcome email');

/**
 * Controller for endpoint POST /users for creating new users
 * @typedef {import("express").Request} Request
 * @typedef {import("express").Response} Response
 * @param {Request} req - request object
 * @param {Response} res - response object
 */
export default async function postNew(req, res) {
  const { email, password } = req.body;
  const usersCollection = dbClient.usersCollection();
  if (email === undefined) {
    res.status(400).json({ error: 'Missing email' });
  } else if (password === undefined) {
    res.status(400).json({ error: 'Missing password' });
  } else if (await usersCollection.findOne({ email })) {
    res.status(400).json({ error: 'Already exist' });
  } else {
    const hashedPassword = sha1(password);
    const newUser = { email, password: hashedPassword };
    const commandResult = await usersCollection.insertOne(newUser);
    userQueue.add({ userId: commandResult.insertedId });
    res.status(201).json({ id: commandResult.insertedId, email });
  }
}
