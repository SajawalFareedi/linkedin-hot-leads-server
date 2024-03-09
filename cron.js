const moment = require("moment");
const createCsvWriter = require('csv-writer').createObjectCsvWriter;
const nodemailer = require('nodemailer');
const { unlinkSync } = require("fs");
const utils = require('./utils');
const logger = require("./logger");

const Cookie = require("./models/Cookie");
const Person = require("./models/Person");
const Customer = require("./models/Customer");

let CRON_STATUS = 0;
let MAIN_CRON_RUNNING = 0; // Flag to know if the main cron is running
let PROFILE_CRON_RUNNING = 0;  // Flag for each profile cron

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: 'sajawalfareedi448@gmail.com',
        pass: 'gndxwareinrzjras'
    }
});

// const transporter = nodemailer.createTransport({
//     host: 'mail.floppyapp.io',
//     port: 465,
//     secure: true,
//     auth: {
//         user: 'bot@floppyapp.io',
//         pass: 'password'
//     }
// });

function sleep(seconds) {
    return new Promise(resolve => setTimeout(resolve, seconds * 1000));
};

async function getAllUpdatedCookies(running) {
    try {
        return await Cookie.find({ running }).exec();
    } catch (error) {
        console.trace(error);
        logger.log(0, error);
        CRON_STATUS = 0;
    };

    return [];
};

async function updateCookie(uuid, data) {
    try {
        return await Cookie.updateOne({ uuid: uuid }, data).exec();
    } catch (error) {
        console.trace(error);
        logger.log(0, error);
    }
};

function isWithin7Days(dateString, isPost) {
    try {

        if (!isPost) {

            if (dateString.split(" ").length > 3) {
                return false;
            };

            const date = dateString.split(" ")[1].match(/[a-zA-Z]+/g);

            if (date == "h" || date == "s" || date == "m" || date == "d") {
                return true;
            };

        } else {
            const date = dateString.split(" • ")[0].match(/[a-zA-Z]+/g);

            if (date == "h" || date == "s" || date == "m" || date == "d") {
                return true;
            };
        }


    } catch (error) {
        console.trace(error);
        logger.log(0, error);
    }

    return false;
}

function isWithin24Hrs(dateString, isPost) {
    try {

        if (!isPost) {
            if (dateString.split(" ").length > 3) {
                return false;
            };

            const date = dateString.split(" ")[1].match(/[a-zA-Z]+/g);

            if (date == "h" || date == "s" || date == "m") {
                return true;
            };
        } else {
            const num = dateString.split(" ")[1].match(/\d+/g);
            const date = dateString.split(" • ")[0].match(/[a-zA-Z]+/g);

            if ((date == "h" || date == "s" || date == "m") && (parseInt(num) <= moment.utc().hour())) {
                return true;
            };
        }


    } catch (error) {
        console.trace(error);
        logger.log(0, error);
    }

    return false;
};

async function getJobTitle(person_urn, data) {
    try {
        const headers = {
            "accept": "application/vnd.linkedin.normalized+json+2.1",
            "accept-language": "en-US,en;q=0.9",
            "csrf-token": data.jsession_id,
            "sec-ch-ua-mobile": "?0",
            "sec-fetch-dest": "empty",
            "sec-fetch-mode": "cors",
            "sec-fetch-site": "same-origin",
            "x-li-lang": "en_US",
            "x-li-page-instance": "urn:li:page:d_flagship3_profile_view_base;TOYMHodvSD+raFovcEj1cg==",
            "x-li-pem-metadata": "Voyager - Profile=profile-tab-initial-cards",
            "x-restli-protocol-version": "2.0.0",
            "cookie": `li_at=${data.li_at}; JSESSIONID=\"${data.jsession_id}\"`,
            "Referer": `https://www.linkedin.com/in/${person_urn}/`,
            "Referrer-Policy": "strict-origin-when-cross-origin"
        }

        const url = `https://www.linkedin.com/voyager/api/graphql?includeWebMetadata=true&variables=(profileUrn:urn%3Ali%3Afsd_profile%3A${person_urn})&queryId=voyagerIdentityDashProfileCards.c78038c1bbcf9183f894d26cbd4f462a`

        const response = await utils.makeGetRequest(url, headers);

        if (!response) {
            // TODO: Send an emergency notification to the Developer & Client
            logger.log(1, "No response from the linkedin api for job title");
            return "NO_JOB_TITLE";
        }

        const included = response.data["included"];

        for (let i = 0; i < included.length; i++) {
            const obj = included[i];

            if (obj.entityUrn.indexOf(",EXPERIENCE,") !== -1) {
                for (let x = 0; x < obj.topComponents.length; x++) {
                    const topComponent = obj.topComponents[x].components;

                    if (topComponent.fixedListComponent) {
                        try {
                            const jobTitle = topComponent.fixedListComponent.components[0].components.entityComponent.titleV2.text.text;
                            return jobTitle;
                        } catch (error) { return "NO_JOB_TITLE" };
                    }
                }
            }
        }

    } catch (error) {
        console.trace(error);
        logger.log(0, error);
    };

    return "NO_JOB_TITLE";
};

