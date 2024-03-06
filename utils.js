const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');
const axios = require("axios").default;
const moment = require("moment");

const initializeDatabase = require("./db");
const Cookie = require("./models/Cookie");
// const Person = require("./models/Person");
const Customer = require("./models/Customer");
const cron = require("./cron");

function sleep(seconds) {
    return new Promise(resolve => setTimeout(resolve, seconds * 1000));
};

async function checkDatabaseConnection() {
    try {
        while (true) {
            if (mongoose.connection.readyState !== 1) {
                await sleep(5)
            } else {
                return "success";
            }
        }
    } catch (error) {
        console.trace(error);
    }

    return "failure";
}

async function keepTheServerRunning() {
    try {
        console.log("Connecting to MongoDB...");

        while (true) {
            if (mongoose.connection.readyState !== 1) {
                try {
                    await initializeDatabase();
                    cron();
                } catch (error) {
                    console.trace(error);
                };

            };

            await sleep(30);
        };

    } catch (error) {
        console.trace(error);
    }
}

/**
 * 
 * @param {Array} cookies 
 * @param {String} name 
 * @returns {String}
 */
function getCookie(cookies, name) {
    for (let i = 0; i < cookies.length; i++) {
        const cookie = cookies[i];

        if (cookie.name == name) {
            return cookie.value;
        };
    };
};

/**
 * 
 * @param {string} str 
 * @returns {object}
 */
function parseJSON(str) { 
    try {
        return JSON.parse(
            str.split(" ").join("")
                .split("&quot;").join('"')
                .split("&amp;").join('&')
                .split("&#61;").join('=')
        )
    } catch (error) {
        console.trace(error);
    }
}

/**
 * 
 * @param {String} response 
 */
function getIncluded(response) {
    try {
        const data_1 = response.indexOf('&quot;identityDashProfilesByMemberIdentity&quot;:{&quot;*elements&quot;:[&quot;urn:li:fsd_profile:');
        const data_2 = response.lastIndexOf('{&quot;data&quot;:{&quot;data&quot;:{&quot;$recipeTypes&quot;:[&quot;', data_1);
        const data_3 = response.indexOf('</code>', data_1);

        const data = parseJSON(response.substring(data_2, data_3));
        return data.included;
    } catch (error) {
        console.trace(error);
    }
}

async function makeGetRequest(url, headers) {
    let retries = 0;
    let response = null;

    try {
        while (retries < 3) {
            response = await axios.get(url, { headers: headers });

            if (response.status === 200) {
                break;
            }

            retries += 1
        }
    } catch (error) {
        console.trace(error);
    }

    return response;
 }

const getCustomerInfo = async (data) => {
    const { li_at, jsession_id, userID } = data;
    const return_data = { urn: "", name: "", isPremium: "NO" };

    try {
        const url = `https://www.linkedin.com/in/${userID}/`;
        const headers = {
            "accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
            "accept-language": "en-US,en;q=0.9",
            "cache-control": "max-age=0",
            // "sec-ch-ua": "\"Not A(Brand\";v=\"99\", \"Google Chrome\";v=\"121\", \"Chromium\";v=\"121\"",
            "sec-ch-ua-mobile": "?0",
            // "sec-ch-ua-platform": "\"Windows\"",
            "sec-fetch-dest": "document",
            "sec-fetch-mode": "navigate",
            "sec-fetch-site": "none",
            "sec-fetch-user": "?1",
            "upgrade-insecure-requests": "1",
            "cookie": `li_at=${li_at}; JSESSIONID=\"${jsession_id}\"`
        }

        const response = await makeGetRequest(url, headers);

        if (!response) {
            // TODO: Send an emergency notification to the Developer & Client
            return return_data;
        }

        const included = getIncluded(response.data);

        for (let i = 0; i < included.length; i++) {
            const obj = included[i];

            if (obj.entityUrn) {
                if (obj.entityUrn.startsWith("urn:li:fsd_profile:")) {
                    if (return_data["urn"].length === 0) {
                        return_data["urn"] = obj.entityUrn;
                    }
                }
            }

            if (obj.premiumFeatures) {
                if (obj.premiumFeatures[0].hasAccess) {
                    return_data["isPremium"] = "YES";
                }
            } else {
                if (obj.premium) {
                    if (obj.premium !== false) {
                        return_data["isPremium"] = "YES";
                    }
                }
            }

            if (obj.lastName || obj.firstName) {
                if (return_data["name"].length === 0) {
                    return_data["name"] = `${obj.firstName} ${obj.lastName}`;
                }
            }
        }

    } catch (error) {
        console.trace(error);
    }

    return return_data;
}

async function handleCookies(data) {
    try {

        if (mongoose.connection.readyState !== 1) { await keepTheServerRunning() };

        let userID = data.url;
        let userEmail = data.email;
        const li_at = getCookie(data.cookies, "li_at");
        const jsession_id = getCookie(data.cookies, "JSESSIONID").split('"').join("");

        // console.log("USER_ID_1: ", userID);

        if (userID && userID !== "NO_URL" && typeof userID !== "undefined") {
            if (userID.length === 0) { return };

            userID = userID.split("/in/")[1].split("/")[0];
            // console.log("USER_ID_2: ", userID);

            // const Customer = mongoose.connection.model("Customer");
            // const Cookie = mongoose.connection.model("Cookie");
            const alreadyExists = await Customer.find({ user_id: userID }).exec();
            const cookieExists = await Cookie.find({ user_id: userID }).exec();

            if (alreadyExists.length === 0) {
                const newUUID = uuidv4();

                const customerInfo = await getCustomerInfo({ li_at, jsession_id, userID });

                const newCustomer = new Customer({
                    urn: customerInfo.urn,
                    name: customerInfo.name,
                    email: userEmail,
                    profile_url: `https://www.linkedin.com/in/${userID}`,
                    user_id: userID,
                    uuid: newUUID,
                    added: moment.utc().format(),
                    last_ran: "NULL"
                });

                await newCustomer.save();

                const newCookie = new Cookie({
                    user_id: userID,
                    li_at: li_at,
                    jsession_id: jsession_id,
                    uuid: newUUID,
                    urn: customerInfo.urn,
                    isPremium: customerInfo.isPremium,
                    running: "NO"
                });

                await newCookie.save();

                console.log("New Customer Added: ", customerInfo.name, userEmail, customerInfo.urn)
                console.log("New Cookie Added: ", userID, newUUID);

            } else {
                if (cookieExists[0].li_at !== li_at || cookieExists[0].jsession_id !== jsession_id) {
                    await Cookie.updateOne({ user_id: userID, uuid: cookieExists[0].uuid }, { li_at: li_at, jsession_id: jsession_id }).exec();
                    console.log("Cookie Updated for UUID: ", cookieExists[0].uuid);
                } else {
                    console.log("No Change in Cookie: ", userID, userEmail);
                }
            };
        }

    } catch (err) {
        console.trace(err);
    };
};

// getCustomerInfo({
//     li_at: "AQEDAUFujR4FLp7wAAABjb04-9wAAAGN4UV_3E4AoAOnEncfwbAqIbLQve6E-1_UDey0sfzgSfkCs9ZJSoFRNh1O0GXMnKwwWV9MJRti7efhY_PTOiON8fJukweOscEN9-R718Ow0LqQZTZ7b-IY9iSN",
//     jsession_id: "ajax:2641296221308317633",
//     userID: "nilsgrammerstorf"
// }).then((d) => {
//     console.log(d);
// })

module.exports = { handleCookies, keepTheServerRunning, makeGetRequest, checkDatabaseConnection };