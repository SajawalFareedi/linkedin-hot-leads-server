const mongoose = require('mongoose');
const logger = require("./logger");


const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://linkedin-hot-leads:ilXR2tTqnF2XDQlW@linkedin-db.tt3ronc.mongodb.net/?retryWrites=true&w=majority';

const InitializeDatabase = async () => {
    try {
        if (mongoose.connection.readyState !== 1) {
            await mongoose.connect(MONGODB_URI, { dbName: "linkedin-db" }).catch((err) => { console.trace(err); logger.log(0, err) });
            mongoose.connection.readyState === 1 ? logger.log(2, "Connected to MongoDB") : await InitializeDatabase();
        };
    } catch (error) {
        console.trace(error);
        logger.log(0, error);
    };
};

module.exports = InitializeDatabase;
