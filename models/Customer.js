const mongoose = require("mongoose");

const createModel = () => {
    try {
        const customerSchema = new mongoose.Schema({
            urn: String,
            name: String,
            profile_url: String,
            user_id: String,
            uuid: String,
        });

        mongoose.model('Customer', customerSchema);
    } catch (error) {
        console.trace(error);
    }
}

module.exports = createModel;