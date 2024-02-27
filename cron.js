const mongoose = require('mongoose');
const moment = require("moment");
const { makeGetRequest, checkDatabaseConnection } = require('./utils');

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

function isWithin24Hrs(dateString) {
    try {

        if (dateString.split(" ").length > 3) {
            return false;
        };

        // const num = dateString.split(" ")[1].match(/\d+/g);
        const date = dateString.split(" ")[1].match(/[a-zA-Z]+/g);

        if (date == "h" || date == "s" || date == "m") {
            return true;
        };
        // else if (date[1] == "d" && date[0] == "1") {
        //     return true;
        // }

    } catch (error) {
        console.trace(error);
    }

    return false;
}

async function getFreeViewersData(data) {
    try {
        const url = `https://www.linkedin.com/voyager/api/graphql?includeWebMetadata=true&variables=(edgeInsightsAnalyticsCardUrns:List(urn%3Ali%3Afsd_edgeInsightsAnalyticsCard%3A%28WVMP%2Curn%3Ali%3Awvmp%3A1%2CANALYTICS%2CSUMMARY%2CBROWSE_FOR_FREE_VIEWERS%29),query:())&queryId=voyagerPremiumDashAnalyticsCard.7541f19840ff2747a5f828dab60e622a`;
        const headers = {
            "accept": "application/vnd.linkedin.normalized+json+2.1",
            "accept-language": "en-US,en;q=0.9",
            "csrf-token": data.jsession_id,
            // "sec-ch-ua": "\"Not A(Brand\";v=\"99\", \"Google Chrome\";v=\"121\", \"Chromium\";v=\"121\"",
            "sec-ch-ua-mobile": "?0",
            // "sec-ch-ua-platform": "\"Windows\"",
            "sec-fetch-dest": "empty",
            "sec-fetch-mode": "cors",
            "sec-fetch-site": "same-origin",
            "x-li-lang": "en_US",
            "x-li-page-instance": "urn:li:page:d_flagship3_leia_profile_views;WU4AeSW4S6m16ZjWL3nHsw==",
            "x-li-pem-metadata": "Voyager - Premium - WVMP=analytics-card-batch-get",
            // "x-li-track": "{\"clientVersion\":\"1.13.10994\",\"mpVersion\":\"1.13.10994\",\"osName\":\"web\",\"timezoneOffset\":5,\"timezone\":\"Asia/Karachi\",\"deviceFormFactor\":\"DESKTOP\",\"mpName\":\"voyager-web\",\"displayDensity\":1,\"displayWidth\":1920,\"displayHeight\":1080}",
            "x-restli-protocol-version": "2.0.0",
            "cookie": `li_at=${data.li_at}; JSESSIONID=\"${data.jsession_id}\"`,
            "Referer": "https://www.linkedin.com/analytics/profile-views/",
            "Referrer-Policy": "strict-origin-when-cross-origin"
        }

        const response = await makeGetRequest(url, headers);

        if (!response) {
            // TODO: Send an emergency notification to the Developer & Client
            return;
        }

        let viewsin24Hrs = []; // entityUrns
        const included = response.data.included;

        for (let i = 0; i < included.length; i++) {
            const obj = included[i];
            if (obj.component) {
                const items = obj.component?.analyticsObjectList?.items;

                if (items) {
                    if (items.length > 0) {
                        for (let x = 0; x < items.length; x++) {
                            const item = items[x].content.analyticsEntityLockup;

                            if (isWithin24Hrs(item.entityLockup.caption.text)) {
                                if (item.ctaItem.actionData["*entityProfile"]) {
                                    viewsin24Hrs.push(item.ctaItem.actionData["*entityProfile"])
                                }
                            }
                        }
                    }
                }
            }
        }

        // console.log(viewsin24Hrs);

        let viewersData = {};
        viewersData["uuid"] = data.uuid;
        viewersData["urn"] = data.urn;
        viewersData["profile_data"] = [];

        for (let i = 0; i < included.length; i++) {
            const obj = included[i];
            
            if (viewsin24Hrs.includes(obj.entityUrn)) {
                viewersData["profile_data"].push({
                    person_urn: obj.entityUrn,
                    first_name: obj.firstName,
                    last_name: obj.lastName,
                    profile_url: `https://www.linkedin.com/in/${obj.publicIdentifier}/`,
                    profile_headline: obj.headline,
                    profile_view_count: 1,
                    score: 1
                });
            }
        }

        if (viewersData.profile_data.length > 0) { 

            for (let i = 0; i < viewersData.profile_data.length; i++) {
                const viewer = viewersData.profile_data[i];
                
                await checkDatabaseConnection();

                const Person = mongoose.connection.model("Person");
                const personData = await Person.find({ person_urn: viewer.person_urn, uuid: viewersData.uuid }).exec();

                if (personData.length == 0) {
                    const newPerson = new Person({
                        uuid: viewersData.uuid,
                        urn: viewersData.urn,
                        person_urn: viewer.person_urn,
                        first_name: viewer.first_name,
                        last_name: viewer.last_name,
                        profile_url: viewer.profile_url,
                        profile_headline: viewer.profile_headline,
                        job_title: "NULL",
                        reactions_count: 0,
                        comments_count: 0,
                        profile_view_count: viewer.profile_view_count,
                        score: viewer.score
                    });

                    await newPerson.save();
                } else {
                    await Person.updateOne({ person_urn: viewer.person_urn, uuid: viewersData.uuid }, {
                        profile_view_count: viewer.profile_view_count + personData[0].profile_view_count,
                        score: viewer.score + personData[0].score
                    }).exec();
                }
            }
        }

    } catch (error) {
        console.trace(error);
    };
};

