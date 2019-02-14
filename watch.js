const fs = require("fs");
const path = require("path");
const assert = require("assert");
const readline = require("readline");
const { spawn } = require("child_process");

const SRC = path.join(process.cwd(), "src" + path.sep);
const OUT = ["fastpack", "parcel", "webpack"].map(
  dir => path.join(process.cwd(), "out", dir) + path.sep
);

const inOutputDirectory = absPath =>
  OUT.some(prefix => absPath.startsWith(prefix));

function watchDir(dir, handler) {
  const watchman = spawn("watchman", [
    "--no-save-state",
    "-j",
    "--no-pretty",
    "-p"
  ]);

  let subscription = `%${new Date().getTime()}-${Math.random()}`;
  let subscribe = ["subscribe", dir, subscription, { fields: ["name"] }];

  watchman.stdin.write(`${JSON.stringify(subscribe)}\n`);
  var rl = readline.createInterface({
    input: watchman.stdout,
    terminal: false
  });

  // Initializing steps
  let response1 = null;
  let response2 = null;

  let srcLastModified = null;

  rl.on("line", function(line) {
    let event = JSON.parse(line);
    if (response1 === null) {
      assert(
        typeof event.version === "string" && event.subscribe === subscription,
        "Unexpected initial watchman response"
      );
      response1 = event;
      console.log(`Initialization step 1.`);
    } else if (response2 === null) {
      assert(event.root === dir, `Mismatched dirs: ${dir} ${event.root}`);
      assert(
        event.subscription === subscription,
        `Mismatched subscription id: ${subscription} ${event.subscription}`
      );
      assert(Array.isArray(event.files), `Expected initial list of files`);
      response2 = event;
      console.log(`Initialization step 2. Fully initialized`);
    } else {
      event.files
        .map(f => path.join(event.root, f))
        .filter(
          absPath => absPath.startsWith(SRC) || inOutputDirectory(absPath)
        )
        .filter(absPath => path.extname(absPath) === ".js")
        .forEach(absPath => {
          let stat = fs.statSync(absPath);
          let timeTakenMsg = "";
          if (absPath.startsWith(SRC)) {
            srcLastModified = stat.mtimeMs;
          } else {
            timeTakenMsg = `\n\t${Math.round(
              stat.mtimeMs - srcLastModified
            )}ms since source modification`;
          }
          console.log(
            `${path.relative(dir, absPath)} (mtime=${
              stat.mtime
            })${timeTakenMsg}`
          );
        });
    }
  });
}

watchDir(process.cwd());
