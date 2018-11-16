var pool = require("../../db/db-module.js");
const Router = require('express');
const router = new Router();

router.get("/hello", async (req, res, next) => {
    console.log("yoyoyo!!!");
    try {
        const row = await pool.query("SELECTI username from users;");
        console.log(row);
    } catch (err) {
        console.log("error while selecting username for testing.")
        console.log(err);
    }
    res.send("yaman");
});

var x = (x) => (a, b) => {console.log("a:" + a + " b:" + b + " x:" + x)};
(x(3))(4, 5);

async function someFunction() {
    return 0;
}

async function someOtherFunction() {
    var val = await someFunction();
    console.log(val);
}


// Boiler plate again, 
// this starts the server
router.listen(process.env.PORT, process.env.IP, function() {
    console.log("The server has started my dear hoho");
});
