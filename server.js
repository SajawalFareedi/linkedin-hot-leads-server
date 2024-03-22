require("dotenv").config();

const express = require("express");
const utils = require('./utils');
const logger = require("./logger");
const cors = require("cors");
const { v4: uuidv4 } = require('uuid');
const bcrypt = require("bcrypt");
const moment = require("moment");
const nodemailer = require("nodemailer");
const { unlinkSync, open, close } = require("fs");
const { PrismaClient } = require('@prisma/client');
const Stripe = require("stripe").default;

const stripe = new Stripe(process.env.STRIPE_API_KEY);
const prisma = new PrismaClient({ log: ["info", "warn", "error"] });
const app = express();
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.MAIL_USER,
        pass: process.env.MAIL_PASS
    }
});

// const transporter = nodemailer.createTransport({
//     host: 'mail.floppyapp.io',
//     port: 465,
//     secure: true,
//     auth: {
//         user: process.env.MAIL_USER // 'bot@floppyapp.io',
//         pass: process.env.MAIL_PASS // 'password'
//     }
// });

const PORT = process.env.PORT || 3000;

// let RUNNING = 0; if (RUNNING === 0) { utils.keepTheServerRunning(); RUNNING = 1; };

app.set("view engine", "ejs");

app.use(express.static(__dirname + "/public"));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));
app.use(cors());

app.get("/", (req, res) => {
    res.render("index", { app_price: 30 });
});

app.post("/", (req, res) => {
    logger.log(2, `New Cookies received: ${req.body.url}, ${req.body.email}`);
    utils.handleCookies(req.body);
    res.json("Data recieved successfully!");

});

app.get("/get-app", (req, res) => {
    res.render("payment", { serverUrl: process.env.BACKEND_URL });
});

app.get("/success", async (req, res) => {

    if (!req.query.session_id) {
        res.send({ message: "No Session Id Provided" });
        return;
    };

    let email = "";
    const session = await stripe.checkout.sessions.retrieve(req.query.session_id);

    if (typeof session.customer !== "string") {
        email = session.customer.email;
    } else {
        const customer = await stripe.customers.retrieve(session.customer);
        email = customer.email;
    };

    const customerExists = await prisma.api.findFirst({ where: { email: email } });

    if (customerExists) {
        res.render("success", { api_key: customerExists.api_key });
    } else {
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
            from: 'Floppy App <sajawalfareedi448@gmail.com>',
            to: email,
            subject: 'Your Floppy App License Key',
            text: `Thanks for buying Floppy App! Here's your License Key: ${hashedToken.substring(10, 45) }`,
        };

        // TODO: Handle the error properly
        transporter.sendMail(mailOptions, async function (error, info) {
            if (error) {
                logger.log(0, `Error occured while trying to send the API Key Email to customer: ${email}`)
                console.trace(error);
                logger.log(0, error);
            }
        });

        res.render("success", { api_key: hashedToken.substring(10, 45) });
    }
});

app.post("/create-checkout-session", async (req, res) => {
    try {
        const customerExists = await prisma.api.findFirst({ where: { email: req.body.customerEmail } });

        if (customerExists) {
            res.send({ message: "already exists" });
        } else {
            const customer = await stripe.customers.create({
                email: req.body.customerEmail
            });

            const session = await stripe.checkout.sessions.create({
                customer: customer.id,
                payment_method_types: ["card"],
                mode: "subscription",
                line_items: [{
                    price: "price_1OvbwCICmfhOJ5j2i47ggBOS",
                    quantity: 1
                }],
                success_url: `${process.env.BACKEND_URL}/success?session_id={CHECKOUT_SESSION_ID}`,
                cancel_url: `${process.env.BACKEND_URL}/`
            });

            res.send({ id: session.id, url: session.url });
        }
    } catch (error) {
        console.trace(error);
        logger.log(0, error);
        res.status(500).send({ message: "Error creating checkout session." });
    };
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
