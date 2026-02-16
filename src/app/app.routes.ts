import { Routes } from '@angular/router';
import { HomeComponent } from './home-component/home-component.component'; 
import { RegisterComponent } from './register/register.component';
import { BirthComponent } from './certificate_types/birth/birth.component';
import { AccountComponent } from './account/account.component';
import { ResetPasswordComponent } from './reset-password/reset-password.component';
import { AdminUsersComponent } from './admin-users/admin-users.component';
import { OtpVerificationComponent } from './otpverify/otpverify.component';
import { EditProfileComponent } from './edit-profile/edit-profile.component';
import { HomeStaffComponent } from './home-staff/home-staff.component';
import { RequestDetailComponent } from './request-detail/request-detail.component';
import { ProcessRequestComponent } from './process-request/process-request.component';
import { AdminComponent } from './admin/admin.component';
import { MyRequestsComponent } from './my-requests/my-requests.component';
import { authGuard } from './auth.guard';
import { ArchivesComponent } from './archives/archives.component';
import { DocumentsComponent } from './documents/documents.component';
import { DelayedRegistrationOfBirthComponent } from './delayed-registration-of-birth/delayed-registration-of-birth.component';
import { DelayedRegistrationOfMarriageComponent } from './delayed-registration-of-marriage/delayed-registration-of-marriage.component';
import { DelayedRegistrationOfDeathComponent } from './delayed-registration-of-death/delayed-registration-of-death.component';
import { RegistrationOfBirthOnTimeComponent } from './registration-of-birth-on-time/registration-of-birth-on-time.component';
import { RegistrationOfDeathOnTimeComponent } from './registration-of-death-on-time/registration-of-death-on-time.component';
import { RegistrationOfMarriageOnTimeComponent } from './registration-of-marriage-on-time/registration-of-marriage-on-time.component';
import { IssuanceOfCertifiedCopyOfBirthOthersComponent } from './issuance-of-certified-copy-of-birth-others/issuance-of-certified-copy-of-birth-others.component';
import { IssuanceOfMarriedLicenseComponent } from './issuance-of-married-license/issuance-of-married-license.component';
import { DeathComponent } from './certificate_types/death/death.component';
import { MarriageComponent } from './certificate_types/marriage/marriage.component';
import { DeathdelayedComponent } from './certificate_types/deathdelayed/deathdelayed.component';
import { MarriagedelayedComponent } from './certificate_types/marriagedelayed/marriagedelayed.component';
import { BirthdelayedComponent } from './certificate_types/birthdelayed/birthdelayed.component';
import { MarriagelicenseComponent } from './certificate_types/marriagelicense/marriagelicense.component';
import { OthersComponent } from './certificate_types/others/others.component';
export const routes: Routes = [
    { path: '', component: HomeComponent }, 
    {
      path: 'login',
      loadComponent: () => import('./login/login.component').then(m => m.LoginComponent)
    },
    { path: 'register', component: RegisterComponent },
    { path: 'otpverify', component: OtpVerificationComponent },
    { path: 'birth', component: BirthComponent },
    { path: 'account-settings', component: AccountComponent },
    { path: 'request-detail/:id', component: RequestDetailComponent },
    { path: 'account', component: AccountComponent },
    { path: 'reset-password', component: ResetPasswordComponent },
    { path: 'admin-users', component: AdminUsersComponent, canActivate: [authGuard] },
    { path: 'edit-profile', component: EditProfileComponent, canActivate: [authGuard] },
    { path: 'home-staff', component: HomeStaffComponent, canActivate: [authGuard] },
    { path: 'process-request/:id', component: ProcessRequestComponent, canActivate: [authGuard] },
    { path: 'admin', component: AdminComponent, canActivate: [authGuard] },
    { path: 'my-requests', component: MyRequestsComponent, canActivate: [authGuard] },
    { path: 'archives', component: ArchivesComponent },
    { path: 'documents', component: DocumentsComponent },
    { path: 'delayed-registration-of-birth', component: DelayedRegistrationOfBirthComponent },
    { path: 'delayed-registration-of-marriage', component: DelayedRegistrationOfMarriageComponent },
    { path: 'delayed-registration-of-death', component: DelayedRegistrationOfDeathComponent },
    { path: 'registration-of-birth-on-time', component: RegistrationOfBirthOnTimeComponent },
    { path: 'registration-of-death-on-time', component: RegistrationOfDeathOnTimeComponent },
    { path: 'registration-of-marriage-on-time', component: RegistrationOfMarriageOnTimeComponent },
    { path: 'issuance-of-certified-copy-of-birth-others', component: IssuanceOfCertifiedCopyOfBirthOthersComponent },
    { path: 'issuance-of-married-license', component: IssuanceOfMarriedLicenseComponent },
    { path: 'death', component: DeathComponent },
    { path: 'marriage', component: MarriageComponent },
    { path: 'deathdelayed', component: DeathdelayedComponent },
    { path: 'marriagedelayed', component: MarriagedelayedComponent },
    { path: 'birthdelayed', component: BirthdelayedComponent },
    {path: 'marriagelicense', component: MarriagelicenseComponent },
    { path: 'others', component: OthersComponent },

];