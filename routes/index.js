import { Router } from 'express';
import { getStatus, getStats } from '../controllers/AppController';
import postNew from '../controllers/UsersController';
import { getConnect, getDisconnect, getMe } from '../controllers/AuthController';
import {
  postUpload, getShow, getIndex, putPublish, putUnpublish, getFile,
} from '../controllers/FilesController';

// App router
const router = Router();

/**
 * @apiDefine XToken
 * @apiHeader {String} X-Token Users access token
 * @apiHeaderExample Header-Example:
 * "X-Token": "a57826f0-c383-4013-b29e-d18c2e68900d"
 */
/**
 * @apiDefine Unauthorized
 * @apiError UnauthorizedAccess Invalid or missing token
 */
/**
 * @apiDefine NotFound
 * @apiError NotFound File not found
 */

/**
 * @api {get} /status Get database and redis client status
 * @apiName GetStatus
 * @apiGroup Status
 * @apiDescription This end point returns the status of the mongodb
 * database client and redis client. `true` means that the specific
 * client is connected while `false` indicates failure to connect.
 * @apiSuccess {Boolean} db Database client connection status
 * @apiSuccess {Boolean} redis Redis client connection status
 * @apiSuccessExample Success-Response:
 *  HTTP/1.1 200 OK
 *  {
 *    "db": true,
 *    "redis": true
 *  }
 */
router.get('/status', getStatus);

/**
 * @api {get} /stats Gets number of users and files
 * @apiName GetStats
 * @apiGroup Stats
 * @apiDescription This endpoint retrieves number of users and files.
 * @apiSuccess {Number} users Number of users in the database
 * @apiSuccess {Number} files Number of files in the database
 * @apiSuccessExample Success-Response:
 *  HTTP/1.1 200 OK
 *  {
 *    "users": 78,
 *    "files": 1112
 *  }
 */
router.get('/stats', getStats);

/**
 * @api {post} /users Create new user
 * @apiName PostUser
 * @apiGroup User
 * @apiDescription Create a new user profile from this endpoint.
 * @apiBody {String} email User's email
 * @apiBody {String} password User's password
 * @apiSuccessExample Success-Response:
 *  HTTP/1.1 201 OK
 *  {
 *    "id": "12345678910",
 *    "email": "user@email.com"
 *  }
 * @apiError MissingEmail User email is not provided
 * @apiError MissingPassword User password is not provide
 */
router.post('/users', postNew);

/**
 * @api {get} /users/me Get user details
 * @apiName GetUser
 * @apiGroup User
 * @apiUse XToken
 * @apiSuccessExample Success-Response:
 *  HTTP/1.1 201 OK
 *  {
 *    "id": "643307deac9bf5303c49bc6e",
 *    "email": "user@email.com"
 *  }
 */
router.get('/users/me', getMe);

/**
 * @api {get} /connect User login
 * @apiName GetConnect
 * @apiGroup Authentication
 * @apiDescription Login in to the system through this endpoint.
 * Providing the right credential generates a user token that can
 * be used to access restricted endpoints. The token is valid for
 * 24 hours.
 * @apiBody {String} email User's email
 * @apiBody {String} password User's password
 * @apiSuccessExample Success-Response:
 *  HTTP/1.1 200 OK
 *  {
 *    "token": "a57826f0-c383-4013-b29e-d18c2e68900d"
 *  }
 */
router.get('/connect', getConnect);

/**
 * @api {get} /disconnect User logout
 * @apiName GetDisconnect
 * @apiGroup Authentication
 * @apiDescription Log out from the system through this endpoint.
 * Your use token cannot be used for subsequent access to restricted
 * endpoint after you log out.
 * @apiUse XToken
 * @apiUse Unauthorized
 */
router.get('/disconnect', getDisconnect);

/**
 * @api {post} /files Post a file
 * @apiName PostFile
 * @apiGroup Files
 * @apiDescription Upload a new file or folder to the API.
 * Three thumbnails of the file are generated when the files is uploaded.
 * The thumbnails' widths are `100`, `250` and `500`
 * @apiUse XToken
 * @apiUse Unauthorized
 * @apiBody {String} name Filename
 * @apiBody {String=folder, file, image} type File type
 * @apiBody {String} [parentId=0] File's parent Id. Default: 0
 * @apiBody {Boolean} [isPublic=false] File view status
 * @apiBody {String} [data] Base64 content of file. Mandatory for type `file` and `image`
 * @apiSuccessExample Success-Response
 *  HTTP/1.1 201 OK
 *  {
 *    "id": "6432fdc01815ce25f2bc5871",
 *    "name": "myFile.txt",
 *    "type": "folder",
 *    "userId": "643307deac9bf5303c49bc6e",
 *    "parentId": "6432fe1b1815ce25f2bc5873",
 *    "isPublic": false
 *  }
 * @apiError MissingFileName File name is absent
 * @apiError MissingFileType File type is absent
 * @apiError MissingFileData File data is missing. Applicable to uploads of type `file` and `image`
 */
