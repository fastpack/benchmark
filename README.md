# Fastpack Benchmarks / Integration Tests

## TL;DR

- Objective measurements were used to measure the build time (`time` command &
  `statMs` difference between the source modification and the resulting file)
- All the tested bundlers (including fastpack!) think they are faster than they
  really are (see [logs](./basic/logs)).
- Fastpack is still the fastest.

## Basic Benchmark
This is intended to be the simple benchmark of bundling ~1600 modules
together with no transpiling involved.

|   | fastpack| parcel| webpack
|----|:--:|:--:|:--:
| initial build| 0.730s| 9.740s| 3.625s
| persistent cache| 0.171s| 1.218s| N/A
| watch mode| 0.084s| 0.503s| 0.473s

[Details](./basic)

## Methodology

- We are comparing the  execution times of 3 bundlers: `webpack`, `parcel` &
  `fastpack`
- 3 kinds of bundler executions are considered:
  - **initial** run, when the bundler doesn't have any additional information
    available
  - **persistent cache**-based run, when the bundler may have stored some
    information on the disk during the previous run
  - **watch mode**, when the bundler is running in a watch mode and rebuilds
    based on a single file change
- The measurements are grouped by the bundler and executed in the following
  order:
  - 3 **initial** runs
  - 3 **cache** runs
  - the **watch** mode run
- The computer is rebooted before running all the measurements above for a
  single bundler
- The **watch** mode benchmark consists of the several (same for each bundler)
  modifications, applied one by one.
- After each modification applied, file is restored to its original state,
  which is by itself another modification contributing to a resulting timings
  list
- We store the logs of all the example executions in this repo
- We do not trust timings, bundlers provide about themselves (aka `Built in
  ...s`). Instead:
  - `time` command is used to measure the **initial**/**cache** runs
  - the difference between the modification time of the source file and the
    *latest* modification in the output directory is considered as the rebuild
    time in a **watch** mode
- All the comparisons do not include source map generation
- We tried to configure all the bundlers to perform the same action as much as
  their interface permitted (`parcel` is not very configurable)
- We had to modify `parcel`'s CLI a little (see `parcel.patch` in this repo) to
  make it exit right away after the build is completed instead of going to the
  watch mode
- So far, this has been tested on MacOS only. It probably should run fine on
  Linux as well. Windows version should technically be possible too, although
  requires the `time` command implementation. PRs are welcome :)

## Adding test case / benchmark

TBD
