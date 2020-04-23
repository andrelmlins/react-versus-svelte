"use strict";

const getSize = require("get-folder-size");
const { exec } = require("child_process");
const rimraf = require("rimraf");
const fs = require("fs");
const handler = require("serve-handler");
const http = require("http");

const object = { svelte: {}, react: {} };

const createBuildFolder = () => {
  if (fs.existsSync("build")) {
    rimraf.sync("build");
  }
  fs.mkdirSync("build");
};

const getAvailable = () => {
  const serverSvelte = http.createServer((request, response) => {
    return handler(request, response, {
      public: "../../build/svelte",
      rewrites: [{ source: "/svelte", destination: "index.html" }]
    });
  });

  serverSvelte.listen(3000, () => {
    exec(
      'lighthouse http://localhost:3000/svelte --output=json --output-path=build/perfSvelte.json --chrome-flags="--headless"',
      (error, stdout) => {
        console.log(error, stdout);
        const file = fs.readFileSync("./build/perfSvelte.json");
        object.svelte.time = JSON.parse(file.toString()).audits.metrics;
        serverSvelte.close();
      }
    );
  });

  const serverReact = http.createServer((request, response) => {
    return handler(request, response, {
      public: "../../build/react",
      rewrites: [{ source: "/react", destination: "index.html" }]
    });
  });

  serverReact.listen(3001, () => {
    exec(
      'lighthouse http://localhost:3001/react --output=json --output-path=build/perfReact.json --chrome-flags="--headless"',
      () => {
        const file = fs.readFileSync("./build/perfReact.json");
        object.react.time = JSON.parse(file.toString()).audits.metrics;
        serverReact.close();
      }
    );
  });
};

const getSizes = () => {
  getSize("../../build/svelte", (err, size) => {
    if (err) {
      throw err;
    }
    object.svelte.size = {
      format: (size / 1024 / 1024).toFixed(2) + " MB",
      bytes: size
    };
  });

  getSize("../../build/react", (err, size) => {
    if (err) {
      throw err;
    }
    object.react.size = {
      format: (size / 1024 / 1024).toFixed(2) + " MB",
      bytes: size
    };
  });
};

const getCountLines = () => {
  exec(
    "cloc ../svelte-app/src --json --force-lang-def=cloc_definitions.txt",
    (error, stdout) => {
      let data = JSON.parse(stdout);
      delete data.header;

      object.svelte.countLine = data;
    }
  );

  exec(
    "cloc ../react-app/src --json --force-lang-def=cloc_definitions.txt",
    (error, stdout) => {
      let data = JSON.parse(stdout);
      delete data.header;

      object.react.countLine = data;
    }
  );
};

createBuildFolder();
getSizes();
getCountLines();
getAvailable();

process.on("exit", () => {
  fs.appendFileSync("build/data.json", JSON.stringify(object));
});
