import fs from 'fs';
import mime from 'mime-types';
import { v4 } from 'uuid';
import Queue from 'bull';
import { ObjectId } from 'mongodb';
import dbClient from '../utils/db';
import redisClient from '../utils/redis';
import formatFileDocument from '../utils/format';

// Thumbnail generating queue
const fileQueue = Queue('thumbnail generation');

/**
 * Controller for POST /files endpoint for handling file creation
 * @typedef {import("express").Request} Request
 * @typedef {import("express").Response} Response
 * @param {Request} req - request object
 * @param {Response} res - response object
 */
export async function postUpload(req, res) {
  const filesDir = process.env.FOLDER_PATH || '/tmp/file_manager';
  const fileTypes = ['folder', 'file', 'image'];
  const filesCollection = dbClient.filesCollection();
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
  const _parentId = parentId && ObjectId.isValid(parentId) ? new ObjectId(parentId) : parentId;
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
  const parentDocument = await filesCollection.findOne({ _id: _parentId });
  if (_parentId && !parentDocument) {
    res.status(400).json({ error: 'Parent not found' });
    return;
  }
  if (_parentId && parentDocument.type !== 'folder') {
    res.status(400).json({ error: 'Parent is not a folder' });
    return;
  }
  // Store folder details in db
  if (type === 'folder') {
    const fileDocument = {
      userId: new ObjectId(userId), name, type, isPublic, parentId: _parentId,
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
  fs.writeFileSync(localPath, Buffer.from(data, 'base64'));
  const parentIdObject = parentId === 0 ? parentId : new ObjectId(parentId);
  const fileDocument = {
    userId: new ObjectId(userId), name, type, isPublic, parentId: parentIdObject, localPath,
  };
  const commandResult = await filesCollection.insertOne(fileDocument);
  // Add thumbnail job to queue
  if (type === 'image') {
    const jobData = { fileId: commandResult.insertedId, userId };
    fileQueue.add(jobData);
  }
  // Response
  res.status(201).json({
    id: commandResult.insertedId, userId, name, type, isPublic, parentId,
  });
}

/**
 * Controller for GET /files/:id that retrieves files
 * information by their ids
 * @param {Request} req - request object
 * @param {Response} res - response object
 */
export async function getShow(req, res) {
  // Token validation
  const token = req.get('X-Token');
  const userId = await redisClient.get(`auth_${token}`);
  if (!userId) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }
  // Request params retrieval and conversion to ObjectIds
  const { id } = req.params;
  const _id = ObjectId.isValid(id) ? new ObjectId(id) : id;
  const _userId = ObjectId.isValid(userId) ? new ObjectId(userId) : userId;
  const filesCollection = dbClient.filesCollection();
  const fileDocument = await filesCollection.findOne({ _id, userId: _userId });
  if (!fileDocument) {
    res.status(404).json({ error: 'Not found' });
    return;
  }
  const formattedResponse = formatFileDocument(fileDocument);
  res.status(200).json(formattedResponse);
}

/**
 * Controller for GET /files endpoint that returns
 * all files of a logged in user
 * @param {Request} req - request object
 * @param {Response} res - response object
 */
export async function getIndex(req, res) {
  const MAX_PAGE_SIZE = 20;
  const token = req.get('X-Token');
  const userId = await redisClient.get(`auth_${token}`);
  if (!userId) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }
  const { parentId = '0', page = 0 } = req.query;
  const filesCollection = dbClient.filesCollection();
  // Convert id query parameters to ObjectIds
  const _parentId = parentId && ObjectId.isValid(parentId) ? new ObjectId(parentId) : parentId;
  const _userId = ObjectId.isValid(userId) ? new ObjectId(userId) : userId;

  // Check if page number is valid
  const _page = /^\d+$/.test(page) ? parseInt(page, 10) : 0;

  // Pipeline for aggregation operation
  const pipeline = [
    { $match: { parentId: _parentId, userId: _userId } },
    { $sort: { _id: 1 } },
    { $skip: _page * MAX_PAGE_SIZE },
    { $limit: MAX_PAGE_SIZE },
  ];
  const fileDocuments = await (await filesCollection.aggregate(pipeline)).toArray();
  const formattedResponse = fileDocuments.map((document) => formatFileDocument(document));
  res.status(200).json(formattedResponse);
}

/**
 * Controller for GET /files/:id/publish endpoint that updates
 * file document's isPublic field to true
 * @param {Request} req - request object
 * @param {Response} res - response object
 */
export async function putPublish(req, res) {
  // Token validation
  const token = req.get('X-Token');
  const userId = await redisClient.get(`auth_${token}`);
  if (!userId) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }
  const { id } = req.params;
  // Convert request id params to ObjectIds
  const _id = ObjectId.isValid(id) ? new ObjectId(id) : id;
  const _userId = ObjectId.isValid(userId) ? new ObjectId(userId) : userId;
  const filesCollection = dbClient.filesCollection();
  // Search filers
  const updateFilter = { _id, userId: _userId };
  // Update parameters
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
 * @param {Request} req - request object
 * @param {Response} res - response object
 */
export async function putUnpublish(req, res) {
  // Token validation
  const token = req.get('X-Token');
  const userId = await redisClient.get(`auth_${token}`);
  if (!userId) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }
  // Query params retrieval and conversion
  const { id } = req.params;
  const _id = ObjectId.isValid(id) ? new ObjectId(id) : id;
  const _userId = ObjectId.isValid(userId) ? new ObjectId(userId) : userId;
  const filesCollection = dbClient.filesCollection();

  // Search filter
  const updateFilter = { _id, userId: _userId };
  // Update parameters
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
 * @param {Request} req - request object
 * @param {Response} res - response object
 */
export async function getFile(req, res) {
  const IMG_SIZES = ['500', '250', '100'];
  const token = req.get('X-Token');
  const userId = await redisClient.get(`auth_${token}`);
  const { id } = req.params;
  const { size } = req.query;
  const _id = ObjectId.isValid(id) ? new ObjectId(id) : id;
  const filesCollection = dbClient.filesCollection();
  const fileDocument = await filesCollection.findOne({ _id });
  if (!fileDocument) {
    res.status(404).json({ error: 'Not found' });
    return;
  }
  if (!fileDocument.isPublic && !userId) {
    res.status(404).json({ error: 'Not found' });
    return;
  }
  if (!fileDocument.isPublic && fileDocument.userId.toString() !== userId) {
    res.status(404).json({ error: 'Not found' });
    return;
  }

  if (fileDocument.type === 'folder') {
    res.status(400).json({ error: "A folder doesn't have content" });
    return;
  }
  let filePath = fileDocument.localPath;
  if (fileDocument.type === 'image' && IMG_SIZES.includes(size)) {
    filePath = `${filePath}_${size}`;
  }
  if (!fs.existsSync(filePath)) {
    res.status(404).json({ error: 'Not found' });
    return;
  }
  res.append('Content-Type', mime.contentType(fileDocument.name));
  res.sendFile(filePath);
}
