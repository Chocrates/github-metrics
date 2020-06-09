# github-metrics
A simple cli tool to allow gathering metrics on your GitHub organization

## Installation  
* Checkout the repo
* `npm install`

## Running
`node src/index.js --token <PAT> [command] <command parameters>`  

At the moment only counting issues is implemented  
`node src/index.js --token <PAT> issue --owner <Organization> --repo <Repo Name> --label <label name> [--state <open|closed|all>]`


## License
[MIT Licensed](LICENSE)

## Contributing