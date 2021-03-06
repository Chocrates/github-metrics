const fs = require('fs');
const { SSL_OP_ALLOW_UNSAFE_LEGACY_RENEGOTIATION, SSL_OP_SINGLE_ECDH_USE } = require('constants');

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
  .options('date', {
    alias: 'd',
    type: 'string',
    description: 'Date from which to start looking for activity, In ISO 8601 format: YYYY-MM-DDTHH:MM:SSZ with timestamp optional'
  })
  .demand('date')
}

exports.run = async ({ client, argv}) => {
    try {
        const owner = argv.owner;
        const gatherEmails = argv.gatherEmails;
        const date = new Date(Date.parse(argv.date));
        
        // Get all org members into a hash with login, email, active bool set to alse    
        const cacheDir = '.cache'
        if (!fs.existsSync(cacheDir)){
            fs.mkdirSync(cacheDir);
        }
        const members = await getMembers({client, cacheDir, owner, gatherEmails}) 
        const unrecognized_users = {};

        const errors = { 
            repo:[],
            branch: []
        }

        // Get all repos from this org
        const repos = await getRepos({client,cacheDir,owner});

        // For each Repo
        let index = 0;
        for(let repo of repos) {
            try{
                console.log(`Logging Repo ${repo.name} ${index++}/${repos.length-1}`)
                const branches = await getBranches({client,cacheDir, owner, repo: repo.name});
                for(let branch of branches) {
                    try { 
                        const commits = await getCommits({client,cacheDir,owner, repo: repo.name,branch: branch.name, since:date.toISOString()});
                        for(let commit of commits){
                            if(commit.author && commit.author.login in members){
                                members[commit.author.login].active = true;
                            }else{
                                unrecognized_users[commit.commit.author.name] = { email: commit.commit.author.email }
                            }
                        }
                    }catch(error){
                        console.log('Error while reading branches')
                        console.log(error)
                        handleError({type: 'branch', errors, error})
                    }
                }

                // Get Issue Activity
                const issues = await getIssues({client,cacheDir,owner,repo: repo.name,since: date.toISOString()})
                for(let issue of issues){
                    if(issue.user && issue.user.login in members){
                        members[issue.user.login].active = true;
                    }else{
                        console.error(`User not found in members dict: ${issue.user.login}`)
                        unrecognized_users[issue.user.login] = { email: "" }
                    }
                }

                const issueComments = await getIssueComments({client,cacheDir,owner,repo: repo.name, since: date.toISOString()})
                for(let comment of issueComments){
                    if(comment.user && comment.user.login in members){
                        members[comment.user.login].active = true
                    }else {
                        console.error(`User not found in members dict: ${comment.user.login}`)
                        unrecognized_users[comment.user.login] = { email: "" }
                    }
                }
            }catch(error){ 
                handleError({type:'repo', errors,  error})
            }
        }

        // Moving users less than 90 days old to the active list
        const audit_log = await get_audit_entries({client, owner, since: date.toISOString()})
        await remove_new_users({audit_log, members})
        await write_result_files({members, unrecognized_users, errors});
    }catch(error){
        console.error(error);
        console.error(error.stack);
    }
}

const handleError = ({type, errors, error}) => {
    console.log(`Error: ${type} has been deleted. ${error}`)
    if(error && 'code' in error && error.code !== 404){
        errors[type].push(error)
    }
}

const write_result_files = async ({members, unrecognized_users, errors}) => {
    // active users
    const active = Object.entries(members).filter(([key,value]) => {
        return value.active
    })//.map((entry) => { return entry[0]})
    fs.writeFile("active_members.json", JSON.stringify(active), (err) => {
        if(err){
            console.error(err);
        }
    })
    // inactive users
    const inactive = Object.entries(members).filter(([key,value]) => {
        return !value.active
    })//.map((entry) => { return entry[0]})
    fs.writeFile("inactive_members.json", JSON.stringify(inactive), (err) => {
        if(err){
            console.error(err);
        }
    })
    // unrecognized users
    const unrecognized = Object.keys(unrecognized_users)
    fs.writeFile("unrecognized_users.json", JSON.stringify(unrecognized_users), (err) => {
        if(err){
            console.error(err);
        }
    })

    fs.writeFile("errors.log", JSON.stringify(errors), (err) => {
        if(err){
            console.error(err);
        }
    })
}

