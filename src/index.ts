import axios, { AxiosInstance, AxiosRequestConfig, InternalAxiosRequestConfig } from "axios";
import { isFunction, sleep } from "./utils";
import { DEFAULT_CONFIG, DEFAULT_RETRY_CONFIG, DEFAULT_INTERCEPTOR } from "./config";
import type { AxiosWrapperProOptions, RetryConfig, InterceptorConfig, RequestConfig, RequestKey } from "./types";

class AxiosWrapperPro {
  /** 中断控制器 */
  private _abortControllers: Map<RequestKey, AbortController>;

  /** 请求拦截器ID */
  private _requestInterceptorId!: number;

  /** 响应拦截器ID */
  private _responseInterceptorId!: number;

  /** 拦截器配置 */
  private _interceptorConfig: Partial<InterceptorConfig>;

  /** 重试配置（完整配置） */
  private _retryConfig: RetryConfig;

  /** 参数序列化函数 */
  private _paramsSerializer: ((params: any) => string) | null;

  /** Axios实例 */
  private _instance: AxiosInstance;

  constructor(options: AxiosWrapperProOptions = {}) {
    this._abortControllers = new Map();

    // 接口重试配置
    this._retryConfig = {
      ...DEFAULT_RETRY_CONFIG,
      ...(options?.retry || {}),
    };

    // 保存参数序列化函数
    this._paramsSerializer = isFunction(options.paramsSerializer) ? options.paramsSerializer : null;

    // 创建axios实例
    const axiosConfig: AxiosRequestConfig = {
      ...DEFAULT_CONFIG,
      ...(options.baseURL && { baseURL: options.baseURL }),
      ...(options.timeout && { timeout: options.timeout }),
      headers: { ...DEFAULT_CONFIG.headers, ...options.headers },
    };
    if (this._paramsSerializer) {
      axiosConfig.paramsSerializer = this._paramsSerializer;
    }
    this._instance = axios.create(axiosConfig);

    // 保存拦截器配置
    this._interceptorConfig = options.interceptors || {};

    // 初始化拦截器
    this._initRequestInterceptors();
    this._initResponseInterceptors();
  }

  /**
   * 获取拦截器配置，未配置的使用默认值
   * @returns {InterceptorConfig} 完整的拦截器配置
   */
  _getInterceptors(): InterceptorConfig {
    const { request, requestError, response, responseError } = this._interceptorConfig;
    return {
      request: isFunction(request) ? request : DEFAULT_INTERCEPTOR.request,
      requestError: isFunction(requestError) ? requestError : DEFAULT_INTERCEPTOR.requestError,
      response: isFunction(response) ? response : DEFAULT_INTERCEPTOR.response,
      responseError: isFunction(responseError) ? responseError : DEFAULT_INTERCEPTOR.responseError,
    };
  }

  /**
   * 初始化请求拦截器
   */
  _initRequestInterceptors() {
    const { request, requestError } = this._getInterceptors();
    this._requestInterceptorId = this._instance.interceptors.request.use(request, requestError);
  }

  /**
   * 初始化响应拦截器
   */
  _initResponseInterceptors() {
    const { response, responseError } = this._getInterceptors();

    // 响应拦截器
    this._responseInterceptorId = this._instance.interceptors.response.use(
      (res) => {
        // 清理AbortController，使用请求时保存的 key 确保一致性
        const key = res.config._requestKey;
        key && this._abortControllers.delete(key);

        // 执行自定义响应拦截器
        return response(res);
      },
      (error) => {
        // 清理AbortController，使用请求时保存的 key 确保一致性
        const key = error.config?._requestKey;
        key && this._abortControllers.delete(key);

        // 执行自定义响应错误拦截器
        return responseError(error);
      }
    );
  }

  /**
   * 设置请求拦截器，移除旧拦截器，更新拦截器配置，重新初始化拦截器
   * @param {InterceptorConfig["request"]} interceptor 拦截器
   * @param {InterceptorConfig["requestError"]} errorInterceptor 错误拦截器
   */
  setRequestInterceptor(
    interceptor: InterceptorConfig["request"],
    errorInterceptor: InterceptorConfig["requestError"]
  ) {
    if (this._requestInterceptorId !== undefined) {
      this._instance.interceptors.request.eject(this._requestInterceptorId);
    }
    this._interceptorConfig.request = interceptor;
    this._interceptorConfig.requestError = errorInterceptor;
    this._initRequestInterceptors();
  }

