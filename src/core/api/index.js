// @flow
import { call, put, select } from 'redux-saga/effects';
import type { Saga } from 'redux-saga';
import Events from '../events';

export type ApiResponseSuccessType = { data: any }
export type ApiResponseErrorType = { error: boolean, code?: number, message: string }
export type ApiResponseType = ApiResponseSuccessType | ApiResponseErrorType
type ApiRequestMethodType = 'POST' | 'GET'
type ApiCallOptions = {
  action: string,
  endpoint?: '/api' | '/plex',
  method?: ApiRequestMethodType,
  params?: {},
  query?: string,
}

const defaultOptions = {
  action: '',
  endpoint: '/api',
  method: 'GET',
  query: '',
  params: {},
};

function* apiCall(userOptions: ApiCallOptions): Saga<ApiResponseType> {
  const options = Object.assign({}, defaultOptions, userOptions);
  let fetchOptions;
  let fetchUrl;

  const apiKey = yield select(state => state.apiSession.apikey);

  switch (options.method) {
    case 'POST':
      fetchOptions = {
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
          apikey: apiKey,
        },
        body: JSON.stringify(options.params),
        method: 'POST',
      };
      fetchUrl = `${options.endpoint}${options.action}`;
      break;
    case 'GET':
      fetchOptions = {
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
          apikey: apiKey,
        },
      };
      fetchUrl = `${options.endpoint}${options.action}${options.query}`;
      break;
    default:
      return { error: true, message: 'Unknown method' };
  }

  try {
    const response = yield call(fetch, fetchUrl, fetchOptions);

    if (response.status === 401) {
      yield put({ type: Events.LOGOUT, payload: null });
      yield put({ type: Events.STOP_API_POLLING, payload: { type: 'auto-refresh' } });
    }
    if (response.status !== 200) {
      return { error: true, message: `Network error: ${options.action} ${response.status}: ${response.statusText}` };
    }

    const json = yield response.json();
    if (json.code && json.code !== 200) {
      return { error: true, code: json.code, message: json.message || 'No error message given.' };
    }
    return { data: json };
  } catch (ex) {
    return { error: true, message: ex.message };
  }
}

export default {
  call: apiCall,
};