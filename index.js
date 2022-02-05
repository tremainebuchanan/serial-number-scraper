const puppeteer = require('puppeteer');
const fs = require('fs');
const csv = require('csv-parser');
const writer = require('csv-writer').createObjectCsvWriter;
const csvWriter = writer({
    path: 'out.csv',
    header: [
        {id: 'serial', title: 'Serial'},
        {id: 'start', title: 'Start'},
        {id: 'expire', title: 'Expire'}
    ]
});

function readFile(){
    const serialNumbers = [];
    fs.createReadStream('input.csv')
    .pipe(csv())
    .on('data', function(row){
        serialNumbers.push(Object.values(row))
    }).on('end', function(){
        console.info('Reading input file complete.');
        scrapingDriver(serialNumbers);
    }).on('error', function(error){
        console.log(error);
    });
}

function scrapingDriver(data){
    console.log('Commencing scrape in 25 seconds..');
    let i = 0;
    const id = setInterval(() => {
        if(data[i] != null){
            console.log(`Executing scrape on serial number ${data[i]}`)
            let serial = data[i];
            scrape(serial[0])
        }else{
            console.log('Terminating scrape job.')
            clearInterval(id)
        }
        i++;
    }, 25000);
}


function scrape(serial){
    (async () => {
        const url = 'https://datacentersupport.lenovo.com/us/en/warrantylookup#/'
        const browser = await puppeteer.launch({headless: false, args: ["--disable-setuid-sandbox"]});
        const page = await browser.newPage();
        await page.goto(url);
        await page.waitForSelector('.button-placeholder__input')
        await page.click('input[type="text"].button-placeholder__input')
        await page.keyboard.type(serial)
        await page.keyboard.press('Enter')
        await page.waitForSelector('.chart-time-bucket')
        let start = await page.$("[class='chart-start']")
        let end = await page.$("[class='chart-expires']")
        await extractInfo(start, end,serial);
        await browser.close();
    })();
}

async function extractInfo(start, end, serial){
    const data = [];
    const datum = {
        serial: '',
        start: '',
        expire: ''
    };
    const startDate = await (await start.getProperty('textContent')).jsonValue()
    const endDate = await (await end.getProperty('textContent')).jsonValue()
    datum.serial = serial;
    datum.start = startDate.substr(startDate.indexOf('start') + 'start'.length)
    datum.expire = endDate.substr(endDate.indexOf('Expiration') + 'expiration'.length)
    data.push(datum);
    csvWriter.writeRecords(data).then(() => console.log('Data written to output file successfully.'));
}

readFile()


