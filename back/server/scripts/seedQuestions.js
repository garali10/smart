import mongoose from 'mongoose';
import Question from '../models/Question.js';
import { mbtiQuestions } from '../data/mbtiQuestions.js';
import dotenv from 'dotenv';

dotenv.config();

async function seedQuestions() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    // Clear existing questions
    await Question.deleteMany({});
    console.log('Cleared existing questions');

    // Insert new questions
    const questions = await Question.insertMany(mbtiQuestions);
    console.log(`Inserted ${questions.length} questions`);

    // Close the connection
    await mongoose.connection.close();
    console.log('Database connection closed');
  } catch (error) {
    console.error('Error seeding questions:', error);
    process.exit(1);
  }
}

 