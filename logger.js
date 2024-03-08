const { writeFileSync } = require("fs");
const moment = require("moment");

const log = (level, message) => {
    if (level == 0) {
        writeFileSync("./logs/errors.log", `[${moment.utc().format()}] [ERROR] ${message}\n`, { flag: "a", encoding: "utf8" });
    } else if (level == 1) {
        console.log(`[${moment.utc().format()}] [WARNING] ${message}`);
        writeFileSync("./logs/warnings.log", `[${moment.utc().format()}] [WARNING] ${message}\n`, { flag: "a", encoding: "utf8" });
    } else {
        console.log(`[${moment.utc().format()}] [INFO] ${message}`);
        writeFileSync("./logs/info.log", `[${moment.utc().format()}] [INFO] ${message}\n`, { flag: "a", encoding: "utf8" });
    }
};

module.exports.log = log;