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
            }
            catch (e) {
                reject(e)
            }
        })
    })
};

exports.lambdaHandler = async (event, context) => {
    try {
        const autowebsecrets = await getSecret('autowebsecrets')
        const username = autowebsecrets.username
        const password = autowebsecrets.password

        browser = await chromium.puppeteer.launch({
            args: chromium.args,
            defaultViewport: chromium.defaultViewport,
            executablePath: await chromium.executablePath,
            headless: chromium.headless,
        })

        page = await browser.newPage()
        const navigationPromise = page.waitForNavigation()
        await page.goto("https://www.example.com", { waitUntil: 'networkidle2' })

        await page.setViewport({ width: 1920, height: 1001 })

        await navigationPromise

        const footerleft = await page.waitForSelector('body > div > p:nth-child(2)')
        const textContent = await (await footerleft.getProperty('textContent')).jsonValue()

        return { username, password, textContent }

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