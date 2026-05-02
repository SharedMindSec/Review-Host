export type Video = {
  id: string;
  sourcePlatform: string;
  title: string;
  description: string;
  thumbnailUrl: string;
  embedUrl: string;
  watchUrl: string;
  publishedAt: string;
  durationSeconds: number | null;
  channelId: string;
  channelTitle: string;
  category: string;
  tags: string[];
};

export type Category = {
  category: string;
  label: string;
  description: string;
  videoCount: number;
  channelCount: number;
};
