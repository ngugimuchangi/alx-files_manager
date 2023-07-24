import dbClient from './db';

// Utility class for stats database operations
class Stats {
  /**
 * Queries 'users' collection
 * @returns {number} - number of documents in users collection
 */
  static async nbUsers() {
    const usersCollection = dbClient.getCollection('users');
    const numberOfUsers = await usersCollection.countDocuments();
    return numberOfUsers;
  }

  /**
   * Queries 'files' collection
   * @returns {number} - number of documents in files collection
   */
  static async nbFiles() {
    const filesCollection = dbClient.getCollection('files');
    const numberOfFiles = filesCollection.countDocuments();
    return numberOfFiles;
  }
}

export default Stats;
