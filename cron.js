const mongoose = require('mongoose');
// const utils = require('./utils');
const { connectToDB } = require("./db");

let CRON_STATUS = 0;

async function cron(userID) {
    try {
        
    } catch (error) {
        console.trace(error);
    };
};

async function getAllUpdatedCookies() {
    try {
        const Cookie = mongoose.connection.model("Cookie");
        return await Cookie.find().exec();
    } catch (error) {
        console.trace(error);
    };
};

function findCookieForUser(id, cookies) {
    try {
        for (let i = 0; i < cookies.length; i++) {
            const cookie = cookies[i];

            if (cookie.user_id === id) {
                return cookie;
            };
        };
    } catch (error) {
        console.trace(error)
    };
};

async function main() {
    try {

        if (CRON_STATUS === 1) { return }; // Avoid multiple execution of the script at the same time

        CRON_STATUS = 1;

        let cookies = [];

        console.log("Checking MongoDB Connection...");

        if (mongoose.connection.readyState !== 1) { await connectToDB() };

        console.log("Starting to check for updates...");

        const Cookie = mongoose.connection.model("Cookie");
        const _cookies = await Cookie.find().exec();

        for (let i = 0; i < _cookies.length; i++) {
            const ck = _cookies[i];

            console.log("Cookie: ", ck);
        };

    } catch (error) {
        console.trace(error);
    };
};

module.exports = main;