async function getFreeViewersData(data) {
    try {
        const url = `https://www.linkedin.com/voyager/api/graphql?includeWebMetadata=true&variables=(edgeInsightsAnalyticsCardUrns:List(urn%3Ali%3Afsd_edgeInsightsAnalyticsCard%3A%28WVMP%2Curn%3Ali%3Awvmp%3A1%2CANALYTICS%2CSUMMARY%2CBROWSE_FOR_FREE_VIEWERS%29),query:())&queryId=voyagerPremiumDashAnalyticsCard.7541f19840ff2747a5f828dab60e622a`;
        const headers = {
            "accept": "application/vnd.linkedin.normalized+json+2.1",
            "accept-language": "en-US,en;q=0.9",
            "csrf-token": data.jsession_id,
            "sec-ch-ua-mobile": "?0",
            "sec-fetch-dest": "empty",
            "sec-fetch-mode": "cors",
            "sec-fetch-site": "same-origin",
            "x-li-lang": "en_US",
            "x-li-page-instance": "urn:li:page:d_flagship3_leia_profile_views;WU4AeSW4S6m16ZjWL3nHsw==",
            "x-li-pem-metadata": "Voyager - Premium - WVMP=analytics-card-batch-get",
            "x-restli-protocol-version": "2.0.0",
            "cookie": `li_at=${data.li_at}; JSESSIONID=\"${data.jsession_id}\"`,
            "Referer": "https://www.linkedin.com/analytics/profile-views/",
            "Referrer-Policy": "strict-origin-when-cross-origin"
        }

        const response = await utils.makeGetRequest(url, headers);

        if (!response) {
            // TODO: Send an emergency notification to the Developer & Client
            logger.log(1, "No response from linkedin api for  getting free viewer's data.");
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

                await utils.checkDatabaseConnection();
                const personData = await Person.find({ person_urn: viewer.person_urn, uuid: viewersData.uuid }).exec();

                if (personData.length == 0) {
                    const jobTitle = await getJobTitle(viewer.person_urn.split(":")[-1], data);

                    const newPerson = new Person({
                        uuid: viewersData.uuid,
                        urn: viewersData.urn,
                        person_urn: viewer.person_urn,
                        first_name: viewer.first_name,
                        last_name: viewer.last_name,
                        profile_url: viewer.profile_url,
                        profile_headline: viewer.profile_headline,
                        job_title: jobTitle,
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
        logger.log(0, error);
    };
};

async function getPremiumViewersData(data) {
    try {
        const headers = {
            "accept": "application/vnd.linkedin.normalized+json+2.1",
            "accept-language": "en-GB,en-US;q=0.9,en;q=0.8",
            "csrf-token": data.jsession_id,
            "sec-ch-ua-mobile": "?0",
            "sec-fetch-dest": "empty",
            "sec-fetch-mode": "cors",
            "sec-fetch-site": "same-origin",
            "x-li-lang": "en_US",
            "x-li-page-instance": "urn:li:page:d_flagship3_leia_profile_views;zR1VyZsJQaWNibtZVPuZ4w==",
            "x-li-pem-metadata": "Voyager - Premium - WVMP=analytics-entity-list-display",
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

            const response = await utils.makeGetRequest(url, headers);

            if (!response) {
                // TODO: Send an emergency notification to the Developer & Client
                logger.log(1, "No response from linkeidn api for premium viewer's data");
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

                    await utils.checkDatabaseConnection();

                    const personData = await Person.find({ person_urn: viewer.person_urn, uuid: viewersData.uuid }).exec();

                    if (personData.length == 0) {
                        const jobTitle = await getJobTitle(viewer.person_urn.split(":")[-1], data);

                        const newPerson = new Person({
                            uuid: viewersData.uuid,
                            urn: viewersData.urn,
                            person_urn: viewer.person_urn,
                            first_name: viewer.first_name,
                            last_name: viewer.last_name,
                            profile_url: viewer.profile_url,
                            profile_headline: viewer.profile_headline,
                            job_title: jobTitle,
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
        logger.log(0, error);
    }
}

async function getRecentEngagements(data) {
    let postsIDs = [];

    try {
        const headers = {
            "accept": "application/vnd.linkedin.normalized+json+2.1",
            "accept-language": "en-US,en;q=0.9",
            "csrf-token": data.jsession_id,
            "sec-ch-ua-mobile": "?0",
            "sec-fetch-dest": "empty",
            "sec-fetch-mode": "cors",
            "sec-fetch-site": "same-origin",
            "x-li-lang": "en_US",
            "x-li-page-instance": "urn:li:page:d_flagship3_profile_view_base_recent_activity_content_view;rZo8oOd3TJ2HB6VGXLR0qw==",
            "x-restli-protocol-version": "2.0.0",
            "cookie": `li_at=${data.li_at}; JSESSIONID=\"${data.jsession_id}\"`,
            "Referer": `https://www.linkedin.com/in/${data.urn.split(':')[-1]}/recent-activity/all/`,
            "Referrer-Policy": "strict-origin-when-cross-origin"
        }

        let variables = `variables=(count:20,start:0,profileUrn:urn%3Ali%3Afsd_profile%3A${data.urn.split(':')[-1]})&queryId=voyagerFeedDashProfileUpdates.53c3a4bd255094f16123c5b4ed7ad0dc`
        let hasPagination = false;
        let paginationToken = "";
        let start = 0;

        while (true) {
            if (hasPagination) {
                variables = `variables=(count:20,start:${start},profileUrn:urn%3Ali%3Afsd_profile%3A${data.urn.split(':')[-1]},paginationToken:${paginationToken})&queryId=voyagerFeedDashProfileUpdates.53c3a4bd255094f16123c5b4ed7ad0dc`;
            }

            const url = `https://www.linkedin.com/voyager/api/graphql?${variables}`;

            const response = await utils.makeGetRequest(url, headers);

            if (!response) {
                // TODO: Send an emergency notification to the Developer & Client
                logger.log(1, "No response from LinkedIn API for getting recent engagements");
                return postsIDs;
            }

            const feedDash = response.data.data.data.feedDashProfileUpdatesByMemberShareFeed;
            paginationToken = feedDash.metadata.paginationToken;
            const paging = feedDash.paging;
            const postsList = response.data.included;

            if (paging.total > 10) {
                hasPagination = true;
            }

            for (let i = 0; i < postsList.length; i++) {
                const post = postsList[i];

                if (post.commentary) {
                    if (isWithin7Days(post.actor.subDescription.text, true)) {
                        postsIDs.push(post.entityUrn.split(":")[-1].split(",")[0]);
                    }
                }
            }

            if (start >= paging.total) break;
            start += 20;

        }

        return postsIDs;

    } catch (error) {
        console.trace(error);
        logger.log(0, error);
    }

    return postsIDs;
}

async function getComments(data, postID) {
    try {
        const headers = {
            "accept": "application/vnd.linkedin.normalized+json+2.1",
            "accept-language": "en-US,en;q=0.9",
            "csrf-token": data.jsession_id,
            "sec-ch-ua-mobile": "?0",
            "sec-fetch-dest": "empty",
            "sec-fetch-mode": "cors",
            "sec-fetch-site": "same-origin",
            "x-li-lang": "en_US",
            "x-li-page-instance": "urn:li:page:d_flagship3_detail_base;1E7brz1+RyGqOmx/Xv/YYA==",
            "x-li-pem-metadata": "Voyager - Feed - Comments=load-comments",
            "x-restli-protocol-version": "2.0.0",
            "cookie": `li_at=${data.li_at}; JSESSIONID=\"${data.jsession_id}\"`,
            "Referer": `https://www.linkedin.com/feed/update/urn:li:activity:${postID}/`,
            "Referrer-Policy": "strict-origin-when-cross-origin"
        }

        let variables = `variables=(count:10,numReplies:1,socialDetailUrn:urn%3Ali%3Afsd_socialDetail%3A%28urn%3Ali%3Aactivity%3A${postID}%2Curn%3Ali%3Aactivity%3A${postID}%2Curn%3Ali%3AhighlightedReply%3A-%29,sortOrder:REVERSE_CHRONOLOGICAL,start:0)&queryId=voyagerSocialDashComments.c8848fd440e02d7ae3d4c5e06280856b`
        let hasPagination = false;
        let start = 0;

        while (true) {
            if (hasPagination) {
                variables = `variables=(count:10,numReplies:1,socialDetailUrn:urn%3Ali%3Afsd_socialDetail%3A%28urn%3Ali%3Aactivity%3A${postID}%2Curn%3Ali%3Aactivity%3A${postID}%2Curn%3Ali%3AhighlightedReply%3A-%29,sortOrder:REVERSE_CHRONOLOGICAL,start:${start})&queryId=voyagerSocialDashComments.c8848fd440e02d7ae3d4c5e06280856b`;
            }

            const url = `https://www.linkedin.com/voyager/api/graphql?${variables}`;

            const response = await utils.makeGetRequest(url, headers);

            if (!response) {
                // TODO: Send an emergency notification to the Developer & Client
                logger.log(1, "No response from LinkedIn for comments request");
                return;
            }

            const commentsAnalytics = response.data.data.data.socialDashCommentsBySocialDetail
            const paging = commentsAnalytics.paging;
            const commentsList = response.data.included;

            if (paging.total > 10) {
                hasPagination = true;
            }

            for (let i = 0; i < commentsList.length; i++) {
                const comment = commentsList[i]

                if (Object.keys(comment).includes("commentary")) {
                    if (!comment.commenter.author) {
                        await utils.checkDatabaseConnection();

                        const personData = await Person.find({ person_urn: comment.commenter.actor["*profileUrn"], uuid: data.uuid }).exec();

                        if (personData.length == 0) {

                            const firstName = comment.commenter.title.text.split(" ")[0]
                            const lastName = comment.commenter.title.text.split(" ").slice(1).join(' ');
                            const jobTitle = await getJobTitle(comment.commenter.actor["*profileUrn"].split(":")[-1], data);

                            const newPerson = new Person({
                                uuid: data.uuid,
                                urn: data.urn,
                                person_urn: comment.commenter.actor["*profileUrn"],
                                first_name: firstName,
                                last_name: lastName,
                                profile_url: comment.commenter.navigationUrl,
                                profile_headline: comment.commenter.subtitle,
                                job_title: jobTitle,
                                reactions_count: 0,
                                comments_count: 1,
                                profile_view_count: 0,
                                score: 1
                            });

                            await newPerson.save();
                        } else {
                            await Person.updateOne({ person_urn: comment.commenter.actor["*profileUrn"], uuid: data.uuid }, {
                                comments_count: personData[0].comments_count + 1,
                                score: personData[0].score + 1
                            }).exec();
                        }
                    }
                }
            }

            if (start >= paging.total) break;
            start += 10;
        }

    } catch (error) {
        console.trace(error);
        logger.log(0, error);
    };
};

async function getReactions(data, postID) {
    try {
        const headers = {
            "accept": "application/vnd.linkedin.normalized+json+2.1",
            "accept-language": "en-US,en;q=0.9",
            "csrf-token": data.jsession_id,
            "sec-ch-ua-mobile": "?0",
            "sec-fetch-dest": "empty",
            "sec-fetch-mode": "cors",
            "sec-fetch-site": "same-origin",
            "x-li-lang": "en_US",
            "x-li-page-instance": "urn:li:page:d_flagship3_detail_base;1E7brz1+RyGqOmx/Xv/YYA==",
            "x-restli-protocol-version": "2.0.0",
            "cookie": `li_at=${data.li_at}; JSESSIONID=\"${data.jsession_id}\"`,
            "Referer": `https://www.linkedin.com/feed/update/urn:li:activity:${postID}/`,
            "Referrer-Policy": "strict-origin-when-cross-origin"
        }

        let variables = `variables=(count:10,start:0,threadUrn:urn%3Ali%3Aactivity%3A${postID})&queryId=voyagerSocialDashReactions.56bde53f0c6873eb4870f5a25da96573`
        let hasPagination = false;
        let start = 0;

        while (true) {
            if (hasPagination) {
                variables = `variables=(count:10,start:${start},threadUrn:urn%3Ali%3Aactivity%3A${postID})&queryId=voyagerSocialDashReactions.56bde53f0c6873eb4870f5a25da96573`;
            }

            const url = `https://www.linkedin.com/voyager/api/graphql?${variables}`;

            const response = await utils.makeGetRequest(url, headers);

            if (!response) {
                // TODO: Send an emergency notification to the Developer & Client
                logger.log(1, "No response from linkedin api for reactions request");
                return;
            }

            const reactionsAnalytics = response.data.data.data.socialDashReactionsByReactionType;
            const paging = reactionsAnalytics.paging;
            const reactionsList = response.data.included;

            if (paging.total > 10) {
                hasPagination = true;
            }

            for (let i = 0; i < reactionsList.length; i++) {
                const reaction = reactionsList[i];

                if (Object.keys(reaction).includes("actorUrn")) {

                    await utils.checkDatabaseConnection();

                    const personData = await Person.find({ person_urn: reaction.actorUrn, uuid: data.uuid }).exec();

                    if (personData.length == 0) {

                        const firstName = reaction.reactorLockup.title.text.split(" ")[0]
                        const lastName = reaction.reactorLockup.title.text.split(" ").slice(1).join(' ');
                        const jobTitle = await getJobTitle(reaction.actorUrn.split(":")[-1], data);

                        const newPerson = new Person({
                            uuid: data.uuid,
                            urn: data.urn,
                            person_urn: reaction.actorUrn,
                            first_name: firstName,
                            last_name: lastName,
                            profile_url: reaction.reactorLockup.navigationUrl,
                            profile_headline: reaction.reactorLockup.subtitle.text,
                            job_title: jobTitle,
                            reactions_count: 1,
                            comments_count: 0,
                            profile_view_count: 0,
                            score: 1
                        });

                        await newPerson.save();
                    } else {
                        await Person.updateOne({ person_urn: reaction.actorUrn, uuid: data.uuid }, {
                            reactions_count: personData[0].reactions_count + 1,
                            score: personData[0].score + 1
                        }).exec();
                    }
                }

                if (start >= paging.total) break;
                start += 10;
            }
        }
    } catch (error) {
        console.trace(error);
        logger.log(0, error);
    }
}

async function cron(data) {
    try {

        const postsIDs = await getRecentEngagements(data);

        for (let i = 0; i < postsIDs.length; i++) {
            const postID = postsIDs[i];
            await getComments(data, postID);
            await getReactions(data, postID);
        }

        await updateCookie(data.uuid, { running: "NO" });


    } catch (error) {
        console.trace(error);
        logger.log(0, error);
    };
};

async function sendDataToCustomer(customer) {
    try {
        logger.log(2, `Sending the data CSV file to customer: ${customer.name} - ${customer.email}`);
        await utils.checkDatabaseConnection();

        const persons = await Person.find({ uuid: customer.uuid, urn: customer.urn }).exec();

        if (!persons || persons.length == 0) {
            return
        }

        let csvData = [];

        for (let x = 0; x < persons.length; x++) {
            const person = persons[x];

            csvData.push(
                {
                    "First Name": person.first_name,
                    "Last Name": person.last_name,
                    "Profile Url": person.profile_url,
                    "Profile Headline": person.profile_headline,
                    "Job Title": person.job_title,
                    "Comments Count": person.comments_count,
                    "Reactions Count": person.reactions_count,
                    "Profile View Count": person.profile_view_count,
                    "Score": person.score
                }
            )
        }

        const csvWriter = createCsvWriter({
            path: `./csv_files/${customer.uuid}.csv`,
            header: [
                { id: 'First Name', title: 'First Name' },
                { id: 'Last Name', title: 'Last Name' },
                { id: 'Profile Url', title: 'Profile Url' },
                { id: 'Profile Headline', title: 'Profile Headline' },
                { id: 'Job Title', title: 'Job Title' },
                { id: 'Comments Count"', title: 'Comments Count"' },
                { id: 'Reactions Count', title: 'Reactions Count' },
                { id: 'Profile View Count', title: 'Profile View Count' },
                { id: 'Score', title: 'Score' }
            ]
        });

        csvData = csvData.sort(function (a, b) { return a["Score"] - b["Score"] }).reverse() // Sort by score in descending order
        await csvWriter.writeRecords(csvData);

        // Send email with CSV attachment
        const mailOptions = {
            from: 'sajawalfareedi448@gmail.com',
            to: customer.email,
            subject: 'Weekly LinkedIn HotLeads Data Extraction Report',
            text: 'The CSV file with the data is attached.',
            attachments: [
                {
                    filename: 'linkedin_hotleads_data.csv',
                    path: `./csv_files/${customer.uuid}.csv`
                }
            ]
        };

        // TODO: Handle the error properly
        transporter.sendMail(mailOptions, async function (error, info) {
            if (error) {
                logger.log(0, `Error occured while trying to send the Email to customer: ${customer.uuid}`)
                console.trace(error);
                logger.log(0, error);
            } else {
                console.log();
                logger.log(2, `Sent the data CSV file to customer: ${customer.uuid}`);
                unlinkSync(`./csv_files/${customer.uuid}.csv`);
                await Person.deleteMany({ uuid: customer.uuid, urn: customer.urn }).exec();
            }
        });

    } catch (error) {
        console.trace(error);
        logger.log(0, error);
    }
};

async function profileViewCron(data, isLastProfile) {
    try {
        if (data.isPremium == "NO") {
            await getFreeViewersData(data);
        } else {
            await getPremiumViewersData(data);
        }

        if (isLastProfile) {
            PROFILE_CRON_RUNNING = 0;
        }

    } catch (error) {
        console.trace(error);
        logger.log(0, error);
    };
};

async function checkForFinishedCrons() {
    try {
        logger.log(2, "Starting the Finished Crons Checking Process...");

        while (true) {
            const cookies = await getAllUpdatedCookies("NO");

            for (let i = 0; i < cookies.length; i++) {
                const cookie = cookies[i];
                const customer = await Customer.findOne({ uuid: cookie.uuid, urn: cookie.urn }).exec();
                await sendDataToCustomer(customer);
                await Customer.updateOne({ uuid: cookie.uuid, urn: cookie.urn }, { last_ran: moment.utc().format() }).exec();
            }

            await sleep(30 * 60);  // Wait for 10 minutes before checking again

        }

    } catch (error) {
        console.trace(error);
        logger.log(0, error);
    };
};

// TODO: Don't repeat the same code...
// TODO: try to use customer's timezone
//! TODO: Fix all of the timing for cron - CRITICAL - DONE
// TODO: Use ENV file for storing credentials
//! TODO: Update Cookie status after it's finished - CRITICAL - DONE

async function main() {
    try {

        if (CRON_STATUS === 1) { return }; // Avoid multiple execution of the script at the same time
        CRON_STATUS = 1;

        logger.log(2, "Cron is Up & Running!");

        while (true) {

            if (moment.utc().hour() == 0 && moment.utc().minutes() <= 5 && PROFILE_CRON_RUNNING == 0) {
                logger.log(2, "Checking MongoDB Connection...");
                const dbStatus = await utils.checkDatabaseConnection();
                if (dbStatus == "failure") { continue };

                logger.log(2, "Starting the Profile View Scraping Process...");
                const cookies = await getAllUpdatedCookies("NO");

                PROFILE_CRON_RUNNING = 1;

                for (let i = 0; i < cookies.length; i++) {
                    const isLastProfile = i >= (cookies.length - 1);
                    profileViewCron(cookies[i], isLastProfile);
                };
            };

            if (moment.utc().day() == 7 && moment.utc().hour() == 0 && MAIN_CRON_RUNNING == 0) {
                try {
                    logger.log(2, "Checking MongoDB Connection...")
                    const dbStatus = await utils.checkDatabaseConnection();
                    if (dbStatus == "failure") { continue };

                    logger.log(2, "Starting the Interaction Scraping Process...")
                    const cookies = await getAllUpdatedCookies("NO");

                    if (cookies.length > 0) {
                        MAIN_CRON_RUNNING = 1;

                        for (let i = 0; i < cookies.length; i++) {

                            if (cookies[i].running === "NO") {
                                cron(cookies[i]);
                            }

                            await updateCookie(cookies[i].uuid, { running: "YES" });

                        };

                        checkForFinishedCrons();
                    } else {
                        MAIN_CRON_RUNNING = 0;
                    }
                    
                } catch (error) {
                    console.trace(error);
                    logger.log(0, error);
                    MAIN_CRON_RUNNING = 0;
                };
            };

            await sleep(5 * 60); // Check after every 5 minutes
        }

    } catch (error) {
        console.trace(error);
        logger.log(0, error);
        CRON_STATUS = 0;
    };
};


module.exports = main;