// TODO: Handle Paging
async function getPremiumViewersData(data) {
    try {
        const headers = {
            "accept": "application/vnd.linkedin.normalized+json+2.1",
            "accept-language": "en-GB,en-US;q=0.9,en;q=0.8",
            "csrf-token": data.jsession_id,
            // "sec-ch-ua": "\"Not A(Brand\";v=\"99\", \"Google Chrome\";v=\"121\", \"Chromium\";v=\"121\"",
            "sec-ch-ua-mobile": "?0",
            // "sec-ch-ua-platform": "\"Windows\"",
            "sec-fetch-dest": "empty",
            "sec-fetch-mode": "cors",
            "sec-fetch-site": "same-origin",
            "x-li-lang": "en_US",
            "x-li-page-instance": "urn:li:page:d_flagship3_leia_profile_views;zR1VyZsJQaWNibtZVPuZ4w==",
            "x-li-pem-metadata": "Voyager - Premium - WVMP=analytics-entity-list-display",
            // "x-li-track": "{\"clientVersion\":\"1.13.10994\",\"mpVersion\":\"1.13.10994\",\"osName\":\"web\",\"timezoneOffset\":5,\"timezone\":\"Asia/Karachi\",\"deviceFormFactor\":\"DESKTOP\",\"mpName\":\"voyager-web\",\"displayDensity\":1,\"displayWidth\":1920,\"displayHeight\":1080}",
            "x-restli-protocol-version": "2.0.0",
            "cookie": `li_at=${data.li_at}; JSESSIONID=\"${data.jsession_id}\"`,
            "Referer": "https://www.linkedin.com/analytics/profile-views/?timeRange=past_2_weeks",
            "Referrer-Policy": "strict-origin-when-cross-origin"
        }

        let variables = "variables=(start:0,query:(selectedFilters:List((key:timeRange,value:List(past_2_weeks)))),analyticsEntityUrn:(activityUrn:urn%3Ali%3Adummy%3A-1),surfaceType:WVMP)&queryId=voyagerPremiumDashAnalyticsObject.09dfd4ecd107e545d3ad06c1c5d1cf6a"
        let hasPagination = false;
        let paginationToken = "";
        let start = 0;

        while (true) {
            if (hasPagination) {
                variables = `variables=(paginationToken:${paginationToken},start:${start},query:(selectedFilters:List((key:timeRange,value:List(past_2_weeks)))),analyticsEntityUrn:(activityUrn:urn%3Ali%3Adummy%3A-1),surfaceType:WVMP)&queryId=voyagerPremiumDashAnalyticsObject.09dfd4ecd107e545d3ad06c1c5d1cf6a`;
            }
                
            const url = `https://www.linkedin.com/voyager/api/graphql?${variables}`;

            const response = await makeGetRequest(url, headers);

            if (!response) {
                // TODO: Send an emergency notification to the Developer & Client
                return;
            }

            const premiumAnalytics = response.data.data.data.premiumDashAnalyticsObjectByAnalyticsEntity
            paginationToken = premiumAnalytics.metadata.paginationToken;
            const paging = premiumAnalytics.paging;
            const viewerList = premiumAnalytics.elements;
            const included = response.data.included;

            let viewsin24Hrs = [];

            if (paging.total > 10) {
                hasPagination = true;
            }

            if (viewerList.length > 0) {
                for (let x = 0; x < viewerList.length; x++) {
                    const item = viewerList[x].content.analyticsEntityLockup;

                    if (isWithin24Hrs(item.entityLockup.caption.text)) {
                        if (item.ctaItem.actionData["*entityProfile"]) {
                            viewsin24Hrs.push(item.ctaItem.actionData["*entityProfile"])
                        }
                    }
                }
            }

            let viewersData = {};
            viewersData["uuid"] = data.uuid;
            viewersData["urn"] = data.urn;
            viewersData["profile_data"] = [];

            for (let i = 0; i < included.length; i++) {
                const obj = included[i];

                if (viewsin24Hrs.includes(obj.entityUrn)) {
                    viewersData["profile_data"].push({
                        person_urn: obj.entityUrn,
                        first_name: obj.firstName,
                        last_name: obj.lastName,
                        profile_url: `https://www.linkedin.com/in/${obj.publicIdentifier}/`,
                        profile_headline: obj.headline,
                        profile_view_count: 1,
                        score: 1
                    });
                }
            }

            if (viewersData.profile_data.length > 0) {

                for (let i = 0; i < viewersData.profile_data.length; i++) {
                    const viewer = viewersData.profile_data[i];

                    await checkDatabaseConnection();

                    const Person = mongoose.connection.model("Person");
                    const personData = await Person.find({ person_urn: viewer.person_urn, uuid: viewersData.uuid }).exec();

                    if (personData.length == 0) {
                        const newPerson = new Person({
                            uuid: viewersData.uuid,
                            urn: viewersData.urn,
                            person_urn: viewer.person_urn,
                            first_name: viewer.first_name,
                            last_name: viewer.last_name,
                            profile_url: viewer.profile_url,
                            profile_headline: viewer.profile_headline,
                            job_title: "NULL",
                            reactions_count: 0,
                            comments_count: 0,
                            profile_view_count: viewer.profile_view_count,
                            score: viewer.score
                        });

                        await newPerson.save();
                    } else {
                        await Person.updateOne({ person_urn: viewer.person_urn, uuid: viewersData.uuid }, {
                            profile_view_count: viewer.profile_view_count + personData[0].profile_view_count,
                            score: viewer.score + personData[0].score
                        }).exec();
                    }
                }
            }

            if (start >= paging.total) break;
            start += 10;
        }

    } catch (error) {
        console.trace(error);
    }
}

