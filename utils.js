const mongoose = require('mongoose');

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
        let userID = data.url;
        const li_at = getLiAtCookie(data.cookies);
        const cookieStr = JSON.stringify(data.cookies);

        if (userID && userID !== "NO_URL" && typeof userID !== "undefined") {
            if (userID.length === 0) { return };

            const Cookie = mongoose.connection.model("Cookie");
            const alreadyExists = await Cookie.find({ user_id: userID }).exec();

            if (alreadyExists.length === 0) {
                const newCookie = new Cookie({
                    user_id: userID,
                    li_at: li_at,
                    cookie_str: cookieStr
                });

                await newCookie.save();

                console.log("New Cookie Added: ", userID, li_at);

            } else {
                if (alreadyExists[0].li_at !== li_at) {
                    await Cookie.updateOne({ user_id: userID }, { li_at: li_at, cookie_str: cookieStr }).exec();
                    console.log("Cookie Updated: ", userID, li_at);
                };
                // else {
                //     console.log("No Change in Cookie: ", userID);
                // }
            };
        };

    } catch (err) {
        console.trace(err);
    };
};

module.exports = { handleCookies };
