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

async function fetchGitChanges() {
    let before = 'HEAD^1';
    let after = 'HEAD';
    const payload = github.context.payload;
    if (payload.before && payload.after) {
        before = payload.before;
        after = payload.after;
    }

    let lines = [];
    const options = {
        listeners: {
            stdout: (data) => {
                data.toString().split('\n').forEach((line) => {
                    lines.push(line);
                })
            },
            stderr: (data) => {
                console.log(data.toString());
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
        lines = await fetchGitChanges();
        result = matchGitChanges(map, lines);
    }
    console.log('result', result);
    core.setOutput('result', JSON.stringify(result));
}

run();
