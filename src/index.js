const { throttling } = require("@octokit/plugin-throttling");
const { retry } = require("@octokit/plugin-retry")
const { Octokit } = require('@octokit/rest')
const MyOctokit = Octokit
  .plugin(throttling)
  .plugin(retry)
const { program } = require("commander");
const Agent = require("https").Agent;
const issueCmd = require("./issues");
const userCmd = require("./users");
const { demandOption } = require("yargs");

const argv = require("yargs").option('base-url', { alias: 'b',
    type: 'string',
    description: 'GitHub or GitHub Enterprise base url',
    default: 'https://api.github.com',
    global: true
  })
  .option('token', {
    alias: 't',
    description: 'personal access token with which to authenticate',
    global: true,
    demandOption: true
  })
  .command(issueCmd)
  .command(userCmd)
  .argv



async function main() {
    const baseUrl = argv.baseUrl;
    const token = argv.token;
    const client = getGitHubClient({token: argv.token, baseUrl: argv.baseUrl })

    if (argv._.indexOf('issue')  > -1){
      await issueCmd.run({client, argv} );
      return;
    } else if(argv._.indexOf('users') > -1){
      await userCmd.run({client,argv});
      return;
    }

}

// ugly but doesn't need async
const sleep = (duration) => {
  var now = new Date().getTime();
  while(new Date().getTime() < now + duration) {  }
}

function getGitHubClient({ token, baseUrl }) {
  return new MyOctokit({
    auth: "token " + token,
    agent: new Agent({ rejectUnauthorized: true }),
    baseUrl,
    throttle: {
      onRateLimit: (retryAfter, options) => {
        console.warn(`Request quota exhausted for request ${options.method} ${options.url}`);
        console.log(`Retrying after ${retryAfter} seconds! Retry Count: ${options.request.retryCount}`);
        return true;
      },
      onAbuseLimit: (retryAfter, options) => {
        console.warn(`Abuse detected for request ${options.method} ${options.url}`);
      }
    },
    request: { retries: 100,
    doNotRetry: [
      403
    ]
     }
  });
}

if (require.main == module){
    main();
}

module.exports = main;
