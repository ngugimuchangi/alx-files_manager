/* eslint no-console: off */
import Queue from 'bull';
import { ObjectId } from 'mongodb';
import imageThumbnail from 'image-thumbnail';
import generateThumbnail from './utils/thumbnails';
import UsersCollection from './utils/users';
import FilesCollection from './utils/files';

const fileQueue = Queue('thumbnail generation');
const userQueue = Queue('send welcome email');

// Thumbnail jobs consumer
fileQueue.process(10, async (job) => {
  const { fileId, userId } = job.data;
  // job essential properties validation
  if (!fileId) throw new Error('Missing fileId');
  if (!userId) throw new Error('Missing userId');

  // file id and user id conversion to ObjectId before querying db
  const _id = ObjectId.isValid(fileId) ? new ObjectId(fileId) : fileId;
  const _userId = ObjectId.isValid(userId) ? new ObjectId(userId) : userId;
  const file = await FilesCollection.getFile({ _id, userId: _userId });
  const { localPath } = file;

  // Check if file exists in db and local storage
  if (!file) throw new Error('File not found');

  // Create thumbnails and store them in local storage
  const thumbnail100 = generateThumbnail(localPath, 100);
  const thumbnail250 = imageThumbnail(localPath, 250);
  const thumbnail500 = imageThumbnail(localPath, 500);
  await Promise.all([thumbnail100, thumbnail250, thumbnail500]);
  return Promise.resolve(`Thumbnails for ${file.name} created successfully.`);
});

fileQueue.on('completed', (job, result) => {
  console.log(`Thumbnail generation job #${job.id} completed: ${result}`);
});

// Email jobs consumer
userQueue.process(20, async (job) => {
  const { userId } = job.data;
  if (!userId) throw new Error('Missing userId');
  const _id = ObjectId.isValid(userId) ? new ObjectId(userId) : userId;
  const user = await UsersCollection.getUser({ _id });
  if (!user) throw new Error('User not found');
  return Promise.resolve(`Welcome ${user.email}`);
});

userQueue.on('completed', (_job, result) => {
  console.log(result);
});