const getIssueComments = async ({client,cacheDir,owner,repo,since}) => {
    const options = client.issues.listCommentsForRepo.endpoint.merge({owner,repo,since})
    return await client.paginate(options)
}

const getIssues = async ({client,cacheDir,owner,repo,since}) => {
    const options = client.issues.listForRepo.endpoint.merge({owner,repo,since})
    return await client.paginate(options)
}

const getCommits = async ({client,cacheDir,owner,repo,branch,since}) => {
    const options = client.repos.listCommits.endpoint.merge({owner: owner, repo: repo, sha: branch, since: since});
    return await client.paginate(options);
}

const getBranches = async ({client,cacheDir,owner,repo}) => {
    const options = client.repos.listBranches.endpoint.merge({owner: owner, repo: repo})
    return await client.paginate(options);
}

const getRepos = async ({client, cacheDir, owner}) => {
    const options = client.repos.listForOrg.endpoint.merge({org: owner});
    return await client.paginate(options);
}

const getMembers = async({client,cacheDir, owner, gatherEmails}) => {
    let members;

    const options = client.orgs.listMembers.endpoint.merge({org: owner});
    const results = await client.paginate(options);
    members = Object.assign({}, ...results.map((user) => ({[user.login]: {
    'email': '',
    'name': '',
    'active': false
    }})));
    if(gatherEmails) {
        const membersWithRole = await fetchMembersWithRole(client, owner);
        for(let user of membersWithRole){
            members[user.login].email = user.organizationVerifiedDomainEmails.length > 0 ? user.organizationVerifiedDomainEmails[0] : user.email;
            members[user.login].name = user.name;
        }
    }

    return members;
}


async function fetchMembersWithRole(octokit, owner, { results, cursor } = { results: [] }) {
    const USER_QUERY = `query($cursor:String) {
        organization(login: "${owner}") {
           membersWithRole(first: 100, after:$cursor) {
            pageInfo {
                endCursor
                hasNextPage
            }
    
            nodes {
              login
              name
              email
              organizationVerifiedDomainEmails(login:  "${owner}")
            }
          }
        }
      }`;

    const { organization: { membersWithRole } } = await octokit.graphql(USER_QUERY, { cursor });
    results.push(...membersWithRole.nodes);
  
    if (membersWithRole.pageInfo.hasNextPage) {
      await fetchMembersWithRole(octokit, owner, { results, cursor: membersWithRole.pageInfo.endCursor });
    }
  
    return results;
  }

const get_audit_entries = async({client, owner, since}) => {
    const AUDIT_QUERY = `
    query($owner: String!, $per_page: Int = 100, $after: String) {
      organization(login: $owner) {
        auditLog(first: $per_page, after: $after, query: "created:>=${since} action:org.add_member") {
          nodes {
            ... on OrgAddMemberAuditEntry {
              action
              actor {
                ... on User {
                  login
                  email
                }
                ... on Bot {
                  login
                  login
                }
                ... on Organization {
                  login
                  orgEmail: email
                }
              }
              createdAt
              userLogin
            }
          }
          pageInfo {
            hasNextPage
            endCursor
          }
          totalCount
        }
      }
    }`
    let cursor
    const auditLog = []

    try{
        do {
            results = await client.graphql(AUDIT_QUERY, {
            owner,
            after: cursor,
            });
            cursor = results.organization.auditLog.pageInfo.endCursor;


            auditLog.push(...results.organization.auditLog.nodes);
        } while (results.organization.auditLog.pageInfo.hasNextPage);
    }catch(error){
        console.error(error)
        throw error;
    }
    return auditLog;
}

const remove_new_users = async({audit_log, members}) => {
    for(let audit of audit_log){
        if(members[audit.userLogin]){
            members[audit.userLogin].active = true;
        }
    }
}


  
