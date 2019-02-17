# Basic Benchmark

A very basic synthetic test of bundling **~1600** modules together into the
**5.2Mb** bundle with no transpiling involved. The numbers below were obtained
using the **MacBook Pro 2017/4 Cores/16Gb RAM**.  For a detailed output see
[saved logs](./logs)

## Reproduce
```
$ yarn
$ yarn patch-parcel
$ yarn fastpack:benchmark
$ yarn parcel:benchmark
$ yarn webpack:benchmark
```
Note, the `yarn patch-parcel`. It makes sure that parcel exists right after
build is completed and not stays in the `watch` mode.

## Statistics

## Fastest Run
|   | fastpack| parcel| webpack
|----|:--:|:--:|:--:
| initial build| 0.730s| 9.740s| 3.625s
| persistent cache| 0.171s| 1.218s| N/A
| watch mode| 0.084s| 0.503s| 0.473s


## Slowest Run
|   | fastpack| parcel| webpack
|----|:--:|:--:|:--:
| initial build| 0.956s| 15.009s| 4.467s
| persistent cache| 0.173s| 1.336s| N/A
| watch mode| 0.115s| 0.733s| 0.566s


## All Runs
|   | initial #1| initial #2| initial #3| cache #1| cache #2| cache #3| watch #1| watch #2| watch #3| watch #4| watch #5| watch #6
|----|:--:|:--:|:--:|:--:|:--:|:--:|:--:|:--:|:--:|:--:|:--:|:--:
| fastpack| 0.956s| 0.730s| 0.765s| 0.173s| 0.171s| 0.171s| 0.084s| 0.104s| 0.112s| 0.112s| 0.115s| 0.102s
| parcel| 15.009s| 9.740s| 9.746s| 1.218s| 1.336s| 1.287s| 0.733s| 0.582s| 0.583s| 0.547s| 0.614s| 0.503s
| webpack| 4.467s| 3.652s| 3.625s| N/A| N/A| N/A| 0.554s| 0.5s| 0.494s| 0.551s| 0.566s| 0.473s