async function getComments(data, post) {
    try {
        const headers = {
            "accept": "application/vnd.linkedin.normalized+json+2.1",
            "accept-language": "en-US,en;q=0.9",
            "csrf-token": data.jsession_id,
            // "sec-ch-ua": "\"Not A(Brand\";v=\"99\", \"Google Chrome\";v=\"121\", \"Chromium\";v=\"121\"",
            "sec-ch-ua-mobile": "?0",
            // "sec-ch-ua-platform": "\"Windows\"",
            "sec-fetch-dest": "empty",
            "sec-fetch-mode": "cors",
            "sec-fetch-site": "same-origin",
            "x-li-lang": "en_US",
            "x-li-page-instance": "urn:li:page:d_flagship3_detail_base;1E7brz1+RyGqOmx/Xv/YYA==",
            "x-li-pem-metadata": "Voyager - Feed - Comments=load-comments",
            // "x-li-track": "{\"clientVersion\":\"1.13.11186\",\"mpVersion\":\"1.13.11186\",\"osName\":\"web\",\"timezoneOffset\":5,\"timezone\":\"Asia/Karachi\",\"deviceFormFactor\":\"DESKTOP\",\"mpName\":\"voyager-web\",\"displayDensity\":1,\"displayWidth\":1920,\"displayHeight\":1080}",
            "x-restli-protocol-version": "2.0.0",
            "cookie": `li_at=${data.li_at}; JSESSIONID=\"${data.jsession_id}\"`,
            "Referer": `https://www.linkedin.com/feed/update/urn:li:activity:${post.id}/`,
            "Referrer-Policy": "strict-origin-when-cross-origin"
        }
    } catch (error) {
        console.trace(error);
    };
};

async function cron(data) {
    try {

        if (data.isPremium == "NO") {
            await getFreeViewersData(data);
        } else {
            await getPremiumViewersData(data);
        }
        
        const posts = await getRecentEngagements(data);
        for (let i = 0; i < posts.length; i++) {
            const post = posts[i];
            await getComments(data, post);
            // await getReactions(data);
        }
        

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

            const dbStatus = await checkDatabaseConnection();

            if (dbStatus == "failure") {
                continue;
            }

            console.log("Starting to check for updates...");

            const cookies = await getAllUpdatedCookies("NO");

            if (cookies) {
                CACHE = cookies;
            }

            // console.log(CACHE);

            // if (moment.utc().hour() >= 20) {
            for (let i = 0; i < CACHE.length; i++) {

                if (CACHE[i].running === "NO") {
                    cron(CACHE[i]);
                }

                await updateCookie(CACHE[i].uuid, { running: "YES" });
                CACHE[i]["running"] = "YES";

            }
            // }

            await sleep(1800); // Check every half-hour
        }

    } catch (error) {
        console.trace(error);
        CRON_STATUS = 0;
    };
};

// getFreeViewersData({
//     jsession_id: "ajax:4904300844858187340",
//     li_at: "AQEDATLg72QCzi31AAABjbwE_hkAAAGN4BGCGU0An1A-jTu39cAKAoHxBOc6rBvqjsLsGYxLYIOGTHrlnkyhMFkGBrv90tGD66eFkgRizim_VZZ1JRZdf3PzNZEQfKUlZ7ewk3piDr5Mf0yuvCbJCn0_",
//     uuid: ""
// })

// module.exports = main;
