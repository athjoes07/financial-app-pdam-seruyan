const { main } = require('../backend/server');

let app;

module.exports = async (req, res) => {
  if (!app) {
    app = await main();
  }
  // Handle all /api/* requests
  return app(req, res);
};
