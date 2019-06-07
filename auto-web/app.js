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
        const fieldglass = await getSecret('autowebsecrets')
        const username = fieldglass.username
        const password = fieldglass.password

        browser = await chromium.puppeteer.launch({
            args: chromium.args,
            defaultViewport: chromium.defaultViewport,
            executablePath: await chromium.executablePath,
            headless: chromium.headless,
        })

        page = await browser.newPage()
        const navigationPromise = page.waitForNavigation()
        await page.goto("https://www.fieldglass.net", { waitUntil: 'networkidle2' })

        await page.setViewport({ width: 1920, height: 1001 })

        await page.waitForSelector('#usernameId_new')
        await page.click('#usernameId_new')
        await page.type('#usernameId_new', username)

        await page.waitForSelector('#passwordId_new')
        await page.click('#passwordId_new')
        await page.type('#passwordId_new', password)

        await page.waitForSelector('form > #content_area_new > #primary_content > .entryLoginInput_button > .formLoginButton_new')
        await page.click('form > #content_area_new > #primary_content > .entryLoginInput_button > .formLoginButton_new')

        await navigationPromise

        const footerleft = await page.waitForSelector('#disclaimer > div.footerLeft')
        const textContent = await (await footerleft.getProperty('textContent')).jsonValue()

        return textContent

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