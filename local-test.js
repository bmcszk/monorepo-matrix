#!/usr/bin/env node

// Simple local test script for the action
require('dotenv').config();

// Mock GitHub Actions environment
const originalCore = require('@actions/core');
const originalExec = require('@actions/exec');
const originalGithub = require('@actions/github');

// Mock the core inputs
originalCore.getInput = (name) => {
  const envVar = `INPUT_${name.toUpperCase().replace(/-/g, '_')}`;
  return process.env[envVar] || '';
};

// Mock GitHub context with realistic test data
originalGithub.context = {
  repo: {
    owner: process.env.GITHUB_REPOSITORY?.split('/')[0] || 'testowner',
    repo: process.env.GITHUB_REPOSITORY?.split('/')[1] || 'testrepo'
  },
  payload: {
    before: 'abc123',
    after: 'def456'
  }
};

// Mock exec to avoid actual git commands in testing
let mockGitChanges = [
  'pkg/consumer.js',
  'services/consumer/index.js',
  'README.md'
];

originalExec.exec = (command, args, options) => {
  return new Promise((resolve, reject) => {
    console.log(`[MOCK] Executing: ${command} ${args?.join(' ') || ''}`);

    if (command === 'git' && args?.includes('diff')) {
      // Simulate git diff output
      options?.listeners?.stdout?.(Buffer.from(mockGitChanges.join('\n')));
      resolve({ exitCode: 0 });
    } else if (command === 'git' && args?.includes('rev-parse')) {
      options?.listeners?.stdout?.(Buffer.from('def456'));
      resolve({ exitCode: 0 });
    } else {
      resolve({ exitCode: 0 });
    }
  });
};

// Mock octokit API calls
const mockOctokit = {
  rest: {
    actions: {
      listWorkflowRuns: () => Promise.resolve({
        data: {
          workflow_runs: [
            { head_commit: { id: 'abc123' } }
          ]
        }
      })
    }
  }
};

originalGithub.getOctokit = () => mockOctokit;

// Set environment variables for testing
process.env.GITHUB_WORKFLOW_REF = 'main.yml@main';
process.env.GITHUB_HEAD_REF = 'feature-branch';
process.env.GITHUB_REF = 'refs/heads/main';
process.env.GITHUB_EVENT_NAME = 'push';
process.env.GITHUB_REPOSITORY = 'testowner/testrepo';
process.env.GITHUB_WORKSPACE = '/tmp/workspace';

console.log('🚀 Starting local action test...\n');

// Run the actual action
try {
  require('./index.js');
  console.log('\n✅ Local action test completed successfully!');
} catch (error) {
  console.error('\n❌ Local action test failed:', error.message);
  process.exit(1);
}