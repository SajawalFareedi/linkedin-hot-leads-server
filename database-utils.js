const mongoose = require('mongoose');


const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://linkedin-hot-leads:ilXR2tTqnF2XDQlW@linkedin-db.tt3ronc.mongodb.net/?retryWrites=true&w=majority';

function sleep(seconds) {
    return new Promise(resolve => setTimeout(resolve, seconds * 1000));
};

const connectToDB = async () => {
    try {
        await sleep(1.7);

        if (mongoose.connection.readyState !== 1) {
            // connectTimeoutMS: 120000, socketTimeoutMS: 150000, 
            await mongoose.connect(MONGODB_URI, { dbName: "linkedin-db" }).catch((err) => { console.trace(err) });
            await sleep(1.3)
            mongoose.connection.readyState === 1 ? console.info("Connected to MongoDB") : await connectToDB();
        }
    } catch (error) {
        console.trace(error);
    };
};

const main = async () => {
    try {
        await connectToDB();

        const cookieSchema = new mongoose.Schema({
            user_id: String,
            li_at: String,
            cookie_str: String,
            uuid: String,
            isPremium: String,
            running: String
        });

        const Cookie = mongoose.model('Cookie', cookieSchema);
        const result = await Cookie.updateMany({}, { $set: { isPremium: "NOT_SURE" } }).exec();

        console.log(result);

    } catch (err) {
        console.trace(err);
    }
};


main();