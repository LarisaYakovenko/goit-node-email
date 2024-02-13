import nodemailer from "nodemailer";
import "dotenv/config";
const { UKR_NET_PASSWORD } = process.env;

const nodemaillerConfig = {
    host: "smtp.ukr.net",
    port: 465,
    secure: true,
    auth: {
        user: "yalorik295@ukr.net",
        pass: UKR_NET_PASSWORD,
    }
}

const tranport = nodemailer.createTransport(nodemaillerConfig);

const sendEmail = data => {
    const email = { ...data, from: "yalorik295@ukr.net" };
    return tranport.sendMail(email);
}

export default sendEmail;