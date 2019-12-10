# SReality

Scraping SReality with Puppeteer.

## Usage

`npm start ${url}`

`${url}` is the URL of the search results page. E.g. all houses in Prague:
`https://www.sreality.cz/hledani/prodej/domy?region=Praha&vzdalenost=0.5`

When using PowerShell, use triple quotes to escape everything in the URL right:
`npm start """${url}"""`

## To-Do

### Implement paging the search results
