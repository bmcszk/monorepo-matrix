## Monorepo changes detection - Github Action

### Description
The `monorepo-matrix` Github Action is checking git commits and detects changes in the given paths.

### Inputs
- `github-token` - `${{ secrets.GITHUB_TOKEN }}` - Github token to access private repositories.
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
          fetch-depth: 0
```
`fetch-depth: 0` is recommended to have all the changes from the repository.

### Sample usage
1. Sample action:
    ```yaml
          - name: Create matrix
            id: changes-matrix
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
        if: needs.changes-matrix.outputs.result != '[]'
        strategy:
          matrix:
            service: ${{fromJson(needs.changes-matrix.outputs.result)}}
    ```

2. The same but simpler:
    ```yaml
          - name: Create matrix
            id: changes-matrix
            uses: bmcszk/monorepo-matrix@v1
            with:
              build-all: ${{ inputs.build-all }}
              map: |-
                pkg|go.mod|go.sum|Dockerfile -> consumer|producer
                services/consumer -> consumer
                services/producer -> producer
    ```

3. Using `contains()` to check for specific modules:
    ```yaml
    jobs:
      detect-changes:
        runs-on: ubuntu-latest
        outputs:
          changed-services: ${{ steps.matrix.outputs.result }}
        steps:
          - name: Checkout code
            uses: actions/checkout@v4
            with:
              fetch-depth: 0
          - name: Create matrix
            id: matrix
            uses: bmcszk/monorepo-matrix@v1
            with:
              map: |-
                services/consumer/** -> consumer
                services/producer/** -> producer
                docs/** -> docs

      deploy-consumer:
        needs: detect-changes
        if: contains(needs.detect-changes.outputs.changed-services, '"consumer"')
        runs-on: ubuntu-latest
        steps:
          - name: Deploy consumer
            run: echo "Deploying consumer service"

      deploy-producer:
        needs: detect-changes
        if: contains(needs.detect-changes.outputs.changed-services, '"producer"')
        runs-on: ubuntu-latest
        steps:
          - name: Deploy producer
            run: echo "Deploying producer service"

      update-docs:
        needs: detect-changes
        if: contains(needs.detect-changes.outputs.changed-services, '"docs"')
        runs-on: ubuntu-latest
        steps:
          - name: Update docs
            run: echo "Updating documentation"
    ```
    This allows you to trigger specific jobs only when certain modules have changed.

4. This returns `[ 'true' ]` if there are changes detected in path `helm`; and `[]` otherwise:
    ```yaml
          - name: Create matrix
            id: changes-matrix
            uses: bmcszk/monorepo-matrix@v1
            with:
              build-all: ${{ github.event_name == 'workflow_dispatch' && 'true' || 'false'}}
              map: helm -> true
    ```

### Build
- `npm install` - installs dependencies in the root of the repository.
- `npm install -g @vercel/ncc` - install build tool.
- `npm run build` - builds the action.
