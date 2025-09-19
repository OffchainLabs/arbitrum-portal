import fs from 'fs';
import { fetch, setGlobalDispatcher, Agent } from 'undici';

import { prepareJSON, publicFolder } from './utils';

setGlobalDispatcher(new Agent({ connect: { timeout: 3_000 } }));

const UNAUTHORIZED_STATUS_CODE = 401;
const FORBIDDEN_STATUS_CODE = 403;
const TOO_MANY_REQUESTS_STATUS_CODE = 429;

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const generatedJsonsDirectoryPath = publicFolder();

const allLinks: string[] = [];
const brokenLinks: string[] = [];
const invalidLinks: string[] = [];

function readJsonAndGetLinks(jsonPath: string) {
  const data = fs.readFileSync(publicFolder('/' + jsonPath), 'utf8');
  const json = JSON.parse(data);
  if (!Array.isArray(json.content)) {
    return;
  }
  const links: string[] = json.content
    .map((item: any) => {
      if ('links' in item) {
        return Object.values(item.links);
      }
      return item.link;
    })
    .flat()
    .filter(Boolean)
    .filter((link: string) => {
      // TODO: set up check for twitter
      // twitter requires specific API and header to look up accounts, otherwise it would return 400 for valid accounts
      if (link.includes('twitter.com') || link.includes('https://x.com/')) {
        return false;
      }
      return true;
    });
  allLinks.push(...links);
}

function onlyValidLinks(): string[] {
  const urlRegex = new RegExp(/^(https?:\/\/[^\s]+)$/);
  return allLinks.filter((link) => {
    const trimmedLink = link.trim();
    const regexTestResult = urlRegex.test(trimmedLink);
    if (!regexTestResult) {
      console.error(`Invalid link: ${trimmedLink}`);
      invalidLinks.push(trimmedLink);
    }
    return regexTestResult;
  });
}

function checkAreLinksBroken(links: string[]) {
  return links.reduce((promise, link) => {
    return promise.then(() =>
      fetch(link)
        .then((response) => {
          if (!response.ok) {
            if (
              response.status !== UNAUTHORIZED_STATUS_CODE &&
              response.status !== FORBIDDEN_STATUS_CODE &&
              response.status !== TOO_MANY_REQUESTS_STATUS_CODE
            ) {
              console.error(
                `HTTP status failed with ${response.status}: `,
                link,
              );
              brokenLinks.push(link);
            }
          } else {
            console.log(`HTTP status ok: ${link}`);
          }
        })
        .catch((error) => {
          console.error(`Fetch failed: ${link}`);
          brokenLinks.push(link);
        }),
    );
  }, delay(20));
}

function main() {
  fs.readdir(generatedJsonsDirectoryPath, function (error, files) {
    if (error) {
      return console.log('Unable to scan directory: ' + error);
    }
    files.forEach(function (file) {
      if (!file.includes('.json')) {
        return;
      }
      console.log(file);
      readJsonAndGetLinks(file);
    });
    const linksToCheck = onlyValidLinks();
    const resultsFolder = '/check_results/';
    if (!fs.existsSync(publicFolder(resultsFolder))) {
      fs.mkdirSync(publicFolder(resultsFolder), { recursive: true });
    }
    fs.writeFileSync(
      publicFolder(resultsFolder + '__invalid-links.json'),
      prepareJSON(invalidLinks),
    );
    checkAreLinksBroken(linksToCheck).then(() => {
      fs.writeFileSync(
        publicFolder(resultsFolder + '__broken-links.json'),
        prepareJSON(brokenLinks),
      );
    });
  });
}

main();
