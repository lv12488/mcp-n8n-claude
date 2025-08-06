const fs = require('fs');
const path = require('path');

console.log('=== DEBUGGING RAILWAY DEPLOYMENT ===');
console.log('Current working directory:', process.cwd());
console.log('Environment:', process.env.NODE_ENV);

// List all files in current directory
console.log('Files in root directory:');
try {
    const files = fs.readdirSync('.');
    files.forEach(file => {
        const stats = fs.statSync(file);
        console.log(`- ${file} (${stats.isDirectory() ? 'dir' : 'file'})`);
    });
} catch (err) {
    console.log('Error reading directory:', err.message);
}

// Check build directory
console.log('\nChecking build directory:');
try {
    if (fs.existsSync('build')) {
        console.log('build/ directory exists');
        const buildFiles = fs.readdirSync('build');
        buildFiles.forEach(file => {
            console.log(`- build/${file}`);
        });
        
        // Try to start the actual server if build/index.js exists
        if (fs.existsSync('build/index.js')) {
            console.log('build/index.js found, attempting to start...');
            require('./build/index.js');
        } else {
            console.log('build/index.js NOT FOUND');
        }
    } else {
        console.log('build/ directory does NOT exist');
    }
} catch (err) {
    console.log('Error checking build directory:', err.message);
}

// Check src directory
console.log('\nChecking src directory:');
try {
    if (fs.existsSync('src')) {
        console.log('src/ directory exists');
        const srcFiles = fs.readdirSync('src');
        srcFiles.forEach(file => {
            console.log(`- src/${file}`);
        });
    } else {
        console.log('src/ directory does NOT exist');
    }
} catch (err) {
    console.log('Error checking src directory:', err.message);
}

// Keep server running
const port = process.env.PORT || 3456;
const http = require('http');
const server = http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('MCP Server Debug Mode - Check logs for details');
});

server.listen(port, () => {
    console.log(`Debug server running on port ${port}`);
});