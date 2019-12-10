const puppeteer = require('puppeteer');
const fs = require('fs-extra');

void async function () {
  if (!process.argv[2]) {
    console.log('Pass the URL of the search results page as an argument, please.');
    process.exit(1);
  }

  const browser = await puppeteer.launch({ headless: false });
  try {
    const [page] = await browser.pages();

    console.log('Going to the search result page');
    await page.goto(process.argv[2]);

    const hrefs = await page.$$eval('a.title[href^="/detail/"]', as => as.map(a => a.href));
    console.log(`Found ${hrefs.length} post links on the page`);

    for (const href of hrefs) {
      const page = await browser.newPage();
      console.log(`Going to the post link href: ${href}`);
      await page.goto(href);

      const [id] = href.split('/').slice(-1);
      const title = await page.$eval('div.property-title span.name', span => span.textContent);
      const location = await page.$eval('span.location-text', span => span.textContent);
      const price = await page.$eval('span.norm-price', span => span.textContent);
      const description = await page.$eval('div.description', div => div.textContent);

      const photos = [];
      let photoCount = await page.$eval('button.thumbnails', button => Number(button.textContent.match(/\d+/)[0]));
      if (await page.$('button.btn-panorama-open__btn')) {
        // Discard the last "photo" because it's really a panorama
        photoCount--;
      }

      console.log(`Scraping ${photoCount} post photos`);
      for (let number = 1; number <= photoCount; number++) {
        const selector = `img[img-src]:not([src="${photos[number - 1 /* number to index */ - 1 /* index of the already scraped photo */]}"])`;
        if (number > 1) {
          // Wait for the button press from the previous loop to have changed the `img.src` attribute value
          await page.waitForSelector(selector);
        }

        const src = await page.$eval(selector, img => img.src);
        photos.push(src);
        console.log(`Scraped photo #${number}: ${src}`);

        // Hover over the photo to make the action buttons appear
        await page.hover('div.image-cover');

        // Click the button which changes the `img.src` attribute value
        await page.click('button.detail-btn.next');
      }

      await fs.writeJson(
        id + '.json',
        { title, location, price, description, photoCount, photos },
        { spaces: 2 }
      );

      console.log('Capturing a screenshot of the post page');
      await page.screenshot({ path: id + '.png', fullPage: true });

      await page.close();
    }

    console.log('Captured screenshot of all the posts');
  }
  finally {
    console.log('Closing the browser');
    await browser.close();
  }
}()
