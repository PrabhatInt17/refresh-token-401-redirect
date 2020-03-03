

@Injectable({
  providedIn: 'root'
})
export class AuthenticationService {

private refreshTokenSubject = new Subject<Boolean>();
  appTokenInitNotifier: Observable<
    Boolean
  > = this.refreshTokenSubject.asObservable();
  refreshAccessToken() {
    this.refreshTokenSubject.next(true);
    this.http.post<any>(refreshTokenUrl, httpOptions).subscribe(
      res => {
        // clear the existing accessToken from the localStorage.
      
        this.refreshTokenSubject.next(false);
      },
      err => {
        // handling scenrio where user manually enters code value in url
       
        if (err.status === 404) {
          
        }
        throw err;
      }
    );

  }
}