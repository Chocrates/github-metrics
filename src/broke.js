const { throttling } = require("@octokit/plugin-throttling");
const { retry } = require("@octokit/plugin-retry")
const { Octokit } = require('@octokit/rest')
const MyOctokit = Octokit
  .plugin(throttling)
  .plugin(retry)

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
  .argv

  // ugly but doesn't need async
const sleep = (duration) => {
    var now = new Date().getTime();
    while(new Date().getTime() < now + duration) {  }
  }


  async function main() {
    const baseUrl = argv.baseUrl;
    const token = argv.token;

    const client =  new MyOctokit({
      auth: "token " + token,
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
      request: { 
        retries: 100,
        doNotRetry: [ 403 ]
       }
    });


         console.log('Gathering issues...')
         // const options = client.repos.listCommits.endpoint.merge({owner: 'department-of-veterans-affairs',repo: 'vets-website', sha: 'u-don/webpack-build-scaffold', since: new Date(Date.parse('2020-01-01'))})
         const options = client.activity.listOrgEventsForAuthenticatedUser.endpoint.merge({org: 'department-of-veterans-affairs', username: 'chocrates', since: new Date(Date.parse('2020-03-01'))})
         try {
          const issues = await client.paginate(options)
          const users = issues.map((evt) => { 
            return evt.actor.login
          })
          console.log(users.length)
          console.log(users)
         }catch(error){
           console.log(error.code);
         }
}

if (require.main == module){
    main();
}

module.exports = main;
