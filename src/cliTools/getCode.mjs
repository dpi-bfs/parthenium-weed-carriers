import * as crypto from 'crypto';

const bytes = crypto.randomBytes(32);
console.log(bytes.toString('hex')); // Convert the bytes to a hexadecimal string for easy viewing
