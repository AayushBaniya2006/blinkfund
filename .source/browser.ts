// @ts-nocheck
import { browser } from 'fumadocs-mdx/runtime/browser';
import type * as Config from '../source.config';

const create = browser<typeof Config, import("fumadocs-mdx/runtime/types").InternalTypeConfig & {
  DocData: {
  }
}>();
const browserCollections = {
  docs: create.doc("docs", {"anotherpage.mdx": () => import("../src/content/docs/anotherpage.mdx?collection=docs"), "index.mdx": () => import("../src/content/docs/index.mdx?collection=docs"), "folder/folder-page-2.mdx": () => import("../src/content/docs/folder/folder-page-2.mdx?collection=docs"), "folder/index.mdx": () => import("../src/content/docs/folder/index.mdx?collection=docs"), }),
};
export default browserCollections;