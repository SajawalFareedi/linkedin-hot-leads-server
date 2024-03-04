const mongoose = require("mongoose");

const createModel = () => {
    try {
        const customerSchema = new mongoose.Schema({
            urn: String,
            name: String,
            email: String,
            profile_url: String,
            user_id: String,
            uuid: String,
            added: String,
            last_ran: String
        });

        mongoose.model('Customer', customerSchema);
    } catch (error) {
        console.trace(error);
    }
}

module.exports = createModel;