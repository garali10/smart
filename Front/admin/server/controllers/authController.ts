import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';

const JWT_SECRET = 'your-secret-key'; // In production, use environment variable

interface User {
  id: string;
  email: string;
  password: string;
}

// Temporary user storage (replace with database in production)
const users: User[] = [];

export const authController = {
  login: async (req: Request, res: Response) => {
    const { email, password } = req.body;

    try {
      // For demo purposes, accept any login
      const token = jwt.sign({ email }, JWT_SECRET, { expiresIn: '1h' });
      
      res.json({
        token,
        user: {
          email,
          name: email.split('@')[0], // Demo user name
        }
      });
    } catch (error) {
      res.status(401).json({ message: 'Invalid credentials' });
    }
  },

  register: async (req: Request, res: Response) => {
    const { email, password } = req.body;

    try {
      // For demo purposes, accept any registration
      const token = jwt.sign({ email }, JWT_SECRET, { expiresIn: '1h' });
      
      res.json({
        token,
        user: {
          email,
          name: email.split('@')[0], // Demo user name
        }
      });
    } catch (error) {
      res.status(400).json({ message: 'Registration failed' });
    }
  }
}; 