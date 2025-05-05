import yup from 'yup';
import mongoose from 'mongoose';

const departmentHeadSchema = yup.object().shape({
  company: yup.string().required('Company name is required'),
  posted_jobs: yup.array().of(yup.number()),
  candidatList: yup.array().of(yup.number())
});

const hrSchema = yup.object().shape({
  name: yup.string().required('Name is required'),
  email: yup.string()
    .email('Invalid email')
    .required('Email is required')
    .matches(/@esprit.tn$/, 'Must be an esprit.tn email'),
  department: yup.string().required('Department is required')
});

const candidateSchema = yup.object().shape({
  name: yup.string().required('Name is required'),
  email: yup.string()
    .email('Invalid email')
    .required('Email is required')
    .matches(/@esprit.tn$/, 'Must be an esprit.tn email'),
  resume: yup.string().required('Resume is required'),
  skills: yup.array().of(yup.string()).required('Skills are required'),
  experience: yup.number().required('Experience is required'),
  education: yup.array().of(yup.string()).required('Education is required')
});

export const validateDepartmentHead = async (req, res, next) => {
  try {
    await departmentHeadSchema.validate(req.body);
    next();
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

export const validateHR = async (req, res, next) => {
  try {
    await hrSchema.validate(req.body);
    next();
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

export const validateCandidate = async (req, res, next) => {
  try {
    await candidateSchema.validate(req.body);
    next();
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

export const validateObjectId = (req, res, next) => {
  if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
    return res.status(400).json({ 
      message: 'Invalid ID format' 
    });
  }
  next();
};

export const validateNumericId = (req, res, next) => {
  const id = parseInt(req.params.id);
  if (isNaN(id) || id < 1) {
    return res.status(400).json({ 
      message: 'Invalid ID format. ID must be a positive number.' 
    });
  }
  req.params.id = id;
  next();
};

export const validateRole = async (req, res, next) => {
  const validRoles = ['hr', 'departmentHead', 'candidate'];
  
  if (!req.body.role || !validRoles.includes(req.body.role)) {
    return res.status(400).json({ 
      message: 'Invalid role. Must be one of: ' + validRoles.join(', ') 
    });
  }
  next();
};

export const validateProfile = async (req, res, next) => {
  const schema = yup.object().shape({
    name: yup.string().min(2, 'Name must be at least 2 characters'),
    email: yup.string().email('Invalid email format')
  });

  try {
    await schema.validate(req.body);
    next();
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

export const validatePassword = async (req, res, next) => {
  const schema = yup.object().shape({
    currentPassword: yup.string().required('Current password is required'),
    newPassword: yup.string()
      .min(8, 'Password must be at least 8 characters')
      .matches(/[0-9]/, 'Password must contain at least one number')
      .matches(/[a-z]/, 'Password must contain at least one lowercase letter')
      .matches(/[A-Z]/, 'Password must contain at least one uppercase letter')
  });

  try {
    await schema.validate(req.body);
    next();
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
}; 