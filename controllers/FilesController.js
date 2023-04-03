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
  const fileTypes = ['folder', 'file', 'images'];
  const filesCollection = dbClient.db.collection('files');
  const token = req.get('X-Token');
  // Validate token has passed in the headers
  if (!token) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }
  // Validate token is valid
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
  if (!type || !fileTypes.includes(type)) {
    res.status(400).json({ error: 'Missing type' });
    return;
  }
  // Validate data is present if type is a file or image
  if (type !== 'folder' && !data) {
    res.status(400).json({ error: 'Missing data' });
    return;
  }
  // Validate parent folder exists in db, its type is a folder
  const parentFolder = await filesCollection.findOne({ _id: new ObjectId(parentId) });
  if (parentId && !parentFolder) {
    res.status(400).json({ error: 'Parent not found' });
    return;
  }
  if (parentId && parentFolder.type !== 'folder') {
    res.status(400).json({ error: 'Parent is not a folder' });
    return;
  }
  // Make main directory if does'nt exist
  if (!fs.existsSync(filesDir)) {
    fs.mkdirSync(filesDir, { recursive: true });
  }
  // Create new folder if type is folder and add its details to db
  if (type === 'folder') {
    const fileDocument = {
      userId: new ObjectId(userId), name, type, isPublic, parentId,
    };
    fs.mkdirSync(`${filesDir}/${name}`, { recursive: true });
    const commandResult = await filesCollection.insertOne(fileDocument);
    res.status(201).json({
      id: commandResult.insertedId, userId, name, type, isPublic, parentId,
    });
    return;
  }
  // Create new file if type is file or image and add its details to db
  const fileUuid = v4();
  const localPath = parentFolder ? `${filesDir}/${parentFolder}/${fileUuid}`
    : `${filesDir}/${fileUuid}`;
  fs.writeFileSync(localPath, Buffer.from(data, 'base64').toString('utf-8'));
  const fileDocument = {
    userId: new ObjectId(userId), name, type, isPublic, parentId, localPath,
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
