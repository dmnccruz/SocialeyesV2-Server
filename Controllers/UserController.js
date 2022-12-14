import UserModel from '../Models/userModel.js';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

// Get all Users
export const getAllUsers = async (req, res) => {
  try {
    let users = await UserModel.find();
    users = users.map((user) => {
      const { password, ...otherDetails } = user._doc;
      return otherDetails;
    });
    res.status(200).json(users);
  } catch (error) {
    res.status(500).json(error);
  }
};

// Get a User
export const getUser = async (req, res) => {
  const id = req.params.id;

  try {
    const user = await UserModel.findById(id);
    if (user) {
      const { password, ...otherDetails } = user._doc;
      res.status(200).json(otherDetails);
    } else {
      res.status(404).json('User does not exist.');
    }
  } catch (error) {
    res.status(500).json(error);
  }
};

// Update a User
export const updateUser = async (req, res) => {
  const id = req.params.id;
  const { _id: currentUserId, currentUserAdminStatus, password } = req.body;

  if (id === currentUserId || currentUserAdminStatus) {
    try {
      if (password) {
        const salt = await bcrypt.genSalt(10);
        req.body.password = await bcrypt.hash(password, salt);
      }
      const user = await UserModel.findByIdAndUpdate(id, req.body, {
        new: true,
      });

      const token = jwt.sign(
        {
          username: user.username,
          id: user._id,
        },
        process.env.JWT_KEY,
        { expiresIn: '1h' }
      );

      res.status(200).json({ user, token });
    } catch (error) {
      res.status(500).json(error);
    }
  } else {
    res
      .status(403)
      .json('Access Denied! You can only update your own profile.');
  }
};

// Delete a User
export const deleteUser = async (req, res) => {
  const id = req.params.id;

  const { currentUserId, currentUserAdminStatus } = req.body;
  if (id === currentUserId || currentUserAdminStatus) {
    try {
      await UserModel.findByIdAndDelete(id);
      res.status(200).json('User deleted.');
    } catch (error) {
      res.status(500).json(error);
    }
  } else {
    res
      .status(403)
      .json('Access Denied! You can only delete your own profile.');
  }
};

// Follow a User
export const followUser = async (req, res) => {
  const id = req.params.id;

  const { _id: currentUserId } = req.body;
  if (id === currentUserId) {
    res.status(403).json('Action forbidden.');
  } else {
    try {
      const followUser = await UserModel.findById(id);
      const followingUser = await UserModel.findById(currentUserId);

      if (!followUser.followers.includes(currentUserId)) {
        await followUser.updateOne({ $push: { followers: currentUserId } });
        await followingUser.updateOne({ $push: { following: id } });
        res.status(200).json(`You are now following ${followUser.firstname}.`);
      } else {
        res
          .status(403)
          .json(`You are already following ${followUser.firstname}.`);
      }
    } catch (error) {
      res.status(500).json(error);
    }
  }
};

// Unfollow a User
export const unfollowUser = async (req, res) => {
  const id = req.params.id;

  const { _id: currentUserId } = req.body;
  if (id === currentUserId) {
    res.status(403).json('Action forbidden.');
  } else {
    try {
      const followUser = await UserModel.findById(id);
      const followingUser = await UserModel.findById(currentUserId);

      if (followUser.followers.includes(currentUserId)) {
        await followUser.updateOne({ $pull: { followers: currentUserId } });
        await followingUser.updateOne({ $pull: { following: id } });
        res.status(200).json(`Unfollowed ${followUser.firstname}.`);
      } else {
        res.status(403).json(`You are not following ${followUser.firstname}.`);
      }
    } catch (error) {
      res.status(500).json(error);
    }
  }
};
