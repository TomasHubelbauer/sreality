# SReality

Scraping SReality with Puppeteer.

## Usage

`npm start ${url}`

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
