# SReality

Scraping SReality with Puppeteer.

## Usage

```
npm install
node . ${url}
```

`${url}` is the URL of the search results page. E.g. all houses in Prague:

`https://www.sreality.cz/hledani/prodej/domy?region=Praha&vzdalenost=0.5`

When using PowerShell, use triple quotes to escape everything in the URL right:
`npm start """${url}"""`

## Limitations

Note that SReality does not show the post creation date, only the modification
date and this scraper does not capture either. If you want to track post age,
run this script daily and keep track of which posts appear and disappear
yourself.

At this time, this scraper only scrapes the posts on the provided search results
page URL, but doesn't not automatically advance to further pages. I have plans
to add this.

## To-Do

### Implement paging the search results

### Run this on schedule in GitHub Actions for interesting searches

Could be automated to make issues with the photos and metadata and delete the
issues once the post is no longer found in the next run.

### Download the post photos to the file system, not just the URLs
