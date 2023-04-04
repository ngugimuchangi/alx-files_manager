import fs from 'fs';
import mime from 'mime-types';
import { ObjectId } from 'mongodb';
import { v4 } from 'uuid';
import dbClient from '../utils/db';
import redisClient from '../utils/redis';
import formatFileDocument from '../utils/format';

/**
 * Controller for POST /files endpoint for handling file creation
 * @param {Object} req - request object
 * @param {Object} res - response object
 */
export async function postUpload(req, res) {
  const filesDir = process.env.FOLDER_PATH || '/tmp/file_manager';
  const fileTypes = ['folder', 'file', 'image'];
  const filesCollection = dbClient.db.collection('files');
  // Validate token
  const token = req.get('X-Token');
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
  // Store folder details in db
  if (type === 'folder') {
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
  // Make FOLDER_PATH directory if doesn't exist or isn't a directory
  if (!fs.existsSync(filesDir) || !fs.lstatSync(filesDir).isDirectory()) {
    fs.mkdirSync(filesDir, { recursive: true });
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
 * Controller for GET /files/:id that retrieves files
 * by their ids
 * @param {Object} req - request object
 * @param {Object} res - response object
 */
export async function getShow(req, res) {
  const token = req.get('X-Token');
  if (!token || !await redisClient.get(`auth_${token}`)) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }
  const { id } = req.params;
  const filesCollection = dbClient.db.collection('files');
  const file = filesCollection.findOne({ _id: new ObjectId(id) });
  if (!file) {
    res.status(404).json({ error: 'Not found' });
    return;
  }
  const formattedResponse = formatFileDocument(file);
  res.status(200).json(formattedResponse);
}

/**
 * Controller for GET /files endpoint that returns
 * all files of a logged in user
 * @param {Object} req - request object
 * @param {Object} res - response object
 */
export async function getIndex(req, res) {
  const token = req.get('X-Token');
  if (!token || !await redisClient.get(`auth_${token}`)) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }
  let { parentId = 0 } = req.query;
  const { page = 0 } = req.query;
  const filesCollection = dbClient.db.collection('files');
  parentId = parentId ? new ObjectId(parentId) : 0;
  await filesCollection.createIndex({ parentId: -1 });
  const pipeline = [
    { $match: { parentId } },
    { $skip: page * 20 },
    { $limit: 20 },
  ];
  const files = await filesCollection.aggregate(pipeline).toArray();
  const formattedResponse = files.map((document) => formatFileDocument(document));
  res.status(200).json(formattedResponse);
}

/**
 * Controller for GET /files/:id/publish endpoint that updates
 * file document's isPublic field to true
 * @param {Object} req - request object
 * @param {Object} res - response object
 */
export async function putPublish(req, res) {
  const token = req.get('X-Token');
  const userId = await redisClient.get(`auth_${token}`);
  if (!userId) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }
  const { id } = req.params;
  const filesCollection = dbClient.db.collection('files');
  const updateFilter = { _id: new ObjectId(id), userId: new ObjectId(userId) };
  const updateOperation = { $set: { isPublic: true } };
  const commandResult = await filesCollection.updateOne(updateFilter, updateOperation);
  if (commandResult.matchedCount) {
    const modifiedFileDOcument = await filesCollection.findOne({ _id: updateFilter._id });
    res.status(200).json(formatFileDocument(modifiedFileDOcument));
  } else {
    res.status(404).json({ error: 'Not found' });
  }
}

/**
 * Controller for GET /files/:id/unpublish endpoint that updates
 * file document's isPublic field to false
 * @param {Object} req - request object
 * @param {Object} res - response object
 */
export async function putUnpublish(req, res) {
  const token = req.get('X-Token');
  const userId = await redisClient.get(`auth_${token}`);
  if (!userId) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }
  const { id } = req.params;
  const filesCollection = dbClient.db.collection('files');
  const updateFilter = { _id: new ObjectId(id), userId: new ObjectId(userId) };
  const updateOperation = { $set: { isPublic: false } };
  const commandResult = await filesCollection.updateOne(updateFilter, updateOperation);
  if (commandResult.matchedCount) {
    const modifiedFileDOcument = await filesCollection.findOne({ _id: updateFilter._id });
    res.status(200).json(formatFileDocument(modifiedFileDOcument));
  } else {
    res.status(404).json({ error: 'Not found' });
  }
}

/**
 * Controller for /GET /files/:id/data endpoint that retrieves
 * data associated with a file
 * @param {Object} req - request object
 * @param {Object} res - response object
 */
export async function getFile(req, res) {
  const token = req.get('X-Token');
  const userId = await redisClient.get(`auth_${token}`);
  if (!userId) {
    res.status(404).json({ error: 'Not found' });
    return;
  }
  const { id } = req.params;
  const filesCollection = dbClient.db.collection('files');
  const fileDocument = await filesCollection.findOne({ _id: new ObjectId(id) });
  if (!fileDocument) {
    res.status(404).json({ error: 'Not found' });
    return;
  }
  if (fileDocument.type === 'folder') {
    res.status(400).json({ error: "A folder doesn't have content" });
    return;
  }
  if (!fileDocument.isPublic || !fs.existsSync(fileDocument.localPath)) {
    res.status(404).json({ error: 'Not found' });
    return;
  }
  const mimeType = mime.lookup(fileDocument.name);
  res.append('Content-Type', mimeType);
  res.sendFile(fileDocument.localPath);
}
