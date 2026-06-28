const app = require('./src/app');
const connectDB = require('./src/config/db');

const startServer = async () => {
  await connectDB().then(() => {
    console.log("DB connected")
    app.listen(8000, () => {
      console.log('Server running on port 8000');
    });
  })


};

startServer();