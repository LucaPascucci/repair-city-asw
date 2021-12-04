import {Component} from '@angular/core';
import {App,NavController} from 'ionic-angular';
import {AppPreferences} from '@ionic-native/app-preferences';
import {Toast} from "@ionic-native/toast";
import {SocialSharing} from "@ionic-native/social-sharing";
import {LoginPage} from "../login/login";
import { AlertController } from 'ionic-angular';
import {Firebase} from "@ionic-native/firebase";

@Component({
  selector: 'page-settings',
  templateUrl: 'settings.html'
})

export class SettingsPage {

  private toast : Toast = new Toast;
  private range: number = 25;
  private userLogged: any;

  constructor(public navCtrl: NavController, private appPreferences: AppPreferences, private socialSharing:SocialSharing, public alertCtrl: AlertController, private app:App, private fcm: Firebase) {
    this.appPreferences.fetch('range','range').then(res => {
      this.range = res;
    });

    this.appPreferences.fetch('logged','logged').then(res => {
      this.userLogged = res;
    });
  }

  onChange(event: any) {
    this.appPreferences.store('range','range',this.range).catch(e => this.showToast("Errore in scrittura " + e));
  }

  /*Runs when the page has loaded. This event only happens once per page being created.
  If a page leaves but is cached, then this event will not fire again on a subsequent viewing.
  The ionViewDidLoad event is good place to put your setup code for the page.*/
  ionViewDidLoad(){

  }

  //Runs when the page is about to enter and become the active page.
  ionViewWillEnter(){

  }

  //Runs when the page has fully entered and is now the active page. This event will fire, whether it was the first load or a cached page
  ionViewDidEnter(){

  }

  //Runs when the page is about to leave and no longer be the active page.
  ionViewWillLeave(){

  }

  //Runs when the page has finished leaving and is no longer the active page.
  ionViewDidLeave(){

  }

  //Runs when the page is about to be destroyed and have its elements removed.
  ionViewWillUnload(){

  }

  //Runs before the view can enter. This can be used as a sort of "guard" in authenticated views where you need to check permissions before the view can enter
  //returns: boolean/Promise<void>
  ionViewCanEnter(){

  }

  shareWithFacebook() {
    this.socialSharing.shareViaFacebookWithPasteMessageHint('Prova Repair City!\n\n#repaircity', 'https://i.imgur.com/loL91W4.png', null, 'Incolla il testo preparato per te!');
  }

  shareWithMail(){
    // Check if sharing via email is supported
    this.socialSharing.canShareViaEmail().then(() => {
      this.socialSharing.shareViaEmail('Prova Repair City!','Repair City',null,null,null,['https://i.imgur.com/loL91W4.png']);
    }).catch(() => {
      this.showToast("Non è possibile condividere tramite mail");
    });
  }

  shareWithSMS(){
    this.socialSharing.shareViaSMS("Prova Repair City!\n\nwww.repaircity.com",null);
  }

  showToast(message: string) {
    this.toast.show(message, '1000', 'top').subscribe();
  }

  logout(){
    let confirm = this.alertCtrl.create({
      title: 'Logout',
      message: 'Vuoi uscire da Repair City?',
      buttons: [
        {
          text: 'Si',
          handler: () => {
            this.fcm.unsubscribe("user_" + this.userLogged).then( () => {
              this.appPreferences.remove("logged","logged").then(() => {}).catch(res => this.showToast("Errore di logout: " + res ));
              this.appPreferences.remove("fullname","fullname").then(() => {}).catch(res => this.showToast("Errore di logout: " + res ));
              this.app.getRootNav().setRoot(LoginPage);
              this.app.getRootNav().popToRoot();
            });
          }
        },
        {
          text: 'No',
          handler: () => {}
        }
      ]
    });
    confirm.present();
  }
}
