import chai from 'chai';
import chaiHttp from 'chai-http';
import { ObjectId, MongoClient } from 'mongodb';
import sha1 from 'sha1';
import app from '../server';

/**
 * Test cases for AppController.js endpoints:
 * 1. GET /status
 * 2. GET /stats
 */
describe('app controller tests', () => {
  chai.use(chaiHttp);
  const { expect } = chai;
  const { request } = chai;
  const DB_HOST = process.env.DB_HOST || 'localhost';
  const DB_PORT = process.env.BD_PORT || 27017;
  const DATABASE = process.env.DB_DATABASE || 'files_manager';
  let client;
  let db;
  const randomString = () => Math.random().toString(16).substring(2);

  before(async () => {
    // Connect to db
    client = new MongoClient(`mongodb://${DB_HOST}:${DB_PORT}`, { useUnifiedTopology: true });
    await client.connect();
    db = client.db(DATABASE);
    // Clear user and files collections
    await db.collection('users').deleteMany({});
    await db.collection('files').deleteMany({});
    // Populate user and files collections
    for (let i = 0; i < 5; i++) {
      const newUser = {
        email: randomString(),
        password: sha1(randomString()),
      };
      const newFile = {
        name: randomString(),
        type: 'folder',
        parentId: 0,
        isPublic: false,
      };
      await db.collection('users').insertOne(newUser);
      await db.collection('files').insertOne(newFile);
    }
  });

  after(async () => {
    // Clear collection and close connection
    await db.collection('users').deleteMany({});
    await db.collection('files').deleteMany({});
    await client.close();
  });

  describe('GET /status', () => {
    it('return status of redis and mongodb clients', (done) => {
      request(app)
        .get('/status')
        .end((error, res) => {
          const status = res.body;
          expect(error).to.be.null;
          expect(res).to.have.status(200);
          expect(status).to.have.property('redis');
          expect(status.redis).to.be.a('boolean');
          expect(status).to.have.property('db');
          expect(status.db).to.be.a('boolean');
          done();
        });
    });
  });
  describe('GET /stats', () => {
    it('returns number of users and files in the database', (done) => {
      request(app)
        .get('/stats')
        .end((error, res) => {
          const stats = res.body;
          expect(error).to.be.null;
          expect(res).to.have.status(200);
          expect(stats.users).to.equal(5);
          expect(stats.files).to.equal(5);
          done();
        });
    });
  });
});
