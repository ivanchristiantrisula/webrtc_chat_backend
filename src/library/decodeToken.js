let jwt = require("jsonwebtoken");
require("dotenv").config();
const App = (token) => {
    try {
        return jwt.verify(token, process.env.JWT_SECRET);
    }
    catch (err) {
        return false;
    }
};
module.exports = App;
