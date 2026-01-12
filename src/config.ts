import { AxiosError, AxiosRequestConfig, AxiosResponse, InternalAxiosRequestConfig } from "axios";
import { isCancel } from "./utils";
import type { InterceptorConfig, RetryConfig } from "./types";

/**
 * Axios默认配置
 */
export const DEFAULT_CONFIG: AxiosRequestConfig = {
  baseURL: "",
  timeout: 10000,
  headers: {
    "Content-Type": "application/json;charset=utf-8",
  },
};

/**
 * 接口重试默认配置
 */
export const DEFAULT_RETRY_CONFIG: RetryConfig = {
  count: 0,
  delay: 1000,
  condition: (error: AxiosError): boolean => {
    if (isCancel(error)) return false;
    if (!error?.response) return true; // 网络错误
    return error?.response?.status >= 500; // 服务端错误
  },
};

/**
 * 默认拦截器配置
 */
export const DEFAULT_INTERCEPTOR: InterceptorConfig = {
  request: (config: InternalAxiosRequestConfig) => config,
  requestError: (error: AxiosError) => Promise.reject(error),
  response: (response: AxiosResponse) => response,
  responseError: (error: AxiosError) => Promise.reject(error),
};
