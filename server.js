require("dotenv").config();

const express = require("express");
const utils = require('./utils');
const logger = require("./logger");
const cors = require("cors");
const { v4: uuidv4 } = require('uuid');
const bcrypt = require("bcrypt");
const moment = require("moment");
const sendGridMail = require("@sendgrid/mail");
const { unlinkSync, open, close } = require("fs");
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient({ log: ["info", "warn", "error"] });
const app = express();

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
    // logger.log(2, `New Cookies received: ${req.body.url}, ${req.body.email}`);
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
                uuid: "NO_UUID"
            }
        });

        const mailOptions = {
            from: { name: 'Floppy App', email: process.env.MAIL_USER },
            to: email,
            subject: 'Your Floppy App License Key',
            html: `<p>Thanks for subscribing to Floppy App!</p><p>Here's your License Key: <strong>${hashedToken.substring(10, 45)}</strong></p><p>Complete steps 1-8 to get your first report (<a href="https://www.loom.com/share/6a0a10a77c7b4055a9d77ebd9af87e87?sid=007079d6-28bf-4ba0-99c1-451f13c89d84" target="_blank">Video</a>):</p><ol><li><a href="https://chromewebstore.google.com/detail/floppy-app/noafdngnlnenmkkhnlfniekginoimlne" target="_blank">Download the Floppy Chrome Extension from here</a></li><li>Copy the Floppy license key above</li><li>Insert the license key into the Chrome Extension</li><li>Click 'Submit'</li><li>Insert the LinkedIn URL of your profile</li><li>Enter your correct email address to receive the report</li><li>Choose a day you want to receive your report every week</li><li>Click 'Submit'</li></ol><p>After this, we will send you a report every 7 days on the day you chose.</p><p>Thanks,<br>The Floppy Team</p>`
        };

        sendGridMail.send(mailOptions, false, (error, result) => {
            if (error) {
                logger.log(0, `Error occured while trying to send the API Key Email to customer: ${email}`)
                console.trace(error);
                logger.log(0, error);
            }
        });
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
    const licenseKey = req.body["licenseKey"]

    if (licenseKey) {
        const result = await prisma.api.findFirst({
            where: { api_key: licenseKey }
        });

        if (result) {
            res.json({ message: "ok" });
        } else {
            res.status(403).send({ message: "error" });
        }
    } else {
        res.status(403).send({ message: "error" });
    }

});

app.listen(PORT, () => {
    logger.log(2, `Server is running on port ${PORT}`);
});