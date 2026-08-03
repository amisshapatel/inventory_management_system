import User from './model.js';
import Role from '../roles/model.js';

export const getUsers = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 50;
    const skip = (page - 1) * limit;

    const count = await User.countDocuments();
    const users = await User.find()
      .populate('role', 'name permissions')
      .select('-password')
      .skip(skip)
      .limit(limit);

    res.status(200).json({
      success: true,
      count,
      page,
      pages: Math.ceil(count / limit),
      data: users
    });
  } catch (error) {
    next(error);
  }
};

export const createUser = async (req, res, next) => {
  try {
    const { name, email, password, roleName } = req.body;

    if (!name || !email || !password || !roleName) {
      res.status(400);
      throw new Error('Please fill in all required fields');
    }

    const emailExists = await User.findOne({ email });
    if (emailExists) {
      res.status(400);
      throw new Error('Email is already registered');
    }

    const role = await Role.findOne({ name: roleName });
    if (!role) {
      res.status(400);
      throw new Error(`Role '${roleName}' does not exist`);
    }

    const user = await User.create({
      name,
      email,
      password,
      role: role._id,
      status: 'Active'
    });

    res.status(201).json({
      success: true,
      data: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: roleName,
        status: user.status
      }
    });
  } catch (error) {
    next(error);
  }
};

export const updateUser = async (req, res, next) => {
  try {
    const { name, email, roleName, status } = req.body;
    const user = await User.findById(req.params.id);

    if (!user) {
      res.status(404);
      throw new Error('User not found');
    }

    if (name) user.name = name;
    if (email) {
      const emailExists = await User.findOne({ email, _id: { $ne: user._id } });
      if (emailExists) {
        res.status(400);
        throw new Error('Email is already in use');
      }
      user.email = email;
    }
    
    if (roleName) {
      const role = await Role.findOne({ name: roleName });
      if (!role) {
        res.status(400);
        throw new Error(`Role '${roleName}' does not exist`);
      }
      user.role = role._id;
    }

    if (status) {
      // Prevent admin from deactivating themselves
      if (user.email === 'admin@example.com' && status === 'Inactive') {
        res.status(400);
        throw new Error('Cannot deactivate the root admin user');
      }
      user.status = status;
    }

    await user.save();
    const updatedUser = await User.findById(user._id).populate('role');

    res.status(200).json({
      success: true,
      data: {
        _id: updatedUser._id,
        name: updatedUser.name,
        email: updatedUser.email,
        role: updatedUser.role.name,
        status: updatedUser.status
      }
    });
  } catch (error) {
    next(error);
  }
};

export const deleteUser = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);

    if (!user) {
      res.status(404);
      throw new Error('User not found');
    }

    if (user.email === 'admin@example.com') {
      res.status(400);
      throw new Error('Cannot delete the root admin user');
    }

    await User.findByIdAndDelete(req.params.id);

    res.status(200).json({
      success: true,
      message: 'User deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};
