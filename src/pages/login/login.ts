import { Component } from '@angular/core';
import {NavController} from 'ionic-angular';
import {TabsPage} from "../tabs/tabs";
import {Facebook, FacebookLoginResponse} from "@ionic-native/facebook";
import firebase from 'firebase';
import {AppPreferences} from "@ionic-native/app-preferences";
import {Toast} from "@ionic-native/toast";
import {StatusBar} from "@ionic-native/status-bar";
import {Firebase} from "@ionic-native/firebase";

@Component({
  selector: 'page-login',
  templateUrl: 'login.html'
})
export class LoginPage {

  private toast : Toast = new Toast;
  userData: any;

  constructor(public navCtrl: NavController, private fb: Facebook, private appPreferences: AppPreferences, private statusBar: StatusBar, private fcm: Firebase) {
    this.statusBar.hide();
  }

  login() {
    this.fb.login(['public_profile', 'user_friends', 'email'])
      .then((res: FacebookLoginResponse) => {
        this.fb.api('me?fields=id,email,first_name,last_name,picture.width(720).height(720).as(picture_large)', []).then((profile) => {
          this.userData = {
            id: profile['id'],
            email: profile['email'],
            firstName: profile['first_name'],
            lastName: profile['last_name'],
            profilePic: profile['picture_large']['data']['url']
          };
          const personRef: firebase.database.Reference = firebase.database().ref('/users/' + this.userData.id);
          personRef.set({
            email: this.userData.email,
            firstName: this.userData.firstName,
            lastName: this.userData.lastName,
            profilePic: this.userData.profilePic
          });
          this.appPreferences.store("logged", "logged", this.userData.id);
          let fullName = this.userData.firstName + " " + this.userData.lastName;
          this.appPreferences.store("fullname", "fullname", fullName);
          this.fcm.hasPermission().then((data) => {
            if (!data.isEnabled) { //per iOS
              console.log("permessi non dati");
              this.fcm.grantPermission().then((success) => {
                if (success) {
                  console.log("ora hai i permessi");
                  this.fcm.subscribe("user_" + this.userData.id).then((res) => console.log("Mi iscrivo al topic user_" + this.userData.id + " res: " + res));
                }
              });
            } else {
              console.log("hai gia i permessi");
              this.fcm.subscribe("user_" + this.userData.id).then((res) => console.log("Mi iscrivo al topic user_" + this.userData.id + " res: " + res));
            }
          });
        });
        this.navCtrl.setRoot(TabsPage).then(() => {
          this.navCtrl.popToRoot();
          this.statusBar.show();
        });
      })
      .catch(e => this.showToast("Errore di accesso a Facebook" + JSON.stringify(e)));
  }

  showToast(message: string) {
    this.toast.show(message, '4000', 'top').subscribe();
  }

}
