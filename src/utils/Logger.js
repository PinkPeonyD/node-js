const os = require('os');

class Logger {
  #isVerboseModeEnabled = false;
  #isQuietModeEnabled = false;

  constructor(verbose = false, quiet = false) {
    this.#isVerboseModeEnabled = verbose;
    this.#isQuietModeEnabled = quiet;
  }

  log(...data) {
    if (this.#isQuietModeEnabled) return;

    const timestamp = new Date().toISOString();

    if (this.#isVerboseModeEnabled) {
      console.log(
        `[${timestamp}]`,
        ...data,
        '\n--- System Info ---',
        '\nPlatform:',
        os.platform(),
        '\nTotal memory:',
        os.totalmem(),
        '\nFree memory:',
        os.freemem(),
        '\nCPU:',
        os.cpus()[0].model,
        '\n-------------------'
      );
    } else {
      console.log(`[${timestamp}]`, ...data);
    }
  }

  error(...data) {
    if (this.#isQuietModeEnabled) return;
    const timestamp = new Date().toISOString();
    console.error(`[${timestamp}] ERROR:`, ...data);
  }
}

module.exports = Logger;
