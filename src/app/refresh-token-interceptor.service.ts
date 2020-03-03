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
  pendingRequestsCount = 0;
  refreshTokenInProgress = false;

  authService;

  tokenRefreshedSource = new Subject();
  tokenRefreshed$ = this.tokenRefreshedSource.asObservable();

  constructor(
    private authenticationSvc: AuthenticationService,
    private injector: Injector
  ) {
    this.authenticationSvc.appTokenInitNotifier.subscribe(action => {
      if (action) {
        console.log('current pending requests', this.pendingRequestsCount);
        this.refreshTokenInProgress = true;
      } else {
        this.refreshTokenInProgress = false;
      }
    });
  }

  refreshToken() {
    if (this.refreshTokenInProgress) {
      return new Observable(observer => {
        this.authenticationSvc.appTokenInitNotifier.subscribe(action => {
          if (!action) {
            observer.next();
            observer.complete();
          }
        });
      });
    }
  }

  intercept(
    request: HttpRequest<any>,
    next: HttpHandler
  ): Observable<HttpEvent<any>> {
    this.authService = this.injector.get(AuthenticationService);

    return next.handle(request).catch(error => {
      if (error.status === 401) {
        return this.refreshToken()
          .switchMap(() => {
            return next.handle(request);
          })
          .catch(() => {
            return Observable.empty();
          });
      }

      return Observable.throw(error);
    });
  }
}
