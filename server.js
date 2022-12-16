
require('dotenv').config()  // for security purpose and geting data from .env file
const app = require('express')()
const path = require('path')
const shortid = require('shortid')// for generating token
const Razorpay = require('razorpay')// for connecting backend to Razorpay servers
const cors = require('cors')
const bodyParser = require('body-parser')
const Pool = require('pg').Pool // for connecting database
const crypto = require('crypto')

app.use(cors())
app.use(bodyParser.json())


// setting pool for postgres database
const pool = new Pool({
    user: 'postgres',
    host: process.env.DBHOST.toString(),
    database: process.env.DBDATABASE.toString(),
    password: process.env.DBPASS.toString(),
    port: 5760,
})

// Instantiate the razorpay instance with key_id & key_secret
const razorpay = new Razorpay({
    key_id: process.env.SECRET_ID,
    key_secret: process.env.SECRET_KEY
})

//For tesing
app.get('/logo.svg', (req, res) => {
    res.sendFile(path.join(__dirname, 'logo.svg'))
})




//Webhook URL
app.post('/verification', (req, res) => {
    // do a validation
    const secret = process.env.SECRET.toString(); // secret string
    // for generating hash
    const shasum = crypto.createHmac('sha256', secret)
    shasum.update(JSON.stringify(req.body))
    const digest = shasum.digest('hex')

    console.log(digest, req.body)

    if (digest === req.headers['x-razorpay-signature']) {
        console.log('request is legit')
        // process it
        const status = req.body.payload.payment.entity.captured;
        const oid = req.body.payload.payment.entity.order_id;
        if (status === true) {
            pool.connect((err, client, done) => {
                if (err) throw err
                //updating status to true after payment into database
                client.query('Update  paymentgateway set status=$1 where bill_no=$2', [true, oid], (err, res) => {
                    done()

                    if (err) {
                        console.log(err.stack)
                    }

                })
            })
        }
    } else {
        // pass it
    }
    res.json({status: 'ok'}) // sending https status 200 to razorpay servers
})


// for getting OrderID
app.post('/razorpay/:options', async (req, res) => {
    const amount = parseInt(req.params.options)
    const currency = 'INR'
    const receiptNo = shortid.generate()
    const options = {
        amount: amount * 100,
        currency,
        receipt: receiptNo,
    }

    try {
        // creating order in razorpay
        const response = await razorpay.orders.create(options)

        // entering data in database
        pool.connect((err, client, done) => {
            if (err) throw err
            client.query('Insert Into paymentgateway (bill_no, date, currency, amount, status, token) VALUES ($1,$2,$3,$4,$5,$6)', [response.id, new Date(), response.currency, response.amount / 100, false, receiptNo], (err, res) => {
                done()
                if (err) {
                    console.log(err.stack)
                }

            })
        })
        // sending .json with orderid,currency,amount
        res.json({
            id: response.id,
            currency: response.currency,
            amount: response.amount
        })


    } catch (error) {
        console.log(error)
    }
})
const port = process.env.PORT || 3002
app.listen(port, () => {
    console.log('Listening on ' + port);
})
