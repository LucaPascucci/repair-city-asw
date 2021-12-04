import { Component } from '@angular/core';

import { MapPage } from '../map/map';
import { AddPage } from '../add/add';
import { ListPage} from '../list/list';
import {ProfilePage} from "../profile/profile";
import {SettingsPage} from "../settings/settings";
import {ModalController, NavController} from "ionic-angular";

@Component({
  templateUrl: 'tabs.html'
})
export class TabsPage {

  tab1Root = MapPage;
  tab2Root = ListPage;
  tab3Root = AddPage;
  tab4Root = ProfilePage;
  tab5Root = SettingsPage;

  constructor(public navCtrl: NavController, public modalCtrl: ModalController) {

  }

  public showCreateEvent() {
    this.modalCtrl.create(this.tab3Root).present();
  }
}
