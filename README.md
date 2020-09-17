# github-metrics
A simple cli tool to allow gathering metrics on your GitHub organization

## Installation  
* Checkout the repo
* `npm install`

## Running
`node src/index.js --token <PAT> [command] <command parameters>`  

At the moment only counting issues is implemented  
`node src/index.js --token <PAT> issue --owner <Organization> --repo <Repo Name> --label <label name> [--state <open|closed|all>]`

## Running With Docker
- Build Docker
  - `docker build -t metrics .`
- Run 
  - `docker run test --token <Token> --owner <Org> --gather-emails --date <Date in YYYY-MM-DD> --report-repo <Repo to check the report in to> --assignees <comma delimited list of users eg: "chocrates,chocrates">`

## License
[MIT Licensed](LICENSE)

## Contributing