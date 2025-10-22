const core = require('@actions/core');
const exec = require('@actions/exec');
const github = require('@actions/github');
const wcmatch = require('wildcard-match');

function parseMap(mapStr) {
    if (!mapStr || typeof mapStr !== 'string') {
        return {};
    }

    let map = {};
    for (let entryStr of mapStr.split(/[\n;]+/)) {
        if (!entryStr.includes('->')) {
            continue;
        }
        entryStr = entryStr.replace(/\s/g, '');
        let entry = entryStr.split('->', 2);
        let keys = entry[0].split('|');
        let vals = entry[1].split('|');
        for (let key of keys) {
            if (key === '') {
                continue;
            }
            map = { ...map, [key]: vals };
        }
    }
    return map;
}

function getAllValues(map) {
    const resultSet = new Set();
    for (let key in map) {
        for (let service of map[key]) {
            resultSet.add(service);
        }
    }
    return [...resultSet];
}

function getWorkflowFile() {
    let ref = process.env.GITHUB_WORKFLOW_REF;
    if (!ref) {
        return ref;
    }
    if (ref.includes('@')) {
        ref = ref.split('@')[0];
    }
    if (ref.includes('/')) {
        const array = ref.split('/');
        ref = array[array.length - 1];
    }
    return ref;
}

function getBranch() {
    if (process.env.GITHUB_HEAD_REF) {
        return process.env.GITHUB_HEAD_REF;
    } else if (
        process.env.GITHUB_REF &&
        !process.env.GITHUB_REF.startsWith('refs/tags')
    ) {
        const match = /refs\/heads\/(.*)/.exec(process.env.GITHUB_REF);
        return match ? match[1] : null;
    }
    return null;
}

async function getLastSuccessfulRun(token) {
    const { owner, repo } = github.context.repo;
    if (!owner || !repo) {
        throw new Error('GitHub context the repository information not available');
    }

    const octokit = github.getOctokit(token);
    const res = await octokit.rest.actions.listWorkflowRuns({
        owner: owner,
        repo: repo,
        status: 'success',
        branch: getBranch(),
        workflow_id: getWorkflowFile(),
        per_page: 1,
    });
    if (res.data.workflow_runs.length === 0) {
        throw new Error('No previous workflow run found');
    }
    const result = res.data.workflow_runs[0].head_commit.id;
    console.log('last successful run commit: ', result);
    return result;
}

async function getBefore(token) {
    const payload = github.context.payload;
    try {
        return await getLastSuccessfulRun(token);
    } catch (error) {
        console.log('getLastSuccessfulRun()', error.message);
    }
    if (payload.before) {
        console.log('last commit: ', payload.before);
        return payload.before;
    }
    return 'HEAD^1';
}

function getAfter() {
    const payload = github.context.payload;
    if (payload.after) {
        return payload.after;
    }
    return 'HEAD';
}

async function fetchGitChanges(before, after) {
    if (!before || !after) {
        throw new Error('Both before and after commit references are required');
    }

    let lines = [];
    const options = {
        listeners: {
            stdout: (data) => {
                lines = data.toString().split('\n');
            },
            stderr: (data) => {
                core.setFailed(data.toString());
            },
        },
    };
    await exec.exec('git', ['diff', before, after, '--name-only'], options);
    return lines;
}

function matchGitChanges(map, lines) {
    const resultSet = new Set();
    for (let key in map) {
        const isMatch = wcmatch(key);
        for (let line of lines) {
            if (line.startsWith(key) || isMatch(line)) {
                for (let service of map[key]) {
                    resultSet.add(service);
                }
            }
        }
    }
    return [...resultSet];
}

async function run() {
    const buildAll = core.getInput('build-all') === 'true';
    const map = parseMap(core.getInput('map'));
    const token = core.getInput('github-token');
    let result;
    if (buildAll) {
        result = getAllValues(map);
    } else {
        const lines = await fetchGitChanges(await getBefore(token), getAfter());
        result = matchGitChanges(map, lines);
    }
    console.log('result', result);
    core.setOutput('result', JSON.stringify(result));
}

// Export functions for testing
module.exports = {
    parseMap,
    getAllValues,
    getWorkflowFile,
    getBranch,
    matchGitChanges,
    fetchGitChanges,
    getBefore,
    getAfter,
    run,
};

// Only run the action when this file is executed directly (not when imported for testing)
if (require.main === module) {
    run();
}
