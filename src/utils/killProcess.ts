/**
 * code from https://github.com/pkrumins/node-tree-kill/blob/cb478381547107f5c53362668533f634beff7e6e/index.js
 */

import { spawn, exec, type ChildProcess } from "child_process";

export function treeKill(
  pid: number | `${number}`,
  signal?: NodeJS.Signals | number,
  callback?: (err?: Error) => void
): void {
  if (typeof signal === "function") {
    callback = signal;
    signal = undefined;
  }

  const pidInt = typeof pid === "string" ? parseInt(pid, 10) : pid;
  if (Number.isNaN(pidInt)) {
    if (callback) {
      return callback(new Error("pid must be a number"));
    } else {
      throw new Error("pid must be a number");
    }
  }

  const tree: Record<number, number[]> = {};
  const pidsToProcess: Record<number, number> = {};
  tree[pidInt] = [];
  pidsToProcess[pidInt] = 1;

  switch (process.platform) {
    case "win32":
      exec(`taskkill /pid ${pidInt} /T /F`, (err) => {
        if (callback) callback(err ?? undefined);
      });
      break;
    case "darwin":
      buildProcessTree(
        pidInt,
        tree,
        pidsToProcess,
        (parentPid) => spawn("pgrep", ["-P", String(parentPid)]),
        () => {
          killAll(tree, signal, callback);
        }
      );
      break;
    default: // Linux
      buildProcessTree(
        pidInt,
        tree,
        pidsToProcess,
        (parentPid) =>
          spawn("ps", [
            "-o",
            "pid",
            "--no-headers",
            "--ppid",
            String(parentPid),
          ]),
        () => {
          killAll(tree, signal, callback);
        }
      );
      break;
  }
}

function killAll(
  tree: Record<number, number[]>,
  signal?: NodeJS.Signals | number,
  callback?: (err?: Error) => void
) {
  const killed: Record<number, number> = {};
  try {
    Object.keys(tree).forEach((pidStr) => {
      const pid = parseInt(pidStr, 10);
      tree[pid].forEach((pidpid) => {
        if (!killed[pidpid]) {
          killPid(pidpid, signal);
          killed[pidpid] = 1;
        }
      });
      if (!killed[pid]) {
        killPid(pid, signal);
        killed[pid] = 1;
      }
    });
  } catch (err: any) {
    if (callback) {
      return callback(err);
    } else {
      throw err;
    }
  }
  if (callback) {
    return callback();
  }
}

function killPid(pid: number, signal?: NodeJS.Signals | number) {
  try {
    process.kill(pid, signal);
  } catch (err: any) {
    if (err.code !== "ESRCH") throw err;
  }
}

function buildProcessTree(
  parentPid: number,
  tree: Record<number, number[]>,
  pidsToProcess: Record<number, number>,
  spawnChildProcessesList: (pid: number) => ChildProcess,
  cb: () => void
) {
  const ps = spawnChildProcessesList(parentPid);
  let allData = "";
  ps.stdout?.on("data", (data) => {
    allData += data.toString("ascii");
  });

  const onClose = (code: number | null) => {
    delete pidsToProcess[parentPid];

    if (code !== 0) {
      // no more parent processes
      if (Object.keys(pidsToProcess).length === 0) {
        cb();
      }
      return;
    }

    const matches = allData.match(/\d+/g);
    if (matches) {
      matches.forEach((pidStr) => {
        const pid = parseInt(pidStr, 10);
        tree[parentPid].push(pid);
        tree[pid] = [];
        pidsToProcess[pid] = 1;
        buildProcessTree(pid, tree, pidsToProcess, spawnChildProcessesList, cb);
      });
    } else if (Object.keys(pidsToProcess).length === 0) {
      cb();
    }
  };

  ps.on("close", onClose);
}

export async function treeKillAsync(
  pid: number | `${number}`,
  signal?: NodeJS.Signals | number
): Promise<void> {
  return new Promise((resolve, reject) => {
    treeKill(pid, signal, (err) => {
      if (err) reject(err);
      else resolve();
    });
  });
}

export async function killProcess(proc: ChildProcess) {
  if (proc.pid) {
    await treeKillAsync(proc.pid, "SIGKILL");
  } else {
    proc.kill("SIGKILL");
  }
}
