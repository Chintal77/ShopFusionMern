import express from 'express';
import bcrypt from 'bcryptjs';
import expressAsyncHandler from 'express-async-handler';
import jwt from 'jsonwebtoken';
import User from '../models/userModel.js';
import { isAuth, isAdmin, generateToken, baseUrl, mailgun } from '../utils.js';

const userRouter = express.Router();

userRouter.get(
  '/',
  isAuth,
  isAdmin,
  expressAsyncHandler(async (req, res) => {
    const users = await User.find({});
    res.send(users);
  })
);

// Update own profile
userRouter.put(
  '/profile',
  isAuth,
  expressAsyncHandler(async (req, res) => {
    const user = await User.findById(req.user._id);

    if (user) {
      // ✅ Basic profile fields
      user.name = req.body.name || user.name;
      user.email = req.body.email || user.email;
      user.phone = req.body.phone || user.phone;
      user.address = req.body.address || user.address;
      user.city = req.body.city || user.city;
      user.state = req.body.state || user.state;
      user.pinCode = req.body.pinCode || user.pinCode;

      // ✅ Handle password update if provided
      if (req.body.password) {
        user.password = bcrypt.hashSync(req.body.password, 10);
      }

      // ✅ Handle seller fields if user is seller
      if (user.isSeller && req.body.seller) {
        user.seller = {
          ...user.seller, // Preserve existing values
          name: req.body.seller.name || user.seller.name,
          logo: req.body.seller.logo || user.seller.logo,
          description: req.body.seller.description || user.seller.description,
        };
      }

      const updatedUser = await user.save();

      res.send({
        _id: updatedUser._id,
        name: updatedUser.name,
        email: updatedUser.email,
        isAdmin: updatedUser.isAdmin,
        isSeller: updatedUser.isSeller,
        seller: updatedUser.seller,
        token: req.user.token,
      });
    } else {
      res.status(404).send({ message: 'User not found' });
    }
  })
);

userRouter.get(
  '/:id',
  isAuth,
  isAdmin,
  expressAsyncHandler(async (req, res) => {
    const user = await User.findById(req.params.id);
    if (user) {
      res.send(user);
    } else {
      res.status(404).send({ message: 'User Not Found' });
    }
  })
);

userRouter.delete(
  '/:id',
  isAuth,
  isAdmin,
  expressAsyncHandler(async (req, res) => {
    const user = await User.findById(req.params.id);
    if (user) {
      if (user.email === 'admin@shopfusion.com') {
        res.status(400).send({ message: 'Can Not Delete Admin User' });
        return;
      }
      await user.deleteOne();
      res.send({ message: 'User Deleted' });
    } else {
      res.status(404).send({ message: 'User Not Found' });
    }
  })
);

userRouter.post(
  '/signin',
  expressAsyncHandler(async (req, res) => {
    const { identifier, password } = req.body;
    const user = await User.findOne({
      $or: [{ email: identifier }, { name: identifier }],
    });

    if (user && bcrypt.compareSync(password, user.password)) {
      res.send({
        _id: user._id,
        name: user.name,
        email: user.email,
        isAdmin: user.isAdmin,
        isSeller: user.isSeller,
        token: generateToken(user),
      });
    } else {
      res.status(401).send({ message: 'Invalid email/username or password' });
    }
  })
);

userRouter.post(
  '/signup',
  expressAsyncHandler(async (req, res) => {
    const { name, email, password, isSeller } = req.body; // <--- get isSeller from request

    const newUser = new User({
      name,
      email,
      password: bcrypt.hashSync(password),
      isSeller: isSeller || false, // <--- save seller status
    });

    const user = await newUser.save();

    res.send({
      _id: user._id,
      name: user.name,
      email: user.email,
      isAdmin: user.isAdmin,
      isSeller: user.isSeller, // <--- will now reflect checkbox
      token: generateToken(user),
    });
  })
);

userRouter.put(
  '/profile',
  isAuth,
  expressAsyncHandler(async (req, res) => {
    const user = await User.findById(req.user._id);
    if (user) {
      user.name = req.body.name || user.name;
      user.email = req.body.email || user.email;
      if (user.isSeller) {
        user.seller.name = req.body.sellerName || user.seller.name;
        user.seller.logo = req.body.sellerLogo || user.seller.logo;
        user.seller.description =
          req.body.sellerDescription || user.seller.description;
      }
      if (req.body.password) {
        user.password = bcrypt.hashSync(req.body.password, 8);
      }

      const updatedUser = await user.save();
      res.send({
        _id: updatedUser._id,
        name: updatedUser.name,
        email: updatedUser.email,
        isAdmin: updatedUser.isAdmin,
        isSeller: updatedUser.isSeller,
        token: generateToken(updatedUser),
      });
    } else {
      res.status(404).send({ message: 'User not found' });
    }
  })
);

