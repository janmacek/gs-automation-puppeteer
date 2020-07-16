/**
 * Responds to any HTTP request by one tun of automation of all challenges.
 *
 * @param {!express:Request} req HTTP request context.
 * @param {!express:Response} res HTTP response context.
 */
exports.gsAutomation = (req, res) => {
    const puppeteer = require('puppeteer');
    const assert = require('assert');

    const config = {
        'URL_LOGIN_PAGE': 'https://gurushots.com/',

        'XPATH_LOGIN_SIGN_IN_BUTTON': '//header[@id="header"]//div[contains(@class, "gs-container")]//div[contains(@class, "user")]/a[contains(@class, "signin")]',
        'XPATH_LOGIN_NAME_INPUT': '//div[contains(@class, "modal-login__input")]/input[contains(@name, "email")]',
        'XPATH_LOGIN_PASSWORD_INPUT': '//div[contains(@class, "modal-login__input")]/input[contains(@name, "password")]',
        'XPATH_LOGIN_SUBMIT_BUTTON': '//button[contains(@class, "modal-login__submit")]',
        'XPATH_CHALLENGES_ITEM_DIV': '//div[contains(@class, "my-challenges__items")]/div[contains(@class, "challenges__item")]',
        'XPATH_CHALLENGES_VOTE_BUTTON': '//div[contains(@class, "my-challenges__items")]/div[contains(@class, "challenges__item")][.//div[contains(text(), "#CHALLENGE_NAME")]]//div[contains(@class, "c-challenges-item__btn")]/i[contains(@class, "icon-voting")]/..',
        'XPATH_CHALLENGES_EXPOSURE_METER_DIV': '//div[contains(@class, "my-challenges__items")]/div[contains(@class, "challenges__item")][.//div[contains(text(), "#CHALLENGE_NAME")]]//div[contains(@class, "c-challenges-item__exposure__meter__arrow")]',
        'XPATH_CHALLENGES_ENTER_VOTING_BUTTON': '//div[contains(@class, "gs-btn--blue") and text()="LET\'S GO"]',
        'XPATH_CHALLENGE_NAME_DIV': './/div[contains(@class, "c-challenges-item__title__label")]',
        'XPATH_CHALLENGE_PHOTO_DIV': '//div[contains(@class, "modal-vote__photo__vote")]',
        'XPATH_CHALLENGE_SUBMIT_VOTES_DIV': '//div[contains(@class, "modal-vote__photos__actions")]/div[contains(@class, "modal-vote__submit on")]',
        'XPATH_CHALLENGE_DONE_DIV': '//div[contains(@class, "modal-vote__message-wrap")]//div[contains(@class, "actions")]//div[contains(text(), "Done")]',
        'XPATH_END_OF_CHALLENGE_NEXT_DIV': '//md-dialog-actions/div[contains(@class, "c-modal-broadcast--closed__next")]',
        'XPATH_END_OF_CHALLENGE_CLOSE_DIV': '//div/md-dialog/div[contains(@class, "c-modal-broadcast--closed__close-btn")]',

        'AMOUNT_PHOTOS_TO_VOTE': 20,
        'WINDOW_WIDTH': 1400,
        'WINDOW_HEIGHT': 800,
        'CHROME_HEADER_HEIGHT': 100,

        'MAX_EXPOSURE': 90,
        'EXPOSURE_METER_REGEX': /matrix\([^,]+,[^,]+,([^,]+),[^,]+,[^,]+,[^,]+\)/g
    };

    const paramPuppeteer = {
        args: [
            '--incognito',
            '--no-sandbox',
            '--ignore-certificate-errors',
            `--window-size=${config.WINDOW_WIDTH},${config.WINDOW_HEIGHT + config.CHROME_HEADER_HEIGHT}`,
        ],
        headless: false,
    };

    /**
     * Main function to run automation of GS web page. It process login page of web page and then go through all
     * challenges and there clicks on photos to "like" them. This is how challenge exposure is kept at
     * the highest level.
     */
    async function main() {
        assert(req.query.loginName && req.query.loginPwd, 'Login name and password for GS webpage are mandatory.')
        return puppeteer
            .launch(paramPuppeteer)
            .then(async (browser) => {
                const page = await browser.newPage();
                await processLoginPage(page);
                await processMainPage(page);
                await browser.close()
            });
    }

    /**
     * Processes main GS page where all challenges are listed. It goes one by one and push challenges to max
     * exposure by liking photos from each.
     *
     * @param page  Object of currently initialized page.
     */
    async function processMainPage(page) {
        try {
            await cancelEndOfChallengePopup(page)
            await page.waitForXPath(config.XPATH_CHALLENGE_NAME_DIV)
            let challenges = await page.$x(config.XPATH_CHALLENGE_NAME_DIV)
            for (const challenge of challenges) {
                try {
                    await delay(5000)
                    const challenge_name = await page.evaluate(element => element.textContent, challenge);
                    while (true) {
                        try {
                            const challenge_exposure_meter = await page.$x(config.XPATH_CHALLENGES_EXPOSURE_METER_DIV
                                .replace('#CHALLENGE_NAME', challenge_name))
                            const challenge_exposure = await page.evaluate(
                                element => window.getComputedStyle(element).transform, challenge_exposure_meter[0]
                            );
                            let angle = Math.round(Math.asin(challenge_exposure.split(',')[1]) * (180 / Math.PI));
                            console.log(`Exposure of challenge '${challenge_name}' is ${angle}.`)
                            if (angle >= config.MAX_EXPOSURE) {
                                console.log(`As exposure cannot be higher, processing of this challenge is done.`)
                                break;
                            }
                        } catch (e) {
                            console.warn(`Unable to proceed with challenge '${challenge_name}'.`);
                            break;
                        }
                        await elClick(page, config.XPATH_CHALLENGES_VOTE_BUTTON
                            .replace('#CHALLENGE_NAME', challenge_name));
                        await page.waitForXPath(config.XPATH_CHALLENGES_ENTER_VOTING_BUTTON);
                        await elClick(page, config.XPATH_CHALLENGES_ENTER_VOTING_BUTTON);
                        const photo_count = await page.$x(config.XPATH_CHALLENGE_PHOTO_DIV).length;
                        let position = 1;
                        for (let i = 0; i < config.AMOUNT_PHOTOS_TO_VOTE; i++) {
                            if (photo_count < position) {
                                break;
                            }
                            await elClick(
                                page, '(' + config.XPATH_CHALLENGE_PHOTO_DIV + ')[position()=' + position + ']'
                            );
                            position += Math.floor(Math.random() * 5) + 1;
                            await delay(500);
                        }
                        await elClick(page, config.XPATH_CHALLENGE_SUBMIT_VOTES_DIV);
                        await elClick(page, config.XPATH_CHALLENGE_DONE_DIV);
                        await delay(1000);
                    }
                } catch (e) {
                    console.warn(`An error occurred. Processing of current challenge is stopped: '${e}'`);
                }
            }

            console.log('All challenges were processed.')
        } catch (e) {
            return new Promise((_, reject) => reject(e))
        }
        return new Promise((resolve, _) => resolve())
    }

    /**
     * Processes login GS page by filling login name and password to inputs and submitting the form.
     *
     * @param page  Object of currently initialized page.
     */
    async function processLoginPage(page) {
        try {
            await page.setViewport({width: config.WINDOW_WIDTH, height: config.WINDOW_HEIGHT});
            await page.goto(config.URL_LOGIN_PAGE);
            await elClick(page, config.XPATH_LOGIN_SIGN_IN_BUTTON);
            await delay(2000);
            await elFill(page, config.XPATH_LOGIN_NAME_INPUT, req.query.loginName);
            await elFill(page, config.XPATH_LOGIN_PASSWORD_INPUT, req.query.loginPwd);
            await elClick(page, config.XPATH_LOGIN_SUBMIT_BUTTON);
            console.log('Login page successfully processed.')
        } catch (e) {
            return new Promise((_, reject) => reject(e))
        }
        return new Promise((resolve, _) => resolve())
    }

    /**
     * Cancels 'end of challenge' popup window that blocks successful proceeding to challenge.
     *
     * @param page  Object of currently initialized page.
     */
    async function cancelEndOfChallengePopup(page) {
        try {
            await elClick(page, config.XPATH_END_OF_CHALLENGE_NEXT_DIV);
            await elClick(page, config.XPATH_END_OF_CHALLENGE_CLOSE_DIV);
        } catch (_) {}
        return new Promise((resolve, _) => resolve())
    }

    /**
     * Fills elements with value.
     *
     * @param page  Object of currently initialized page.
     * @param xpath Xpath of the element.
     * @param value Value to be filled into element.
     */
    async function elFill(page, xpath, value) {
        try {
            await page.waitForXPath(xpath)
            const elements = await page.$x(xpath)
            await elements[0].focus()
            await elements[0].type(value)
        } catch (e) {
            return new Promise((_, reject) => reject(e))
        }
        return new Promise((resolve, _) => resolve())
    }

    /**
     * Click on the element.
     *
     * @param page  Object of currently initialized page.
     * @param xpath Xpath of the element.
     */
    async function elClick(page, xpath) {
        try {
            await page.waitForXPath(xpath, {'timeout': 5000})
            const elements = await page.$x(xpath)
            await elements[0].click()
        } catch (e) {
            return new Promise((_, reject) => reject(e))
        }
        return new Promise((resolve, _) => resolve())
    }

    /**
     * Sleeps for a specified amount of milliseconds.
     *
     * @param milliseconds Amount of milliseconds.
     */
    function delay(milliseconds) {
        return new Promise(resolve => setTimeout(resolve, milliseconds));
    }

    main().then(_ => {
        res.status(200).send('OK: Automation finished successfully');
    }).catch(err => {
        console.error(err);
        res.status(500).send('ERROR: Automation was interrupted -> ' + err);
    });
};