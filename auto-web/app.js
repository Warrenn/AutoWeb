const chromium = require('chrome-aws-lambda')
const AWS = require('aws-sdk')
const client = new AWS.SecretsManager({ region: 'eu-west-1' })

let browser = null
let page = null

function getSecret(secretId) {
    return new Promise((resolve, reject) => {
        client.getSecretValue({ SecretId: secretId }, (err, data) => {
            if (err) {
                reject(err)
                return
            }
            try {
                let result = JSON.parse(data.SecretString);
                resolve(result)
            } catch (e) {
                reject(e)
            }
        })
    })
};

exports.lambdaHandler = async(event, context) => {
    try {
        const autowebsecrets = await getSecret('autowebsecrets')
        const username = autowebsecrets.username
        const password = autowebsecrets.password

        if (process.env.Mocha) {
            browser = await chromium.puppeteer.launch({
                headless: false,
                executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
            })
        } else {
            browser = await chromium.puppeteer.launch({
                args: chromium.args,
                defaultViewport: chromium.defaultViewport,
                executablePath: await chromium.executablePath,
                headless: chromium.headless
            })
        }

        page = await browser.newPage()
        let navigation = page.waitForNavigation()
        await page.goto("https://www.fieldglass.net/login.do", { waitUntil: 'networkidle2' })
        await page.setViewport({ width: 1024, height: 768 })
        await navigation

        await page.waitForSelector('#usernameId_new')
        await page.type('#usernameId_new', username)

        await page.waitForSelector('#passwordId_new')
        await page.type('#passwordId_new', password)

        page.click('#primary_content > div.entryLoginInput_button > button')
        await page.waitForNavigation({ waitUntil: 'networkidle0' })

        let welcometag = null
        try {
            welcometag = await page.$eval('#helpWelcome_new', e => e.innerHTML === 'Your password has expired.' ? e : null)
        } catch (e) {
            welcometag = null
        }

        if (welcometag) throw "Your password has expired."

        while (true) {
            let links = await page.$$('[id^="ts_"]')
            if (links.length <= 0) return { message: 'all time sheets done' };
            await links[0].click();
            await page.waitForNavigation({ waitUntil: 'networkidle0' })

            let typeInBoxes = async(selctor, amnt) => {
                let recurse = await page.$$(selctor)
                for (let r of recurse) {
                    await r.click({ clickCount: 3 })
                    if (amnt == null) await page.keyboard.press('Backspace')
                    else await r.type(amnt)
                }
            }

            await page.waitForSelector('.hoursWorked > td.nonWorkingDay > input.min, .hoursWorked > td.nonWorkingDay > input.hour')
            await typeInBoxes('.hoursWorked > td.nonWorkingDay > input.min, .hoursWorked > td.nonWorkingDay > input.hour')

            const totalMinutes = 1440
            let hours = await page.$$('.hoursWorked > td:not(.nonWorkingDay) > input.hour')
            let days = hours.length
            let hourInDay = (totalMinutes / days) / 60
            let minInDay = (totalMinutes / days) % 60

            await typeInBoxes('.hoursWorked > td:not(.nonWorkingDay) > input.hour')
            await typeInBoxes('.hoursWorked > td:not(.nonWorkingDay) > input.min')
            await typeInBoxes('.hoursWorked > td:not(.nonWorkingDay) > input.hour', `${hourInDay}`)
            await typeInBoxes('.hoursWorked > td:not(.nonWorkingDay) > input.min', `${minInDay}`)

            await page.click("input[selenium-id='btn_WEB_INF_pages_worker_rate_schedule_time_sheet_form_0_0_Continue']")

            if ((await page.$$('.errorrow')).length > 0) {
                await page.waitForSelector("input[selenium-id='btn_WEB_INF_pages_worker_rate_schedule_time_sheet_form_0_0_Continue']")
                await page.click("input[selenium-id='btn_WEB_INF_pages_worker_rate_schedule_time_sheet_form_0_0_Continue']")
            }

            await page.waitForSelector("input[selenium-id='btn_WEB_INF_pages_worker_rate_schedule_time_sheet_form_0_0_Submit']")
            await page.click("input[selenium-id='btn_WEB_INF_pages_worker_rate_schedule_time_sheet_form_0_0_Submit']")

            await page.waitForSelector('#update')
            await page.click('#update')

            await page.waitForSelector("#homeMenuTitle > figure > a[title='Home']")
            await page.click("#homeMenuTitle > figure > a[title='Home']")
            await page.waitForNavigation({ waitUntil: 'networkidle0' })
        }

    } catch (err) {
        console.log(err)
        return err
    } finally {
        if (page) {
            await page.close()
        }

        if (browser) {
            await browser.disconnect()
        }
    }
}