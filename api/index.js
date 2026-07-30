const { main } = require('../backend/server');

let app;

module.exports = async (req, res) => {
  if (!app) {
    app = await main();
  }
  return app(req, res);
};
