const path = require("path");
const fs = require("fs");

let logsDir = process.argv[2];
if (logsDir === undefined) {
  console.error(
    "Please specify the logs firectory as the command line argument"
  );
  process.exit(0);
}
logsDir = path.join(process.cwd(), logsDir);

function extractRealTime(action, lines) {
  let timeRegex = /^STDERR: real[^\d]+(\d+)m(\d+\.\d+)s$/;
  let time = lines.map(line => line.match(timeRegex)).filter(line => line)[0];
  if (time) {
    let minutes = time[1];
    let seconds = time[2];
    let s = time[1] === "0" ? `${time[2]}s` : `${time[1]}m${time[2]}s`;
    let n = parseInt(time[1], 10) * 60 + parseFloat(time[2]);
    return { s, n };
  } else {
    throw Error(`Cannot extract real timing for action ${action}`);
  }
}

function parseItem(data) {
  let lines = data.split("\n");
  let action = lines.filter(line => /^ACTION:/.test(line))[0] || null;
  let watch = lines
    .map(line =>
      line.match(/^CHECK MTIME:[^\d]+(\d+)ms since source modification/)
    )
    .filter(match => match);
  if (watch.length) {
    watch.reverse(); // we want the last modification
    n = parseInt(watch[0][1], 10) / 1000.0;
    return {
      watch: true,
      s: `${n}s`,
      n
    };
  } else if (/:initial/.test(action)) {
    return { initial: true, ...extractRealTime(action, lines) };
  } else if (/:cache/.test(action)) {
    return { cache: true, ...extractRealTime(action, lines) };
  }
}

function parseLog(data) {
  return data
    .split(/\n-----/)
    .map(s => s.trim())
    .map(parseItem)
    .filter(item => item);
}

function printTable(columns, rows) {
  //  |                       |Fastpack|Webpack|Parcel<sup>*</sup>
  let print = s => process.stdout.write(s);
  let nl = () => print("\n");
  print("|   ");
  columns.forEach(col => print(`| ${col}`));
  nl();
  print("|----");
  columns.forEach(() => print(`|:--:`));
  nl();
  rows.forEach(row => {
    print(`| ${row.title}`);
    row.items.forEach(item => print(`| ${item}`))
    nl();
  });
  nl();
}

let data = fs
  .readdirSync(logsDir)
  .filter(f => path.extname(f) === ".log")
  .map(f => ({
    bundler: f.slice(0, -4),
    data: parseLog(fs.readFileSync(path.join(logsDir, f)).toString())
  }));

const titles = {
  initial: "initial build",
  cache: "persistent cache",
  watch: "watch mode"
}
let columns = data.map(r => r.bundler);
let fastestRun = ["initial", "cache", "watch"].map(type => {
  return {
    title: titles[type],
    items: data.map(bundler => {
      let min = Infinity;
      let found = null;
      bundler.data.filter(row => row[type]).forEach(row => {
        if(row.n < min) {
          min = row.n;
          found = row.s;
        }
      });
      return found || 'N/A';
    })
  }
});

let slowestRun = ["initial", "cache", "watch"].map(type => {
  return {
    title: titles[type],
    items: data.map(bundler => {
      let max = -Infinity;
      let found = null;
      bundler.data.filter(row => row[type]).forEach(row => {
        if(row.n > max) {
          max = row.n;
          found = row.s;
        }
      });
      return found || 'N/A';
    })
  }
});


console.log("## Fastest Run")
printTable(columns, fastestRun);
console.log("");

console.log("## Slowest Run")
printTable(columns, slowestRun);
console.log("");

let allRunsColumns = [];
let allRunsRows = data.map(bundler => ({
  title: bundler.bundler,
  items: []
}));
function updateRows(type, index) {
  data.forEach((b, i) => {
    let value = b.data.filter(r => r[type])[index];
    allRunsRows[i].items.push(value ? value.s : 'N/A');
  })
}

let index = {};
data.filter(b => b.bundler === 'fastpack')[0].data.forEach(row => {
  if(row.initial) {
    index.initial = (index.initial || 0) + 1;
    allRunsColumns.push(`initial #${index.initial}`);
    updateRows("initial", index.initial - 1);
  } else if(row.cache) {
    index.cache = (index.cache || 0) + 1;
    allRunsColumns.push(`cache #${index.cache}`);
    updateRows("cache", index.cache - 1);
  } else if(row.watch) {
    index.watch = (index.watch || 0) + 1;
    allRunsColumns.push(`watch #${index.watch}`);
    updateRows("watch", index.watch - 1);
  }
})

console.log("## All Runs")
printTable(allRunsColumns, allRunsRows);
console.log("");
