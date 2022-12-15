require('dotenv').config()

const app = require('express')()
const path = require('path')
const shortid = require('shortid')
const Razorpay = require('razorpay')
const cors = require('cors')
const bodyParser = require('body-parser')
const Pool = require('pg').Pool
const crypto = require('crypto')

app.use(cors())
app.use(bodyParser.json())

const pool = new Pool({
    user: 'postgres',
    host: process.env.DBHOST.toString(),
    database: process.env.DBDATABASE.toString(),
    password: process.env.DBPASS.toString(),
    port: 5760,
})

const razorpay = new Razorpay({
    key_id: process.env.SECRET_ID,
    key_secret: process.env.SECRET_KEY
})

app.get('/logo.svg', (req, res) => {
    res.sendFile(path.join(__dirname, 'logo.svg')) // for testing
})


app.post('/payment_done/:status', async (req, res) => {
    const oid = req.params.status
    //TODO: update to database
    // pool.connect((err, client, done) => {
    //     if (err) throw err
    //     client.query('Update  paymentgateway set status=$1 where bill_no=$2', [true, oid], (err, res) => {
    //         done()
    //
    //         if (err) {
    //             console.log(err.stack)
    //         }
    //         // } else {
    //         //     console.log(res.rows[0])
    //         // }
    //     })
    // })
    res.send(true)


})
app.post('/verification', (req, res) => {
    // do a validation
    const secret = process.env.SECRET;

    console.log(req.body)


    const shasum = crypto.createHmac('sha256', secret)
    shasum.update(JSON.stringify(req.body))
    const digest = shasum.digest('hex')

    console.log(digest, req.headers['x-razorpay-signature'])

    if (digest === req.headers['x-razorpay-signature']) {
        console.log('request is legit')
        // process it
        const status = req.body.payload.payment.entity.captured;
        const oid = req.body.payload.payment.entity.order_id;
        if (status === true) {
            pool.connect((err, client, done) => {
                if (err) throw err
                client.query('Update  paymentgateway set status=$1 where bill_no=$2', [true, oid], (err, res) => {
                    done()

                    if (err) {
                        console.log(err.stack)
                    }
                    // } else {
                    //     console.log(res.rows[0])
                    // }
                })
            })
        }
        // require('fs').writeFileSync('payment1.json', JSON.stringify(req.body, null, 4))
    } else {
        // pass it
    }
    res.json({status: 'ok'})
})
app.post('/razorpay/:options', async (req, res) => {
    // const payment_capture = 1
    const amount = parseInt(req.params.options)
    const currency = 'INR'
    const receiptNo = shortid.generate()
    const options = {
        amount: amount * 100,
        currency,
        receipt: receiptNo,
        // payment_capture
    }

    try {
        const response = await razorpay.orders.create(options)
        // console.log(response)
        //TODO: Store to database

        pool.connect((err, client, done) => {
            if (err) throw err
            client.query('Insert Into paymentgateway (bill_no, date, currency, amount, status, token) VALUES ($1,$2,$3,$4,$5,$6)', [response.id, new Date(), response.currency, response.amount / 100, false, receiptNo], (err, res) => {
                done()

                if (err) {
                    console.log(err.stack)
                }
                // } else {
                //     console.log(res.rows[0])
                // }
            })
        })
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
