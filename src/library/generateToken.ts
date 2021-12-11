const jwt = require("jsonwebtoken");
const dotenv = require("dotenv").config();

const App = (obj) => {
    return jwt.sign(JSON.stringify(obj),process.env.JWT_SECRET);
}

module.exports = App;