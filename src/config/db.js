const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    await mongoose.connect(
      'mongodb+srv://srikanthkk3077_db_user:n8C0V9BySnpG18Ia@srikanth.16asjrt.mongodb.net/todolist'
    );

    console.log('MongoDB Connected');
  } catch (error) {
    console.error(error.message);
    process.exit(1);
  }
};

module.exports = connectDB;