const mongoose = require('mongoose');


const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://linkedin-hot-leads:ilXR2tTqnF2XDQlW@linkedin-db.tt3ronc.mongodb.net/?retryWrites=true&w=majority';

const connectToDB = async () => {
    await mongoose.connect(MONGODB_URI, { connectTimeoutMS: 120000, socketTimeoutMS: 150000, dbName: "linkedin-db" })
        .catch((err) => { console.trace(err) });
}

const main = async () => {
    try {
        await connectToDB();

        mongoose.connection.readyState === 1 ? console.info("Connected to MongoDB") : await connectToDB();

        if (!mongoose.modelNames().includes("Cookie")) {
            const cookieSchema = new mongoose.Schema({
                user_id: String,
                li_at: String,
                cookie_str: String
            });

            mongoose.model('Cookie', cookieSchema);
        };
    } catch (err) {
        console.trace(err);
    }
};

module.exports = main;
