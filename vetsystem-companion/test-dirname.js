import { fileURLToPath } from 'url';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('✓ Test passed!');
console.log('__filename:', __filename);
console.log('__dirname:', __dirname);
console.log('');
console.log('Если вы видите это сообщение - исправление работает!');
