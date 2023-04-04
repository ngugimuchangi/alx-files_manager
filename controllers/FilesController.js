import fs from 'fs';
import { ObjectId } from 'mongodb';
import { v4 } from 'uuid';
import dbClient from '../utils/db';
import redisClient from '../utils/redis';

/**
 * Controller for POST /files endpoint for handling file creation
 * @param {Object} req - request object
 * @param {Object} res - response object
 */
export async function postUpload(req, res) {
  const filesDir = process.env.FOLDER_PATH || '/tmp/file_manager';
  const fileTypes = ['folder', 'file', 'image'];
  const filesCollection = dbClient.db.collection('files');
  const token = req.get('X-Token');
  // Validate token has passed in the headers
  if (!token) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }
  // Validate token is associated with a user
  const userId = await redisClient.get(`auth_${token}`);
  if (!userId) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }
  const {
    name, type, parentId = 0, isPublic = false, data,
  } = req.body;
  // Validate name and type are okay
  if (!name) {
    res.status(400).json({ error: 'Missing name' });
    return;
  }
  if (!fileTypes.includes(type)) {
    res.status(400).json({ error: 'Missing type' });
    return;
  }
  // Validate data is present if type is a file or image
  if (type !== 'folder' && !data) {
    res.status(400).json({ error: 'Missing data' });
    return;
  }
  // Validate parent folder exists in db, its type is a folder
  const parentDocument = await filesCollection.findOne({ _id: new ObjectId(parentId) });
  if (parentId && !parentDocument) {
    res.status(400).json({ error: 'Parent not found' });
    return;
  }
  if (parentId && parentDocument.type !== 'folder') {
    res.status(400).json({ error: 'Parent is not a folder' });
    return;
  }
  // Make main directory if doesn't exist or isn't a directory
  if (!fs.existsSync(filesDir) || !fs.lstatSync(filesDir).isDirectory()) {
    fs.mkdirSync(filesDir, { recursive: true });
  }
  // Create new folder if type is folder and add its details to db
  if (type === 'folder') {
    // const localPath = parentDocument ? `${filesDir}/${parentDocument.name}/${name}` : `${filesDir}/${name}`;
    // fs.mkdirSync(localPath, { recursive: true });
    const parentIdObject = parentId === 0 ? parentId : new ObjectId(parentId);
    const fileDocument = {
      userId: new ObjectId(userId), name, type, isPublic, parentId: parentIdObject,
    };
    const commandResult = await filesCollection.insertOne(fileDocument);
    res.status(201).json({
      id: commandResult.insertedId, userId, name, type, isPublic, parentId,
    });
    return;
  }
  // Create new file if type is file or image and add its details to db
  const fileUuid = v4();
  const localPath = `${filesDir}/${fileUuid}`;
  fs.writeFileSync(localPath, Buffer.from(data, 'base64').toString('utf-8'));
  const parentIdObject = parentId === 0 ? parentId : new ObjectId(parentId);
  const fileDocument = {
    userId: new ObjectId(userId), name, type, isPublic, parentId: parentIdObject, localPath,
  };
  const commandResult = await filesCollection.insertOne(fileDocument);
  res.status(201).json({
    id: commandResult.insertedId, userId, name, type, isPublic, parentId,
  });
}

/**
 *
 * @param {Object} req - request object
 * @param {Object} res - response object
 */
export async function getShow(req, res) {

}

/**
 *
 * @param {Object} req - request object
 * @param {Object} res - response object
 */
export async function getIndex(req, res) {

}

/**
 *
 * @param {Object} req - request object
 * @param {Object} res - response object
 */
export async function putPublish(req, res) {

}

/**
 *
 * @param {Object} req - request object
 * @param {Object} res - response object
 */
export async function putUnpublish(req, res) {

}

/**
 *
 * @param {Object} req - request object
 * @param {Object} res - response object
 */
export async function getFile(req, res) {

}
