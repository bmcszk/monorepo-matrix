const core = require('@actions/core')
const exec = require('@actions/exec')
const github = require('@actions/github')
const wcmatch = require('wildcard-match')

function parseMap(mapStr) {
    let map = {};
    for (let entryStr of mapStr.split(/[\n;]+/)) {
        if (!entryStr.includes('->')) {
            continue;
        }
        entryStr = entryStr.replace(/\s/g,'');
        let entry = entryStr.split('->', 2);
        let keys = entry[0].split('|');
        let vals = entry[1].split('|');
        for (let key of keys) {
            if (key === '') {
                continue;
            }
            map = {...map, [key]: vals};
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

function getLastSuccessfulRun() {
    const payload = github.context.payload;
    const octokit = github.getOctokit(core.getInput('github-token'));
    let result = null;
    octokit.rest.actions.listWorkflowRuns({
        // owner: payload.repository_owner,
        // repo: payload.repository.split('/')[1],
        owner: github.context.repo.owner,
        repo: github.context.repo.repo,
        status: "success",
        branch: (payload.head_ref || payload.ref_name),
        per_page: 1
    }).then(res => {
        if (res.data.workflow_runs.length === 0) {
            throw new Error('No previous workflow run found');
        }
        result = res.data.workflow_runs[0].head_commit.id;
        // const sortedHeadCommits = headCommits.sort((a, b) =>
        //     a.timestamp - b.timestamp
        // );
        // return sortedHeadCommits[sortedHeadCommits.length - 1].id;
    })
    return result;
}

function getBefore() {
    const payload = github.context.payload;
    try {
        return getLastSuccessfulRun();
    } catch (error) {
        console.log(error.message);
    }
    if (payload.before) {
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
    let lines = [];
    const options = {
        listeners: {
            stdout: (data) => {
                lines = data.toString().split('\n');
            },
            stderr: (data) => {
                core.setFailed(data.toString());
            }
        }
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
    console.log('map:', map);
    let result;
    if (buildAll) {
        result = getAllValues(map);
    } else {
        lines = await fetchGitChanges(getBefore(), getAfter());
        result = matchGitChanges(map, lines);
    }
    console.log('result', result);
    core.setOutput('result', JSON.stringify(result));
}

run();
