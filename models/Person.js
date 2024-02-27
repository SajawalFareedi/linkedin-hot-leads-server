const mongoose = require("mongoose");

const createModel = () => {
    try {
        const personSchema = new mongoose.Schema({
            uuid: String,
            urn: String,
            person_urn: String,
            first_name: String,
            last_name: String,
            profile_url: String,
            profile_headline: String,
            job_title: String,
            reactions_count: Number,
            comments_count: Number,
            profile_view_count: Number,
            score: Number
        });

        mongoose.model('Person', personSchema);
    } catch (error) {
        console.trace(error);
    }
}

module.exports = createModel;