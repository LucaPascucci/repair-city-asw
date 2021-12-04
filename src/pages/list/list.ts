import { Component } from '@angular/core';
import {ModalController, NavController} from 'ionic-angular';
import firebase from 'firebase';
import {Geolocation} from "@ionic-native/geolocation";
import {AppPreferences} from "@ionic-native/app-preferences";
import {DetailPage} from "../detail/detail";
import {Toast} from "@ionic-native/toast";
import {LaunchNavigator} from '@ionic-native/launch-navigator';

declare let require;
declare let GeoFire;

@Component({
  selector: 'page-list',
  templateUrl: 'list.html'
})

export class ListPage {

  private toast: Toast = new Toast;

  private filter: string;
  private cardItems: any[] = [];

  private userLogged: string;
  private range: number;
  private fullName: string;

  private storage = firebase.storage();
  private database = firebase.database();
  private dbRefLocations = this.database.ref('locations');
  private dbRefSegnalations =  this.database.ref('/segnalations/');
  private dbRefLikeDislike =this.database.ref('/likesDislikes/');
  private geoFire = new GeoFire(this.dbRefLocations);
  private geoQuery : any;

  private currentPosition: any;

  private monthNames = ["Gennaio", "Febbraio", "Marzo", "Aprile", "Maggio", "Giugno",
    "Luglio", "Agosto", "Settembre", "Ottobre", "Novembre", "Dicembre"
  ];

  constructor(public navCtrl: NavController, public geoLocation: Geolocation, private appPreferences: AppPreferences,public modalCtrl: ModalController,
              private launchNavigator: LaunchNavigator) {
    this.appPreferences.fetch('logged','logged').then(res => {
      this.userLogged = res;
    });
    this.appPreferences.fetch('range', 'range').then( res => {
      this.range = res;
    });
    this.appPreferences.fetch('fullname','fullname').then(res => {
      this.fullName = res;
    });
    this.filter = "distance";
    this.setupList();
  }

  setupList(){
    this.geoLocation.getCurrentPosition().then((position) => {

      this.currentPosition = position;
      this.cardItems.length = 0; //Pulisce la lista
      this.dbRefSegnalations.on('child_added', (snapshot) => {  //preleva i dati già presenti e quelli nuovi

        if (!snapshot.val().solved) { //visualizzo solo le segnalazioni risolte
          let segnalationId = snapshot.key;

          this.geoQuery = this.geoFire.query({
            center: [position.coords.latitude, position.coords.longitude],
            radius: this.range
          });
          this.geoQuery.on("key_entered", (key, location, distance) => { //distanza data in km

            if (key == segnalationId) {
              let item = {
                title: snapshot.val().title,
                description: snapshot.val().description,
                gravity: snapshot.val().gravity,
                date: this.getDate(snapshot.val().timestamp),
                timestamp: snapshot.val().timestamp,
                segnalationId: segnalationId,
                userId: snapshot.val().user,
                solved: snapshot.val().solved,
                location: location,
                distance: distance,
                distanceToShow: this.getDistance(distance)
              };
              this.getUserOfSegnalation(item);
              this.createLikeListenerOfSegnalation(item);
              this.getImageOfSegnalation(item);
            }
          });
        }
      });

      this.dbRefSegnalations.on("child_changed", (snapshot) => {
        this.geoQuery.on("key_entered", (geoQueryKey, location, distance) => {
          let segnalationId = snapshot.key;
          if (geoQueryKey === segnalationId) {
            if (snapshot.val().solved) { //mi è cambiata una segnalazione da non risolta a risolta, la cancello dalla lista
              let indexToRemove;
              for (let i = 0; i < this.cardItems.length; i++) {
                if (this.cardItems[i].segnalationId === segnalationId) {
                  indexToRemove = i;
                }
              }
              this.cardItems.splice(indexToRemove, 1);
            } else { //mi è cambiata una segnalazione da risolta a non risolta, la devo riscaricare e aggiungerla alla lista
              let item = {
                title: snapshot.val().title,
                description: snapshot.val().description,
                gravity: snapshot.val().gravity,
                date: this.getDate(snapshot.val().timestamp),
                timestamp: snapshot.val().timestamp,
                segnalationId: segnalationId,
                userId: snapshot.val().user,
                solved: snapshot.val().solved,
                location: location,
                distance: distance,
                distanceToShow: this.getDistance(distance)
              };
              this.getUserOfSegnalation(item);
              this.createLikeListenerOfSegnalation(item);
              this.getImageOfSegnalation(item);
            }
          }
        });
      });
    });
  }

