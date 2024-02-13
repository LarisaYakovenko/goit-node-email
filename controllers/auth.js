import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import gravatar from "gravatar";
import path from "path";
import fs from "fs/promises";
import { nanoid } from "nanoid";


const avatarsDir = path.resolve('public', "avatars");

import User from "../models/user.js"
import HttpError from "../helpers/HttpError.js";
import sendEmail from "../helpers/sendEmail.js";
// import {HttpError, sendEmail} from '../helpers/index.js';

const { SECRET_KEY, BASE_URL } = process.env;

export const register = async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = await User.findOne({ email });
        if (user) {
            throw HttpError(409, "Email already in use");
        }
    
        const hashPassword = await bcrypt.hash(password, 10);
        const avatarURL = gravatar.url(email);
        const verificationToken = nanoid();

        const newUser = await User.create({
            ...req.body,
            password: hashPassword,
            avatarURL,
            verificationToken,
        });

        const verifyEmail = {
            to: email,
            subject: "Verify email",
            html: `<a target="_blank" href="${BASE_URL}/users/verify/${verificationToken }">Click verify email</a>`
        };

        await sendEmail(verifyEmail);

        res.status(201).json({
            user: {
              email: newUser.email,
              subscription: newUser.subscription,
            },
        })
    }
    catch (error) {
        next(error)
    }
}

export const verifyEmail = async (req, res) => {
    try {
        const { verificationToken } = req.params;
        const user = await User.findOne({ verificationToken });
        if (!user) {
            throw HttpError(404, "User not found")
        }
        await User.findByIdAndUpdate(user._id, { verify: true, verificationToken: "" });

        res.status(200).json({
            message: "Verification successful"
        })
        
    }
    catch (error) {
        next(error)
    }
}

export const resendVerifyEmail = async (req, res) => {
    try {
        const { email } = req.body;
        const user = await User.findOne({ email });
        if (!user) {
        throw HttpError(401, "Email not found");
        }
        if (user.verify) {
        throw HttpError(401, "Email already verify");
        }

        const verifyEmail = {
            to: email,
            subject: "Verify email",
            html: `<a target="_blank" href="${BASE_URL}/users/verify/${user.verificationToken }">Click verify email</a>`
        };
    
        await sendEmail(verifyEmail);

        res.status(200).json({
            message: "Verify email send"
        })    
    }
    catch (error) {
        next(error)
    }
} 

export const login = async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = await User.findOne({ email });
        if (!user) {
            throw HttpError(401, "Email or password invalid");
        }

        if (!user.verify) {
            throw HttpError(401, "Email not verify");
        }

        const passwordCompare = await bcrypt.compare(password, user.password);
        if (!passwordCompare) {
            throw HttpError(401, "Email or password invalid");
        }

        const payload = {
            id: user._id,
        }

        const token = jwt.sign(payload, SECRET_KEY, { expiresIn: "23h" });
        await User.findByIdAndUpdate(user._id, { token });

        res.json({
            token,
            user: {
              email: user.email,
              subscription: user.subscription,
            },
        })
        
    }
    catch (error) {
        next(error);
    }
}

export const getCurrent = async (req, res) => {
    const { email, subscription } = req.user;

    res.json({
        email,
        subscription,
    });
};

export const logout = async (req, res) => {
    const { _id } = req.user;
    await User.findByIdAndUpdate(_id, { token: "" });

    res.status(204).json({
        message: "Logout success"
    })
}

export const updateUserSubscription = async (req, res) => {    
    const { subscription } = req.body;
    const { _id } = req.user;
    const updatedUser = await User.findByIdAndUpdate(_id, {subscription});

    if (!updatedUser) {
      throw new HttpError(404, "User not found");
    }

    res.status(200).json(updatedUser);
};

export const updateAvatar = async (req, res) => {
    const { _id } = req.user;
    const { path: tempUpload, originalname } = req.file;
    const filename = `${_id}_${originalname}`;
    const resultUpload = path.join(avatarsDir, filename);

    const avatar = await jimp.read(tempUpload);
    await avatar
    .resize(250, 250, jimp.RESIZE_BEZIER)
    .normalize()
    .quality(50)
    .writeAsync(tempUpload);

    await fs.rename(tempUpload, resultUpload);
    const avatarURL = path.join("avatars", filename);
    await User.findByIdAndUpdate(_id, { avatarURL });
    
    res.json({
        avatarURL, 
    })
}