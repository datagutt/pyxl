import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/**/*.ts"],
  splitting: false,
  sourcemap: true,
  clean: true,
  format: ["cjs", "esm"],
  onSuccess:
    "tsc --emitDeclarationOnly --declaration --project tsconfig.server.json",
});
