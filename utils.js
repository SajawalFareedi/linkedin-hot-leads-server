const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');
const { connectToDB } = require("./db");

function getLiAtCookie(cookies) {
    for (let i = 0; i < cookies.length; i++) {
        const cookie = cookies[i];

        if (cookie.name == "li_at") {
            return cookie.value
        };
    };
};

async function handleCookies(data) {
    try {

        if (mongoose.connection.readyState !== 1) { await connectToDB() };

        let userID = data.url;
        const li_at = getLiAtCookie(data.cookies);
        const cookieStr = JSON.stringify(data.cookies);

        console.log("USER_ID_1: ", userID);

        if (userID && userID !== "NO_URL" && typeof userID !== "undefined") {
            if (userID.length === 0) { return };

            userID = userID.split("/in/")[1].split("/")[0];
            console.log("USER_ID_2: ", userID);

            const Cookie = mongoose.connection.model("Cookie");
            const alreadyExists = await Cookie.find({ user_id: userID }).exec();

            if (alreadyExists.length === 0) {
                const newCookie = new Cookie({
                    user_id: userID,
                    li_at: li_at,
                    cookie_str: cookieStr,
                    uuid: uuidv4()
                });

                await newCookie.save();

                console.log("New Cookie Added: ", userID, li_at);

            } else {
                if (alreadyExists[0].li_at !== li_at) {
                    await Cookie.updateOne({ user_id: userID }, { li_at: li_at, cookie_str: cookieStr }).exec();
                    console.log("Cookie Updated: ", userID, li_at);
                } else {
                    console.log("No Change in Cookie: ", userID);
                }
            };
        }

    } catch (err) {
        console.trace(err);
    };
};

module.exports = { handleCookies };
