const { v4: uuidv4 } = require('uuid');
const axios = require("axios").default;
const moment = require("moment");
const { PrismaClient } = require('@prisma/client');
const logger = require("./logger");
const cron = require("./cron");

const prisma = new PrismaClient({ log: ["info", "warn", "error"] });

function sleep(seconds) {
    return new Promise(resolve => setTimeout(resolve, seconds * 1000));
};

async function keepTheServerRunning() {
    try {
        while (true) {
            try {
                cron();
            } catch (error) {
                console.trace(error);
                logger.log(0, error);
            };

            await sleep(30);

        };

    } catch (error) {
        console.trace(error);
        logger.log(0, error);
    };
};

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
        logger.log(0, error);
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
        logger.log(0, error);
    }
}

async function makeGetRequest(url, headers) {
    let retries = 0;
    let response = null;

    try {
        while (retries < 3) {
            response = await axios.get(url, { headers: headers })

            if (response.status === 200) {
                break;
            }

            retries += 1
        }
    } catch (error) {
        console.trace(error);
        logger.log(0, error);
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
            "sec-ch-ua-mobile": "?0",
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
            logger.log(1, 'Failed to fetch customer info from LinkedIn');
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
        logger.log(0, error);
    }

    return return_data;
}

async function handleCookies(data) {
    try {
        let userID = data.url;
        let userEmail = data.email;
        const scrapingDay = data.scraping_day;
        const li_at = getCookie(data.cookies, "li_at");
        const jsession_id = getCookie(data.cookies, "JSESSIONID").split('"').join("");
        const apiKey = data.api_key;

        // TODO: Notify the User about the API Key not valid
        if (apiKey && apiKey !== "NO_KEY") {
            const keyExists = await prisma.api.findFirst({ where: { api_key: apiKey } });
            if (!keyExists) {
                return;
            }
        }

        if (userID && userID !== "NO_URL" && typeof userID !== "undefined") {
            if (userID.length === 0) { return };

            userID = userID.split("/in/")[1].split("/")[0];

            const keyExists = await prisma.api.findFirst({ where: { api_key: apiKey } });

            const alreadyExists = await prisma.customer.findMany({ where: { uuid: keyExists.uuid } });
            const cookieExists = await prisma.cookie.findMany({ where: { uuid: keyExists.uuid } });

            if (alreadyExists.length === 0 && scrapingDay !== "NO_DAY") {
                // // TODO: Notify the User that he/she can't create more than 1 account
                // if (keyExists.uuid !== "NO_UUID") { return };

                const newUUID = uuidv4();
                const customerInfo = await getCustomerInfo({ li_at, jsession_id, userID });

                // TODO: Notify the User that the Url of LinkedIn is incorrect
                if (customerInfo.urn.length == 0) { return };

                await prisma.customer.create({
                    data: {
                        urn: customerInfo.urn,
                        name: customerInfo.name,
                        email: userEmail,
                        profile_url: `https://www.linkedin.com/in/${userID}`,
                        user_id: userID,
                        uuid: newUUID,
                        added: moment.utc().format(),
                        last_ran: "NULL"
                    }
                });

                await prisma.cookie.create({
                    data: {
                        user_id: userID,
                        li_at: li_at,
                        jsession_id: jsession_id,
                        uuid: newUUID,
                        urn: customerInfo.urn,
                        ispremium: customerInfo.isPremium,
                        running: "NO",
                        scraping_day: parseInt(scrapingDay),
                        last_profile_view: ""
                    }
                });

                await prisma.api.update({ where: { api_key: apiKey }, data: { uuid: newUUID } });
                logger.log(2, `New Customer Added: ${customerInfo.name}, ${userEmail}, ${customerInfo.urn}`);

            } else {
                if (userID !== alreadyExists[0].user_id) {
                    return;
                }

                if (cookieExists[0].li_at !== li_at || cookieExists[0].jsession_id !== jsession_id) {
                    await prisma.cookie.update({ where: { user_id: userID, uuid: cookieExists[0].uuid }, data: { li_at: li_at, jsession_id: jsession_id } });
                    logger.log(2, `Updated Cookies for UUID: ${cookieExists[0].uuid}`);
                }

                if (alreadyExists[0].email !== userEmail) {
                    await prisma.customer.update({ where: { user_id: userID, uuid: cookieExists[0].uuid }, data: { email: userEmail } });
                    logger.log(2, `Updated Email for UUID: ${cookieExists[0].uuid}`);
                }

                if (cookieExists[0].scraping_day !== scrapingDay && scrapingDay !== "NO_DAY") {
                    await prisma.cookie.update({ where: { user_id: userID, uuid: cookieExists[0].uuid }, data: { scraping_day: parseInt(scrapingDay) } });
                    logger.log(2, `Updated Scraping Day for UUID: ${cookieExists[0].uuid}`);
                }
            };
        };

    } catch (err) {
        console.trace(err);
        logger.log(0, err);
    };
};

module.exports.handleCookies = handleCookies;
module.exports.keepTheServerRunning = keepTheServerRunning;
module.exports.makeGetRequest = makeGetRequest;
