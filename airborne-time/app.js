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
        const airbornetimesecrets = await getSecret('airbornetimesecrets')
        const username = airbornetimesecrets.username
        const password = airbornetimesecrets.password

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
        await page.goto("https://bt.abg.co.za/Account/LogOn?ReturnUrl=%2F", { waitUntil: 'networkidle2' })
        await page.setViewport({ width: 1024, height: 768 })
        await navigation

        await page.waitForSelector('#UserName')
        await page.type('#UserName', username)

        await page.waitForSelector('#Password')
        await page.type('#Password', password)

        page.click('#LogOn_Login')
        await page.waitForNavigation({ waitUntil: 'networkidle0' })

        let barkSel = await page.waitForSelector('div[title="Barclays Africa Development Services 2017 - .Net Dev"] > input')
        let barcId = await (await barkSel.getProperty('id')).jsonValue();
        let barcRow = barcId.match(/TimeSheet_ProjectTasks_(\d+)__TaskID/)[1]

        await page.type(`#TimeSheet_ProjectTasks_${barcRow}__Days_0__CapturedTime`, '8')
        await page.type(`#TimeSheet_ProjectTasks_${barcRow}__Days_1__CapturedTime`, '8')
        await page.type(`#TimeSheet_ProjectTasks_${barcRow}__Days_2__CapturedTime`, '8')

        let leaveSel = await page.waitForSelector('div[title="Internal  - Study Leave"] > input')
        let leaveId = await (await leaveSel.getProperty('id')).jsonValue();
        let leaveRow = leaveId.match(/TimeSheet_ProjectTasks_(\d+)__TaskID/)[1]

        await page.type(`#TimeSheet_ProjectTasks_${leaveRow}__Days_3__CapturedTime`, '8')
        await page.type(`#TimeSheet_ProjectTasks_${leaveRow}__Days_4__CapturedTime`, '8')

        await page.click('#saveTime')
        await page.goto("https://bt.abg.co.za", { waitUntil: 'networkidle2' })

        await page.waitForSelector('input.subforappbutton.headerbutton-submit.buttons')
        await page.click('input.subforappbutton.headerbutton-submit.buttons')

        return { message: 'time submitted' }
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