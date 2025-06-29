module.exports = {
  // Repository URL (will be auto-detected from Git)
  // repository: "https://github.com/username/simple-amm",
  
  // Project token (use environment variable)
  // token: process.env.ARGOS_TOKEN,
  
  // Upload directory for screenshots
  uploadDir: "./screenshots",
  
  // Parallel upload for faster performance
  parallel: true,
  
  // Reference branch for comparisons
  referenceBranch: "main",
  
  // Threshold for considering two images different (0-1)
  threshold: 0.01,
  
  // Fail CI on visual changes (requires --wait flag)
  failOnChanges: true,
  
  // Ignore regions (if needed)
  // ignore: [
  //   { x: 0, y: 0, width: 100, height: 50 }, // Example: ignore header
  // ],
};