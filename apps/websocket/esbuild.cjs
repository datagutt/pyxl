/* eslint-disable */
/* tslint:disable */
const { build } = require("esbuild");
const path = require("path");
const fs = require("fs");


const findBinaryFiles = (dir) => {
   const binaries = [];
   const files = fs.readdirSync(dir);
   for (const file of files) {
      const filePath = path.join(dir, file);
      const stat = fs.statSync(filePath);
      if (stat.isDirectory()) {
         binaries.push(...findBinaryFiles(filePath));
      } else if (path.extname(file) === ".node") {
         binaries.push(filePath);
      }
   }
   return binaries;
};


const nativeNodeModulesPlugin = {
   name: "native-node-modules",
   setup(build) {
      const baseOutdir = build.initialOptions.outdir || path.dirname(build.initialOptions.outfile);
      const outdir = path.resolve(baseOutdir);
      const buildDir = path.join(outdir, 'build');
      
      if (!fs.existsSync(outdir)) fs.mkdirSync(outdir);
      if (!fs.existsSync(buildDir)) fs.mkdirSync(buildDir);

      const processedBinaries = new Set();
      
      build.onResolve({ filter: /bindings/, namespace: "file" }, (args) => {
         const filePath =  require.resolve(args.path, { paths: [args.resolveDir] });
         const { resolveDir } = args;
         let packageDir = path.dirname(resolveDir);
         while(packageDir && path.basename(packageDir) !== "node_modules") {
            packageDir = path.dirname(packageDir);
         }
         packageDir = path.dirname(packageDir);

         // find '.node' files in the packageDir
         const binaries = findBinaryFiles(packageDir);
         binaries.forEach((binary) => {
            const fname = path.basename(binary);
            if (!processedBinaries.has(fname)) {
               const outPath = path.join(buildDir, fname);
               fs.copyFileSync(binary, outPath);
               processedBinaries.add(fname);
            }
         });
         
         return {
            path: filePath,
            namespace: "bindings",
         };
      });

      build.onLoad({ filter: /.*/, namespace: "bindings" }, (args) => {
         return {
            contents: `
            const path = require("path");
            const fs = require("fs");
            const __bindings = require(${JSON.stringify(args.path)});

            module.exports = function(opts) {
               if (typeof opts == "string") {
                  opts = { bindings: opts };
               } else if (!opts) {
                  opts = {};
               }

               opts.module_root = path.dirname(__filename);
               return __bindings(opts);
            };
          `,
         };
      });

      build.onResolve({ filter: /bindings\.js$/, namespace: "bindings" }, (args) => {
         return {
            path: args.path,
            namespace: "file",
         };
      });
   },
};

const options = {
   entryPoints: ['src/prodServer.ts'],
   outfile: 'dist/prodServer.mjs',
   bundle: true,
   minify: false,
   sourcemap: true,
   external: ["lmdb"],
   platform: 'node',
   format: 'esm',
   target: 'esnext',
   banner: {
     js: `import {dirname as toplevelDirname} from 'path'; import {fileURLToPath as topLevelFileURLToPath} from 'url'; import {createRequire as topLevelCreateRequire} from 'module'; const require = topLevelCreateRequire(import.meta.url), __filename = topLevelFileURLToPath(import.meta.url), __dirname = toplevelDirname(__filename);`,
   },
   define: {},
   plugins: [nativeNodeModulesPlugin],
};

build(options).catch(() => process.exit(1));