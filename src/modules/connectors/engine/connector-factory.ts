import { Injectable, Logger } from '@nestjs/common';
import * as crypto from 'crypto';
import { ConnectorTypeEnum, AuthTypeEnum } from '../domain/value-objects';
import { AxiosRequestConfig } from 'axios';

export interface PreparedRequest {
  config: AxiosRequestConfig;
  url: string;
}

@Injectable()
export class ConnectorFactory {
  private readonly logger = new Logger(ConnectorFactory.name);

  public prepareRequest(
    connectorType: ConnectorTypeEnum,
    baseUrl: string,
    method: string,
    path: string,
    params: Record<string, any>,
    authConfig: { authType: AuthTypeEnum; data: any },
    config: Record<string, any> = {},
  ): PreparedRequest {
    // 1. Substitute variables in path and baseUrl
    let resolvedUrl = this.resolveUrlTemplates(
      `${baseUrl.replace(/\/$/, '')}/${path.replace(/^\//, '')}`,
      params,
    );

    // 2. Separate query parameters vs request body
    const bodyMethods = ['POST', 'PUT', 'PATCH', 'DELETE'];
    let requestData: any = undefined;
    let queryParams: Record<string, any> = {};

    if (bodyMethods.includes(method.toUpperCase())) {
      requestData = { ...params };
    } else {
      queryParams = { ...params };
    }

    // 3. Prepare headers
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    };

    // Apply authentication
    this.applyAuth(headers, queryParams, authConfig);

    // 4. Adjustments based on Connector Type
    if (connectorType === ConnectorTypeEnum.GRAPHQL) {
      const graphqlQuery = config.graphqlQuery || '';
      requestData = {
        query: graphqlQuery,
        variables: params,
      };
    } else if (connectorType === ConnectorTypeEnum.SHOPIFY) {
      const apiVersion = config.apiVersion || '2026-04';
      if (!resolvedUrl.includes('/admin/api/')) {
        // e.g. base_url: https://{shop}.myshopify.com
        resolvedUrl = `${baseUrl.replace(/\/$/, '')}/admin/api/${apiVersion}/${path.replace(/^\//, '')}`;
        resolvedUrl = this.resolveUrlTemplates(resolvedUrl, params);
      }
    } else if (connectorType === ConnectorTypeEnum.SALESFORCE) {
      const apiVersion = config.apiVersion || 'v57.0';
      if (!resolvedUrl.includes('/services/data/')) {
        resolvedUrl = `${baseUrl.replace(/\/$/, '')}/services/data/${apiVersion}/${path.replace(/^\//, '')}`;
        resolvedUrl = this.resolveUrlTemplates(resolvedUrl, params);
      }
    }

    const axiosConfig: AxiosRequestConfig = {
      method: method.toUpperCase() as any,
      url: resolvedUrl,
      headers,
      params: Object.keys(queryParams).length > 0 ? queryParams : undefined,
      data: requestData,
      timeout: config.timeout || 10000,
    };

    return {
      config: axiosConfig,
      url: resolvedUrl,
    };
  }

  private resolveUrlTemplates(
    template: string,
    params: Record<string, any>,
  ): string {
    let resolved = template;
    for (const [key, value] of Object.entries(params)) {
      const regex = new RegExp(`{${key}}`, 'g');
      if (regex.test(resolved)) {
        resolved = resolved.replace(regex, String(value));
        delete params[key]; // Consume it so it's not sent as query param / body parameter duplicate
      }
    }
    return resolved;
  }

  private applyAuth(
    headers: Record<string, string>,
    queryParams: Record<string, any>,
    authConfig: { authType: AuthTypeEnum; data: any },
  ): void {
    const { authType, data } = authConfig;
    if (!data || authType === AuthTypeEnum.NONE) {
      return;
    }

    switch (authType) {
      case AuthTypeEnum.API_KEY:
        const headerName = data.headerName || 'x-api-key';
        const apiKey = data.apiKey || data.apiKeyValue;
        if (data.in === 'query') {
          queryParams[headerName] = apiKey;
        } else {
          headers[headerName] = apiKey;
        }
        break;

      case AuthTypeEnum.BEARER:
        const token = data.token || data.accessToken;
        headers['Authorization'] = `Bearer ${token}`;
        break;

      case AuthTypeEnum.BASIC:
        const username = data.username || '';
        const password = data.password || '';
        const base64Creds = Buffer.from(`${username}:${password}`).toString(
          'base64',
        );
        headers['Authorization'] = `Basic ${base64Creds}`;
        break;

      case AuthTypeEnum.OAUTH2:
        headers['Authorization'] = `Bearer ${data.accessToken}`;
        break;

      case AuthTypeEnum.HMAC:
        // HMAC logic, typically involves signing the body
        const secret = data.clientSecret || data.secret;
        headers[data.signatureHeader || 'x-signature'] = this.calculateHmac(
          secret,
          queryParams,
        );
        break;
    }
  }

  private calculateHmac(secret: string, data: any): string {
    const payload = typeof data === 'string' ? data : JSON.stringify(data);
    return crypto.createHmac('sha256', secret).update(payload).digest('hex');
  }
}
