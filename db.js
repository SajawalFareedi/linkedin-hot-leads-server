const mongoose = require('mongoose');
const { sleep } = require("./utils");


const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://linkedin-hot-leads:ilXR2tTqnF2XDQlW@linkedin-db.tt3ronc.mongodb.net/?retryWrites=true&w=majority';

const connectToDB = async () => {
    try {
        await sleep(2.3)

        if (mongoose.connection.readyState !== 1) {
            await mongoose.connect(MONGODB_URI, { connectTimeoutMS: 120000, socketTimeoutMS: 150000, dbName: "linkedin-db" }).catch((err) => { console.trace(err) });
            await sleep(1.3)
            mongoose.connection.readyState === 1 ? console.info("Connected to MongoDB") : await connectToDB();
        }
    } catch (error) {
        console.trace(error)
    }
}

const InitializeDatabase = async () => {
    try {
        await connectToDB();

        if (!mongoose.modelNames().includes("Cookie")) {
            const cookieSchema = new mongoose.Schema({
                user_id: String,
                li_at: String,
                cookie_str: String,
                uuid: String
            });

            mongoose.model('Cookie', cookieSchema);
        };
    } catch (err) {
        console.trace(err);
    }
};

module.exports = { InitializeDatabase, connectToDB };
