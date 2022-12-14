
import './App.css';
import {useState} from "react";
import {Alert, Button, Snackbar} from "@mui/material";


function App() {
    const [amount, setAmount] = useState(699);
    const [email, setEmail] = useState("rajaninaan16@gmail.com");
    const [name, setName] = useState("naman");
    const [contact, setContact] = useState(987654321);
    const [status, setStatus] = useState(false);
    const [trueContact, setTrueContact] = useState(true)
    const handleClose = () => {
        setStatus(false);
        setTrueContact(true)
    };

    function loadScript(src) {
        return new Promise((resolve) => {
            const script = document.createElement('script')
            script.src = src
            script.onload = () => {
                resolve(true)
            }
            script.onerror = () => {
                resolve(false)
            }
            document.body.appendChild(script)
        })
    }

    async function displayRazorpay() {

        if (contact.toString().length === 10) {
            setTrueContact(true);
            const res = await loadScript('https://checkout.razorpay.com/v1/checkout.js')

            if (!res) {
                alert('Razorpay SDK failed to load. Are you online?')
                return
            }
            let option = {
                amount: amount,
                email: email,
                name: name,
                contact: contact
            }

            const data = await fetch('http://localhost:3002/razorpay/' + amount.toString(), {method: 'POST'}).then((t) =>
                t.json()
            )

            // console.log(data)

            const options = {
                "key": "rzp_test_aqRrSZmCJ6Z4pC", // Enter the Key ID generated from the Dashboard
                "amount": data.amount.toString(), // Amount is in currency subunits. Default currency is INR. Hence, 50000 refers to 50000 paise
                "currency": data.currency,
                "name": "MyPay",
                "description": "Test Transaction",
                "image": "http://localhost:3002/logo.svg",
                "order_id": data.id, //This is a sample Order ID. Pass the `id` obtained in the response of Step 1
                "handler": async function (response) {
                    // alert(response.razorpay_payment_id);
                    // alert(response.razorpay_order_id);
                    // alert(response.razorpay_signature)
                    console.log(response)
                    setStatus(true);

                    const status = await fetch('http://localhost:3002/payment_done/' + response.razorpay_order_id, {method: 'POST'}).then((t) =>
                        t.json()
                    )
                    console.log("Status: " + status)
                },
                "prefill": {
                    "name": name,
                    "email": email,
                    "contact": "" + contact
                },
                "notes": {
                    "address": "MyPay Corporate Office"
                },
                "theme": {
                    "color": "#3399cc"
                }
            }
            const paymentObject = new window.Razorpay(options)
            paymentObject.open()
        } else {
            setTrueContact(false);
        }


    }

    return (
        <div className="App">
            <header className="App-header">
                <form>
                    <table>
                        <tr>
                            <td>
                                <label>Enter your Name:<span/>
                                    <input
                                        type="text"
                                        value={name}
                                        onChange={(e) => setName(e.target.value)}
                                    />
                                </label>
                            </td>
                        </tr>
                        <tr>
                            <td><label>Enter your Email:<span/>
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                />
                            </label></td>
                        </tr>
                        <tr>
                            <td><label>Enter your Amount:<span/>
                                <input
                                    type="number"
                                    value={amount}
                                    onChange={(e) => setAmount(e.target.value)}
                                />
                            </label></td>
                        </tr>
                        <tr>
                            <td><label>Enter your contact:<span/>
                                <input
                                    type="number"
                                    value={contact}
                                    onChange={(e) => setContact(e.target.value)}
                                />
                            </label></td>
                        </tr>
                    </table>
                    <br/>
                    <Button sx={{
                        bgcolor: '#61dafb',
                        boxShadow: 1,
                        borderRadius: 2,
                        p: 2,
                        fontSize:'1.2rem',
                        minWidth: 200,
                    }} variant="contained" onClick={displayRazorpay}>Pay</Button>

                </form>

            </header>
            <Snackbar open={status} autoHideDuration={6000} onClose={handleClose}>
                <Alert onClose={handleClose} severity="success" sx={{width: '100%'}}>
                    Transaction completed
                </Alert>
            </Snackbar>
            <Snackbar open={!trueContact} autoHideDuration={6000} onClose={handleClose}>
                <Alert onClose={handleClose} severity="error" sx={{width: '100%'}}>
                    Contact was wrong
                </Alert>
            </Snackbar>
        </div>
    );
}

export default App;
