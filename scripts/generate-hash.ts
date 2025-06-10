import bcrypt from 'bcryptjs';

const password = 'password123'; // This is the password we want to hash
const saltRounds = 10;

async function generateHash() {
  try {
    const hash = await bcrypt.hash(password, saltRounds);
    console.log('Hashed password:', hash);
  } catch (error) {
    console.error('Error generating hash:', error);
  }
}

void generateHash(); 