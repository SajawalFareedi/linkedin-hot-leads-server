const mongoose = require('mongoose');
// const utils = require('./utils');
const db = require("./db");

let CRON_STATUS = 0;

function sleep(seconds) {
    return new Promise(resolve => setTimeout(resolve, seconds * 1000));
};

async function getAllUpdatedCookies() {
    try {
        const Cookie = mongoose.connection.model("Cookie");
        return await Cookie.find().exec();
    } catch (error) {
        console.trace(error);
        CRON_STATUS = 0;
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
        CRON_STATUS = 0;
    };
};

async function cron(data) {
    try {
        
    } catch (error) {
        console.trace(error);
        CRON_STATUS = 0;
    };
};

async function main() {
    try {

        if (CRON_STATUS === 1) { return }; // Avoid multiple execution of the script at the same time

        CRON_STATUS = 1;

        console.log("Checking MongoDB Connection...");

        if (mongoose.connection.readyState !== 1) { await db.connectToDB() };

        console.log("Starting to check for updates...");

        const cookies = await getAllUpdatedCookies();

        if (cookies) {
            for (let i = 0; i < cookies.length; i++) {
                cron(cookies[i]);
            }
        }

    } catch (error) {
        console.trace(error);
        CRON_STATUS = 0;
    };
};

module.exports = main;
