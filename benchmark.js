const os = require("os");
const path = require("path");
const fs = require("fs");
const readline = require("readline");
const { spawn } = require("child_process");
const packageJson = require(path.join(process.cwd(), "package.json"));

const BUNDLERS = ["fastpack", "webpack", "parcel"];
const TARGETS = ["initial", "cache"];

function getEnvValue(envVar, defaultValue) {
  let result = parseInt(process.env[envVar] || defaultValue, 10);
  if (isNaN(result) || result < 1) {
    throw Error(
      `Expected environment variable ${envVar} to contain integer positive value. Got: ${
        process.env[envVar]
      }`
    );
  }
  return result;
}

const N_RUNS = getEnvValue("N_RUNS", 3);
const DELAY = getEnvValue("DELAY", 1);
const BUNDLER_WATCH_INITIALIZATION_DELAY = getEnvValue(
  "BUNDLER_WATCH_INITIALIZATION_DELAY",
  3
);
const CHECK_MTIME_INITIALIZATION_DELAY = getEnvValue(
  "CHECK_MTIME_INITIALIZATION_DELAY",
  3
);
const AFTER_FILE_MODIFICATION_DELAY = getEnvValue(
  "AFTER_FILE_MODIFICATION_DELAY",
  3
);

let bundler = process.argv.slice(2)[0];

if (!BUNDLERS.some(knownBundler => bundler === knownBundler)) {
  console.error(`Unknown bundler: ${bundler}`);
  process.exit(1);
}

let plan = [{
  title: 'System Information',
  sysInfo: true
}];
TARGETS.forEach(target => {
  let script = `${bundler}:${target}`;
  if (packageJson.scripts && packageJson.scripts[script]) {
    for (let i = 0; i < N_RUNS; i++) {
      plan.push({
        title: `yarn -s ${script}`,
        command: packageJson.scripts[script],
        cmd: { name: "yarn", args: ["-s", script] }
      });
    }
  }
});

let watch = `${bundler}:watch`;
if (packageJson.scripts && packageJson.scripts[watch]) {
  // gather modifications
  let modifications = [];
  function walk(dir) {
    fs.readdirSync(dir).forEach(file => {
      let modFile = path.join(dir, file);
      let stats = fs.statSync(modFile);
      if (stats.isDirectory()) {
        walk(modFile);
      } else if (stats.isFile()) {
        let ext = path.extname(modFile);
        let match = ext.match(/^\.mod\d*$/);
        if (match) {
          let index = parseInt(match[1] || 0, 10);
          let origFile = modFile.slice(0, -ext.length);
          if (fs.existsSync(origFile) && fs.statSync(origFile).isFile()) {
            modifications.push({
              modFile,
              modContent: fs.readFileSync(modFile).toString(),
              origFile,
              origContent: fs.readFileSync(origFile).toString(),
              index
            });
          }
        }
      }
    });
  }
  walk(path.join(process.cwd(), "src"));
  modifications.sort(
    (m1, m2) =>
      m1.origFile === m2.origFile
        ? m1.index - m2.index
        : m1.origFile.length - m2.origFile.length === 0
          ? m1.origFile < m2.origFile
            ? -1
            : 1
          : m1.origFile.length - m2.origFile.length
  );
  if (modifications.length) {
    plan.push({
      title: `yarn -s ${watch}`,
      command: packageJson.scripts[watch],
      watch: { name: "yarn", args: ["-s", watch] },
      delay: BUNDLER_WATCH_INITIALIZATION_DELAY
    });
    plan.push({
      title: "file modification controlling service",
      checkMtime: true,
      delay: CHECK_MTIME_INITIALIZATION_DELAY
    });
  }
  modifications.forEach(({ origFile, origContent, modFile, modContent }) => {
    let shortOrigName = path.relative(process.cwd(), origFile);
    let shortModName = path.relative(process.cwd(), modFile);
    plan.push({
      title: `Modifying ${shortOrigName} using the content of ${shortModName}`,
      modifyFile: {
        filename: origFile,
        data: modContent
      },
      delay: AFTER_FILE_MODIFICATION_DELAY
    });
    plan.push({
      title: `Reverting ${shortOrigName} to the original content`,
      modifyFile: {
        filename: origFile,
        data: origContent
      },
      delay: AFTER_FILE_MODIFICATION_DELAY
    });
  });

}

const STDOUT = [];
const STDERR = [];
function appendStdout(data) {
  process.stdout.write(data);
  STDOUT.push(data);
}

function appendStderr(data) {
  let s = data.toString().trim();
  s = "STDERR: " + s.replace(/\n/g, "\nSTDERR: ") + "\n";
  process.stdout.write(s);
  STDOUT.push(s);
}

function startOutput(title, command) {
  let line = `\n---------------------------------------------------------\n`;
  process.stdout.write(line);
  process.stdout.write(`ACTION: ${title}\n`);
  if(command) {
    process.stdout.write(`COMMAND: ${command}\n`);
  }
  STDOUT.push(line);
  STDERR.push(line);
}

function completeOutput() {
  let line = "\n";
  process.stdout.write(line);
  STDOUT.push(line);
  STDERR.push(line);
}

let checkMtime = null;
let bundlerWatch = null;

function finalize() {
  if (checkMtime) {
    checkMtime.kill("SIGTERM");
  }
  if (bundlerWatch) {
    bundlerWatch.kill("SIGTERM");
  }
  fs.writeFileSync(`${bundler}.log`, STDOUT.join(""));
  process.exit(0);
}

function runOne(index) {
  let action = plan[index];

  if (!action) {
    return finalize();
  }

  const next = () =>
    setTimeout(() => runOne(index + 1), (action.delay || DELAY) * 1000);

  startOutput(action.title || "Untitled", action.command);

  if (action.cmd) {
    let { name, args } = action.cmd;
    let command = spawn(name, args);
    command.stdout.on("data", appendStdout);
    command.stderr.on("data", appendStderr);
    command.on("close", () => {
      completeOutput();
      next();
    });
  } else if (action.watch) {
    let { name, args } = action.watch;
    bundlerWatch = spawn(name, args);
    bundlerWatch.stdout.on("data", appendStdout);
    bundlerWatch.stderr.on("data", appendStderr);
    bundlerWatch.on("close", () => {
      completeOutput();
    });
    next();
  } else if (action.checkMtime) {
    checkMtime = spawn("node", [path.join(__dirname, "watch.js")]);
    checkMtime.stdout.on("data", data => {
      let s = data.toString().trim();
      appendStdout(
        "CHECK MTIME: " + s.replace(/\n/g, "\nCHECK MTIME: ") + "\n"
      );
    });
    next();
  } else if (action.modifyFile) {
    let { filename, data } = action.modifyFile;
    fs.writeFileSync(filename, data);
    next();
  } else if (action.sysInfo) {
    appendStdout('CPU:\n')
    os.cpus().forEach(({model, speed}, i) => {
      appendStdout(`    Core ${i + 1} Model: ${model}\n`);
      appendStdout(`    Core ${i + 1} Speed: ${speed}\n`);
    });
    appendStdout('Memory:\n')
    appendStdout(`    os.totalmem(): ${os.totalmem()}\n`)
    appendStdout(`    os.freemem(): ${os.freemem()}\n`)

    let uptime = spawn('uptime');
    uptime.stdout.on('data', data => appendStdout(`Uptime: ${data}`))
    uptime.on('close', () => {
      completeOutput();
      next();
    })

  }
}

runOne(0);
