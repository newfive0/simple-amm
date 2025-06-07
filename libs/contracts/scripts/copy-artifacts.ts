import * as fs from 'fs';
import * as path from 'path';

const sourceDir = path.join(__dirname, '../artifacts/src');
const targetDir = path.join(
  __dirname,
  '../../../apps/frontend/public/artifacts',
);

// Create target directory if it doesn't exist
if (!fs.existsSync(targetDir)) {
  fs.mkdirSync(targetDir, { recursive: true });
}

// Copy Token artifact
const tokenArtifact = JSON.parse(
  fs.readFileSync(path.join(sourceDir, 'Token.sol/Token.json'), 'utf8'),
);
fs.writeFileSync(
  path.join(targetDir, 'Token.json'),
  JSON.stringify(tokenArtifact, null, 2),
);

// Copy AMMPool artifact
const ammPoolArtifact = JSON.parse(
  fs.readFileSync(path.join(sourceDir, 'AMMPool.sol/AMMPool.json'), 'utf8'),
);
fs.writeFileSync(
  path.join(targetDir, 'AMMPool.json'),
  JSON.stringify(ammPoolArtifact, null, 2),
);

console.log('Artifacts copied successfully!');
