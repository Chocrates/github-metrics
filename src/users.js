const fs = require('fs');

exports.command = 'users';
exports.describe = 'Generate the active/inactive user reports';
exports.builder = (yargs) => {
  yargs.option('owner', {
    alias: 'o',
    type: 'string',
    description: 'Organization from which to gather user info'
  })
  .demand('owner')
  .option('gather-emails', {
    alias: 'e',
    type: 'boolean',
    description: 'Flag to  determine whether or not to query individual users emails',
    default: false
  })
}

exports.run = async ({ client, argv}) => {
    const owner = argv.owner;
    const gatherEmails = argv.gatherEmails;
    
    // Get all org members into a hash with login, email, active bool set to alse    
    const cacheDir = '.cache'
    if (!fs.existsSync(cacheDir)){
        fs.mkdirSync(cacheDir);
    }
    const members = getMembers({client, cacheDir}) 
    // Get all repos from this org
    options = client.repos.listForOrg.endpoint.merge({org: owner});
    const repos = await client.paginate(options);
    console.log(repos);
    // For each Repo

        // Get Commit activity
            // For each branch
                // For each commits since date
                    // if authoer is blank
                        // add unrecognized author
                    // else
                        // make author active
        // Get Issue Activity
            // For Each issue since date
                // if user is not blank
                    // make author active


}
const getMembers = async({client,cacheDir}) => {
    const cacheMembers = cacheDir + '/members.json';
    let members;
    // TODO: Determine if the cache is stale
    // Give option to ignore/reset cache
    // Save option flags so we can determine if we need to update the cache (IE was the cache saved without gather emails)
    if(!fs.existsSync(cacheMembers)){
    let options = client.orgs.listMembers.endpoint.merge({org: owner});
    members = Object.assign({}, ...(await client.paginate(options)).map((user) => ({[user.login]: {
    'email': '',
    'active': false
    }})));
    if(gatherEmails) {
       for(let key in members){
           members[key].email = (await client.users.getByUsername({username: key})).email
       } 
    }
    fs.writeFile(cacheMembers, JSON.stringify(members), (err) => {
        if(err){
            console.error(err);
        }
    })
} else {
    members = JSON.parse(fs.readFileSync(cacheMembers));
}
    console.log(members)
    return members;
}