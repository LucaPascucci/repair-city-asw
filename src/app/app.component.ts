import { Component } from '@angular/core';
import { Platform, ToastController} from 'ionic-angular';
import { StatusBar } from '@ionic-native/status-bar';
import { SplashScreen } from '@ionic-native/splash-screen';
import { Geolocation } from "@ionic-native/geolocation";
import firebase from 'firebase';
import {LoginPage} from "../pages/login/login";
import {AppPreferences} from "@ionic-native/app-preferences";
import {TabsPage} from "../pages/tabs/tabs";
import {Network} from "@ionic-native/network";
import {Firebase} from "@ionic-native/firebase";

@Component({
  templateUrl: 'app.html'
})
export class MyApp {
  rootPage:any;

  constructor(private platform: Platform, statusBar: StatusBar, splashScreen: SplashScreen, geoLocation: Geolocation, private appPreferences: AppPreferences, private network: Network, private fcm: Firebase, private toastCtrl: ToastController) {
    this.setUpFirebase();
    platform.ready().then(() => {
      // Okay, so the platform is ready and our plugins are available.
      // Here you can do any higher level native things you might need.
      this.selectStartPage();
      this.setUpRange();
      this.startNetworkObserver();
      statusBar.styleDefault();
      splashScreen.hide();
      geoLocation.getCurrentPosition();
      fcm.setBadgeNumber(0);
      this.receiveNotification();
    });
  }

  setUpFirebase(){
    firebase.initializeApp({
      apiKey: "",
      authDomain: "",
      databaseURL: "",
      projectId: "",
      storageBucket: "",
      messagingSenderId: ""
    });
  }

  receiveNotification() {
    this.fcm.onNotificationOpen().subscribe( (data) => {
      console.log(JSON.stringify(data));
      if (!data.tap) { //se sono con l'app attiva mostro solo un toast con body della notifica
        this.platform.is('ios')? this.presentToast(data.aps.alert.body) : this.presentToast(data.body);
      }
      // this.fcm.getBadgeNumber().then((n) => {
      //   console.log("numero notifiche: " + n);
      //
      //   this.fcm.setBadgeNumber(n++)
      // });
    }, (err) => {
      console.log(err);
    })
  }

  presentToast(body) {
    const toast = this.toastCtrl.create({
      message: body,
      duration: 3000,
      position: 'top'
    });
    toast.present();
  }

  selectStartPage(){
    this.appPreferences.fetch("logged", "logged").then((res) => {
      if (res !== null && res) {
        this.rootPage = TabsPage;
      } else {
        this.rootPage = LoginPage;
      }
    });
  }

  setUpRange(){
    this.appPreferences.fetch('range', 'range').then((res) => {
      if (res == null) {
        this.appPreferences.store('range','range',25).catch(e => console.log(e));
      }
    });
  }

  startNetworkObserver(){
    // watch network for a disconnect
    this.network.onDisconnect().subscribe(() => {
      console.log('network was disconnected :-(');
    });
    // watch network for a connection
    this.network.onConnect().subscribe(() => {
      console.log('network connected!');
      // We just got a connection but we need to wait briefly
      // before we determine the connection type. Might need to wait.
      // prior to doing any api requests as well.
      setTimeout(() => {
        if (this.network.type === 'wifi') {
          console.log('we got a wifi connection, woohoo!');
        }
      }, 3000);
    });
  }

}
