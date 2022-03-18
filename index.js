import 'dotenv/config';
import Web3 from 'web3';
import puppeteer from 'puppeteer';

const browserArgs = [
  '--autoplay-policy=user-gesture-required',
  '--disable-background-networking',
  '--disable-background-timer-throttling',
  '--disable-backgrounding-occluded-windows',
  '--disable-breakpad',
  '--disable-client-side-phishing-detection',
  '--disable-component-update',
  '--disable-default-apps',
  '--disable-dev-shm-usage',
  '--disable-domain-reliability',
  '--disable-extensions',
  '--disable-features=AudioServiceOutOfProcess',
  '--disable-hang-monitor',
  '--disable-ipc-flooding-protection',
  '--disable-notifications',
  '--disable-offer-store-unmasked-wallet-cards',
  '--disable-popup-blocking',
  '--disable-print-preview',
  '--disable-prompt-on-repost',
  '--disable-renderer-backgrounding',
  '--disable-setuid-sandbox',
  '--disable-speech-api',
  '--disable-sync',
  '--hide-scrollbars',
  '--ignore-gpu-blacklist',
  '--metrics-recording-only',
  '--mute-audio',
  '--no-default-browser-check',
  '--no-first-run',
  '--no-pings',
  '--no-sandbox',
  '--no-zygote',
  '--password-store=basic',
  '--use-gl=swiftshader',
  '--use-mock-keychain',
];

// TODO:
// 1. Make browser instance single for all functions and create pages per function
function delay(time) {
  return new Promise(function(resolve) { 
    setTimeout(resolve, time)
  });
};

// fetching child wallets from parent wallet, keeping transaction hash to fetch block number
// block number will be used as a timestamp limit in the future functions
const fetchChildWallets = async (page, addr) => {
  let assembledWallets = [];
  // scrap wallets, only OUT txs are pushed to the array
  let pageLimit = 1;
  let currentPage = 0;
  while(currentPage < pageLimit) {
    const toGo = currentPage + 1;
    await page.goto(`https://bscscan.com/txs?a=${addr}&p=${(toGo)}`);
    await page.waitForSelector('#paywall_mask > table > tbody > tr:nth-child(1) > td:nth-child(2) > span > a');
    const pLimitPos = '#ctl00 > div.d-md-flex.justify-content-between.my-3 > ul > li:nth-child(3) > span > strong:nth-child(2)';
    pageLimit = await page.$eval(pLimitPos, ele => ele.innerHTML);
    try {
      for(let i = 1; i <= 50; i++) {
        const methodName = `#paywall_mask > table > tbody > tr:nth-child(1) > td.text-center > span`;
        const isOut = (await page.$eval(methodName, ele => ele.innerHTML)).toLowerCase() == 'out';
        if(isOut) {
          let toPeek = `#paywall_mask > table > tbody > tr:nth-child(${i}) > td:nth-child(9) > span > a`;
          const address = await page.$eval(toPeek, ele => {
            const href = ele.href.substring(ele.href.lastIndexOf('/') + 1);
            if(href == ele.innerHTML) return href;
            return null;
          });
          if(address) {
            toPeek = `#paywall_mask > table > tbody > tr:nth-child(${i}) > td:nth-child(2) > span > a`;
            const tx = await page.$eval(toPeek, ele => ele.innerHTML);
            toPeek = `#paywall_mask > table > tbody > tr:nth-child(${i}) > td.d-none.d-sm-table-cell > a`;
            const blockNumber = await page.$eval(toPeek, ele => ele.innerHTML);
            assembledWallets.push({
              tx,
              address,
              blockNumber
            });
          }
        }
      }
    } catch(err) {}
    await delay(750); // this delay is probably not needed
    currentPage = toGo;
  }
  return assembledWallets;
};

const fetchAllTransactionHashes = async (page, addrs) => {
  let assembledTxs = [];
  for(let i = 0; i < addrs.length; i++) {
    const { address, blockNumber } = addrs[i];
    // scrap transactions, collect FILTERed ones
    let pageLimit = 1;
    let currentPage = 0;
    let lastBlockNumber = Number.MAX_SAFE_INTEGER;
    try {
      while(currentPage < pageLimit && lastBlockNumber > blockNumber) {
        const toGo = currentPage + 1;
        await page.goto(`https://bscscan.com/txs?a=${address}&p=${(toGo)}`);
        await page.waitForSelector('#paywall_mask > table > tbody > tr:nth-child(1) > td:nth-child(2) > span > a');
        const pLimitPos = '#ctl00 > div.d-md-flex.justify-content-between.my-3 > ul > li:nth-child(3) > span > strong:nth-child(2)';
        pageLimit = await page.$eval(pLimitPos, ele => ele.innerHTML);
        try {
          for(let i = 1; i <= 50; i++) {
            let toPeek = `#paywall_mask > table > tbody > tr:nth-child(${i}) > td.text-center > span`;
            const isOut = (await page.$eval(toPeek, ele => ele.innerHTML)).toLowerCase() == 'out';
            toPeek = `#paywall_mask > table > tbody > tr:nth-child(${i}) > td:nth-child(2) > span > a`;
            const tx = await page.$eval(toPeek, ele => ele.innerHTML);
            toPeek = `#paywall_mask > table > tbody > tr:nth-child(${i}) > td.d-none.d-sm-table-cell > a`;
            lastBlockNumber = await page.$eval(toPeek, ele => ele.innerHTML);
            if(lastBlockNumber > blockNumber) console.log(tx); else console.log('block number too low');
            if(lastBlockNumber > blockNumber) assembledTxs.push({
              tx,
              isOut,
              blockNumber: lastBlockNumber
            });
          }
        } catch(err) {
          console.log(err);
        }
        await delay(800); // this delay is probably not needed
        currentPage = toGo;
      }
    } catch(e) {
      console.log(e);
    }
  }
  return assembledTxs;
};

// probably deprecated function as bscscan is providing us with block numbers now
// const fetchBlockNumber = async (data) => {
//   const web3 = new Web3(process.env.WEB3_PROVIDER);
//   return await data.map(async entry => {
//     const log = await web3.eth.getTransaction(entry.tx);
//     return {
//       blockNumber: log.blockNumber,
//       ...entry
//     };
//   });
// };

const listenToTxs = (addr) => {
  const web3 = new Web3(process.env.WEB3_PROVIDER);

};

(async () => {
  const browser = await puppeteer.launch({ headless: false, defaultViewport: null, args: browserArgs });
  let page = await browser.newPage();
  await page.setViewport({
    width: 1920,
    height: 1080
  });
  const walletsFresh = await fetchChildWallets(page, process.env.ADDRESS);
  const transactions = await fetchAllTransactionHashes(page, walletsFresh);
  await page.close();
  await browser.close();
  console.log(transactions);
  // const walletsWithBlocks = await fetchBlockNumber(walletsFresh);
  // const transactions = await fetchAllTransactionHashes(walletsWithBlocks);
  // const transactionsWithData = await listenToTxs(transactions);
})();