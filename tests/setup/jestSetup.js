// Jest setup to prevent server from starting during tests
const originalListen = require('http').Server.prototype.listen;

require('http').Server.prototype.listen = function(...args) {
  // Only start server if not in test environment
  if (process.env.NODE_ENV !== 'test') {
    return originalListen.apply(this, args);
  }
  // In test environment, mock the server with a fake port
  this.address = () => ({ port: 3000, address: '127.0.0.1' });
  return this;
};
