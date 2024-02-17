const mongoose = require('mongoose');
const moment = require("moment");
// const utils = require('./utils');
const db = require("./db");

let CRON_STATUS = 0;
let CACHE = [];

function sleep(seconds) {
    return new Promise(resolve => setTimeout(resolve, seconds * 1000));
};

async function getAllUpdatedCookies(running) {
    try {
        const Cookie = mongoose.connection.model("Cookie");
        return await Cookie.find({ running }).exec();
    } catch (error) {
        console.trace(error);
        CRON_STATUS = 0;
    };
};

// TODO:
// TODO:
// TODO:
// TODO:
// TODO:

function updateCache(uuid, key, value) {
    try {
        for (let i = 0; i < CACHE.length; i++) {
            if (CACHE[i].uuid == uuid) {
                CACHE[i][key] = value;
            };
        };
    } catch (error) {
        console.trace(error);
    }
}

async function updateCookie(uuid, data) {
    try {
        const Cookie = mongoose.connection.model("Cookie");
        return await Cookie.updateOne({ uuid: uuid }, data).exec();
    } catch (error) {
        console.trace(error);
    }
}

// function findCookieForUser(id, cookies) {
//     try {
//         for (let i = 0; i < cookies.length; i++) {
//             const cookie = cookies[i];

//             if (cookie.user_id === id) {
//                 return cookie;
//             };
//         };
//     } catch (error) {
//         console.trace(error)
//     };
// };

async function cron(data) {
    try {
        console.log(data);
    } catch (error) {
        console.trace(error);
    };
};

async function main() {
    try {

        if (CRON_STATUS === 1) { return }; // Avoid multiple execution of the script at the same time

        CRON_STATUS = 1;

        while (true) {
            console.log("Checking MongoDB Connection...");

            if (mongoose.connection.readyState !== 1) { await db.connectToDB() };

            console.log("Starting to check for updates...");

            const cookies = await getAllUpdatedCookies("NO");

            if (cookies) {
                CACHE = cookies;
            }

            if (moment.utc().hour() >= 20) {
                for (let i = 0; i < CACHE.length; i++) {

                    if (CACHE[i].running === "NO") {
                        cron(CACHE[i]);
                    }

                    await updateCookie(CACHE[i].uuid, { running: "YES" });
                    CACHE[i]["running"] = "YES";

                }
            }

            await sleep(1800); // Check every half-hour
        }

    } catch (error) {
        console.trace(error);
        CRON_STATUS = 0;
    };
};

module.exports = main;
