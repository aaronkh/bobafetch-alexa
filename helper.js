var exec = require('child_process').exec;
var fs = require('fs');
const path = require("path");

var contents = JSON.parse(fs.readFileSync(path.resolve(__dirname, './.ask/config'), 'utf8'));
var creds = contents.alexaHosted.gitCredentialsCache;
var url = creds.protocol + creds.host + creds.path
dir = exec(`git remote set-url origin ${url}`, function(err) {
    if (err) console.log(err);
    console.log('Now run "ask deploy -f" and see your code deployed on your skill!');
});
