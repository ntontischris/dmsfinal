import { z } from "zod";

// Σχήματα των JSON των RPC της Γνώσης (knowledge_library, knowledge_item_get, knowledge_search, knowledge_manage_list,
// knowledge_manage_item, knowledge_file_path). Ό,τι δεν ταιριάζει σπάει εδώ, δυνατά.

export const ITEM_KINDS = ["article", "file"] as const;
export const ITEM_STATUSES = ["draft", "published"] as const;
export const TEXT_STATUSES = ["pending", "ok", "image_only", "failed"] as const;
export const ROLE_KINDS = ["team", "client"] as const;

export type ItemKind = (typeof ITEM_KINDS)[number];
export type ItemStatus = (typeof ITEM_STATUSES)[number];
export type TextStatus = (typeof TEXT_STATUSES)[number];

const fileSchema = z.object({
  name: z.string(),
  mime: z.string(),
  size: z.number(),
});

const roleSchema = z.object({
  id: z.string(),
  name: z.string(),
  kind: z.enum(ROLE_KINDS),
});

const audienceSchema = z.object({
  isPublic: z.boolean(),
  roles: z.array(roleSchema),
});

const libraryItemSchema = z.object({
  id: z.string(),
  kind: z.enum(ITEM_KINDS),
  title: z.string(),
  summary: z.string(),
  updatedAt: z.string(),
});

const librarySchema = z.object({
  sections: z.array(
    z.object({
      id: z.string(),
      name: z.string(),
      description: z.string(),
      items: z.array(libraryItemSchema),
    }),
  ),
});

const itemViewSchema = z.object({
  id: z.string(),
  kind: z.enum(ITEM_KINDS),
  title: z.string(),
  summary: z.string(),
  body: z.string().nullable(),
  sectionId: z.string(),
  sectionName: z.string(),
  updatedAt: z.string(),
  file: fileSchema.nullable(),
  textStatus: z.enum(TEXT_STATUSES).nullable(),
});

const searchSchema = z.object({
  items: z.array(
    z.object({
      id: z.string(),
      kind: z.enum(ITEM_KINDS),
      title: z.string(),
      summary: z.string(),
      sectionName: z.string(),
    }),
  ),
});

const manageSectionSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  sort: z.number(),
  itemCount: z.number(),
});

const manageItemRowSchema = z.object({
  id: z.string(),
  sectionId: z.string(),
  sectionName: z.string(),
  kind: z.enum(ITEM_KINDS),
  title: z.string(),
  summary: z.string(),
  status: z.enum(ITEM_STATUSES),
  publishedAt: z.string().nullable(),
  updatedAt: z.string(),
  updatedByName: z.string().nullable(),
  textStatus: z.enum(TEXT_STATUSES).nullable(),
  audience: audienceSchema,
});

const manageListSchema = z.object({
  counts: z.object({
    all: z.number(),
    draft: z.number(),
    published: z.number(),
  }),
  sections: z.array(manageSectionSchema),
  items: z.array(manageItemRowSchema),
});

const editableItemSchema = z.object({
  id: z.string(),
  sectionId: z.string(),
  kind: z.enum(ITEM_KINDS),
  title: z.string(),
  summary: z.string(),
  body: z.string().nullable(),
  status: z.enum(ITEM_STATUSES),
  publishedAt: z.string().nullable(),
  updatedAt: z.string(),
  textStatus: z.enum(TEXT_STATUSES).nullable(),
  file: fileSchema.nullable(),
  audience: audienceSchema,
});

const manageItemSchema = z.object({
  item: editableItemSchema.nullable(),
  sections: z.array(z.object({ id: z.string(), name: z.string() })),
  roles: z.array(roleSchema),
});

const fileLinkSchema = z.object({ path: z.string(), name: z.string() });

export type Library = z.infer<typeof librarySchema>;
export type LibraryItem = z.infer<typeof libraryItemSchema>;
export type ItemView = z.infer<typeof itemViewSchema>;
export type SearchResult = z.infer<typeof searchSchema>;
export type ManageList = z.infer<typeof manageListSchema>;
export type ManageSection = z.infer<typeof manageSectionSchema>;
export type ManageItemRow = z.infer<typeof manageItemRowSchema>;
export type ManageItem = z.infer<typeof manageItemSchema>;
export type EditableItem = z.infer<typeof editableItemSchema>;
export type Audience = z.infer<typeof audienceSchema>;
export type RoleOption = z.infer<typeof roleSchema>;
export type FileLink = z.infer<typeof fileLinkSchema>;

export const parseLibrary = (data: unknown): Library =>
  librarySchema.parse(data);
export const parseItemView = (data: unknown): ItemView =>
  itemViewSchema.parse(data);
export const parseSearch = (data: unknown): SearchResult =>
  searchSchema.parse(data);
export const parseManageList = (data: unknown): ManageList =>
  manageListSchema.parse(data);
export const parseManageItem = (data: unknown): ManageItem =>
  manageItemSchema.parse(data);
export const parseFileLink = (data: unknown): FileLink =>
  fileLinkSchema.parse(data);
