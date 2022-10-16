export const CATEGORY: {
  ROOT: "ROOT",
  LIST: "LIST",
} = {
  ROOT: "ROOT",
  LIST: "LIST",
};

export interface RootObject {
  Category: "ROOT",
  SubCategory: "ROOT",
  lists: string[],
}

export interface ListObject {
  Category: "LIST",
  SubCategory: string,
  items: string[],
}