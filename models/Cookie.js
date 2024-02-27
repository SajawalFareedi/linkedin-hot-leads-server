const mongoose = require("mongoose");

const createModel = () => {
    try {
        const cookieSchema = new mongoose.Schema({
            user_id: String,
            li_at: String,
            jsession_id: String,
            uuid: String,
            urn: String,
            isPremium: String,
            running: String
        });

        mongoose.model('Cookie', cookieSchema);
    } catch (error) {
        console.trace(error);
    }
}

module.exports = createModel;