  getDistance(distance) {
    if (distance < 1) {
      return Math.round(distance * 1000)  + " metri";
    } else {
      return Math.round(distance) + " kilometri";
    }
  }

  removeRef(){
    this.dbRefSegnalations.off();
    this.dbRefLikeDislike.off();
    if (this.geoQuery !== undefined){
      this.geoQuery.cancel();
    }
  }

  segmentChanged() {
    if (this.filter == "distance") {
      this.orderByDistance();
    } else if (this.filter == "gravity") {
      this.orderByGravity();
    } else if (this.filter == "recent") {
      this.orderByTime();
    } else if (this.filter == "popularity") {
      this.orderByPopularity();
    }
  }

  /*Runs when the page has loaded. This event only happens once per page being created.
  If a page leaves but is cached, then this event will not fire again on a subsequent viewing.
  The ionViewDidLoad event is good place to put your setup code for the page.*/
  ionViewDidLoad(){}

  //Runs when the page is about to enter and become the active page.
  ionViewWillEnter(){

  }

  //Runs when the page has fully entered and is now the active page. This event will fire, whether it was the first load or a cached page
  ionViewDidEnter(){
    this.appPreferences.fetch('range', 'range').then( res => {
      if (this.range !== res){
        this.range = res;
        this.removeRef();
        this.setupList();
      }
    });
  }

  //Runs when the page is about to leave and no longer be the active page.
  ionViewWillLeave(){

  }

  //Runs when the page has finished leaving and is no longer the active page.
  ionViewDidLeave(){

  }

  //Runs when the page is about to be destroyed and have its elements removed.
  ionViewWillUnload(){
    this.removeRef();
    this.cardItems.length = 0; //Pulisce la lista di segnalazioni
  }

  //Runs before the view can enter. This can be used as a sort of "guard" in authenticated views where you need to check permissions before the view can enter
  //returns: boolean/Promise<void>
  ionViewCanEnter(){

  }

  //Runs before the view can leave. This can be used as a sort of "guard" in authenticated views where you need to check permissions before the view can leave
  //returns: boolean/Promise<void>
  ionViewCanLeave(){

  }

  getImageOfSegnalation(item) {
    let pathReference = this.storage.ref("images/" + item.segnalationId + ".jpg");
    pathReference.getDownloadURL().then((url) => {
      item["image"] = url;
      this.cardItems.push(item);
      this.segmentChanged();
    });
  }

  getUserOfSegnalation(item) {
    this.database.ref('/users/' + item.userId).once('value').then((snapshot) => {
      item["userImage"] = snapshot.val().profilePic;
      item["userFirstName"] = snapshot.val().firstName;
      item["userLastName"] = snapshot.val().lastName;
    });
  }

  createLikeListenerOfSegnalation(item) {
    this.dbRefLikeDislike.orderByChild("segnalationId").equalTo(item.segnalationId).on('value', (snapshot) => {
      let likesCounter = 0;
      let dislikesCounter = 0;
      let userchoice = 0;
      snapshot.forEach((childSnapshot) => {
        if (childSnapshot.val().userId == this.userLogged && childSnapshot.val().value){
          userchoice = 1;
        } else if (childSnapshot.val().userId == this.userLogged && !childSnapshot.val().value){
          userchoice = -1;
        }
        if(childSnapshot.val().value) {
          likesCounter++;
        } else {
          dislikesCounter++;
        }
        return false;
      });
      item["userchoice"] = userchoice;
      item["likes"] = likesCounter;
      item["dislikes"] = dislikesCounter;
    });
  }

