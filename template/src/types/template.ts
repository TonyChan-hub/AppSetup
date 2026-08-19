export type TemplateItem = {
  id: string;
  title: string;
  description: string;
  createdAt: number;
};

export type ApiResult<T> = {
  ok: boolean;
  data?: T;
  error?: string;
};
