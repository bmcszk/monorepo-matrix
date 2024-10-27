## Monorepo changes detection - Github Action

### Description
The `monorepo-matrix` Github Action is checking git commits and detects changes in the given paths.

### Inputs
- `build-all` - boolean flag to build all packages in monorepo. Default value is false.
- `map` - list of paths and their owners (modules).

### Outputs
- `result` - list of modules that have changes in the given paths. Returns `[]` if there are no changes in the given paths.

### Sample usage
1. Sample action:
    ```yaml
          - name: Create matrix
            id: create-matrix
            uses: discoveryinc-tvn/TVN-github-actions/actions/monorepo-matrix@feature/CWP-2653-helm-gha
            with:
              build-all: ${{ inputs.build-all }}
              map: |-
                pkg/** -> consumer|producer|importer_redge
                go.mod -> consumer|producer|importer_redge
                go.sum -> consumer|producer|importer_redge
                Dockerfile -> consumer|producer|importer_redge
                services/consumer/** -> consumer
                services/producer/** -> producer
                services/importer_redge/** -> importer_redge
    ```
    Where `map` line is a value that stores changes detection rules in form of:
    ```yaml
    git|paths|changed|separated|by|pipe -> module|names|separated|by|pipe
    ```

    The output values can be used as build matrix:
    ```yaml
        strategy:
          matrix:
            service: ${{fromJson(needs.create-matrix.outputs.result)}}
    ```

2. The same but simpler:
    ```yaml
          - name: Create matrix
            id: create-matrix
            uses: discoveryinc-tvn/TVN-github-actions/actions/monorepo-matrix@feature/CWP-2653-helm-gha
            with:
              build-all: ${{ inputs.build-all }}
              map: |-
                pkg|go.mod|go.sum|Dockerfile -> consumer|producer|importer_redge
                services/consumer -> consumer
                services/producer -> producer
                services/importer_redge -> importer_redge
    ```

3. This returns `[ true ]` if there are changes detected in path `helm`; and `[]` otherwise:
    ```yaml
          - name: Create matrix
            id: create-matrix
            uses: discoveryinc-tvn/TVN-github-actions/actions/monorepo-matrix@feature/CWP-2653-helm-gha
            with:
              build-all: ${{ github.event_name == 'workflow_dispatch' && 'true' || 'false'}}
              map: |-
                helm -> true
    ```

### Build
- `npm install` - installs dependencies in the root of the repository.
- `npm install -g @vercel/ncc` - install build tool.
- `npm run build` - builds the action.