  getDate(timestamp) {
    let today = new Date(timestamp);
    let dd = today.getDate();
    let mm = this.monthNames[today.getMonth()];
    let yyyy = today.getFullYear();
    let m = today.getMinutes();
    let h = today.getHours();

    let hour;
    let minutes;

    if (h < 10) {
      hour = "0" + h;
    } else {
      hour = h
    }

    if (m < 10) {
      minutes = "0" + m;
    } else {
      minutes = m;
    }

    return dd + " " + mm + " " + yyyy + " " + hour + ":" + minutes;
  }

  likeClicked(item, likeOrDislike) {
    let uuid = require("uuid");
    let id = uuid.v4();
    this.dbRefLikeDislike.once('value').then((snapshot) => {
      if (snapshot.exists()) { //se la tabella like è stata creata cerco se l'utente ha gia messo una valutazione per la segnalazione data
        let i = 0;
        let found = false;
        snapshot.forEach((childSnapshot) => {
          if (childSnapshot.val().userId == this.userLogged && childSnapshot.val().segnalationId == item.segnalationId) { //l'utente ha gia espresso una valutazione per questa segnalazione
            found = true;
            if (childSnapshot.val().value == likeOrDislike) { //se la valutazione espressa è uguale a quella gia presente, la cancello
              this.database.ref('/likesDislikes/' + Object.keys(snapshot.val())[i]).remove();
            } else { //se la valutazione espressa è diversa da quella gia presente, la setto.
              this.database.ref('/likesDislikes/' + Object.keys(snapshot.val())[i]).set({
                userId: this.userLogged,
                segnalationId: item.segnalationId,
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
            segnalationId: item.segnalationId,
            value: likeOrDislike
          });
          this.sendNotification(likeOrDislike, item);
        }
      } else { //se la tabella non c'è la creo con la prima valutazione passata come parametro
        this.database.ref('/likesDislikes/' + id).set({
          userId: this.userLogged,
          segnalationId: item.segnalationId,
          value: likeOrDislike
        });
        this.sendNotification(likeOrDislike, item);
      }
    });
  }

  sendNotification(likeOrDislike: boolean, item) {
    if (item.userId !== this.userLogged) { //mando la notifica se l'utente loggato è diverso da quello che ha fatto la segnalazione
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
        username: item.userId,
        message: "A " + this.fullName + " " + message + " '" + item.title + "'"
      });
    }
  }

  orderByGravity() {
    this.cardItems = this.cardItems.sort((t1, t2) => {
      if (t1.gravity == "low" && (t2.gravity == "mid" || t2.gravity == "high")) {
        return 1;
      }
      if (t1.gravity == "mid" && t2.gravity == "high") {
        return 1;
      }
      if (t2.gravity == "low" && (t1.gravity == "mid" || t1.gravity == "high")) {
        return -1;
      }
      if (t2.gravity == "mid" && t1.gravity == "high") {
        return -1;
      }

      return 0;
    });
  }

  orderByTime() {
    this.cardItems = this.cardItems.sort((t1, t2) => {
      if (t1.timestamp < t2.timestamp) {
        return 1;
      }
      if (t1.timestamp > t2.timestamp) {
        return -1
      }
      return 0;

    });
  };

  orderByDistance() {
    this.cardItems = this.cardItems.sort((t1, t2) => {
      if (t1.distance > t2.distance) {
        return 1;
      }
      if (t1.distance < t2.distance) {
        return -1
      }
      return 0;

    });
  };

  orderByPopularity() {
    this.cardItems = this.cardItems.sort((t1, t2) => {
      if ((t1.likes + t1.dislikes) < (t2.likes + t2.dislikes)) {
        return 1;
      }
      if ((t1.likes + t1.dislikes) > (t2.likes + t2.dislikes)) {
        return -1
      }
      return 0;

    });
  }

  showSegnalation(segnalation : any){
    this.modalCtrl.create(DetailPage, { segnalation: segnalation }).present();
  }

  openMaps(destination) {
    this.launchNavigator.navigate(destination, {
      start: this.currentPosition.coords.latitude + ", " +  this.currentPosition.coords.longitude
    })
  }

  showToast(message: string) {
    this.toast.show(message, '1000', 'top').subscribe();
  }

}
