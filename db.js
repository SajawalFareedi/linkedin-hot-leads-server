const mongoose = require('mongoose');


const main = async () => {
    await mongoose.connect('mongodb+srv://linkedin-hot-leads:ilXR2tTqnF2XDQlW@linkedin-db.tt3ronc.mongodb.net/?retryWrites=true&w=majority');

    if (!mongoose.modelNames().includes("Cookie")) {
        const cookieSchema = new mongoose.Schema({
            user_id: String,
            li_at: String,
            cookie_str: String
        });

        mongoose.model('Cookie', cookieSchema);
    };

};

module.exports = main;