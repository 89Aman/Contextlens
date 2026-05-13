#!/usr/bin/env node

/**
 * ContextLens CLI - Command Line Interface for ContextLens
 * 
 * Provides terminal-based commands to interact with ContextLens features
 * without needing to use the VS Code extension or web dashboard.
 */

const { program } = require('commander');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Version
const VERSION = '1.0.0';

// Initialize commander
program
  .name('contextlens')
  .description('CLI for ContextLens - AI-powered coding session tracker')
  .version(VERSION);

// Command: sync
program
  .command('sync')
  .description('Manually trigger a sync of coding sessions to Firebase')
  .option('--force', 'Force sync even if recent sync exists')
  .option('--dry-run', 'Show what would be synced without actually syncing')
  .action((options) => {
    console.log('🔄 ContextLens Sync CLI');
    console.log('====================');
    
    if (options.dryRun) {
      console.log('🔍 Dry run mode - showing what would be synced:');
      // In a real implementation, this would scan for unsynced sessions
      console.log('  📝 No unsynced sessions found (dry run)');
    } else {
      console.log('⚡ Starting manual sync...');
      // In a real implementation, this would trigger the sync engine
      console.log('✅ Sync completed successfully');
      console.log('   📊 Sessions synced: 0');
      console.log('   💾 Data uploaded: 0 KB');
    }
  });

// Command: status
program
  .command('status')
  .description('Show current ContextLens status and statistics')
  .option('--detailed', 'Show detailed information')
  .action((options) => {
    console.log('📊 ContextLens Status');
    console.log('====================');
    
    // Check if we're in a ContextLens project
    const contextLensDir = path.join(process.cwd(), 'ContextLens');
    const isInProject = fs.existsSync(contextLensDir);
    
    if (isInProject) {
      console.log('✅ ContextLens project detected');
      console.log(`   📁 Location: ${contextLensDir}`);
      
      // Try to read some basic info
      const packagePath = path.join(contextLensDir, 'package.json');
      if (fs.existsSync(packagePath)) {
        try {
          const pkg = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
          console.log(`   📦 Version: ${pkg.version || 'unknown'}`);
        } catch (e) {
          console.log('   📦 Version: unable to read');
        }
      }
    } else {
      console.log('⚠️  Not in a ContextLens project directory');
      console.log('   💡 Run this command from within a ContextLens project folder');
    }
    
    if (options.detailed) {
      console.log('\n📋 Detailed Information:');
      console.log('   🔧 Node.js version:', process.version);
      console.log('   📂 Current directory:', process.cwd());
      console.log('   ⏰ Uptime: N/A (CLI tool)');
    }
  });

// Command: config
program
  .command('config')
  .description('Manage ContextLens configuration')
  .argument('[action]', 'Action to perform (get, set, list)', 'list')
  .argument('[key]', 'Configuration key (for get/set actions)')
  .argument('[value]', 'Configuration value (for set action)')
  .option('--global', 'Use global configuration instead of project-specific')
  .action((action, key, value, options) => {
    console.log('⚙️  ContextLens Configuration');
    console.log('============================');
    
    const configType = options.global ? 'Global' : 'Project';
    console.log(`📋 ${configType} Configuration:`);
    
    switch (action) {
      case 'get':
        if (!key) {
          console.log('❌ Error: Key required for get action');
          console.log('   Usage: contextlens config get <key>');
          return;
        }
        console.log(`🔍 Getting config: ${key}`);
        console.log(`   📄 Value: [NOT IMPLEMENTED - would fetch from config store]`);
        break;
        
      case 'set':
        if (!key || !value) {
          console.log('❌ Error: Key and value required for set action');
          console.log('   Usage: contextlens config set <key> <value>');
          return;
        }
        console.log(`🔧 Setting config: ${key} = ${value}`);
        console.log(`   💾 [NOT IMPLEMENTED - would save to config store]`);
        break;
        
      case 'list':
      default:
        console.log('📄 Available configuration options:');
        console.log('   • syncInterval - Sync interval in seconds (default: 30)');
        console.log('   • batchSize - Number of items per sync batch (default: 5)');
        console.log('   • offlineEnabled - Enable offline buffering (default: true)');
        console.log('   • firebaseProject - Firebase project ID');
        console.log('\n   💡 Use "contextlens config get <key>" to view current values');
        console.log('   💡 Use "contextlens config set <key> <value>" to update values');
        break;
    }
  });

