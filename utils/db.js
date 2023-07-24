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
   * Retrieves specified collection from database
   * @returns {import("mongodb").Collection} - users collection object
   */
  getCollection(collectionName) {
    const collection = this.db.collection(collectionName);
    return collection;
  }

  /**
   * Closes connection to mongodb client
   */
  async closeConnection() {
    await this.mongoClient.close();
  }
}

const dbClient = new DBClient();
export default dbClient;
