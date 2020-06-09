const { Octokit } = require("@octokit/rest")
const { program } = require("commander");
const { throttling } = require("@octokit/plugin-throttling");
const Agent = require("https").Agent;
const issueCmd = require("./issues");

// const issueCmd = {
//   command: 'issue',
//   desc: 'Issue command',
//   builder: (yargs)  => {
//     yargs.option('owner', {
//       alias: 'o',
//       type: 'string',
//       description: 'Owner of the repo'
//     })
//     .demand('owner')
//     .options('repo', {
//       alias: 'r',
//       type: 'string',
//       description: 'Repository'
//     })
//     .demand('repo')
//   }
// }

const argv = require("yargs").option('base-url', { alias: 'b',
    type: 'string',
    description: 'GitHub or GitHub Enterprise base url',
    default: 'https://api.github.com',
    global: true
  })
  .option('token', {
    alias: 't',
    description: 'personal access token with which to authenticate',
    global: true
  })
  .demand('token')
  .command(issueCmd)
  .argv



async function main() {
    const baseUrl = argv.baseUrl;
    const token = argv.token;
    const client = getGitHubClient({token: argv.token, baseUrl: argv.baseUrl })

    if (argv._.indexOf('issue')  > -1){
      await issueCmd.run({client, argv} );
      return;
    }

}


function getGitHubClient({ token, baseUrl }) {
  const MyOctokit = Octokit.plugin(throttling);
  return new MyOctokit({
    auth: "token " + token,
    agent: new Agent({ rejectUnauthorized: true }),
    baseUrl,
    throttle: {
      onRateLimit: (retryAfter, options) => {
        octokit.log.warn(`Request quota exhausted for request ${options.method} ${options.url}`);

        if (options.request.retryCount === 0) {
          console.log(`Retrying after ${retryAfter} seconds!`);
          return true;
        }
      },
      onAbuseLimit: (retryAfter, options) => {
        octokit.log.warn(`Abuse detected for request ${options.method} ${options.url}`);
      },
    },
  });
}

if (require.main == module){
    main();
}

module.exports = main;