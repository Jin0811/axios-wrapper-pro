import { AxiosRequestConfig, AxiosResponse, AxiosError, InternalAxiosRequestConfig } from "axios";

/**
 * 扩展 Axios 类型，添加自定义字段
 */
declare module "axios" {
  export interface InternalAxiosRequestConfig {
    /** 内部使用的请求键（用于在响应拦截器中清理 AbortController） */
    _requestKey?: RequestKey;
  }
}

/** 请求键类型（字符串或符号） */
export type RequestKey = string | symbol;

/**
 * 重试配置接口（完整配置）
 */
export interface RetryConfig {
  /** 重试次数，默认 0 */
  count: number;
  /** 重试延迟（毫秒），默认 1000 */
  delay: number;
  /** 重试条件判断函数 */
  condition: (error: AxiosError) => boolean;
}

/**
 * 拦截器配置接口
 */
export interface InterceptorConfig {
  /** 请求拦截器 */
  request: (config: InternalAxiosRequestConfig) => InternalAxiosRequestConfig | Promise<InternalAxiosRequestConfig>;
  /** 请求错误拦截器 */
  requestError: (error: AxiosError) => Promise<any>;
  /** 响应拦截器 */
  response: (response: AxiosResponse) => AxiosResponse | Promise<AxiosResponse>;
  /** 响应错误拦截器 */
  responseError: (error: AxiosError) => Promise<any>;
}

/**
 * 请求配置扩展接口
 */
export interface RequestConfig extends AxiosRequestConfig {
  /** 自定义请求标识（用于去重和取消请求） */
  requestKey?: RequestKey;
  /** 单次请求的重试配置 */
  retry?: Partial<RetryConfig>;
}

/**
 * AxiosWrapperPro 构造函数配置选项
 */
export interface AxiosWrapperProOptions {
  /** 基础 URL */
  baseURL?: string;
  /** 超时时间（毫秒） */
  timeout?: number;
  /** 默认请求头 */
  headers?: Record<string, string>;
  /** 参数序列化函数 */
  paramsSerializer?: (params: any) => string;
  /** 拦截器配置 */
  interceptors?: Partial<InterceptorConfig>;
  /** 重试配置 */
  retry?: Partial<RetryConfig>;
}


