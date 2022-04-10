import puppeteer from 'puppeteer';
import fs from 'fs';
import evade from './evade.js';

if (!process.argv[2]) {
  console.log('Pass the URL of the search results page as an argument, please.');
  process.exit(1);
}

const browser = await puppeteer.launch();
try {
  const [page] = await browser.pages();

  // https://github.com/paulirish/headless-cat-n-mouse/blob/master/apply-evasions.js
  await evade(page);

  console.log('Going to the search result page');
  await page.goto(process.argv[2]);

  const hrefs = await page.$$eval('a.title[href^="/detail/"]', as => as.map(a => a.href));
  console.log(`Found ${hrefs.length} post links on the page`);

  for (const href of hrefs) {
    const page = await browser.newPage();
    await evade(page);

    console.log(`Going to the post #${hrefs.indexOf(href) + 1} link: ${href}`);
    await page.goto(href);

    // Wait for each element first to make sure it has been rendered using JS
    const [id] = href.split('/').slice(-1);

    await page.waitForSelector('div.property-title span.name');
    const title = await page.$eval('div.property-title span.name', span => span.textContent);
    console.log('Scraped title', title);

    await page.waitForSelector('span.location-text');
    const location = await page.$eval('span.location-text', span => span.textContent);
    console.log('Scraped location', location);

    await page.waitForSelector('span.norm-price');
    const price = await page.$eval('span.norm-price', span => span.textContent);
    console.log('Scraped price', price);

    await page.waitForSelector('div.description');
    const description = await page.$eval('div.description', div => div.textContent);
    console.log('Scraped description', description.length > 50 ? description.slice(0, 50) + '…' : description);

    const imgs = await page.$$('img.ob-c-gallery__img');
    const photos = [];
    for (let index = 0; index < imgs.length; index++) {
      await page.click('button.ob-c-gallery__btn-next');
      try {
        await page.waitForSelector(`img.ob-c-gallery__img[src*="sdn.cz"]${photos.map(photo => `:not([src="${photo}"])`).join('')}`, { timeout: 500 });
      }
      catch (error) {
        console.log('Gave up trying to find photo', index + 1, 'out of', imgs.length, '(panorama or virtual tour?)');
        continue;
      }

      photos.push(await page.$eval('img.ob-c-gallery__img[src*="sdn.cz"]', img => img.src));
    }

    console.log('Scraped', photos.length, 'photos');

    await fs.promises.writeFile(id + '.json', JSON.stringify({ url: href, title, location, price, description, photos }, null, 2));
    console.log('Stored the scraped data in', id + '.json');

    await page.screenshot({ path: id + '.png', fullPage: true });
    console.log('Captured a screenshot of the post page in', id + '.png');

    await page.close();
  }

  console.log('Finished successfully');
}
catch (error) {
  console.log('Failed to finish cleanly');
  throw error;
}
finally {
  console.log('Closing the browser');
  await browser.close();
}
