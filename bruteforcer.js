#!/usr/bin/env casperjs

var utils = require('utils');
var fs = require('fs');
var casper=require('casper').create({
    verbose: true,
//    logLevel: "debug",
    pageSettings: {
        javascriptEnabled: true,
        localToRemoteUrlAccessEnabled: true,
        loadImages: true,
        loadPlugins: true,
        userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_9_4) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/36.0.1985.125 Safari/537.36'
    }
});

var configFile = './bruteforcer.config.js';

if (!fs.exists(configFile)) {
    casper.echo('cannot find '+configFile+'!');
    casper.exit();
}

var config = JSON.parse(fs.read(configFile));

var devilPuzzleUrl = 'http://regexcrossword.com/playerpuzzles/'+config.puzzle_id;



function permute1d(input, usedChars, permArr) {
    var i, ch;
    for (i = 0; i < input.length; i++) {
        ch = input.splice(i, 1)[0];
        usedChars.push(ch);
        if (input.length == 0) {
            permArr.push(usedChars.slice());
        }
        permute1d(input, usedChars, permArr);
        input.splice(i, 0, ch);
        usedChars.pop();
    }
    return permArr;
}

function permute2d(permutations) {
    permutations2d = [];
    for (var i=0; i < permutations.length; ++i) {
        permute2d_helper(permutations, [permutations[i]], permutations2d, [i]);
    }
    return permutations2d;
        
}

function permute2d_helper(permutations, input2d, permutations2d, indexesTried) {
    if (input2d.length == 5) {
        var row = [];
        for(var i=0; i<5; ++i) {
            row.push(input2d[i].join(''));
        }
        permutations2d.push(row);
        return permutations2d;
    }
    for (var i=0; i < permutations.length; ++i) {
        if (indexesTried.indexOf(i) != -1) {
            continue;
        }
        var newIndexesTried = indexesTried.slice(0);
        var newinput = input2d.slice(0);
        newinput.push(permutations[i]);
        if (validate2d(newinput)) {
            newIndexesTried.push(i);
            permute2d_helper(permutations, newinput, permutations2d, newIndexesTried);
        }
    }
    return permutations2d;
}    

function validate2d(input2d) {
    /* invert rows for columns */
    var inverted = [];
    for (var i=0; i < input2d.length; ++i) {
        for (var j=0; j < 5; ++j) {
            if (typeof inverted[j] == 'undefined') {
                inverted[j] = [];
            }
            inverted[j][i] = input2d[i][j];
        }
    }
    for(var i=0; i < 5; ++i) {
        if (checkDupes(inverted[i]) === false) {
            return false;
        }
    }
    return true;
}

function checkDupes(input) {
    var results = [];
    var arr = input.slice(0);
    var ct = arr.length;
    for(i=0; i < ct; ++i) {
        var x = arr.pop();
        if (arr.indexOf(x) != -1) {
            return false;
        }
    }
    return true;
}
var permutations2d = null;
var tempfile = './permutations2d.txt'; 
if (fs.exists(tempfile)) {
    permutations2d = JSON.parse(fs.read(tempfile));
//    utils.dump(permutations2d);
}
else {
    casper.echo('Generating solutions file on first run, may take some time');
    var characters = [1, 2, 3, 4, 5];
    var permutations = permute1d(characters, [], []);
    var permutations2d = permute2d(permutations);
    fs.write(tempfile, JSON.stringify(permutations2d), 'w');
    casper.echo('Solutions file written');
}

var sitempfile = './solutionsIndex.txt';
var solutionsIndex = 0;
if (fs.exists(sitempfile)) {
    solutionsIndex = fs.read(sitempfile);
}
var puzzleSubmitCount = 0;
casper.on('puzzle.submit', function () {
    var solution = getSolution();
    if (solution === null) {
        this.echo('tried all solutions, found none');
        exit(0);
    }
    var my_soln = {
        "puzzle_id": config.puzzle_id,
        "answer": solution,
        "user_id": config.user_id
    }
    this.thenOpen(config.baseUrl + '/api/solved', 
                  {
                      method: 'post',
                      data: JSON.stringify(my_soln),
                      headers: {
                          'Accept' : 'application/json',
                          'Content-Type': 'application/json',
                          'Host': 'regexcrossword.com'
                      }
                  },
                  function(response) {
                      var responseBody = null;
                      try {
                          responseBody = JSON.parse(this.page.plainText);
                      } catch(e) {
                      }
                      if (response.status == 200) {
                          this.echo('we are done!');
                          utils.dump(my_soln);
                          this.exit();
                      }
                      else if (response.status == 400 && responseBody && responseBody.messages.length == 1 && responseBody.messages[0] == 'answer not valid.') {
                          this.echo('failed at attempt ' +solutionsIndex);
                          fs.write(sitempfile, solutionsIndex, 'w');
                          this.wait(100, function() {
                              this.emit('puzzle.submit');
                          });
                      }
                      else {
                          this.echo('shit fuck!');
                          utils.dump(response);
                          utils.dump(responseBody);
                          this.exit();
                      }
                  }
                  
                 );
});
    

function getSolution() {
    if (solutionsIndex < permutations2d.length) {
        return permutations2d[solutionsIndex++];
    }
    return null;
}



casper.start(config.facebookSigninUrl);
casper.then(function() {
    this.fill('#login_form', {email: config.user, pass: config.pass});
    this.click('[name=login]');
});
casper.thenOpen(config.baseUrl);

casper.waitForResource(function(resource) {
    var re = /\/api\/puzzles/;
    if (resource.url.match(re)) {
        var matches = /user_id=([0-9]+)/.exec(resource.url);
        if (matches) {
            config.user_id = matches[1];
        }
        else {
            casper.echo("Cannot determine facebook user_id.  aborting!\n");
            casper.exit();
        }
        return true;
    }
    return false;
}, function() {
    this.echo('logged in to facebook and loaded!');
});
casper.thenOpen(devilPuzzleUrl);
casper.emit('puzzle.submit');
casper.run();
