import 'dotenv/config';
import Web3 from 'web3';
import puppeteer from 'puppeteer';
import abiDecoder from 'abi-decoder';
import db from './models/index.cjs';

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

const delay = (time) => {
  return new Promise(function(resolve) { 
    setTimeout(resolve, time)
  });
};

// fetching child wallets from parent wallet, keeping transaction hash to fetch block number
// block number will be used as a timestamp limit in the future functions
const fetchChildWallets = async (page, addr, maxWallets) => {
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
              owner: addr,
              hash: tx,
              address,
              blockNumber
            });
            if(maxWallets != 0 && maxWallets <= assembledWallets.length) break;
          }
        }
      }
    } catch(err) {}
    await delay(750); // this delay is probably not needed
    currentPage = toGo;
    if(maxWallets != 0 && maxWallets <= assembledWallets.length) break;
  }
  return assembledWallets;
};

const filterTxs = async (txs) => {
  let limit = 0;
  for(let i = txs.length - 2; i >= 0; i--) {
    if(!txs[i].isOut) {
      limit = i;
      break;
    }
  }
  return txs.slice(limit + 1, txs.length - 1);
};

const fetchAllTransactionHashes = async (page, addrs) => {
  let assembledTxs = [];
  for(let i = 0; i < addrs.length; i++) {
    const { address, blockNumber, owner } = addrs[i];
    assembledTxs.push({});
    assembledTxs[assembledTxs.length - 1] = {
      address,
      transactions: []
    };
    // scrap transactions, collect FILTERed ones
    let pageLimit = 1;
    let currentPage = 0;
    try {
      while(currentPage < pageLimit) {
        const toGo = currentPage + 1;
        await page.goto(`https://bscscan.com/txs?a=${address}&p=${(toGo)}`);
        await page.waitForSelector('#paywall_mask > table > tbody > tr:nth-child(1) > td:nth-child(2) > span > a');
        try {
          for(let j = 50; j >= 1; j--) {
            let toPeek = `#paywall_mask > table > tbody > tr:nth-child(${j}) > td.text-center > span`;
            const isOut = (await page.$eval(toPeek, ele => ele.innerHTML)).toLowerCase() == 'out';
            toPeek = `#paywall_mask > table > tbody > tr:nth-child(${j}) > td:nth-child(2) > span > a`;
            const tx = await page.$eval(toPeek, ele => ele.innerHTML);
            toPeek = `#paywall_mask > table > tbody > tr:nth-child(${j}) > td.d-none.d-sm-table-cell > a`;
            const bNumber = await page.$eval(toPeek, ele => ele.innerHTML);
            toPeek = `#ctl00 > div.d-md-flex.justify-content-between.my-3 > ul > li:nth-child(3) > span > strong:nth-child(2)`;
            pageLimit = await page.$eval(toPeek, ele => ele.innerHTML);
            assembledTxs[assembledTxs.length - 1].transactions.push({
              hash: tx,
              isOut,
              blockNumber,
              parentWallet: owner
            });
            if(blockNumber == bNumber) {
              console.log('breaking out because we found initial deposit tx');
              pageLimit = -1;
              break;
            }
          }
        } catch(err) {
          console.log(err);
        }
        await delay(800); // this delay is probably not needed
        if(pageLimit < 0) break;
        currentPage = toGo;
      }
      if(assembledTxs[assembledTxs.length - 1].transactions[assembledTxs[assembledTxs.length - 1].transactions.length - 1].blockNumber == blockNumber) {
        console.log('time to clean up the txs and trim excessive ones');
        const filteredArray = await filterTxs(assembledTxs[assembledTxs.length - 1].transactions);
        assembledTxs[assembledTxs.length - 1].transactions = filteredArray;
      }
    } catch(e) {
      console.log(e);
    }
  }
  return assembledTxs;
};

const fetchTxData = async (page, addrs) => {
  let final = [];
  const web3 = new Web3(process.env.WEB3_PROVIDER);
  for(let i = 0; i < addrs.length; i++) {
    const addr = addrs[i];
    const transactions = addr.transactions;
    final.push({});
    final[final.length - 1] = {
      address: addr.address,
      transactions: []
    };
    for(let j = 0; j < transactions.length; j++) {
      const { hash } = transactions[j];
      const exists = await db.Transaction.findAll({
        where: {
          hash: hash
        }
      });
      if(!exists[0]) {
        console.log('new transaction!');
        const logs = await web3.eth.getTransaction(hash);
        const tstamp = (await web3.eth.getBlock(logs.blockNumber)).timestamp;
        if(logs.input.length > 5) {
          await page.goto(`https://bscscan.com/address/${logs.to}#code`);
          const abiSelector = '#js-copytextarea2';
          await page.waitForSelector(abiSelector);
          const abi = await page.$eval(abiSelector, ele => ele.innerHTML);
          await abiDecoder.addABI(JSON.parse(abi));
          const params = abiDecoder.decodeMethod(logs.input).params;
          const amountFromFunction = params.filter(p => p.name == 'amountOutMin');
          const stringifiedParams = params.map(p => JSON.stringify(p));
          final[final.length - 1].transactions.push({
            from: logs.from,
            to: logs.to,
            params: stringifiedParams.join(';'),
            amount: amountFromFunction[0].value,
            timestamp: tstamp,
            ...transactions[j]
          });
          await delay(750);
        } else {
          final[final.length - 1].transactions.push({
            from: logs.from,
            to: logs.to,
            params: null,
            amount: logs.value,
            timestamp: tstamp,
            ...transactions[j]
          });
        }
      } else {
        console.log('this transactions has already been checked');
      }
    }
  }
  return final;
};

const saveData = (txs) => {
  for(let i = 0; i < txs.length; i++) {
    const data = txs[i];
    for(let j = 0; j < data.transactions.length; j++) {
      db.Transaction.create(data.transactions[j]).then(saved => {
        console.log('saved');
      }).catch(err => {
        console.log(err);
      })
    }
  }
};

(async () => {
  const browser = await puppeteer.launch({ headless: true, defaultViewport: null, args: browserArgs });
  let page = await browser.newPage();
  await page.setViewport({
    width: 1920,
    height: 1080
  });
  const walletsFresh = await fetchChildWallets(page, process.env.ADDRESS, 2);
  const transactions = await fetchAllTransactionHashes(page, walletsFresh);
  const fetched = await fetchTxData(page, transactions);
  await page.close();
  await browser.close();
  // time to save the results into db
  saveData(fetched);
})();
