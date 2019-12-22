const puppeteer = require('puppeteer');
const fs = require('fs-extra');

process.on('unhandledRejection', error => { throw error; });

void async function () {
  if (!process.argv[2]) {
    console.log('Pass the URL of the search results page as an argument, please.');
    process.exit(1);
  }

  const browser = await puppeteer.launch();
  try {
    const [page] = await browser.pages();
    await evade(page);

    console.log('Going to the search result page');
    await page.goto(process.argv[2]);

    const hrefs = await page.$$eval('a.title[href^="/detail/"]', as => as.map(a => a.href));
    console.log(`Found ${hrefs.length} post links on the page`);

    for (const href of hrefs) {
      const page = await browser.newPage();
      await evade(page);

      console.log(`Going to the post link href: ${href}`);
      await page.goto(href);

      // Wait for each element first to make sure it has been rendered using JS
      const [id] = href.split('/').slice(-1);
      await page.waitForSelector('div.property-title span.name');
      const title = await page.$eval('div.property-title span.name', span => span.textContent);
      await page.waitForSelector('span.location-text');
      const location = await page.$eval('span.location-text', span => span.textContent);
      await page.waitForSelector('span.norm-price');
      const price = await page.$eval('span.norm-price', span => span.textContent);
      await page.waitForSelector('div.description');
      const description = await page.$eval('div.description', div => div.textContent);
      await page.waitForSelector('button.thumbnails');
      let photoCount = await page.$eval('button.thumbnails', button => Number(button.textContent.match(/\d+/)[0]));

      if (await page.$('button.btn-panorama-open__btn')) {
        // Discard the last "photo" because it's really a panorama
        photoCount--;
      }

      if (await page.$('img.img-virtual-tour-start-txt')) {
        // Discard the first "photo" because it's really a virtual tour
        photoCount--;

        // Hover over the photo to make the action buttons appear
        await page.hover('div.image-cover');

        // Click the button which goes to the first real photo
        await page.click('button.detail-btn.next');
      }

      const photos = [];
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
        { url: href, title, location, price, description, photoCount, photos },
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

// https://github.com/paulirish/headless-cat-n-mouse/blob/master/apply-evasions.js
async function evade(page) {
  // Pass the User-Agent Test.
  const userAgent =
    'Mozilla/5.0 (X11; Linux x86_64)' +
    'AppleWebKit/537.36 (KHTML, like Gecko) Chrome/64.0.3282.39 Safari/537.36';
  await page.setUserAgent(userAgent);

  // Pass the Webdriver Test.
  await page.evaluateOnNewDocument(() => {
    const newProto = navigator.__proto__;
    delete newProto.webdriver;
    navigator.__proto__ = newProto;
  });

  // Pass the Chrome Test.
  await page.evaluateOnNewDocument(() => {
    // We can mock this in as much depth as we need for the test.
    window.chrome = {
      runtime: {}
    };
  });

  // Pass the Permissions Test.
  await page.evaluateOnNewDocument(() => {
    const originalQuery = window.navigator.permissions.query;
    window.navigator.permissions.__proto__.query = parameters =>
      parameters.name === 'notifications'
        ? Promise.resolve({ state: Notification.permission })
        : originalQuery(parameters);

    // Inspired by: https://github.com/ikarienator/phantomjs_hide_and_seek/blob/master/5.spoofFunctionBind.js
    const oldCall = Function.prototype.call;
    function call() {
      return oldCall.apply(this, arguments);
    }
    Function.prototype.call = call;

    const nativeToStringFunctionString = Error.toString().replace(/Error/g, "toString");
    const oldToString = Function.prototype.toString;

    function functionToString() {
      if (this === window.navigator.permissions.query) {
        return "function query() { [native code] }";
      }
      if (this === functionToString) {
        return nativeToStringFunctionString;
      }
      return oldCall.call(oldToString, this);
    }
    Function.prototype.toString = functionToString;
  });

  // Pass the Plugins Length Test.
  await page.evaluateOnNewDocument(() => {
    // Overwrite the `plugins` property to use a custom getter.
    Object.defineProperty(navigator, 'plugins', {
      // This just needs to have `length > 0` for the current test,
      // but we could mock the plugins too if necessary.
      get: () => [1, 2, 3, 4, 5]
    });
  });

  // Pass the Languages Test.
  await page.evaluateOnNewDocument(() => {
    // Overwrite the `languages` property to use a custom getter.
    Object.defineProperty(navigator, 'languages', {
      get: () => ['en-US', 'en']
    });
  });

  // Pass the iframe Test
  await page.evaluateOnNewDocument(() => {
    Object.defineProperty(HTMLIFrameElement.prototype, 'contentWindow', {
      get: function () {
        return window;
      }
    });
  });

  // Pass toString test, though it breaks console.debug() from working
  await page.evaluateOnNewDocument(() => {
    window.console.debug = () => {
      return null;
    };
  });
};
