const mongoose = require("mongoose");


const person = new mongoose.Schema({
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

module.exports = mongoose.models.Person || mongoose.model('Person', person);