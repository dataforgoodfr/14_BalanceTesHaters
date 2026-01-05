export type Post = {
  url: string;
  author: Autor;
  publishedAt: Date;
  text?: string;
  comments: Comment[];
};

export type Autor = {
  name: string;
  accountHref?: string;
};

export type Comment = {
  autor: Autor;
  commentDate?: Date;
  text: string;
  screenshotDataUrl: string;
  replies: Comment[];
};
