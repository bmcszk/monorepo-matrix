// Mock the dependencies before importing
jest.mock('@actions/core')
jest.mock('@actions/exec')
jest.mock('@actions/github')

const core = require('@actions/core')
const exec = require('@actions/exec')
const github = require('@actions/github')

// Mock getInput to return empty strings by default for the initial run() call
core.getInput.mockImplementation((name) => {
  if (name === 'build-all') return 'false'
  if (name === 'map') return ''
  if (name === 'github-token') return ''
  return ''
})

const {
    parseMap,
    getAllValues,
    getWorkflowFile,
    getBranch,
    matchGitChanges,
    fetchGitChanges,
    getBefore,
    getAfter,
    run
} = require('./index.js')

describe('parseMap', () => {
    test('should parse simple mapping', () => {
        const mapStr = 'pkg/** -> consumer|producer\nservices/consumer/** -> consumer'
        const result = parseMap(mapStr)

        expect(result).toEqual({
            'pkg/**': ['consumer', 'producer'],
            'services/consumer/**': ['consumer']
        })
    })

    test('should handle spaces and empty lines', () => {
        const mapStr = '  pkg/**  ->  consumer|producer  \n\nservices/producer/** -> producer'
        const result = parseMap(mapStr)

        expect(result).toEqual({
            'pkg/**': ['consumer', 'producer'],
            'services/producer/**': ['producer']
        })
    })

    test('should ignore lines without ->', () => {
        const mapStr = 'invalid line\npkg/** -> consumer'
        const result = parseMap(mapStr)

        expect(result).toEqual({
            'pkg/**': ['consumer']
        })
    })

    test('should handle semicolon separator', () => {
        const mapStr = 'pkg/** -> consumer;services/consumer/** -> producer'
        const result = parseMap(mapStr)

        expect(result).toEqual({
            'pkg/**': ['consumer'],
            'services/consumer/**': ['producer']
        })
    })
})

describe('getAllValues', () => {
    test('should return all unique values from map', () => {
        const map = {
            'pkg/**': ['consumer', 'producer'],
            'services/consumer/**': ['consumer'],
            'services/producer/**': ['producer']
        }
        const result = getAllValues(map)

        expect(result).toEqual(['consumer', 'producer'])
    })

    test('should handle empty map', () => {
        const map = {}
        const result = getAllValues(map)

        expect(result).toEqual([])
    })

    test('should handle null/undefined input gracefully', () => {
        const result1 = parseMap(null)
        const result2 = parseMap(undefined)
        const result3 = parseMap('')

        expect(result1).toEqual({})
        expect(result2).toEqual({})
        expect(result3).toEqual({})
    })
})

describe('getWorkflowFile', () => {
    const originalEnv = process.env

    afterEach(() => {
        process.env = originalEnv
    })

    test('should extract workflow name from ref with @', () => {
        process.env.GITHUB_WORKFLOW_REF = 'main.yml@main'
        const result = getWorkflowFile()
        expect(result).toBe('main.yml')
    })

    test('should extract workflow name from ref with /', () => {
        process.env.GITHUB_WORKFLOW_REF = 'path/to/workflow.yml'
        const result = getWorkflowFile()
        expect(result).toBe('workflow.yml')
    })

    test('should handle full path with both @ and /', () => {
        process.env.GITHUB_WORKFLOW_REF = 'path/to/workflow.yml@main'
        const result = getWorkflowFile()
        expect(result).toBe('workflow.yml')
    })
})

describe('getBranch', () => {
    const originalEnv = { ...process.env }

    beforeEach(() => {
        jest.resetModules()
        // Clear and restore process.env
        for (const key in process.env) {
            delete process.env[key]
        }
        Object.assign(process.env, originalEnv)
    })

    test('should return GITHUB_HEAD_REF when available', () => {
        const { getBranch } = require('./index.js')
        process.env.GITHUB_HEAD_REF = 'feature-branch'
        process.env.GITHUB_REF = 'refs/heads/main'

        const result = getBranch()
        expect(result).toBe('feature-branch')
    })

    test('should extract branch from GITHUB_REF', () => {
        const { getBranch } = require('./index.js')
        delete process.env.GITHUB_HEAD_REF
        process.env.GITHUB_REF = 'refs/heads/feature-branch'

        const result = getBranch()
        expect(result).toBe('feature-branch')
    })

    test('should handle tags correctly', () => {
        const { getBranch } = require('./index.js')
        delete process.env.GITHUB_HEAD_REF
        process.env.GITHUB_REF = 'refs/tags/v1.0.0'

        const result = getBranch()
        expect(result).toBeNull()
    })

    test('should return null when no branch info available', () => {
        const { getBranch } = require('./index.js')
        delete process.env.GITHUB_HEAD_REF
        delete process.env.GITHUB_REF

        const result = getBranch()
        expect(result).toBeNull()
    })
})

