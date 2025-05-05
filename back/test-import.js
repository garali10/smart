import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import path from 'path';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function testImport() {
  try {
    console.log('Current directory:', __dirname);
    console.log('Attempting to import mbtiQuestions...');
    
    // Check if file exists first
    const relativePath = './server/data/mbtiQuestions.js';
    const absolutePath = path.join(__dirname, 'server', 'data', 'mbtiQuestions.js');
    
    console.log('Checking file existence...');
    console.log('Relative path:', resolve(relativePath));
    console.log('Absolute path:', absolutePath);
    
    const relativeExists = fs.existsSync(relativePath);
    const absoluteExists = fs.existsSync(absolutePath);
    
    console.log('File exists (relative):', relativeExists);
    console.log('File exists (absolute):', absoluteExists);
    
    if (absoluteExists) {
      // Show file content
      console.log('\nFile content preview:');
      const content = fs.readFileSync(absolutePath, 'utf8');
      console.log(content.substring(0, 200) + '...');
    }
    
    // Try to import using relative path
    try {
      console.log('\nTrying import with relative path...');
      const { mbtiQuestions } = await import('./server/data/mbtiQuestions.js');
      console.log('Import successful using relative path!');
      console.log(`Found ${mbtiQuestions.length} questions`);
    } catch (err) {
      console.error('Import failed using relative path:', err);
    }
    
    // Try to import using absolute path
    try {
      console.log('\nTrying import with absolute path...');
      const { mbtiQuestions } = await import(absolutePath);
      console.log('Import successful using absolute path!');
      console.log(`Found ${mbtiQuestions.length} questions`);
    } catch (err) {
      console.error('Import failed using absolute path:', err);
    }
  } catch (err) {
    console.error('Test failed:', err);
  }
}

testImport(); 