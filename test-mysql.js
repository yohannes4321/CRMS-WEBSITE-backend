const { connectDatabase } = require('./src/config/database');
require('dotenv').config();

connectDatabase().then(() => {
  console.log("SUCCESS!");
  process.exit(0);
}).catch(err => {
  console.error("FAIL", err);
  process.exit(1);
});
