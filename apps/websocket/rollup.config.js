import { readFile } from "fs/promises";
import json from "@rollup/plugin-json";
import noEmit from "rollup-plugin-no-emit";
import nodeExternals from "rollup-plugin-node-externals";
import preserveDirectives from "rollup-plugin-preserve-directives";
import styles from "rollup-plugin-styles";
import swc from "rollup-plugin-swc3";
import typescript from "rollup-plugin-typescript2";

const {
  source = "src/index.ts",
  main,
  exports,
  types,
} = await readPackageJson();

if (!main && !exports && !types) {
  console.error(
    'Your package.json must have either a "main", "exports" or "types" field',
  );
  process.exit(1);
}

/**
 * Returns a Rollup configuration input that builds the source code by
 * transpiling TypeScript to JavaScript.
 */
export default {
  input: source,
  output: [
    main && {
      dir: "./dist",
      format: "cjs",
      sourcemap: true,
      preserveModules: true,
    },
    exports && {
      dir: "./dist",
      format: "es",
      sourcemap: true,
      preserveModules: true,
    },
    ...(!main && !exports ? [{ dir: "dist" }] : []),
  ],
  plugins: [
    nodeExternals(),
    typescript({
      useTsconfigDeclarationDir: true,
      tsconfigOverride: {
        rootDir: "src",
        include: ["src/**/*.ts", "src/**/*.tsx"],
        exclude: ["**/*.test.ts", "**/*.test.tsx"],
        compilerOptions: {
          declarationDir: "dist",
          emitDeclarationOnly: true,
        },
      },
    }),
    swc({
      sourceMaps: true,
      jsc: {
        parser: {
          syntax: "typescript",
        },
        target: "es2022",
      },
    }),
    styles(),
    json(),
    preserveDirectives.default(),
    ...(!main && !exports ? [noEmit()] : []),
  ],
  onwarn(message) {
    if (/Generated an empty chunk/.test(message)) {
      return;
    }

    if (message?.code === "MODULE_LEVEL_DIRECTIVE") {
      return;
    }

    console.warn(message);
  },
};

/**
 * Uses a dynamic import to read the package.json file from the current working
 * directory and returns the parsed JSON object.
 */
async function readPackageJson() {
  return JSON.parse(
    await readFile(new URL(`${process.cwd()}/package.json`, import.meta.url)),
  );
}