  /**
   * 设置响应拦截器，移除旧拦截器，更新拦截器配置，重新初始化拦截器
   * @param {InterceptorConfig["response"]} interceptor 拦截器
   * @param {InterceptorConfig["responseError"]} errorInterceptor 错误拦截器
   */
  setResponseInterceptor(
    interceptor: InterceptorConfig["response"],
    errorInterceptor: InterceptorConfig["responseError"]
  ) {
    if (this._responseInterceptorId !== undefined) {
      this._instance.interceptors.response.eject(this._responseInterceptorId);
    }
    this._interceptorConfig.response = interceptor;
    this._interceptorConfig.responseError = errorInterceptor;
    this._initResponseInterceptors();
  }

  /**
   * 设置取消控制器
   * @param {AxiosRequestConfig} config 请求配置
   * @param {RequestKey} customKey 自定义key
   * @returns {InternalAxiosRequestConfig} 处理后的配置
   */
  _setupAbortController(config: AxiosRequestConfig, customKey: RequestKey): InternalAxiosRequestConfig {
    const key = customKey ?? this._generateRequestKey(config);

    // 取消已存在的相同请求
    this.cancelRequest(key);

    // 设置当前请求的AbortController
    const controller = new AbortController();
    this._abortControllers.set(key, controller);

    // 将 key 保存到 config 中，确保响应拦截器使用相同的 key
    return { ...config, signal: controller.signal, _requestKey: key } as InternalAxiosRequestConfig;
  }

  /**
   * 生成请求唯一标识
   * @param {AxiosRequestConfig} config 请求配置
   * @returns {string} 请求唯一标识
   */
  _generateRequestKey(config: AxiosRequestConfig): string {
    const method = (config.method || "GET").toUpperCase();
    const url = config.url || "";

    // 复制params对象，避免修改原始配置
    const params = config.params ? { ...config.params } : null;

    // 删除_t参数，避免影响生成请求唯一标识
    if (params?._t) {
      delete params._t;
    }

    // 获取序列化函数：优先使用请求级配置，其次使用实例级配置
    const serializer = isFunction(config.paramsSerializer) ? config.paramsSerializer : this._paramsSerializer;

    let paramsStr = "";

    // 所有HTTP方法都可能携带params参数
    if (params) {
      paramsStr = serializer ? serializer(params) : this._stableStringify(params);
    }

    // POST/PUT/PATCH/DELETE 可能同时携带 data
    let dataStr = "";
    if (["POST", "PUT", "PATCH", "DELETE"].includes(method) && config.data) {
      dataStr = typeof config.data === "string" ? config.data : this._stableStringify(config.data);
    }

    return `${method}|${url}|${paramsStr}|${dataStr}`;
  }

  /**
   * 稳定的JSON序列化，确保相同内容生成相同字符串
   * @param {any} obj 待序列化对象
   * @returns {string} 序列化后的字符串
   */
  _stableStringify(obj: any): string {
    if (obj === null || obj === undefined) {
      return "";
    }
    if (Array.isArray(obj)) {
      return "[" + obj.map((item) => this._stableStringify(item)).join(",") + "]";
    }
    if (typeof obj === "object") {
      const sortedKeys = Object.keys(obj).sort();
      const pairs: string[] = sortedKeys.map((key) => `"${key}":${this._stableStringify(obj[key])}`);
      return "{" + pairs.join(",") + "}";
    }
    return JSON.stringify(obj);
  }

  /**
   * 取消指定请求
   * @param {RequestKey} key 请求标识
   * @param {string} [reason] 取消原因
   * @returns {boolean} 是否成功取消
   */
  cancelRequest(key: RequestKey, reason?: string): boolean {
    const controller = this._abortControllers.get(key);
    if (controller) {
      controller.abort(reason || "请求已取消");
      this._abortControllers.delete(key);
      return true;
    }
    return false;
  }

  /**
   * 取消所有请求
   * @param {string} [reason] 取消原因
   * @returns {number} 被取消的请求数量
   */
  cancelAllRequests(reason?: string): number {
    const count = this._abortControllers.size;
    this._abortControllers.forEach((controller) => {
      controller.abort(reason || "请求已取消");
    });
    this._abortControllers.clear();
    return count;
  }

  /**
   * 设置默认请求头
   * @param {string} key 请求头名称
   * @param {string} value 请求头值
   */
  setHeader(key: string, value: string): void {
    this._instance.defaults.headers.common[key] = value;
  }

