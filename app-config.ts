import path from "path";
import { Friends } from "./types";

interface AppConfig {
  title: string;
  description: string;
  headerTitle?: string;
  siteUrl: string;
  me: {
    name: string;
    skills?: string[];
    expirience?: {
      period: string;
      organization: string;
      title: string;
      description: string;
    }[];
    email?: string;
    avatar: string;
    contact: {
      title: string;
      link?: string;
      value?: string;
      key: string;
      icon: string;
    }[];
  };
  navList: {
    title: string;
    url: string;
    key: string;
    isActive?: boolean;
  }[];
  greeting: {
    text: string;
    colorText: string;
    sub: string;
  };
  srcDir: string;
  twikooEnvId: string;
}

export const appConfig: AppConfig = {
  twikooEnvId: "https://Leslie.online/comment",
  title: "Leslie - Leslie秘密基地",
  siteUrl: "https://Leslie.online",
  description: "Leslie的个人站点, 包含文章、项目和个人信息等内容",
  headerTitle: "Leslie",
  me: {
    name: "Leslie",
    email: "Leslie.li@qq.com",
    avatar: "https://img.picui.cn/free/2025/05/24/6831dfa1affeb.jpg",
    skills: [
      "LLM应用开发",
      "Vue",
      "TypeScript",
      "Node.js",
      "React",
      "Next.js",
    ],
    contact: [
      {
        title: "掘金",
        key: "juejin",
        link: "https://juejin.cn/user/2335804829209150",
        icon: "Juejin",
      },
      {
        title: "GitHub",
        key: "github",
        link: "https://github.com/leslieCHUENGT",
        icon: "Github",
      },
      {
        title: "Email",
        key: "email",
        value: "1278207976@qq.com",
        icon: "Email",
      },
    ],
    expirience: [
      {
        period: "2024 - 至今",
        organization: "苏州某司",
        title: "LLM应用前端开发工程师",
        description:
          "负责多个LLM应用开发，包括公司首个LLM应用 0到 1，目前线上项目日 pv是 11W+，俺是一个有产品思维的前端开发",
      },
      {
        period: "2020 - 2024",
        organization: "江西财经大学",
        title: "本科学习",
        description:
          "",
      },
    ],
  },
  navList: [
    {
      title: "首页",
      url: "/",
      key: "index",
    },
    {
      title: "文章",
      url: "/articles",
      key: "articles",
    },
    {
      title: "分类",
      url: "/categories",
      key: "categories",
    },
    {
      title: "关于",
      url: "/about",
      key: "about",
    },
    {
      title: "友链",
      url: "/friends",
      key: "friends",
    },
  ],
  greeting: {
    text: "你好，我是",
    colorText: "Leslie",
    sub: "这位博主朋友面善又友善🕶",
  },
  srcDir: path.join(process.cwd(), "docs/blog"),
};

export const personalExperiencePrompt = "";

export const friends: Friends[] = [];
