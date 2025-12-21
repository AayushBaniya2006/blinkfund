// @ts-nocheck
import * as __fd_glob_3 from "../src/content/docs/folder/index.mdx?collection=docs"
import * as __fd_glob_2 from "../src/content/docs/folder/folder-page-2.mdx?collection=docs"
import * as __fd_glob_1 from "../src/content/docs/index.mdx?collection=docs"
import * as __fd_glob_0 from "../src/content/docs/anotherpage.mdx?collection=docs"
import { server } from 'fumadocs-mdx/runtime/server';
import type * as Config from '../source.config';

const create = server<typeof Config, import("fumadocs-mdx/runtime/types").InternalTypeConfig & {
  DocData: {
  }
}>({"doc":{"passthroughs":["extractedReferences"]}});

export const docs = await create.docs("docs", "src/content/docs", {}, {"anotherpage.mdx": __fd_glob_0, "index.mdx": __fd_glob_1, "folder/folder-page-2.mdx": __fd_glob_2, "folder/index.mdx": __fd_glob_3, });