const mongoose = require('mongoose');


const MONGODB_URI = 'mongodb+srv://linkedin-hot-leads:ilXR2tTqnF2XDQlW@linkedin-db.tt3ronc.mongodb.net/?retryWrites=true&w=majority'; // process.env.MONGODB_URI || 

function sleep(seconds) {
    return new Promise(resolve => setTimeout(resolve, seconds * 1000));
};

const InitializeDatabase = async () => {
    try {
        await sleep(1.7);

        if (mongoose.connection.readyState !== 1) {
            // connectTimeoutMS: 120000, socketTimeoutMS: 150000, 
            await mongoose.connect(MONGODB_URI, { dbName: "linkedin-db" }).catch((err) => { console.trace(err) });
            await sleep(1.3)
            mongoose.connection.readyState === 1 ? console.info("Connected to MongoDB") : await InitializeDatabase();
        }
    } catch (error) {
        console.trace(error);
    };
};

module.exports = InitializeDatabase;
