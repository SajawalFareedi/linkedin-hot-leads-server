const mongoose = require("mongoose");


const api = new mongoose.Schema({
    email: String,
    api_key: String,
});

module.exports = mongoose.models.API || mongoose.model('API', api);
