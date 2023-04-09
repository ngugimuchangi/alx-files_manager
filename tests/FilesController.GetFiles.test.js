import fs from 'fs';
import chai from 'chai';
import chaiHttp from 'chai-http';
import sha1 from 'sha1';
import { ObjectId, MongoClient } from 'mongodb';
import { createClient } from 'redis';
import { promisify } from 'util';
import { v4 } from 'uuid';
import app from '../server';

chai.use(chaiHttp);

const { expect, request } = chai;
/**
 * Test cases for FileController.js endpoints:
  * 1. GET /files
  * 2. GET /files/:id
  * 3. GET /files:id/data
  */
describe('fileController.js tests - File info and data retrieval endpoints', () => {
  let dbClient;
  let db;
  let rdClient;
  let asyncSet;
  let asyncKeys;
  let asyncDel;
  const DB_HOST = process.env.DB_HOST || 'localhost';
  const DB_PORT = process.env.BD_PORT || 27017;
  const DATABASE = process.env.DB_DATABASE || 'files_manager';
  const FOLDER_PATH = process.env.FOLDER_PATH || '/tmp/files_manager';
  const initialPassword = 'supersecretFYI';
  const hashedPassword = sha1(initialPassword);
  const userOne = { _id: new ObjectId(), email: 'tester@mail.com', password: hashedPassword };
  const userTwo = { _id: new ObjectId(), email: 'dev@mail.com', password: hashedPassword };
  const userOneToken = v4();
  const userTwoToken = v4();
  const userOneTokenKey = `auth_${userOneToken}`;
  const userTwoTokenKey = `auth_${userTwoToken}`;

  const files = [];
  const randomString = () => Math.random().toString(32).substring(2);

  before(() => new Promise((resolve) => {
    // Connect to db and clear collections
    dbClient = new MongoClient(`mongodb://${DB_HOST}:${DB_PORT}`, { useUnifiedTopology: true });
    dbClient.connect(async (error, client) => {
      if (error) throw error;
      db = await client.db(DATABASE);
      await db.collection('users').deleteMany({});

      // Create test user
      await db.collection('users').insertMany([userOne, userTwo]);

      // Add files to db
      for (let i = 0; i < 25; i++) {
        const newFile = {
          _id: new ObjectId(),
          name: randomString(),
          type: 'folder',
          parentId: '0',
          userId: (userOne._id),
          isPublic: !!(i % 2),
        };
        files.push(newFile);
      }
      for (let i = 0; i < 10; i++) {
        const newFile = {
          _id: new ObjectId(),
          name: randomString(),
          type: 'file',
          parentId: files[0]._id,
          userId: userOne._id,
          isPublic: !!(i % 2),
        };
        files.push(newFile);
      }
      await db.collection('files').insertMany(files);

      // Connect to redis and clear keys
      rdClient = createClient();
      asyncSet = promisify(rdClient.set).bind(rdClient);
      asyncKeys = promisify(rdClient.keys).bind(rdClient);
      asyncDel = promisify(rdClient.del).bind(rdClient);
      rdClient.on('connect', async () => {
        await asyncSet(userOneTokenKey, userOne._id.toString());
        await asyncSet(userTwoTokenKey, userTwo._id.toString());
        resolve();
      });
    });
  }));

  after(async () => {
    // Delete files
    fs.rmdirSync(FOLDER_PATH, { recursive: true });

    // Clear db collections
    await db.collection('users').deleteMany({ });
    await db.collection('files').deleteMany({});
    await db.dropDatabase();
    await dbClient.close();

    // Clear redis keys and close connection
    const keys = await asyncKeys('auth_*');
    for (const key of keys) {
      await asyncDel(key);
    }
    rdClient.quit();
  });

  describe('GET /files:id', () => {
    it('should return file details given valid token and user id', () => {
      const file = files[0];
      request(app)
        .get(`/files/${file._id}`)
        .set('X-Token', userOneToken)
        .end((error, res) => {
          const responseAttributes = ['id', 'userId', 'name', 'type', 'isPublic', 'parentId'];
          expect(error).to.be.null;
          expect(res).to.have.status(200);
          expect(res.body).to.include.all.keys(responseAttributes);
          expect(res.body.id).to.equal(file._id.toString());
        });
    });

    it('should reject the request if the token is invalid', () => {
      const file = files[0];
      request(app)
        .get(`/files/${file._id}`)
        .set('X-Token', v4())
        .end((error, res) => {
          expect(error).to.be.null;
          expect(res).to.have.status(401);
          expect(res.body.error).to.equal('Unauthorized');
        });
    });

    it('should return not found if file does not exist', () => {
      request(app)
        .get(`/files/${new ObjectId().toString()}`)
        .set('X-Token', userOneToken)
        .end((error, res) => {
          expect(error).to.be.null;
          expect(res).to.have.status(404);
          expect(res.body.error).to.equal('Not found');
        });
    });
  });

  describe('GET /files/:id/data', () => {
    it('should fetch data of specified file', () => new Promise((done) => {
      const fileUpload = {
        name: `${randomString()}.txt`,
        type: 'file',
        parentId: files[0]._id.toString(),
        userId: userOne._id.toString(),
        isPublic: true,
        data: Buffer.from('Hello World').toString('base64'),
      };
      request(app)
        .post('/files')
        .set('X-Token', userOneToken)
        .send(fileUpload)
        .end((error, res) => {
          expect(error).to.be.null;
          expect(res).to.have.status(201);
          files.push(res.body);
          request(app)
            .get(`/files/${res.body.id}/data`)
            .set('X-Token', userOneToken)
            .end((error, res) => {
              expect(error).to.be.null;
              expect(res).to.have.status(200);
              expect(res.text).to.equal('Hello World');
              done();
            });
        });
    }));

    it('should allow cross-user file access as long as the files are public', () => {
      const file = files[files.length - 1];
      request(app)
        .get(`/files/${file.id}/data`)
        .set('X-Token', userTwoToken)
        .end((error, res) => {
          expect(error).to.be.null;
          expect(res).to.have.status(200);
          expect(res.text).to.equal('Hello World');
        });
    });

    it('should reject request for files that do not belong to user and is not public', (done) => {
      const file = files[files.length - 3];
       request(app)
        .get(`/files/${file._id}/data`)
        .set('X-Token', userTwoToken)
        .end((error, res) => {
          expect(error).to.be.null;
          expect(res).to.have.status(404);
          expect(res.body.error).to.equal('Not found');
          done();
        });
    });

    it('should reject request for files that are folders', (done) => {
      const file = files[0];
      request(app)
        .get(`/files/${file._id}/data`)
        .set('X-Token', userOneToken)
        .end((error, res) => {
          expect(error).to.be.null;
          expect(res).to.have.status(400);
          expect(res.body.error).to.equal("A folder doesn't have content");
          done();
        });
    });
  });

  describe('GET /files', () => {
    it('should fetch files when parentId is not provide i.e. implicit ParentId=0', () => {});
    it('should fetch files when parentId=0 i.e. explicit ParentId=0', () => {});
    it('should fetch files when correct, non-zero parentId is provided', () => {});
    it('should fetch second page when correct, non-zero parentId is provided', () => {});
    it('should return an empty list when page is out of index', () => {});
  });
});
