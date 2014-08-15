regexcrosswordbruteforcer
=========================

Brute force utility for winning the internet at http://regexcrossword.com!

This was written to beat the puzzle "An Ambiguous Puzzle" under the player submitted puzzles.  It does not actually use any regexes in the solution, however it does use the knowledge that the puzzle says that any character cannot be repeated in any column or row that it is in.

In order to use this, you'll need to install CasperJS which can be found here:

http://casperjs.org/

as well as PhantomJS which is found here:

http://phantomjs.org/

Copy the config file from the template and fill in the details:

    cp bruteforcer.config.js.template bruteforcer.config.js
    vi bruteforcer.config.js

"user" and "pass" are your facebook credentials.  "puzzle_id" is the id of the puzzle.  For example, on the puzzle url:

http://regexcrossword.com/playerpuzzles/68904a29-49da-4ed1-a27f-4801694b07ac

the puzzle_id will be "68904a29-49da-4ed1-a27f-4801694b07ac"

