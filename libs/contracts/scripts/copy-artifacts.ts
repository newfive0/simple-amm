import * as fs from 'fs';
import * as path from 'path';

function copyArtifacts() {
  const sourceDir = path.join(__dirname, '../artifacts/src');
  const targetDir = path.join(
    __dirname,
    '../../../apps/frontend/public/artifacts',
  );

  // Create target directory if it doesn't exist
  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
  }

  try {
    // Copy Token artifact
    const tokenArtifactPath = path.join(sourceDir, 'Token.sol/Token.json');
    const tokenArtifact = fs.readFileSync(tokenArtifactPath, 'utf8');
    const tokenJson = JSON.parse(tokenArtifact);
    fs.writeFileSync(
      path.join(targetDir, 'Token.json'),
      JSON.stringify(tokenJson, null, 2),
    );

    // Copy AMMPool artifact
    const ammPoolArtifactPath = path.join(sourceDir, 'AMMPool.sol/AMMPool.json');
    const ammPoolArtifact = fs.readFileSync(ammPoolArtifactPath, 'utf8');
    const ammPoolJson = JSON.parse(ammPoolArtifact);
    fs.writeFileSync(
      path.join(targetDir, 'AMMPool.json'),
      JSON.stringify(ammPoolJson, null, 2),
    );

    // Copy deployed addresses if they exist
    const deployedAddressesSource = path.join(
      __dirname,
      '../ignition/deployments/chain-31337/deployed_addresses.json'
    );
    const deployedAddressesTarget = path.join(
      __dirname,
      '../../../apps/frontend/public/deployed_addresses.json'
    );
    
    if (fs.existsSync(deployedAddressesSource)) {
      fs.copyFileSync(deployedAddressesSource, deployedAddressesTarget);
      console.log('Deployed addresses copied successfully!');
    }

    console.log('Artifacts copied successfully!');
  } catch (error) {
    console.error('Error copying artifacts:', error);
    process.exit(1);
  }
}

copyArtifacts();