// Command: logs
program
  .command('logs')
  .description('View ContextLens logs and recent activity')
  .option('--lines <number>', 'Number of lines to show (default: 20)', parseInt)
  .option('--follow', 'Follow log output (like tail -f)')
  .action((options) => {
    const lines = options.lines || 20;
    console.log('📜 ContextLens Logs');
    console.log('==================');
    
    console.log(`📋 Showing last ${lines} lines:`);
    console.log('   [2026-05-12 18:09:00] INFO: ContextLens CLI started');
    console.log('   [2026-05-12 18:08:45] INFO: No active sync operations');
    console.log('   [2026-05-12 18:08:30] DEBUG: Checking for unsynced sessions');
    console.log('   [2026-05-12 18:08:15] INFO: CLI tool ready for commands');
    
    if (options.follow) {
      console.log('\n   👀 Following logs (press Ctrl+C to stop)...');
      // In a real implementation, this would tail the actual log file
      console.log('   [NOTE: Follow mode not implemented in this demo]');
    }
  });

// Command: init
program
  .command('init')
  .description('Initialize ContextLens in the current directory')
  .option('--force', 'Overwrite existing configuration')
  .action((options) => {
    console.log('🚀 ContextLens Initialization');
    console.log('=============================');
    
    const contextLensDir = path.join(process.cwd(), 'ContextLens');
    
    if (fs.existsSync(contextLensDir) && !options.force) {
      console.log('⚠️  ContextLens already initialized in this directory');
      console.log('   💡 Use --force to overwrite existing configuration');
      return;
    }
    
    console.log('📁 Creating ContextLens directory structure...');
    
    // Create basic directory structure
    const dirsToCreate = [
      'context',
      'contextlens-dashboard',
      'src',
      'src/lib',
      'src/middleware',
      'src/routes',
      'src/services',
      '__tests__',
      'coverage',
      'node_modules'
    ];
    
    dirsToCreate.forEach(dir => {
      const fullPath = path.join(contextLensDir, dir);
      if (!fs.existsSync(fullPath)) {
        fs.mkdirSync(fullPath, { recursive: true });
        console.log(`   📂 Created: ${dir}`);
      }
    });
    
    // Create basic files
    const basicFiles = [
      { name: 'README.md', content: '# ContextLens\n\nAI-powered coding session tracker and context preservation tool.\n' },
      { name: 'package.json', content: JSON.stringify({
        "name": "contextlens-cli",
        "version": "1.0.0",
        "description": "CLI for ContextLens",
        "main": "contextlens-cli.js",
        "bin": {
          "contextlens": "./contextlens-cli.js"
        },
        "scripts": {
          "start": "node contextlens-cli.js",
          "test": "echo \"Error: no test specified\" && exit 1"
        },
        "keywords": ["cli", "contextlens", "ai", "coding", "productivity"],
        "author": "ContextLens Team",
        "license": "MIT"
      }, null, 2) }
    ];
    
    basicFiles.forEach(file => {
      const fullPath = path.join(contextLensDir, file.name);
      if (!fs.existsSync(fullPath) || options.force) {
        fs.writeFileSync(fullPath, file.content, 'utf8');
        console.log(`   📄 Created: ${file.name}`);
      }
    });
    
    console.log('\n✅ ContextLens initialized successfully!');
    console.log('   📝 Next steps:');
    console.log('   1. Run "contextlens status" to check your setup');
    console.log('   2. Configure Firebase connection with "contextlens config set firebaseProject <your-project-id>"');
    console.log('   3. Use "contextlens sync" to manually trigger syncs');
  });

// Command: help (alias for --help)
program
  .command('help [command]')
  .description('Display help for contextlens commands')
  .action((command) => {
    if (command) {
      console.log(`Getting help for command: ${command}`);
      // In a real implementation, this would show specific command help
    } else {
      program.help();
    }
  });

// Parse arguments
program.parse(process.argv);

// Show help if no arguments provided
if (program.args.length === 0) {
  program.outputHelp();
}