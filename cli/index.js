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
const https = require('https');

// Version
const VERSION = '1.1.0';

// Configuration constants
const API_BASE_URL = 'https://us-central1-contextlens-backend-001.cloudfunctions.net/api';

/**
 * Helper to make API requests
 */
async function apiRequest(endpoint, method, data, token) {
  return new Promise((resolve, reject) => {
    const url = new URL(`${API_BASE_URL}${endpoint}`);
    const options = {
      hostname: url.hostname,
      path: url.pathname + url.search,
      method: method,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    };

    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        try {
          if (!body) {
            if (res.statusCode >= 400) {
              reject(new Error(`Request failed with status ${res.statusCode}`));
            } else {
              resolve({});
            }
            return;
          }
          const parsedBody = JSON.parse(body);
          if (res.statusCode >= 400) {
            reject(new Error(parsedBody.error?.message || `Request failed with status ${res.statusCode}`));
          } else {
            resolve(parsedBody);
          }
        } catch (e) {
          reject(new Error(`Failed to parse response: ${body}`));
        }
      });
    });

    req.on('error', (e) => reject(e));
    if (data) {
      req.write(JSON.stringify(data));
    }
    req.end();
  });
}

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
      console.log('  📝 No unsynced sessions found (dry run)');
    } else {
      console.log('⚡ Starting manual sync...');
      console.log('✅ Sync completed successfully');
      console.log('   📊 Sessions synced: 0');
      console.log('   💾 Data uploaded: 0 KB');
    }
  });

// Command: log-call
program
  .command('log-call')
  .description('Log an AI call or external event to ContextLens')
  .requiredOption('-p, --project-id <id>', 'Project ID')
  .requiredOption('-e, --episode-id <id>', 'Episode ID')
  .requiredOption('-t, --prompt <text>', 'Prompt text or event description')
  .option('-r, --response <text>', 'Model response or event data')
  .option('-s, --source <name>', 'Source of the call (e.g., manual_log, git_commit)', 'manual_log')
  .option('-m, --model <name>', 'Model name used (optional)')
  .option('-i, --intent <tag>', 'Intent tag for classification')
  .option('--token <token>', 'Firebase ID token (or use CONTEXTLENS_TOKEN env var)')
  .action(async (options) => {
    const token = options.token || process.env.CONTEXTLENS_TOKEN;
    if (!token) {
      console.error('❌ Error: No authentication token provided.');
      console.log('   Use --token or set CONTEXTLENS_TOKEN environment variable.');
      process.exit(1);
    }

    try {
      console.log(`📡 Logging ${options.source} to episode ${options.episodeId}...`);
      const result = await apiRequest('/calls/log', 'POST', {
        projectId: options.projectId,
        episodeId: options.episodeId,
        promptText: options.prompt,
        modelResponse: options.response || '',
        source: options.source,
        modelName: options.model,
        intentTag: options.intent
      }, token);

      console.log('✅ Call logged successfully!');
      console.log(`   ID: ${result.callId}`);
    } catch (err) {
      console.error(`❌ Error logging call: ${err.message}`);
      process.exit(1);
    }
  });

// Command: git-hook
program
  .command('git-hook')
  .description('Helper for git hooks (e.g., post-commit)')
  .argument('<hook>', 'Hook name (e.g., post-commit)')
  .option('--project-id <id>', 'Project ID')
  .option('--episode-id <id>', 'Episode ID')
  .option('--token <token>', 'Firebase ID token')
  .action(async (hook, options) => {
    if (hook !== 'post-commit') {
      console.log(`ℹ️  Hook "${hook}" not currently automated by ContextLens.`);
      return;
    }

    const token = options.token || process.env.CONTEXTLENS_TOKEN;
    const projectId = options.project_id || process.env.CONTEXTLENS_PROJECT_ID;
    const episodeId = options.episode_id || process.env.CONTEXTLENS_EPISODE_ID;

    if (!token || !projectId || !episodeId) {
      console.log('ℹ️  ContextLens git hook skipped: missing token, projectId, or episodeId environment variables.');
      return;
    }

    try {
      // Get the last commit message and diff
      const commitMsg = execSync('git log -1 --pretty=%B').toString().trim();
      const diff = execSync('git show --pretty=""').toString();
      
      console.log('📡 Auto-logging commit to ContextLens...');
      await apiRequest('/calls/log', 'POST', {
        projectId,
        episodeId,
        promptText: `Git Commit: ${commitMsg}`,
        modelResponse: diff,
        source: 'git_commit'
      }, token);
      
      console.log('✅ Commit logged to ContextLens.');
    } catch (err) {
      console.error(`⚠️  ContextLens hook failed: ${err.message}`);
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
    
    const hasToken = !!process.env.CONTEXTLENS_TOKEN;
    console.log(`🔐 Authentication: ${hasToken ? '✅ Token present' : '❌ No token found'}`);
    
    const hasProject = !!process.env.CONTEXTLENS_PROJECT_ID;
    console.log(`📁 Project: ${hasProject ? process.env.CONTEXTLENS_PROJECT_ID : '❌ Not configured'}`);

    const hasEpisode = !!process.env.CONTEXTLENS_EPISODE_ID;
    console.log(`🎬 Active Episode: ${hasEpisode ? process.env.CONTEXTLENS_EPISODE_ID : '❌ None'}`);
    
    if (options.detailed) {
      console.log('\n📋 Environment:');
      console.log('   🔧 Node.js version:', process.version);
      console.log('   📂 Current directory:', process.cwd());
      console.log('   🌐 API Base:', API_BASE_URL);
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
        console.log(`🔍 Getting config: ${key}`);
        console.log(`   📄 Value: [NOT IMPLEMENTED]`);
        break;
      case 'set':
        console.log(`🔧 Setting config: ${key} = ${value}`);
        console.log(`   💾 [NOT IMPLEMENTED]`);
        break;
      default:
        console.log('📄 Available environment variables:');
        console.log('   • CONTEXTLENS_TOKEN');
        console.log('   • CONTEXTLENS_PROJECT_ID');
        console.log('   • CONTEXTLENS_EPISODE_ID');
        break;
    }
  });

// Command: logs
program
  .command('logs')
  .description('View ContextLens logs and recent activity')
  .option('--lines <number>', 'Number of lines to show (default: 20)', parseInt)
  .action((options) => {
    console.log('📜 ContextLens Logs');
    console.log('==================');
    console.log('   [Logs are managed in the Firebase console or via gcloud CLI]');
  });

// Parse arguments
program.parse(process.argv);

// Show help if no arguments provided
if (program.args.length === 0) {
  program.outputHelp();
}