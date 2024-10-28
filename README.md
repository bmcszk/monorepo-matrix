## Monorepo changes detection - Github Action

### Description
The `monorepo-matrix` Github Action is checking git commits and detects changes in the given paths.

### Inputs
- `build-all` - boolean flag to build all packages in monorepo. Default value is false.
- `map` - list of paths and their owners (modules).

### Outputs
- `result` - list of modules that have changes in the given paths. Returns `[]` if there are no changes in the given paths.

### Prerequisites
Checkout code before using the action.
```yaml
      - name: Checkout code
        uses: actions/checkout@v4
        with:
          fetch-depth: 2
```
`fetch-depth: 2` is required to fetch two last commits in the history of the monorepo. 
(In some cases it is better to use `fetch-depth: 0`.)
### Sample usage
1. Sample action:
    ```yaml
          - name: Create matrix
            id: create-matrix
            uses: bmcszk/monorepo-matrix@v1
            with:
              build-all: ${{ inputs.build-all }}
              map: |-
                pkg/** -> consumer|producer
                go.mod -> consumer|producer
                go.sum -> consumer|producer
                Dockerfile -> consumer|producer
                services/consumer/** -> consumer
                services/producer/** -> producer
    ```
    Where `map` line is a value that stores changes detection rules in form of:
    ```yaml
    git|paths|changed|separated|by|pipe -> module|names|separated|by|pipe
    ```
    The above can return:
    - `[]` if there are no changes in paths
    - `[ 'producer' ]` - change only in producer
    - `[ 'consumer' ]` - change only in consumer
    - `[ 'producer', 'consumer' ]` - change in both

    The output values can be used as build matrix:
    ```yaml
        if: needs.create-matrix.outputs.result != '[]'
        strategy:
          matrix:
            service: ${{fromJson(needs.create-matrix.outputs.result)}}
    ```

2. The same but simpler:
    ```yaml
          - name: Create matrix
            id: create-matrix
            uses: bmcszk/monorepo-matrix@v1
            with:
              build-all: ${{ inputs.build-all }}
              map: |-
                pkg|go.mod|go.sum|Dockerfile -> consumer|producer
                services/consumer -> consumer
                services/producer -> producer
    ```

3. This returns `[ 'true' ]` if there are changes detected in path `helm`; and `[]` otherwise:
    ```yaml
          - name: Create matrix
            id: create-matrix
            uses: bmcszk/monorepo-matrix@v1
            with:
              build-all: ${{ github.event_name == 'workflow_dispatch' && 'true' || 'false'}}
              map: helm -> true
    ```

### Build
- `npm install` - installs dependencies in the root of the repository.
- `npm install -g @vercel/ncc` - install build tool.
- `npm run build` - builds the action.
