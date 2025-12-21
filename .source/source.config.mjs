// source.config.ts
import {
  defineConfig,
  defineDocs,
  frontmatterSchema,
  metaSchema
} from "fumadocs-mdx/config";
var docs = defineDocs({
  docs: {
    schema: frontmatterSchema
  },
  meta: {
    schema: metaSchema
  },
  dir: "./src/content/docs"
});
var source_config_default = defineConfig({
  mdxOptions: {
    // MDX options
  }
});
export {
  source_config_default as default,
  docs
};