router.post('/files', postUpload);

/**
 * @api {get} /files/:id Get file details
 * @apiName GetFilesById
 * @apiGroup Files
 * @apiDescription Get file information from the API.
 * @apiUse XToken
 * @apiUse Unauthorized
 * @apiUse NotFound
 * @apiParam {String} id Files unique ID
 * @apiQuery {Number=100, 250, 500} [size] Specific file size to retrieve.
 * @apiSuccessExample Success-Example:
 *  HTTP/1.1 200 OK
 *  {
 *    "id": "6432fdc01815ce25f2bc5871",
 *    "name": "myFile.txt",
 *    "type": "folder",
 *    "userId": "643307deac9bf5303c49bc6e",
 *    "parentId": "6432fe1b1815ce25f2bc5873",
 *    "isPublic": false
 *  }
 */
router.get('/files/:id', getShow);

/**
 * @api {get} /files Get user's files
 * @apiName GetFiles
 * @apiGroup Files
 * @apiDescription Get all files belonging to a user.
 * @apiUse XToken
 * @apiUse Unauthorized
 * @apiQuery {String=0} [parentId] Parent id of files you want to view
 * @apiQuery {Number=0} [page] Page for navigation. Max files per page is 20
 * @apiSuccessExample Success-Example:
 *  HTTP/1.1 200 OK
 *  [
 *    {
 *      "id": "6432fdc01815ce25f2bc5871",
 *      "name": "myFile.txt",
 *      "type": "folder",
 *      "userId": "643307deac9bf5303c49bc6e"
 *      "parentId": "6432fe1b1815ce25f2bc5873",
 *      "isPublic": false
 *    },
 *    {
 *      "id": "6432fdc01815ce25f2bc7122",
 *      "name": "myFile.txt",
 *      "type": "folder",
 *      "userId": "643307deac9bf5303c49bc6e",
 *      "parentId": "6432fe1b1815ce25f2bc5873",
 *      "isPublic": false
 *    },
 *    {
 *      "id": "6432fdc01815ce25f2bc9876",
 *      "name": "myFile.txt",
 *      "type": "folder",
 *      "userId": "643307deac9bf5303c49bc6e",
 *      "parentId": 0,
 *      "isPublic": true
 *    }
 *  ]
 */
router.get('/files', getIndex);

/**
 * @api {put} /files/:id Publish a file
 * @apiName PutPublish
 * @apiGroup Files
 * @apiDescription Change the viewing status of a file to public. This allows
 * other users to view data from this file.
 * @apiUse XToken
 * @apiUse Unauthorized
 * @apiUse NotFound
 * @apiParam {String} id Files unique ID
 * @apiSuccessExample Success-Example:
 *  HTTP/1.1 200 OK
 *  {
 *    "id": "6432fdc01815ce25f2bc5871",
 *    "name": "myFile.txt",
 *    "type": "folder",
 *    "userId": "643307deac9bf5303c49bc6e",
 *    "parentId": "6432fe1b1815ce25f2bc5873",
 *    "isPublic": true
 *  }
 */
router.put('/files/:id/publish', putPublish);

/**
 * @api {put} /files/:id Unpublish a file
 * @apiName PutUnPublish
 * @apiGroup Files
 * @apiDescription Change the viewing status of a file to private.
 * Other users cannot see your file when you unpublish it.
 * @apiUse XToken
 * @apiUse Unauthorized
 * @apiUse NotFound
 * @apiParam {String} id Files unique ID
 * @apiSuccessExample Success-Example:
 *  HTTP/1.1 200 OK
 *  {
 *    "id": "6432fdc01815ce25f2bc5871",
 *    "name": "myFile.txt",
 *    "type": "folder",
 *    "userId": "643307deac9bf5303c49bc6e",
 *    "parentId": "6432fe1b1815ce25f2bc5873",
 *    "isPublic": false
 *  }
 */
router.put('/files/:id/unpublish', putUnpublish);

/**
 * @api {put} /files/:id/data Gets file data
 * @apiName GetFileData
 * @apiGroup Files
 * @apiDescription This endpoint retrieves data of a `file` or `image`
 * belonging to a user. The files data is also accessible to other users
 * if it has been published, i.e, `isPublic` is `true`
 * @apiUse XToken
 * @apiUse Unauthorized
 * @apiUse NotFound
 * @apiParam {String} id Files unique ID
 * @apiSuccessExample Success-Example:
 *  HTTP/1.1 200 OK
 *  "Hello World"
 */
router.get('/files/:id/data', getFile);

export default router;
