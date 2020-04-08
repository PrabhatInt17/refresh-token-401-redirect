import { Injectable, Injector } from '@angular/core';
import { AuthenticationService } from '../services/authentication.service';
import {
  HttpEvent,
  HttpHandler,
  HttpInterceptor,
  HttpRequest
} from '@angular/common/http';
import { Observable, Subject } from 'rxjs/Rx';
import { finalize, tap } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class RefreshTokenInterceptorService implements HttpInterceptor {

  //https://stackoverflow.com/questions/45202208/angular-4-interceptor-retry-requests-after-token-refresh
  refreshTokenInProgress = false;
  currentAccessToken?: any;
  previousAccessToken?: any;

  constructor(private authenticationSvc: AuthenticationService) {}

  private checkError(error: HttpErrorResponse): boolean {
    return error.status == 401 && error.error.error == 'Unauthorized';
  }

  private ifFailedDuringTokenRefresh(req): boolean {
    
    return (
      this.previousAccessToken &&
      this.currentAccessToken &&
      req.headers.headers
        .get('authorization')[0]
        .includes(this.previousAccessToken) 
    );
  }

  updateHeader(req) {
    const authToken = this.authenticationSvc.getToken();
    req = req.clone({
      headers: req.headers.set('authorization', `Bearer ${authToken}`)
    });
    return req;
  }

  intercept(
    req: HttpRequest<any>,
    next: HttpHandler
  ): Observable<HttpEvent<any>> {
    if (req.url.endsWith("/token-refresh")) {
      this.refreshTokenInProgress = true;
      this.currentAccessToken = this.authenticationSvc.getToken();
      return next.handle(req).pipe(
        finalize(() => {
          this.refreshTokenInProgress = false;
          this.previousAccessToken = this.currentAccessToken;
          this.currentAccessToken = this.authenticationSvc.getToken();
        })
      );
    } else {
      return next.handle(req).pipe(
        catchError((error, caught) => {
          if (error instanceof HttpErrorResponse) {
            if (
              this.checkError(error) &&
              !this.refreshTokenInProgress &&
              this.ifFailedDuringTokenRefresh(req)
            ) {
              const cloneCopy = this.updateHeader(req);
              return next.handle(cloneCopy);
            } else if (this.refreshTokenInProgress && this.checkError(error)) {
              return caught; //retry
            } else {
              return throwError(error);
            }
          } else {
            return throwError(error);
          }
         
        })
      );
    }
  }
}
