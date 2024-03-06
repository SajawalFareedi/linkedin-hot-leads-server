const mongoose = require("mongoose");


const customer = new mongoose.Schema({
    urn: String,
    name: String,
    email: String,
    profile_url: String,
    user_id: String,
    uuid: String,
    added: String,
    last_ran: String
});

module.exports = mongoose.models.Customer || mongoose.model('Customer', customer);
