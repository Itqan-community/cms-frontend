#!/usr/bin/env node

'use strict';

const { execSync } = require('child_process');
const fs = require('fs');
const https = require('https');

const version = process.env.NEXT_VERSION;
const apiKey = process.env.GEMINI_API_KEY;

if (!version) {
  console.error('NEXT_VERSION env var required');
  process.exit(1);
}

let prevTag = null;
try {
  prevTag = execSync('git describe --tags --abbrev=0 HEAD^', { encoding: 'utf8' }).trim();
} catch {
  // First release — no previous tag
}

const range = prevTag ? `${prevTag}..HEAD` : '--max-count=50';
const commits = execSync(`git log ${range} --format="- %s" --no-merges`, {
  encoding: 'utf8',
}).trim();

if (!commits) {
  console.log('No commits found, skipping AI notes generation');
  process.exit(0);
}

function writeOutputs(aiNotes) {
  fs.writeFileSync('/tmp/ai-release-notes.txt', aiNotes, 'utf8');
  console.log('AI release notes saved to /tmp/ai-release-notes.txt');

  const date = new Date().toISOString().split('T')[0];
  const entry = `## [${version}] - ${date}\n\n${aiNotes}\n\n---\n\n`;

  const changelogPath = 'CHANGELOG.md';
  let content = fs.existsSync(changelogPath)
    ? fs.readFileSync(changelogPath, 'utf8')
    : '# Changelog\n\n## [Unreleased]\n\n';

  if (content.includes('\n## [Unreleased]')) {
    content = content.replace('\n## [Unreleased]', `\n${entry}## [Unreleased]`);
  } else {
    content = content.replace(/^(# .+\n)/, `$1\n${entry}`);
  }

  fs.writeFileSync(changelogPath, content, 'utf8');
  console.log(`CHANGELOG.md updated for v${version}`);
}

if (!apiKey) {
  console.warn('GEMINI_API_KEY not set, using fallback release notes');
  writeOutputs(`Release ${version}. See commit history for full details.`);
  process.exit(0);
}

const prompt =
  `You are a technical writer for an open-source Islamic/Quranic content management platform.\n` +
  `Write concise release notes for version ${version} based on these git commits:\n\n${commits}\n\n` +
  `Format:\n` +
  `- Start with 1-2 sentences summarising what this release brings.\n` +
  `- Then use only the sections that are relevant: ## What's New, ## Bug Fixes, ## Breaking Changes.\n` +
  `- Be specific. Plain language. No filler words. Target audience: developers integrating with the platform.`;

const requestBody = JSON.stringify({
  contents: [{ parts: [{ text: prompt }] }],
  generationConfig: { maxOutputTokens: 1024, temperature: 0.3 },
});

const options = {
  hostname: 'generativelanguage.googleapis.com',
  path: `/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(requestBody),
  },
};

const req = https.request(options, (res) => {
  let data = '';
  res.on('data', (chunk) => {
    data += chunk;
  });
  res.on('end', () => {
    let aiNotes;
    try {
      const parsed = JSON.parse(data);
      aiNotes = parsed.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
      if (!aiNotes) throw new Error('Empty candidate response');
    } catch (e) {
      console.error('Gemini API error, using fallback:', e.message);
      aiNotes = `Release ${version}. See commit history for full details.`;
    }
    writeOutputs(aiNotes);
  });
});

req.on('error', (e) => {
  console.error('HTTP request failed, using fallback:', e.message);
  writeOutputs(`Release ${version}. See commit history for full details.`);
});
req.write(requestBody);
req.end();
