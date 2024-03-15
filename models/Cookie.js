const mongoose = require("mongoose");


const cookie = new mongoose.Schema({
    user_id: String,
    li_at: String,
    jsession_id: String,
    uuid: String,
    urn: String,
    isPremium: String,
    running: String,
    scraping_day: Number
});

module.exports = mongoose.models.Cookie || mongoose.model('Cookie', cookie);
