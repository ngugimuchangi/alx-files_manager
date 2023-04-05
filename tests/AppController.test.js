import { expect } from 'chai';
import request from 'request';

/**
 * Test cases for AppController.js endpoints:
 * 1. GET /status
 * 2. GET /stats
 */
describe('App controller tests', () => {
  describe('GET /status', () => {
    it('return status of redis and mongodb clients', (done) => {
      request.get('http://127.0.0.1:5000/status', (_error, res, body) => {
        const status = JSON.parse(body);
        expect(res.statusCode).to.equal(200);
        expect(status).to.have.property('redis');
        expect(status.redis).to.be.a('boolean');
        expect(status).to.have.property('db');
        expect(status.db).to.be.a('boolean');
        done();
      });
    });
  });
  describe('GET /stats', () => {
    it('returns the number of users and files in the database', (done) => {
      request.get('http://127.0.0.1:5000/stats', (_error, res, body) => {
        const stats = JSON.parse(body);
        expect(res.statusCode).to.equal(200);
        expect(stats).to.have.property('users');
        expect(stats.users).to.be.a('number');
        expect(stats).to.have.property('files');
        expect(stats.files).to.be.a('number');
        done();
      });
    });
  });
});
