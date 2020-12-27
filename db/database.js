const Pool = require('pg').Pool

const pool = new Pool({
    user: 'fred',
    host: 'localhost',
    database: 'techoverflow',
    password: 'fred',
    port: 5432
});

(async function() {
    const client = await pool.connect()
    client.release()
})()

module.exports = {
    query: (text, params, callback) => {
        return pool.query(text, params, callback)
    }
}