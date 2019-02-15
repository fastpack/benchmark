# Fastpack Benchmarks / Integration Tests

## TL;DR

- All the tested bundlers (including fastpack!) think they are faster than they
  really are.
- Fastpack is still the fastest.

### Basic 
This is intended to be the simple benchmark of just bundling ~1600 modules
together with no transpiling involved.

Table goes here
Details link goes here

## Methodology

- We are comparing the  execution times of 3 bundlers: `webpack`, `parcel` &
  `fastpack`
- We compare timings of 3 kinds of bundler executions:
  - **initial** run, when the bundler doesn't have any additional information
    available
  - **persistent cache**-based run, when bundler may have stored some
    information on disk during the previous run
  - **watch mode**, when the bundler is running in a watch mode and rebuilds
    based on a single file change
- The measurements are grouped by the bundler and executed in the following
  order:
  - 5 **initial** runs
  - 5 **cache** runs
  - the **watch** mode run
- The computer is rebooted before running all the measurements above for a
  single bundler
- The **watch** mode benchmark consists of the several (same for each bundler)
  modifications, applied one by one.
- After each modification applied, file is restored to its original state,
  which is by itself another modification contributing to a resulting timings
  list
- We store the logs of all the executions in this repo
- We do not trust timings, bundlers provide about themselves (aka `Built in
  ...s`). Instead:
  - `time` command is used with the bundler execution and all the time process
    has taken from the stratup till the exit is accounted in
    **initial**/**cache** runs
  - the difference between the modification time of the source file and the
    latest modification in the output directory is considered as the rebuild
    time in a **watch** mode
- All the comparisons do not include source map generation
- We tried to configure all the bundlers to perform the same action as much as
  their interface permitted (`parcel` is not very configurable)
- We had to modify `parcel`'s CLI a little (see `parcel.patch` in this repo) to
  make it exit right away after the build is completed instead of going to the
  watch mode

## Adding test case / benchmark

## Try it out
```
$ cd basic
$ yarn
$ yarn patch-parcel
$ yarn fastpack:benchmark
$ yarn parcel:benchmark
$ yarn webpack:benchmark
```
