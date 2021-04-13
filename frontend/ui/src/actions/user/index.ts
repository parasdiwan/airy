import _typesafe, {createAction} from 'typesafe-actions';
import _, {Dispatch} from 'redux';

import {User} from 'model';
import {LoginViaEmailRequestPayload} from 'httpclient';
import {HttpClientInstance} from '../../InitializeAiryApi';
import {clearUserData} from '../../cookies';

const SET_CURRENT_USER = '@@auth/SET_CURRENT_USER';
const USER_AUTH_ERROR = '@@auth/ERROR';
const USER_LOGOUT = '@@auth/LOGOUT_USER';

export const setCurrentUserAction = createAction(SET_CURRENT_USER, (user: User) => user)<User>();
export const userAuthErrorAction = createAction(USER_AUTH_ERROR, (error: Error) => error)<Error>();
export const logoutUserAction = createAction(USER_LOGOUT)();

export function loginViaEmail(requestPayload: LoginViaEmailRequestPayload) {
  return async (dispatch: Dispatch<any>) => {
    return HttpClientInstance.loginViaEmail(requestPayload)
      .then((response: User) => {
        dispatch(setCurrentUserAction(response));
        HttpClientInstance.token = response.token;
        return Promise.resolve(true);
      })
      .catch((error: Error) => {
        dispatch(userAuthErrorAction(error));
        return Promise.reject(error);
      });
  };
}

export function logoutUser() {
  return async (dispatch: Dispatch<any>) => {
    clearUserData();
    HttpClientInstance.token = null;
    dispatch(logoutUserAction());
  };
}
