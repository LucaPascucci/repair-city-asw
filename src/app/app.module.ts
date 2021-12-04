import { NgModule, ErrorHandler } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import {IonicApp, IonicModule, IonicErrorHandler} from 'ionic-angular';
import { MyApp } from './app.component';

import { MapPage } from '../pages/map/map';
import { AddPage } from '../pages/add/add';
import { ListPage} from '../pages/list/list';
import { ProfilePage } from "../pages/profile/profile";
import { SettingsPage } from "../pages/settings/settings";
import { TabsPage } from '../pages/tabs/tabs';

import { StatusBar } from '@ionic-native/status-bar';
import { Geolocation } from "@ionic-native/geolocation";
import { SplashScreen } from '@ionic-native/splash-screen';
import {Facebook} from "@ionic-native/facebook";
import {LoginPage} from "../pages/login/login";
import {AppPreferences} from "@ionic-native/app-preferences";
import {Network} from "@ionic-native/network";
import {Toast} from "@ionic-native/toast";
import {Camera} from "@ionic-native/camera";
import {SocialSharing} from "@ionic-native/social-sharing";
import {GoogleMaps} from "@ionic-native/google-maps"
import {DetailPage} from "../pages/detail/detail";
import {LaunchNavigator} from "@ionic-native/launch-navigator";
import {Firebase} from "@ionic-native/firebase";

@NgModule({
  declarations: [
    MyApp,
    LoginPage,
    MapPage,
    AddPage,
    ListPage,
    ProfilePage,
    SettingsPage,
    TabsPage,
    DetailPage
  ],
  imports: [
    BrowserModule,
    IonicModule.forRoot(MyApp)
  ],
  bootstrap: [IonicApp],
  entryComponents: [
    MyApp,
    LoginPage,
    MapPage,
    AddPage,
    ListPage,
    ProfilePage,
    SettingsPage,
    TabsPage,
    DetailPage
  ],
  providers: [
    StatusBar,
    SplashScreen,
    Geolocation,
    Facebook,
    AppPreferences,
    Network,
    Toast,
    Camera,
    SocialSharing,
    GoogleMaps,
    LaunchNavigator,
    Firebase,
    {provide: ErrorHandler, useClass: IonicErrorHandler}
  ]
})
export class AppModule {}
