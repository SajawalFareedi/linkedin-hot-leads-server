require("dotenv").config();

const axios = require("axios").default;
const logger = require("./logger");

const HEROKU_API_TOKEN = process.env.HEROKU_API_TOKEN;


const restartDynos = async () => {
    try {
        const response = await axios.request({
            url: `https://api.heroku.com/apps/floppy-app/dynos`,
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/vnd.heroku+json; version=3',
                'Authorization': `Bearer ${HEROKU_API_TOKEN}`
            }

        });

        logger.log(2, `[DYNOS_RESTART] ${response.status} ${JSON.stringify(response.data)}`);
    } catch (error) {
        logger.log(0, `[DYNOS_RESTART] ${error}`);
    }
};

(async () => {
    try {

        if (process.env.BACKEND_URL.indexOf("localhost") !== -1) {
            return;
        }

        const response = await axios.get(process.env.BACKEND_URL, {
            headers: {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
            }
        });

        if (response.status !== 200) {
            await restartDynos();
        }

    } catch (error) {
        logger.log(0, `[DYNOS_RESTART_MAIN] ${error}`);
    }
})();
