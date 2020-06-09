

exports.command = 'issue';
exports.describe = 'Issue command';
exports.builder = (yargs)  => {
  yargs.option('owner', {
    alias: 'o',
    type: 'string',
    description: 'Owner of the repo'
  })
  .demand('owner')
  .options('repo', {
    alias: 'r',
    type: 'string',
    description: 'Repository'
  })
  .demand('repo')
  .options('state', {
    alias: 's',
    type: 'string',
    description: 'State of the ticket, open, closed, or all',
    default: 'all'
  })
  .options('label', {
    alias: 'l',
    type: 'string',
    description: 'The label to pull from GitHub'
  })
  .demand('label')
}

exports.run = async ({ client, argv}) => {
  const owner = argv.owner;
  const repo = argv.repo;
  const state = argv.state;
  const label = argv.label;

  let issues = await client.paginate(client.issues.listForRepo, {
   owner,
   repo,
   state,
   labels: [label]
 });

 issues = issues.filter((issue) => {
   if (!("pull_request" in issue)) {
     return issue;
   }
 });

 console.log(issues.length);
}