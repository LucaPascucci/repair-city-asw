import {Component, ElementRef, ViewChild} from '@angular/core';
import {ActionSheetController, NavController, Platform} from 'ionic-angular';
import {NavParams} from 'ionic-angular';
import {Toast} from "@ionic-native/toast";
import {AppPreferences} from "@ionic-native/app-preferences";
import firebase from 'firebase';
import {SocialSharing} from "@ionic-native/social-sharing";

declare let google;
declare let require;

@Component({
  selector: 'page-detail',
  templateUrl: 'detail.html'
})

export class DetailPage {

  @ViewChild('map') mapElement: ElementRef;
  private map: any;
  private positionMarker: any;

  private toast: Toast = new Toast;
  private segnalation;

  private database = firebase.database();
  private dbRefLikeDislike = this.database.ref('/likesDislikes/');
  private userLogged: string;
  private fullName: string;

  /*
  title:
  description:
  gravity:
  date:
  timestamp:
  segnalationId:
  userId:
  distance:
  location: Array[lat,long]
  userImage:
  userFirstName:
  userLastName:
  likes:
  dislikes:
  image:
  */

  constructor(public navCtrl: NavController, public navParams: NavParams, private appPreferences: AppPreferences, public actionSheetCtrl: ActionSheetController, public platform: Platform, private socialSharing: SocialSharing) {
    this.segnalation = navParams.get('segnalation');
  }

  /*Runs when the page has loaded. This event only happens once per page being created.
  If a page leaves but is cached, then this event will not fire again on a subsequent viewing.
  The ionViewDidLoad event is good place to put your setup code for the page.*/
  ionViewDidLoad() {
    this.loadMap();
    this.positionMarker = new google.maps.Marker({
      position: new google.maps.LatLng(this.segnalation.location[0], this.segnalation.location[1]),
      map: this.map,
      icon: {
        url: './assets/' + this.segnalation.gravity + '.png',
        scaledSize: new google.maps.Size(32,32)
      }
    });
    this.map.setCenter(new google.maps.LatLng(this.segnalation.location[0], this.segnalation.location[1]));
    this.appPreferences.fetch('logged','logged').then(res => {
      this.userLogged = res;
    });
    this.appPreferences.fetch('fullname','fullname').then(res => {
      this.fullName = res;
    });
  }

  loadMap() {
    let mapOptions = {
      draggable: false,
      scrollWheel: false,
      panControl: false,
      maxZoom: 18,
      minZoom: 18,
      zoom:18,
      disableDefaultUI: true,
      mapTypeId: google.maps.MapTypeId.HYBRID,
      center: new google.maps.LatLng(44.1454289, 12.2474282),
      styles: [{
        featureType: "poi",
        elementType: "labels",
        stylers: [
          { visibility: "off" }
        ]
      }]
    };
    this.map = new google.maps.Map(this.mapElement.nativeElement, mapOptions);
  }

  showToast(message: string) {
    this.toast.show(message, '1000', 'top').subscribe();
  }

  dismissModal() {
    this.navCtrl.pop();
  }

  likeClicked(likeOrDislike: boolean) {
    let uuid = require("uuid");
    let id = uuid.v4();
    this.dbRefLikeDislike.once('value').then((snapshot) => {
      if (snapshot.exists()) { //se la tabella like è stata creata cerco se l'utente ha gia messo una valutazione per la segnalazione data
        let i = 0;
        let found = false;
        snapshot.forEach((childSnapshot) => {
          if (childSnapshot.val().userId == this.userLogged && childSnapshot.val().segnalationId == this.segnalation.segnalationId) { //l'utente ha gia espresso una valutazione per questa segnalazione
            found = true;
            if (childSnapshot.val().value == likeOrDislike) { //se la valutazione espressa è uguale a quella gia presente, la cancello
              this.database.ref('/likesDislikes/' + Object.keys(snapshot.val())[i]).remove();
            } else { //se la valutazione espressa è diversa da quella gia presente, la setto.
              this.database.ref('/likesDislikes/' + Object.keys(snapshot.val())[i]).set({
                userId: this.userLogged,
                segnalationId: this.segnalation.segnalationId,
                value: likeOrDislike
              });
            }
          }
          i++;
          return false;
        });
        if (!found) { //l'utente non ha espresso una valutazione per questa segnalazione, quindi la creo
          this.database.ref('/likesDislikes/' + id).set({
            userId: this.userLogged,
            segnalationId: this.segnalation.segnalationId,
            value: likeOrDislike
          });
          this.sendNotification(likeOrDislike);
        }
      } else { //se la tabella non c'è la creo con la prima valutazione passata come parametro
        this.database.ref('/likesDislikes/' + id).set({
          userId: this.userLogged,
          segnalationId: this.segnalation.segnalationId,
          value: likeOrDislike
        });
        this.sendNotification(likeOrDislike);
      }
    });
  }

  sendNotification(likeOrDislike: boolean) {
    if (this.segnalation.userId !== this.userLogged) { //mando la notifica se l'utente loggato è diverso da quello che ha fatto la segnalazione
      let uuid = require("uuid");
      let id = uuid.v4();
      let message;
      if (likeOrDislike) {
        message = "piace la tua segnalazione";
      } else {
        message = "non piace la tua segnalazione";
      }


      const notificationRef: firebase.database.Reference = firebase.database().ref('/notifications/' + id);
      notificationRef.set({
        username: this.segnalation.userId,
        message: "A " + this.fullName + " " + message + " '" + this.segnalation.title + "'"
      });
    }
  }

  showActionSheetMore(){
    let text = "";
    let icon = "";
    if (this.segnalation.solved){
      text = "Non risolta";
      icon = "close"
    } else {
      text = "Risolta";
      icon = "checkmark";
    }
    const actionSheet = this.actionSheetCtrl.create({
      title: '',
      cssClass: 'action-sheets',
      buttons: [
        {
          text: text,
          icon: this.platform.is('ios')? null : icon,
          handler: () => {
            this.solveSegnalation(!this.segnalation.solved);
          }
        },
        {
          text: 'Condividi su Facebook',
          icon: this.platform.is('ios')? null :'logo-facebook',
          handler: () => {
            this.socialSharing.shareViaFacebookWithPasteMessageHint(this.segnalation.title + "\n\n" + this.segnalation.description + "\n\n#repaircity", this.segnalation.image, null,'Incolla il testo preparato per te!');
          }
        },
        {
          text: 'Annulla',
          icon:  this.platform.is('ios') ? null : 'close',
          role: 'destructive',
        }
      ]
    });
    actionSheet.present();
  }

  solveSegnalation(solved: boolean) {
    if (this.segnalation.userId !== this.userLogged) { //mando la notifica se l'utente loggato è diverso da quello che ha fatto la segnalazione
      let uuid = require("uuid");
      let id = uuid.v4();

      const notificationRef: firebase.database.Reference = firebase.database().ref('/notifications/' + id);
      notificationRef.set({
        username: this.segnalation.userId,
        message: this.fullName + " ha modificato lo stato della tua segnalazione '" + this.segnalation.title + "'",
      });
    }

    let update = {};
    update['/segnalations/' + this.segnalation.segnalationId + '/solved/'] = solved;
    this.database.ref().update(update).then(() => {
      this.navCtrl.pop();
    });
  }

}
