const mongoose = require('mongoose');
const utils = require('./utils');

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
        
    } catch (error) {
        console.trace(error);
    };
};

module.exports = main;