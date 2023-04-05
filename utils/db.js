import { MongoClient } from 'mongodb';

class DBClient {
  /**
   * Initializes a new instance of DBClient
   */
  constructor() {
    const HOST = process.env.DB_HOST || 'localhost';
    const PORT = process.env.BD_PORT || 27017;
    const DATABASE = process.env.DB_DATABASE || 'files_manager';
    const URI = `mongodb://${HOST}:${PORT}`;
    this.mongoClient = new MongoClient(URI, { useUnifiedTopology: true });
    this.mongoClient.connect((error) => {
      if (!error) this.db = this.mongoClient.db(DATABASE);
    });
  }

  /**
   * Check mongodb client's connection status
   * @returns {boolean} mongoClient connection status
   */
  isAlive() {
    return this.mongoClient.isConnected();
  }

  /**
   * Queries 'users' collection
   * @returns {number} - number of documents in users collection
   */
  async nbUsers() {
    const usersCollection = this.db.collection('users');
    const numberOfUsers = await usersCollection.countDocuments();
    return numberOfUsers;
  }

  /**
   * Queries 'files' collection
   * @returns {number} - number of documents in files collection
   */
  async nbFiles() {
    const filesCollection = this.db.collection('files');
    const numberOfFiles = filesCollection.countDocuments();
    return numberOfFiles;
  }

  /**
   * Retrieves users collection from database
   * @returns {import("mongodb").Collection} - users collection object
   */
  usersCollection() {
    return this.db.collection('users');
  }

  /**
   * Retrieves files collection from database
   * @returns {import("mongodb").Collection} - files collection object
   */
  filesCollection() {
    return this.db.collection('files');
  }
}

const dbClient = new DBClient();
export default dbClient;
