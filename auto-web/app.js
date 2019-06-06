const chromium = require('chrome-aws-lambda');

exports.lambdaHandler = async (event, context) => {
    try {

        const browser = await chromium.puppeteer.launch({
            args: chromium.args,
            defaultViewport: chromium.defaultViewport,
            executablePath: await chromium.executablePath,
            headless: chromium.headless,
          });
        
        const page = await browser.newPage();
        //await page.goto("https://www.fieldglass.net",{waitUntil:'networkidle2'});
        await page.goto("https://www.example.com");

        //console.log("content:"+(await resp.text()));
        
        //await page.evaluate(()=>console.log(document.querySelector('input')));
        await page.setViewport({ width: 1920, height: 1001 })
        let s = await page.waitForXPath('/html/body/div/p[2]/a');
        console.log((await page.content()));
        /*await page.click('#usernameId_new');

        //await page.waitForSelector('#usernameId_new');
        await page.click('#usernameId_new');
        await page.type('#usernameId_new', userName);

        //await page.waitForSelector('form > #content_area_new > #primary_content #passwordId_new')
        await page.click('form > #content_area_new > #primary_content #passwordId_new')
        await page.type('form > #content_area_new > #primary_content #passwordId_new', passWord);

        //await page.waitForSelector('form > #content_area_new > #primary_content > .entryLoginInput_button > .formLoginButton_new')
        await page.click('form > #content_area_new > #primary_content > .entryLoginInput_button > .formLoginButton_new')

        //await page.waitForSelector('#menuBarId > #viewMenuTitle > figure > a > .anchorText')
        await page.click('#menuBarId > #viewMenuTitle > figure > a > .anchorText')

        //await page.waitForSelector('.column #viewMenu_3_timeSheets_link')
        await page.click('.column #viewMenu_3_timeSheets_link')

        //await browser.close()*/

    } catch (err) {
        console.log(err);
        return err;
    } finally {
        /*if (page) {
            await page.close();
        }

        if (browser) {
            await browser.disconnect();
        }

        if (slsChrome) {
            await slsChrome.kill();
        }*/
    }
};