describe('matchGitChanges', () => {
    test('should match exact file paths', () => {
        const map = {
            'go.mod': ['consumer', 'producer'],
            'services/consumer/main.go': ['consumer']
        }
        const lines = ['go.mod', 'services/consumer/main.go', 'README.md']

        const result = matchGitChanges(map, lines)
        expect(result).toEqual(['consumer', 'producer'])
    })

    test('should match wildcard patterns', () => {
        const map = {
            'pkg/**': ['consumer', 'producer'],
            'services/**/*.go': ['consumer', 'producer']
        }
        const lines = ['pkg/utils/helper.go', 'services/consumer/main.go']

        const result = matchGitChanges(map, lines)
        expect(result).toEqual(['consumer', 'producer'])
    })

    test('should return empty set when no matches', () => {
        const map = {
            'pkg/**': ['consumer'],
            'services/**': ['consumer']
        }
        const lines = ['README.md', 'docs/guide.md']

        const result = matchGitChanges(map, lines)
        expect(result).toEqual([])
    })

    test('should handle empty file list', () => {
        const map = {
            'pkg/**': ['consumer']
        }
        const lines = []

        const result = matchGitChanges(map, lines)
        expect(result).toEqual([])
    })
})

describe('getAfter', () => {
    test('should return payload.after when available', () => {
        const originalPayload = github.context.payload
        github.context.payload = { after: 'abc123' }

        const result = getAfter()
        expect(result).toBe('abc123')

        github.context.payload = originalPayload
    })

    test('should return HEAD when no payload.after', () => {
        const originalPayload = github.context.payload
        github.context.payload = {}

        const result = getAfter()
        expect(result).toBe('HEAD')

        github.context.payload = originalPayload
    })
})

describe('fetchGitChanges', () => {
    test('should execute git diff command and return lines', async () => {
        const mockLines = ['file1.js', 'file2.js', '']
        let execCallback = null

        exec.exec.mockImplementation((command, args, options) => {
            execCallback = options.listeners.stdout
            return Promise.resolve()
        })

        const result = await fetchGitChanges('commit1', 'commit2')

        expect(exec.exec).toHaveBeenCalledWith('git', ['diff', 'commit1', 'commit2', '--name-only'], expect.any(Object))

        // Simulate the callback with git output
        execCallback({ toString: () => mockLines.join('\n') })
    })

    test('should handle git command errors', async () => {
        const errorMessage = 'Git command failed'

        exec.exec.mockImplementation((command, args, options) => {
            options.listeners.stderr({ toString: () => errorMessage })
            return Promise.resolve()
        })

        await fetchGitChanges('commit1', 'commit2')

        expect(core.setFailed).toHaveBeenCalledWith(errorMessage)
    })

    test('should throw error when before or after is missing', async () => {
        await expect(fetchGitChanges(null, 'commit2')).rejects.toThrow('Both before and after commit references are required')
        await expect(fetchGitChanges('commit1', null)).rejects.toThrow('Both before and after commit references are required')
        await expect(fetchGitChanges('', 'commit2')).rejects.toThrow('Both before and after commit references are required')
        await expect(fetchGitChanges('commit1', '')).rejects.toThrow('Both before and after commit references are required')
    })
})

describe('integration tests', () => {
    test('should handle complete workflow simulation', async () => {
        // Mock all the external dependencies
        core.getInput.mockImplementation((name) => {
            switch (name) {
                case 'build-all': return 'false'
                case 'map': return 'pkg/** -> consumer|producer'
                case 'github-token': return 'fake-token'
                default: return ''
            }
        })

        core.setOutput.mockImplementation(() => {})

        exec.exec.mockImplementation(() => Promise.resolve())

        github.context.payload = {
            before: 'commit1',
            after: 'commit2'
        }

        github.context.repo = {
            owner: 'test-owner',
            repo: 'test-repo'
        }

        github.getOctokit.mockReturnValue({
            rest: {
                actions: {
                    listWorkflowRuns: () => Promise.resolve({
                        data: {
                            workflow_runs: [
                                { head_commit: { id: 'commit1' } }
                            ]
                        }
                    })
                }
            }
        })

        // This would normally require git, but we'll mock the exec call
        exec.exec.mockImplementation((command, args, options) => {
            // Simulate the git diff output immediately
            if (command === 'git' && args.includes('--name-only')) {
                // Call the stdout callback directly with test data
                options.listeners.stdout({
                    toString: () => 'pkg/utils/helper.go\nservices/producer/main.go\n'
                })
            }
            return Promise.resolve()
        })

        // Run the main function
        await run()

        expect(core.setOutput).toHaveBeenCalledWith('result', JSON.stringify(['consumer', 'producer']))
    })
})