userRouter.post(
  '/forget-password',
  expressAsyncHandler(async (req, res) => {
    const user = await User.findOne({ email: req.body.email });

    if (user) {
      const token = jwt.sign({ _id: user._id }, process.env.JWT_SECRET, {
        expiresIn: '3h',
      });
      user.resetToken = token;
      await user.save();

      //reset link
      console.log(`${baseUrl()}/reset-password/${token}`);

      mailgun()
        .messages()
        .send(
          {
            from: 'ShopFusion <admin@shopfusion.com>',
            to: `${user.name} <${user.email}>`,
            subject: 'Reset Your Password - ShopFusion',
            html: `
      <div style="font-family: Arial, sans-serif; background-color: #f5f7fa; padding: 30px;">
        <div style="max-width: 600px; margin: auto; background-color: #ffffff; border-radius: 10px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.1);">
          <div style="background-color: #0f172a; padding: 20px; text-align: center;">
            <h1 style="color: #ffffff; margin: 0; font-size: 26px;">ShopFusion</h1>
          </div>
          <div style="padding: 30px;">
            <h2 style="color: #1e293b;">Hi ${user.name},</h2>
            <p style="color: #475569; font-size: 15px; line-height: 1.6;">
              We received a request to reset your password. If you made this request, please click the button below:
            </p>
            <div style="text-align: center; margin: 25px 0;">
              <a href="${baseUrl()}/reset-password/${token}" 
                 style="background-color: #2563eb; color: white; padding: 12px 25px; border-radius: 6px; font-size: 16px; text-decoration: none; display: inline-block;">
                 Reset Password
              </a>
            </div>
            <p style="color: #64748b; font-size: 14px; line-height: 1.5;">
              If you didn’t request this, you can safely ignore this email.  
              The link will expire in <strong>3 hours</strong>.
            </p>
            <p style="color: #94a3b8; font-size: 13px; margin-top: 20px;">
              If the button doesn't work, copy and paste this URL into your browser:
            </p>
            <p style="color: #2563eb; font-size: 13px; word-break: break-all;">
              ${baseUrl()}/reset-password/${token}
            </p>
            <hr style="margin: 25px 0; border: none; border-top: 1px solid #e2e8f0;">
            <p style="font-size: 13px; color: #94a3b8; text-align: center;">
              Need help? Contact us at 
              <a href="mailto:support@shopfusion.com" style="color: #2563eb; text-decoration: none;">support@shopfusion.com</a>
            </p>
          </div>
        </div>
      </div>
      `,
          },
          (error, body) => {
            console.log(error || body);
          }
        );

      res.send({ message: 'We sent reset password link to your email.' });
    } else {
      res.status(404).send({ message: 'User not found' });
    }
  })
);

userRouter.post(
  '/reset-password',
  expressAsyncHandler(async (req, res) => {
    jwt.verify(req.body.token, process.env.JWT_SECRET, async (err, decode) => {
      if (err) {
        return res.status(401).send({ message: 'Invalid Token' });
      } else {
        const user = await User.findOne({ resetToken: req.body.token });
        if (user) {
          if (req.body.password) {
            // Update password
            user.password = bcrypt.hashSync(req.body.password, 8);

            // Clear reset token after successful reset
            user.resetToken = undefined;
            await user.save();

            // Send success email
            mailgun()
              .messages()
              .send(
                {
                  from: 'ShopFusion <admin@shopfusion.com>',
                  to: `${user.name} <${user.email}>`,
                  subject: 'Password Reset Successful - ShopFusion',
                  html: `
      <div style="font-family: Arial, sans-serif; background-color: #f5f7fa; padding: 30px;">
        <div style="max-width: 600px; margin: auto; background-color: #ffffff; border-radius: 10px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.1);">
          <div style="background-color: #0f172a; padding: 20px; text-align: center;">
            <h1 style="color: #ffffff; margin: 0; font-size: 26px;">ShopFusion</h1>
          </div>
          <div style="padding: 30px;">
            <h2 style="color: #1e293b;">Hello ${user.name},</h2>
            <p style="color: #475569; font-size: 15px; line-height: 1.6;">
              Your password has been successfully reset. You can now log in to your account using your new password.
            </p>
            <div style="text-align: center; margin: 25px 0;">
              <a href="${baseUrl()}/signin" 
                 style="background-color: #16a34a; color: white; padding: 12px 25px; border-radius: 6px; font-size: 16px; text-decoration: none; display: inline-block;">
                 Go to Login
              </a>
            </div>
            <p style="color: #64748b; font-size: 14px; line-height: 1.5;">
              If you did not make this change, please 
              <a href="${baseUrl()}/forget-password" style="color: #ef4444; text-decoration: none;">reset your password</a> immediately.
            </p>
            <hr style="margin: 25px 0; border: none; border-top: 1px solid #e2e8f0;">
            <p style="font-size: 13px; color: #94a3b8; text-align: center;">
              Need help? Contact us at 
              <a href="mailto:support@shopfusion.com" style="color: #2563eb; text-decoration: none;">support@shopfusion.com</a>
            </p>
          </div>
        </div>
      </div>
      `,
                },
                (error, body) => {
                  console.log(error || body);
                }
              );

            return res.send({
              message: 'Password reset successfully. Confirmation email sent.',
            });
          }
        } else {
          return res.status(404).send({ message: 'User not found' });
        }
      }
    });
  })
);

export default userRouter;