  /**
   * 批量设置请求头
   * @param {Record<string, string>} headers 请求头对象
   */
  setHeaders(headers: Record<string, string>): void {
    Object.entries(headers).forEach(([key, value]) => {
      this._instance.defaults.headers.common[key] = value;
    });
  }

  /**
   * 移除请求头
   * @param {string} key 请求头名称
   */
  removeHeader(key: string): void {
    delete this._instance.defaults.headers.common[key];
  }

  /** 获取基础URL */
  getBaseURL(): string {
    return this._instance.defaults.baseURL || "";
  }

  /** 设置基础URL */
  setBaseURL(url: string): void {
    this._instance.defaults.baseURL = url;
  }

  /** 获取 Axios 实例 */
  getInstance(): AxiosInstance {
    return this._instance;
  }

  /**
   * 通用请求方法
   * @param {string} method 请求方法
   * @param {string} url 请求地址
   * @param {RequestConfig} [config={}] 请求配置
   * @returns {Promise<AxiosResponse>} 响应数据
   */
  async request(method: string, url: string, config: RequestConfig = {}) {
    const { requestKey, retry, ...restConfig } = config;

    // 合并重试配置
    const retryConfig: RetryConfig = {
      ...this._retryConfig,
      ...(retry || {}),
    };

    // 构建请求配置，避免重复的 method 和 url
    const requestConfig: AxiosRequestConfig = { method, url, ...restConfig };

    let lastError: any = null;
    const configKey: RequestKey = requestKey ?? this._generateRequestKey(requestConfig);

    // 重试循环
    for (let attempt = 0; attempt <= retryConfig.count; attempt++) {
      try {
        // 重试时清理旧的AbortController
        if (attempt > 0) {
          this._abortControllers.delete(configKey);
        }

        // 设置AbortController
        const finalConfig = this._setupAbortController(requestConfig, configKey);

        // 调用接口
        const result = await this._instance.request(finalConfig);
        return result;
      } catch (error: any) {
        lastError = error;

        // 清理旧的AbortController
        this._abortControllers.delete(configKey);

        // 判断是否继续重试
        const isLast = attempt === retryConfig.count;
        const shouldRetry = retryConfig.condition(error);
        const isCancelled = axios.isCancel(error);
        if (isLast || !shouldRetry || isCancelled) {
          break;
        }

        // 延迟重试
        if (retryConfig.delay > 0) {
          await sleep(retryConfig.delay);
        }
      }
    }

    return Promise.reject(lastError);
  }

  /**
   * GET请求
   * @param {string} url 请求地址
   * @param {RequestConfig} [options] 请求选项
   * @returns {Promise<AxiosResponse>} 响应数据
   */
  get(url: string, options: RequestConfig = {}) {
    return this.request("GET", url, options);
  }

  /**
   * POST请求
   * @param {string} url 请求地址
   * @param {any} [data] 请求数据
   * @param {RequestConfig} [options] 其他选项
   * @returns {Promise<AxiosResponse>} 响应数据
   */
  post(url: string, data: any = {}, options: RequestConfig = {}) {
    return this.request("POST", url, { ...options, data });
  }

  /**
   * PUT请求
   * @param {string} url 请求地址
   * @param {any} [data] 请求数据
   * @param {RequestConfig} [options] 其他选项
   * @returns {Promise<AxiosResponse>} 响应数据
   */
  put(url: string, data: any = {}, options: RequestConfig = {}) {
    return this.request("PUT", url, { ...options, data });
  }

  /**
   * DELETE请求
   * @param {string} url 请求地址
   * @param {RequestConfig} [options] 请求选项
   * @returns {Promise<AxiosResponse>} 响应数据
   */
  delete(url: string, options: RequestConfig = {}) {
    return this.request("DELETE", url, options);
  }

  /**
   * PATCH请求
   * @param {string} url 请求地址
   * @param {any} [data] 请求数据
   * @param {RequestConfig} [options] 其他选项
   * @returns {Promise<AxiosResponse>} 响应数据
   */
  patch(url: string, data: any = {}, options: RequestConfig = {}) {
    return this.request("PATCH", url, { ...options, data });
  }
}

export { AxiosWrapperPro };
export type { AxiosWrapperProOptions, RetryConfig, InterceptorConfig, RequestConfig, RequestKey } from "./types";
