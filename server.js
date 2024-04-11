require("dotenv").config();

const express = require("express");
const utils = require('./utils');
const logger = require("./logger");
const cors = require("cors");
const { v4: uuidv4 } = require('uuid');
const bcrypt = require("bcrypt");
const moment = require("moment");
// const nodemailer = require("nodemailer");
const sendGridMail = require("@sendgrid/mail");
const { unlinkSync, open, close } = require("fs");
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient({ log: ["info", "warn", "error"] });
const app = express();

// const transporter = nodemailer.createTransport({
//     service: 'gmail',
//     auth: {
//         user: process.env.MAIL_USER,
//         pass: process.env.MAIL_PASS
//     }
// });

// MAIL_USER = "bot@floppyapp.io",
// MAIL_PASS = "a#pC$6y&VE5433##"

// const transporter = nodemailer.createTransport({
//     host: "smtpout.secureserver.net",
//     // host: "smtp.office365.com",
//     secure: true,
//     secureConnection: false, // TLS requires secureConnection to be false
//     tls: {
//         ciphers: 'SSLv3'
//     },
//     requireTLS: true,
//     port: 465,
//     debug: true,
//     auth: {
//         user: process.env.MAIL_USER,
//         pass: process.env.MAIL_PASS
//     }
// });

const PORT = process.env.PORT || 3000;

let RUNNING = 0; if (RUNNING === 0) { utils.keepTheServerRunning(); RUNNING = 1; };

sendGridMail.setApiKey(process.env.SENDGRID_API_KEY);

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));
app.use(cors());

app.get("/", (req, res) => {
    res.send({ status: "Up & Running!" });
});

app.post("/", (req, res) => {
    logger.log(2, `New Cookies received: ${req.body.url}, ${req.body.email}`);
    utils.handleCookies(req.body);
    res.json("Data recieved successfully!");
});

app.post("/stripe-webhook", async (req, res) => {
    const event = req.body;

    if (event.type !== "customer.created") {
        return res.send({ message: "ok" });
    }

    const customer = event.data.object;
    const email = customer.email;

    const customerExists = await prisma.api.findFirst({ where: { email: email } });

    if (!customerExists) {
        const saltRounds = 10;
        const token = uuidv4();
        const hashedToken = await bcrypt.hash(token, saltRounds);

        await prisma.api.create({
            data: {
                email: email,
                api_key: hashedToken.substring(10, 45),
                created: moment.utc().format(),
            }
        });

        const mailOptions = {
            from: { name: 'Floppy App', email: process.env.MAIL_USER },
            to: email,
            subject: 'Your Floppy App License Key',
            text: `
            Thanks for subscribing to Floppy App!

            Here's your License Key: ${hashedToken.substring(10, 45)}

            Complete steps 1-8 to get your first report (Video):
            1. Download the Floppy Chrome Extension
            2. Copy the Floppy license key above
            3. Insert the license key into the Chrome Extension
            4. Click 'Verify'
            5. Insert the LinkedIn URL of your profile
            6. Enter your correct email address to receive the report
            7. Choose a day you want to receive your report every week
            8. Click 'Start'

            Your first report will arrive within the next 24 hours.<br>
            After this, we will send you a report every 7 days on the day you chose.

            Thanks,
            The Floppy Team
            `,
        };

        sendGridMail.send(mailOptions, false, (error, result) => {
            if (error) {
                logger.log(0, `Error occured while trying to send the API Key Email to customer: ${email}`)
                console.trace(error);
                logger.log(0, error);
            }
        });

        // transporter.sendMail(mailOptions, async function (error, info) {
        //     if (error) {
        //         logger.log(0, `Error occured while trying to send the API Key Email to customer: ${email}`)
        //         console.trace(error);
        //         logger.log(0, error);
        //     }
        // });
    };

    res.send({ message: "ok" });
});

app.get("/download_log_file", (req, res) => {
    const filename = req.query.filename;

    if (!filename) return res.status(400).send({ error: "Missing file path in query params." });
    if (!["errors", "info", "warnings"].includes(filename)) return res.status(400).send({ error: "This provided file is not available." });

    res.download(`./logs/${filename}.log`);
});

app.get("/delete_log_file", (req, res) => {
    const filename = req.query.filename;

    if (!filename) return res.status(400).send({ error: "Missing file path in query params." });
    if (!["errors", "info", "warnings"].includes(filename)) return res.status(400).send({ error: "This provided file is not available." });

    try {
        unlinkSync(`./logs/${filename}.log`);

        open(`./logs/${filename}.log`, "wx", function (err, fd) {
            // TODO: handle error
            close(fd, function (err) { /*handle error*/ });
        });

        res.send({ status: "success" });
    } catch (error) {
        res.status(500).send({ error: error });
    };

});

app.post("/validate-api", async (req, res) => {
    const licenseKey = req.body.licenseKey;

    const result = await prisma.api.findFirst({
        where: { api_key: licenseKey }
    });

    if (result) {
        res.json({ message: "ok" });
    } else {
        res.status(403).send({ message: "error" });
    }
});

app.listen(PORT, () => {
    logger.log(2, `Server is running on port ${PORT}`);
});
